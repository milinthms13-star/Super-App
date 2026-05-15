const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const authenticate = require('../middleware/auth');
const KaraokeDuetRoom = require('../models/KaraokeDuetRoom');
const { mixDuetRoom } = require('../services/karaokeMixService');

const router = express.Router();

const MAX_TAKE_SIZE_BYTES = 60 * 1024 * 1024;
const TAKES_DIR = path.join(__dirname, '..', 'uploads', 'karaoke-duet', 'takes');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TAKE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const supported = /^(audio\/(webm|wav|mpeg|mp3|ogg|x-wav)|video\/webm)$/i.test(
      String(file.mimetype || '')
    );
    if (!supported) {
      cb(new Error('Unsupported take format. Upload audio/webm, wav, mp3, or ogg.'));
      return;
    }
    cb(null, true);
  },
});

const ROOM_STATUS = {
  waiting: 'waiting',
  live: 'live',
  recording: 'recording',
  mixing: 'mixing',
  completed: 'completed',
  closed: 'closed',
};

const DEFAULT_LYRICS = [
  { timeSec: 0, text: 'Duet starts now...' },
  { timeSec: 5, text: 'Singer A line one' },
  { timeSec: 10, text: 'Singer B line one' },
  { timeSec: 15, text: 'Sing together' },
];

const ensureTakesDir = async () => {
  await fs.promises.mkdir(TAKES_DIR, { recursive: true });
};

const extensionFromMimetype = (mimetype = '') => {
  const normalized = String(mimetype || '').toLowerCase();
  if (normalized.includes('wav')) return '.wav';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return '.mp3';
  if (normalized.includes('ogg')) return '.ogg';
  return '.webm';
};

const currentUserId = (req) =>
  String(req?.user?._id || req?.user?.id || req?.userId || '').trim();

const currentUserName = (req) =>
  String(req?.user?.name || req?.user?.fullName || req?.user?.email || 'Guest').trim();

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const buildInviteUrl = (req, roomCode, token) => {
  const origin = String(req.headers.origin || process.env.FRONTEND_URL || 'https://app.nilahub.com').replace(
    /\/$/,
    ''
  );
  return `${origin}/remote-karaoke-duet?room=${encodeURIComponent(roomCode)}&invite=${encodeURIComponent(
    token
  )}`;
};

