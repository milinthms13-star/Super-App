jest.mock('../services/kidsVideoGeneratorHFService', () => ({
  generateKidsVideoFromPrompt: jest.fn(),
  generateKidsVideoFromDiffusersPrompt: jest.fn(),
  generateKidsVideoFromFreeSteveLikePrompt: jest.fn(),
  getKidsVideoProject: jest.fn(),
}));

const request = require('supertest');
const app = require('../app');
const {
  generateKidsVideoFromPrompt,
  generateKidsVideoFromDiffusersPrompt,
  generateKidsVideoFromFreeSteveLikePrompt,
  getKidsVideoProject,
} = require('../services/kidsVideoGeneratorHFService');

describe('kids-video-hf routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/kids-video-hf/generate returns generated video payload', async () => {
    generateKidsVideoFromPrompt.mockResolvedValue({
      projectId: 'proj-1',
      videoUrl: '/uploads/kids-video-hf/proj-1/story-render-123.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-1',
        scenes: [{ id: 1, title: 'Scene 1' }],
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'Rabbit and tortoise race story',
        sceneCount: 5,
        videoSize: 'youtube',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.projectId).toBe('proj-1');
    expect(generateKidsVideoFromPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Rabbit and tortoise race story',
        sceneCount: 5,
      })
    );
  });

  test('GET /api/kids-video-hf/projects/:projectId returns project', async () => {
    getKidsVideoProject.mockResolvedValue({
      projectId: 'proj-2',
      title: 'Story',
    });

    const response = await request(app).get('/api/kids-video-hf/projects/proj-2');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.project.projectId).toBe('proj-2');
  });

  test('POST /api/kids-video-hf/generate uses diffusers engine when requested', async () => {
    generateKidsVideoFromDiffusersPrompt.mockResolvedValue({
      projectId: 'proj-diffusers-1',
      videoUrl: '/uploads/kids-video-hf/proj-diffusers-1/story-render.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-diffusers-1',
        workflowType: 'kids-video-hf-diffusers',
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'a hero flying over a futuristic city',
        engine: 'diffusers_t2v',
        numFrames: 64,
        numInferenceSteps: 20,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.workflowType).toBe('kids-video-hf-diffusers');
    expect(generateKidsVideoFromDiffusersPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'a hero flying over a futuristic city',
        numFrames: 64,
        numInferenceSteps: 20,
      })
    );
  });

  test('POST /api/kids-video-hf/generate uses free steve-like engine when requested', async () => {
    generateKidsVideoFromFreeSteveLikePrompt.mockResolvedValue({
      projectId: 'proj-steve-1',
      videoUrl: '/uploads/kids-video-hf/proj-steve-1/story-render.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-steve-1',
        workflowType: 'kids-video-hf-steve-like',
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'AI helps create videos from script',
        engine: 'free_steve_like',
        sceneCount: 4,
        language: 'en',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.workflowType).toBe('kids-video-hf-steve-like');
    expect(generateKidsVideoFromFreeSteveLikePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'AI helps create videos from script',
        sceneCount: 4,
        language: 'en',
      })
    );
  });
});
