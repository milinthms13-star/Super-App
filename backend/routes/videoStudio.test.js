const request = require('supertest');
const app = require('../app');
const fs = require('fs');

jest.mock('../services/videoStudioService', () => ({
  createStudioProject: jest.fn(),
  createAutopilotProject: jest.fn(),
  getStudioProject: jest.fn(),
  renderVideo: jest.fn(),
  patchStudioProject: jest.fn(),
  regenerateProjectStage: jest.fn(),
}));

const {
  createStudioProject,
  createAutopilotProject,
  getStudioProject,
  renderVideo,
  patchStudioProject,
} = require('../services/videoStudioService');

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

describe('Video studio routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReset();
  });

  test('returns 400 when create payload is missing story prompt', async () => {
    const response = await request(app).post('/api/video-studio/create').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Please provide a story prompt.');
  });

  test('creates a studio project and returns success payload', async () => {
    const project = {
      projectId: 'proj-123',
      title: 'Friendly story',
      storyPrompt: 'A friendly story about magic and friendship.',
      scenes: [
        { id: 1, title: 'Start', description: 'Friends meet', dialogue: 'Hello there!', durationSeconds: 5 },
      ],
    };

    createStudioProject.mockResolvedValue(project);

    const response = await request(app)
      .post('/api/video-studio/create')
      .send({
        storyPrompt: 'A friendly story about magic and friendship.',
        storyTitle: 'Friendly story',
        languageId: 'english',
        styleId: 'cartoon',
        voiceType: 'kid-female',
        videoSizeId: 'youtube',
        storyMode: 'bedtime',
        safeMode: true,
        ageFilter: '5-8',
        storySource: 'paste',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.project).toEqual(project);
    expect(createAutopilotProject).not.toHaveBeenCalled();
  });

  test('returns 400 when render payload has invalid scenes', async () => {
    const response = await request(app)
      .post('/api/video-studio/render')
      .send({ project: { projectId: 'proj-123', scenes: [] } });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('At least one scene is required');
  });

  test('renders a video and returns absolute videoUrl', async () => {
    const validProject = {
      projectId: 'proj-123',
      scenes: [{ id: 1, title: 'Start', description: 'Friends meet', dialogue: 'Hello there', durationSeconds: 4 }],
      title: 'Friendly story',
    };

    renderVideo.mockResolvedValue({
      outputFile: '/tmp/exported-video.mp4',
      videoUrl: '/uploads/video/proj-123.mp4',
      projectId: 'proj-123',
    });
    patchStudioProject.mockResolvedValue({ ...validProject, videoUrl: '/uploads/video/proj-123.mp4' });
    fs.existsSync.mockReturnValue(true);

    const response = await request(app)
      .post('/api/video-studio/render')
      .send({ project: validProject, premiumHD: true });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.videoUrl).toMatch(/\/uploads\/video\/proj-123\.mp4$/);
    expect(patchStudioProject).toHaveBeenCalledWith('proj-123', expect.objectContaining({ videoUrl: '/uploads/video/proj-123.mp4' }));
  });

  test('returns safety error 422 when service rejects with SAFETY_FAILED', async () => {
    createStudioProject.mockRejectedValue({
      code: 'SAFETY_FAILED',
      status: 422,
      message: 'Blocked content',
      safety: { reasons: [{ code: 'adult', reason: 'adult content' }] },
    });

    const response = await request(app)
      .post('/api/video-studio/create')
      .send({ storyPrompt: 'bad prompt', storyTitle: 'Bad story' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('SAFETY_FAILED');
    expect(response.body.safety).toEqual({ reasons: [{ code: 'adult', reason: 'adult content' }] });
  });
});
