const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

jest.mock('../services/karaokeMixService', () => ({
  mixDuetRoom: jest.fn(),
  mixStudioKaraokeDuet: jest.fn(),
}));

const karaokeDuetRouter = require('../routes/karaokeDuet');
const KaraokeDuetRoom = require('../models/KaraokeDuetRoom');
const { mixDuetRoom, mixStudioKaraokeDuet } = require('../services/karaokeMixService');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/karaoke-duet', karaokeDuetRouter);
  return app;
};

const makeToken = ({ sub, email, name }) =>
  jwt.sign(
    {
      sub,
      email,
      name,
    },
    'test-secret'
  );

const makeAudioBuffer = () => Buffer.from('fake-audio-content');

describe('KaraokeDuet routes integration', () => {
  let app;
  let hostToken;
  let guestToken;
  let outsiderToken;

  beforeAll(async () => {
    app = createTestApp();
    hostToken = makeToken({
      sub: '507f191e810c19729de860ea',
      email: 'karaoke-host@example.com',
      name: 'Karaoke Host',
    });
    guestToken = makeToken({
      sub: '507f191e810c19729de860eb',
      email: 'karaoke-guest@example.com',
      name: 'Karaoke Guest',
    });
    outsiderToken = makeToken({
      sub: '507f191e810c19729de860ec',
      email: 'karaoke-outsider@example.com',
      name: 'Karaoke Outsider',
    });

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await KaraokeDuetRoom.deleteMany({});
  });

  test('GET /meta returns karaoke duet capabilities', async () => {
    const response = await request(app).get('/api/karaoke-duet/meta').set('Authorization', `Bearer ${hostToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.features).toContain('Room create/join');
    expect(response.body.features).toContain('Zero-cost Canva-ready creator pack');
  });

  test('POST /rooms creates room with invite details', async () => {
    const response = await request(app)
      .post('/api/karaoke-duet/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Test Karaoke Room',
        karaokeTrackUrl: 'https://example.com/karaoke-track.mp3',
        karaokeTrackBpm: 98,
        lyrics: [{ timeSec: 0, text: 'Start now' }],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.room.roomCode).toHaveLength(6);
    expect(response.body.room.participants).toHaveLength(1);
    expect(response.body.invite.code).toBe(response.body.room.roomCode);
    expect(response.body.invite.token).toBeTruthy();
  });

  test('POST /rooms/:roomCode/join allows guest with valid invite token', async () => {
    const created = await request(app)
      .post('/api/karaoke-duet/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Joinable room',
        karaokeTrackUrl: 'https://example.com/base-track.mp3',
      });

    const roomCode = created.body.room.roomCode;
    const inviteToken = created.body.invite.token;

    const joinResponse = await request(app)
      .post(`/api/karaoke-duet/rooms/${roomCode}/join`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ inviteToken });

    expect(joinResponse.status).toBe(200);
    expect(joinResponse.body.success).toBe(true);
    expect(joinResponse.body.room.participants).toHaveLength(2);
  });

  test('POST /rooms/:roomCode/start rejects non-host user', async () => {
    const created = await request(app)
      .post('/api/karaoke-duet/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Host control room',
        karaokeTrackUrl: 'https://example.com/base-track.mp3',
      });

    const roomCode = created.body.room.roomCode;

    await request(app)
      .post(`/api/karaoke-duet/rooms/${roomCode}/join`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ inviteToken: created.body.invite.token });

    const startResponse = await request(app)
      .post(`/api/karaoke-duet/rooms/${roomCode}/start`)
      .set('Authorization', `Bearer ${guestToken}`);

    expect(startResponse.status).toBe(403);
    expect(startResponse.body.success).toBe(false);
  });

  test('POST /rooms/:roomCode/sync updates room realtime state for participant', async () => {
    const created = await request(app)
      .post('/api/karaoke-duet/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Sync room',
        karaokeTrackUrl: 'https://example.com/base-track.mp3',
      });

    const roomCode = created.body.room.roomCode;
    const syncResponse = await request(app)
      .post(`/api/karaoke-duet/rooms/${roomCode}/sync`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ latestTimecodeMs: 3250, beatCount: 6 });

    expect(syncResponse.status).toBe(200);
    expect(syncResponse.body.success).toBe(true);
    expect(syncResponse.body.realtimeState.latestTimecodeMs).toBe(3250);
    expect(syncResponse.body.realtimeState.beatCount).toBe(6);
  });

  test('POST /coach endpoints generate zero-cost outputs', async () => {
    const lyricsResponse = await request(app)
      .post('/api/karaoke-duet/coach/lyrics-sync')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        lyricsText: 'line one\nline two',
        bpm: 100,
      });

    expect(lyricsResponse.status).toBe(200);
    expect(lyricsResponse.body.success).toBe(true);
    expect(lyricsResponse.body.data.script).toContain('|line one');

    const studioFeedbackResponse = await request(app)
      .post('/api/karaoke-duet/coach/studio-feedback')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        delayASeconds: 0.2,
        delayBSeconds: 0.3,
        volumeA: 1,
        volumeB: 1.1,
        hasTrack: true,
        hasVoiceA: true,
        hasVoiceB: true,
        lyricsLength: 80,
      });

    expect(studioFeedbackResponse.status).toBe(200);
    expect(studioFeedbackResponse.body.success).toBe(true);
    expect(studioFeedbackResponse.body.data.scores.overallScore).toBeGreaterThanOrEqual(0);
  });

  test('POST /coach/creator-pack blocks non-participant for room-scoped request', async () => {
    const created = await request(app)
      .post('/api/karaoke-duet/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Creator pack room',
        karaokeTrackUrl: 'https://example.com/base-track.mp3',
      });

    const roomCode = created.body.room.roomCode;
    const creatorPackResponse = await request(app)
      .post('/api/karaoke-duet/coach/creator-pack')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        roomCode,
        mood: 'electric',
      });

    expect(creatorPackResponse.status).toBe(403);
    expect(creatorPackResponse.body.success).toBe(false);
  });

  test('POST /rooms/:roomCode/finalize returns mix outputs when both takes exist', async () => {
    mixDuetRoom.mockResolvedValue({
      hostDelayMs: 120,
      guestDelayMs: 180,
      outputs: [
        {
          format: 'mp3',
          outputUrl: '/uploads/karaoke-duet/mixes/test.mp3',
          fileSizeBytes: 1024,
        },
      ],
    });

    const created = await request(app)
      .post('/api/karaoke-duet/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Finalize room',
        karaokeTrackUrl: 'https://example.com/base-track.mp3',
      });

    const roomCode = created.body.room.roomCode;
    const inviteToken = created.body.invite.token;

    await request(app)
      .post(`/api/karaoke-duet/rooms/${roomCode}/join`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ inviteToken });

    await request(app)
      .post(`/api/karaoke-duet/rooms/${roomCode}/takes`)
      .set('Authorization', `Bearer ${hostToken}`)
      .field('localStartedAtMs', String(Date.now()))
      .field('durationMs', '4000')
      .attach('take', makeAudioBuffer(), { filename: 'host.webm', contentType: 'audio/webm' });

    await request(app)
      .post(`/api/karaoke-duet/rooms/${roomCode}/takes`)
      .set('Authorization', `Bearer ${guestToken}`)
      .field('localStartedAtMs', String(Date.now() + 100))
      .field('durationMs', '3900')
      .attach('take', makeAudioBuffer(), { filename: 'guest.webm', contentType: 'audio/webm' });

    const finalizeResponse = await request(app)
      .post(`/api/karaoke-duet/rooms/${roomCode}/finalize`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(finalizeResponse.status).toBe(200);
    expect(finalizeResponse.body.success).toBe(true);
    expect(finalizeResponse.body.outputs).toHaveLength(1);
    expect(mixDuetRoom).toHaveBeenCalledTimes(1);
  });

  test('POST /export returns studio mix output from service', async () => {
    mixStudioKaraokeDuet.mockResolvedValue({
      outputUrl: '/uploads/karaoke-duet/exports/studio.mp3',
      fileSizeBytes: 42000,
    });

    const exportResponse = await request(app)
      .post('/api/karaoke-duet/export')
      .set('Authorization', `Bearer ${hostToken}`)
      .field('delayA', '0.1')
      .field('delayB', '0.2')
      .field('volumeA', '1')
      .field('volumeB', '1')
      .attach('track', makeAudioBuffer(), { filename: 'track.mp3', contentType: 'audio/mpeg' })
      .attach('voiceA', makeAudioBuffer(), { filename: 'voice-a.webm', contentType: 'audio/webm' })
      .attach('voiceB', makeAudioBuffer(), { filename: 'voice-b.webm', contentType: 'audio/webm' });

    expect(exportResponse.status).toBe(201);
    expect(exportResponse.body.success).toBe(true);
    expect(exportResponse.body.data.outputUrl).toContain('/uploads/karaoke-duet/exports/');
    expect(mixStudioKaraokeDuet).toHaveBeenCalledTimes(1);
  });
});