const toPublicRoom = (room) => {
  const plain = room.toObject ? room.toObject() : room;
  return {
    roomCode: plain.roomCode,
    inviteToken: plain.inviteToken,
    status: plain.status,
    title: plain.title,
    karaokeTrackUrl: plain.karaokeTrackUrl,
    karaokeTrackBpm: plain.karaokeTrackBpm,
    startedAtMs: plain.startedAtMs,
    participants: plain.participants || [],
    lyrics: plain.lyrics || [],
    settings: plain.settings || {},
    realtimeState: plain.realtimeState || {},
    takes: plain.takes || [],
    mixJobs: plain.mixJobs || [],
    finalOutputs: plain.finalOutputs || [],
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const requireParticipant = (room, userId) =>
  Array.isArray(room?.participants) &&
  room.participants.some((participant) => String(participant.userId) === String(userId));

// Module metadata
router.get('/meta', authenticate, async (_req, res) => {
  res.json({
    success: true,
    module: 'Remote Karaoke Duet',
    approach: 'Live duet feel + local take recording + server-side sync/mixing',
    stack: ['WebRTC', 'MediaRecorder', 'Socket.IO', 'FFmpeg', 'Node.js', 'React'],
    features: [
      'Room create/join',
      'Invite link and code',
      'Timecode/beat sync',
      'Local take upload (per singer)',
      'Server-side alignment and final MP3/WAV mix',
      'Lyrics sync payload',
    ],
  });
});

// Create room
router.post('/rooms', authenticate, async (req, res) => {
  try {
    const userId = currentUserId(req);
    const displayName = currentUserName(req);
    const title = String(req.body?.title || 'Remote Karaoke Duet').trim();
    const karaokeTrackUrl = String(req.body?.karaokeTrackUrl || '').trim();
    const karaokeTrackBpm = Number(req.body?.karaokeTrackBpm || 0);
    const lyrics = Array.isArray(req.body?.lyrics) && req.body.lyrics.length > 0 ? req.body.lyrics : DEFAULT_LYRICS;

    let roomCode = generateRoomCode();
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await KaraokeDuetRoom.exists({ roomCode });
      if (!exists) break;
      roomCode = generateRoomCode();
    }

    const inviteToken = crypto.randomBytes(10).toString('hex');
    const room = await KaraokeDuetRoom.create({
      roomCode,
      inviteToken,
      createdBy: userId,
      title,
      karaokeTrackUrl,
      karaokeTrackBpm: Number.isFinite(karaokeTrackBpm) ? karaokeTrackBpm : 0,
      lyrics,
      participants: [
        {
          userId,
          role: 'host',
          displayName,
          joinedAt: new Date(),
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Karaoke duet room created.',
      room: toPublicRoom(room),
      invite: {
        code: room.roomCode,
        token: room.inviteToken,
        joinUrl: buildInviteUrl(req, room.roomCode, room.inviteToken),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create room.', error: error.message });
  }
});

// Join room
router.post('/rooms/:roomCode/join', authenticate, async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const token = String(req.body?.inviteToken || '').trim();
    const userId = currentUserId(req);
    const displayName = currentUserName(req);

    const room = await KaraokeDuetRoom.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (token && token !== room.inviteToken) {
      return res.status(403).json({ success: false, message: 'Invalid invite token.' });
    }

    const existingParticipant = room.participants.find(
      (participant) => String(participant.userId) === String(userId)
    );

    if (!existingParticipant) {
      if (room.participants.length >= 2) {
        return res.status(409).json({ success: false, message: 'Room already has 2 singers.' });
      }

      room.participants.push({
        userId,
        role: 'guest',
        displayName,
        joinedAt: new Date(),
      });
    }

    await room.save();

    return res.json({
      success: true,
      message: 'Joined karaoke room.',
      room: toPublicRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to join room.', error: error.message });
  }
});

// Get room state
router.get('/rooms/:roomCode', authenticate, async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const userId = currentUserId(req);
    const room = await KaraokeDuetRoom.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (!requireParticipant(room, userId)) {
      return res.status(403).json({ success: false, message: 'Only room participants can view this room.' });
    }

    return res.json({
      success: true,
      room: toPublicRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch room.', error: error.message });
  }
});

// Start room session and assign server timecode zero
router.post('/rooms/:roomCode/start', authenticate, async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const userId = currentUserId(req);
    const room = await KaraokeDuetRoom.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const host = room.participants.find((participant) => participant.role === 'host');
    if (!host || String(host.userId) !== userId) {
      return res.status(403).json({ success: false, message: 'Only host can start the duet.' });
    }

    room.startedAtMs = Date.now();
    room.status = ROOM_STATUS.live;
    room.realtimeState = {
      ...room.realtimeState,
      latestTimecodeMs: 0,
      beatCount: 0,
      lastSyncAt: new Date(),
    };
    await room.save();

    return res.json({
      success: true,
      message: 'Duet started.',
      startedAtMs: room.startedAtMs,
      room: toPublicRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to start duet.', error: error.message });
  }
});

// Update room sync state (timecode / beat)
router.post('/rooms/:roomCode/sync', authenticate, async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const userId = currentUserId(req);
    const room = await KaraokeDuetRoom.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (!requireParticipant(room, userId)) {
      return res.status(403).json({ success: false, message: 'Only participants can sync this room.' });
    }

    const latestTimecodeMs = Number(req.body?.latestTimecodeMs || 0);
    const beatCount = Number(req.body?.beatCount || 0);
    room.realtimeState.latestTimecodeMs = Number.isFinite(latestTimecodeMs) ? latestTimecodeMs : 0;
    room.realtimeState.beatCount = Number.isFinite(beatCount) ? beatCount : 0;
    room.realtimeState.lastSyncAt = new Date();
    await room.save();

    return res.json({
      success: true,
      realtimeState: room.realtimeState,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update sync state.', error: error.message });
  }
});

// Upload local recorded take
router.post('/rooms/:roomCode/takes', authenticate, upload.single('take'), async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const userId = currentUserId(req);
    const room = await KaraokeDuetRoom.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const participant = room.participants.find((entry) => String(entry.userId) === userId);
    if (!participant) {
      return res.status(403).json({ success: false, message: 'Only participants can upload takes.' });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Missing audio take file.' });
    }

    await ensureTakesDir();
    const extension = extensionFromMimetype(req.file.mimetype);
    const fileName = `${room.roomCode}-${participant.role}-${Date.now()}-${crypto
      .randomBytes(3)
      .toString('hex')}${extension}`;
    const absolutePath = path.join(TAKES_DIR, fileName);
    await fs.promises.writeFile(absolutePath, req.file.buffer);

    const publicUrl = `/uploads/karaoke-duet/takes/${fileName}`;
    const localStartedAtMs = Number(req.body?.localStartedAtMs || 0);
    const durationMs = Number(req.body?.durationMs || 0);
    const trackOffsetMs = Number(req.body?.trackOffsetMs || 0);

    const existingIndex = room.takes.findIndex((take) => take.singerRole === participant.role);
    const takeRecord = {
      singerRole: participant.role,
      userId,
      fileUrl: publicUrl,
      format: extension.replace('.', ''),
      durationMs: Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0,
      localStartedAtMs: Number.isFinite(localStartedAtMs) ? localStartedAtMs : null,
      trackOffsetMs: Number.isFinite(trackOffsetMs) ? trackOffsetMs : 0,
      uploadedAt: new Date(),
    };

    if (existingIndex >= 0) {
      room.takes.splice(existingIndex, 1, takeRecord);
    } else {
      room.takes.push(takeRecord);
    }

    room.status = ROOM_STATUS.recording;
    await room.save();

    return res.status(201).json({
      success: true,
      message: `${participant.role} take uploaded.`,
      take: takeRecord,
      room: toPublicRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to upload take.', error: error.message });
  }
});

// Trigger final mix
router.post('/rooms/:roomCode/finalize', authenticate, async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const userId = currentUserId(req);
    const room = await KaraokeDuetRoom.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const host = room.participants.find((participant) => participant.role === 'host');
    if (!host || String(host.userId) !== userId) {
      return res.status(403).json({ success: false, message: 'Only host can finalize duet mix.' });
    }

    const jobId = `mix-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const mixJob = {
      jobId,
      status: 'processing',
      startedAt: new Date(),
      outputs: [],
      errorMessage: '',
    };

    room.status = ROOM_STATUS.mixing;
    room.mixJobs.push(mixJob);
    await room.save();

    try {
      const result = await mixDuetRoom({ room });

      const target = room.mixJobs.find((job) => job.jobId === jobId);
      if (target) {
        target.status = 'completed';
        target.completedAt = new Date();
        target.outputs = result.outputs;
        target.errorMessage = '';
      }

      room.finalOutputs = result.outputs;
      room.status = ROOM_STATUS.completed;
      await room.save();

      return res.json({
        success: true,
        message: 'Final duet mix generated.',
        jobId,
        hostDelayMs: result.hostDelayMs,
        guestDelayMs: result.guestDelayMs,
        outputs: result.outputs,
      });
    } catch (mixError) {
      const failedTarget = room.mixJobs.find((job) => job.jobId === jobId);
      if (failedTarget) {
        failedTarget.status = 'failed';
        failedTarget.completedAt = new Date();
        failedTarget.errorMessage = mixError.message;
      }
      room.status = ROOM_STATUS.live;
      await room.save();

      return res.status(500).json({
        success: false,
        message: 'Mix generation failed.',
        error: mixError.message,
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to finalize room.', error: error.message });
  }
});

// Get final outputs
router.get('/rooms/:roomCode/final-output', authenticate, async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const userId = currentUserId(req);
    const room = await KaraokeDuetRoom.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (!requireParticipant(room, userId)) {
      return res.status(403).json({ success: false, message: 'Only participants can access final output.' });
    }

    return res.json({
      success: true,
      status: room.status,
      finalOutputs: room.finalOutputs || [],
      mixJobs: room.mixJobs || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch final output.', error: error.message });
  }
});

module.exports = router;
