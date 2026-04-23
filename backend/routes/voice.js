const express = require('express');
const { authenticate } = require('../middleware/auth');
const Call = require('../models/Call');
const FileStorage = require('../models/FileStorage');
const { uploadToS3 } = require('../utils/s3Storage');
const { emitToUser } = require('../config/websocket');
const router = express.Router();

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/voice/initiate - Start voice call
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { recipientId, module, contextId } = req.body; // contextId = productId, propertyId, etc.
    
    const call = new Call({
      chatId: contextId, // Use module context as chatId
      initiatorId: req.user._id,
      recipientId,
      callType: req.body.callType || 'audio',
      metadata: { module, contextId }
    });

    await call.save();

    // Emit to recipient via WebSocket
    emitToUser(recipientId, 'voice:call-incoming', {
      callId: call._id,
      caller: {
        id: req.user._id,
        name: req.user.name,
        avatar: req.user.avatar
      },
      module,
      contextId,
      callType: call.callType
    });

    res.json({ success: true, callId: call._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/voice/accept - Accept call
router.post('/accept/:callId', authenticate, async (req, res) => {
  try {
    const call = await Call.findById(req.params.callId);
    if (!call || !call.recipientId.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    call.status = 'accepted';
    call.startedAt = new Date();
    await call.save();

    emitToUser(call.initiatorId, 'voice:call-accepted', {
      callId: call._id,
      sdpAnswer: req.body.sdpAnswer // WebRTC SDP
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/voice/end/:callId - End call
router.post('/end/:callId', authenticate, async (req, res) => {
  try {
    const call = await Call.findById(req.params.callId);
    if (!call || !call.participants.some(p => p.userId.equals(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    call.status = 'ended';
    call.endedAt = new Date();
    call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
    await call.save();

    // Notify all participants
    call.participants.forEach(p => emitToUser(p.userId, 'voice:call-ended', { callId: call._id }));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/voice/voicenote - Send voice note to any module
router.post('/voicenote', authenticate, upload.single('audio'), async (req, res) => {
  try {
    const { module, contextId, recipientId } = req.body;

    const result = await uploadToS3(req.file.buffer, `voice-notes/${module}/${contextId}/${Date.now()}.m4a`, {
      contentType: 'audio/m4a'
    });

    const voiceNote = new FileStorage({
      uploadedBy: req.user._id,
      contextId,
      contextModule: module,
      recipientId,
      originalFileName: 'voice-note.m4a',
      mimeType: 'audio/m4a',
      fileSize: req.file.size,
      s3Url: result.s3Url
    });

    await voiceNote.save();

    // Emit real-time notification
    emitToUser(recipientId, 'voice:note-received', {
      voiceNoteId: voiceNote._id,
      sender: req.user.name,
      module,
      contextId
    });

    res.json({ success: true, voiceNote });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/voice/history - Get call history
router.get('/history', authenticate, async (req, res) => {
  const calls = await Call.find({
    $or: [{ initiatorId: req.user._id }, { recipientId: req.user._id }]
  }).sort({ createdAt: -1 }).limit(50);

  res.json({ success: true, calls });
});

module.exports = router;
