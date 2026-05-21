jest.mock('../services/kidsVideoGeneratorHFService', () => ({
  generateKidsVideoFromPrompt: jest.fn(),
  generateKidsVideoFromHybridPrompt: jest.fn(),
  generateKidsVideoFromDiffusersPrompt: jest.fn(),
  generateKidsVideoFromFreeSteveLikePrompt: jest.fn(),
  generateKidsVideoFromCogVideoXPrompt: jest.fn(),
  getKidsVideoProject: jest.fn(),
  getKidsVideoGeneratorCapabilities: jest.fn(() => ({
    pythonAvailable: true,
    ffmpegAvailable: true,
    hybridMotionAvailable: true,
    hybridPhase2Available: true,
    reasons: [],
  })),
}));
jest.mock('sharp', () => () => ({
  png: () => ({
    toFile: jest.fn(async () => {}),
  }),
}));

const request = require('supertest');
const app = require('../app');
const {
  generateKidsVideoFromPrompt,
  generateKidsVideoFromHybridPrompt,
  generateKidsVideoFromDiffusersPrompt,
  generateKidsVideoFromFreeSteveLikePrompt,
  generateKidsVideoFromCogVideoXPrompt,
  getKidsVideoProject,
  getKidsVideoGeneratorCapabilities,
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

  test('POST /api/kids-video-hf/jobs creates async render job', async () => {
    generateKidsVideoFromPrompt.mockResolvedValue({
      projectId: 'proj-job-1',
      videoUrl: '/uploads/kids-video-hf/proj-job-1/story-render-123.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-job-1',
        scenes: [{ id: 1, title: 'Scene 1' }],
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/jobs')
      .send({
        prompt: 'Rabbit and tortoise race story',
        sceneCount: 5,
      });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(response.body.jobId).toBeTruthy();
    expect(response.body.status).toBe('queued');
    expect(response.body.pollUrl).toContain(`/api/kids-video-hf/jobs/${response.body.jobId}`);
  });

  test('GET /api/kids-video-hf/jobs/:jobId returns job status', async () => {
    generateKidsVideoFromPrompt.mockResolvedValue({
      projectId: 'proj-job-2',
      videoUrl: '/uploads/kids-video-hf/proj-job-2/story-render-123.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-job-2',
        scenes: [{ id: 1, title: 'Scene 1' }],
      },
    });

    const createResponse = await request(app)
      .post('/api/kids-video-hf/jobs')
      .send({
        prompt: 'A short story',
        sceneCount: 4,
      });
    const jobId = createResponse.body.jobId;
    expect(jobId).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 30));
    const statusResponse = await request(app).get(`/api/kids-video-hf/jobs/${jobId}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.success).toBe(true);
    expect(statusResponse.body.jobId).toBe(jobId);
    expect(['queued', 'processing', 'completed']).toContain(statusResponse.body.status);
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

  test('GET /api/kids-video-hf/capabilities returns capability flags', async () => {
    getKidsVideoGeneratorCapabilities.mockReturnValue({
      pythonAvailable: true,
      ffmpegAvailable: true,
      hybridMotionAvailable: true,
      hybridPhase2Available: false,
      reasons: ['AnimateDiff/OpenPose phase2 script missing'],
    });

    const response = await request(app).get('/api/kids-video-hf/capabilities');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.capabilities.hybridMotionAvailable).toBe(true);
    expect(response.body.capabilities.hybridPhase2Available).toBe(false);
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

  test('POST /api/kids-video-hf/generate uses hybrid engine when requested', async () => {
    generateKidsVideoFromHybridPrompt.mockResolvedValue({
      projectId: 'proj-hybrid-1',
      videoUrl: '/uploads/kids-video-hf/proj-hybrid-1/story-render.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-hybrid-1',
        workflowType: 'kids-video-hybrid-motion-cogvideox',
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'A kid and robot dancing in a school festival',
        engine: 'hybrid_motion_cogvideox',
        strictHybrid: true,
        sceneCount: 5,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.workflowType).toBe('kids-video-hybrid-motion-cogvideox');
    expect(generateKidsVideoFromHybridPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A kid and robot dancing in a school festival',
        strict: true,
        sceneCount: 5,
      })
    );
  });

  test('POST /api/kids-video-hf/generate uses hybrid phase2 engine when requested', async () => {
    generateKidsVideoFromHybridPrompt.mockResolvedValue({
      projectId: 'proj-hybrid-phase2-1',
      videoUrl: '/uploads/kids-video-hf/proj-hybrid-phase2-1/story-render.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-hybrid-phase2-1',
        workflowType: 'kids-video-hybrid-phase2-animatediff-openpose-cogvideox',
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'A dancing peacock and rabbit on a moonlit stage',
        engine: 'hybrid_phase2',
        strictHybrid: true,
        sceneCount: 5,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.workflowType).toBe('kids-video-hybrid-phase2-animatediff-openpose-cogvideox');
    expect(generateKidsVideoFromHybridPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A dancing peacock and rabbit on a moonlit stage',
        strict: true,
        phase2: true,
        sceneCount: 5,
      })
    );
  });

  test('POST /api/kids-video-hf/generate prefers structured renderer when scenes are provided', async () => {
    generateKidsVideoFromPrompt.mockResolvedValue({
      projectId: 'proj-structured-1',
      videoUrl: '/uploads/kids-video-hf/proj-structured-1/story-render.mp4',
      aiImagesEnabled: false,
      project: {
        projectId: 'proj-structured-1',
        characters: [{ name: 'Lion' }, { name: 'Cat' }],
        scenes: [{ id: 1, title: 'Forest', description: 'Lion and Cat in forest', dialogue: 'Lion: hi' }],
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'lion and cat story',
        engine: 'cogvideox',
        storyTitle: 'Lion Cat Story',
        characters: [{ name: 'Lion' }, { name: 'Cat' }],
        scenes: [{ id: 1, title: 'Forest', description: 'Lion and Cat in forest', dialogue: 'Lion: hi' }],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(generateKidsVideoFromPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        storyTitle: 'Lion Cat Story',
        providedCharacters: expect.arrayContaining([expect.objectContaining({ name: 'Lion' })]),
        providedScenes: expect.arrayContaining([expect.objectContaining({ title: 'Forest' })]),
      })
    );
    expect(generateKidsVideoFromCogVideoXPrompt).not.toHaveBeenCalled();
  });

  test('POST /api/kids-video-hf/generate maps languageId aliases to language code', async () => {
    generateKidsVideoFromPrompt.mockResolvedValue({
      projectId: 'proj-lang-1',
      videoUrl: '/uploads/kids-video-hf/proj-lang-1/story-render.mp4',
      aiImagesEnabled: false,
      project: {
        projectId: 'proj-lang-1',
        scenes: [{ id: 1, title: 'Scene 1' }],
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'A short kids story in Malayalam',
        languageId: 'malayalam',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(generateKidsVideoFromPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'ml',
      })
    );
  });

  test('POST /api/kids-video-hf/generate forwards storyTitle to prompt renderer', async () => {
    generateKidsVideoFromPrompt.mockResolvedValue({
      projectId: 'proj-title-1',
      videoUrl: '/uploads/kids-video-hf/proj-title-1/story-render.mp4',
      aiImagesEnabled: false,
      project: {
        projectId: 'proj-title-1',
        scenes: [{ id: 1, title: 'Scene 1' }],
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'A short kids story',
        storyTitle: 'The Brave Little Elephant',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(generateKidsVideoFromPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        storyTitle: 'The Brave Little Elephant',
      })
    );
  });

  test('POST /api/kids-video-hf/generate accepts character face uploads and maps them into provided characters', async () => {
    generateKidsVideoFromPrompt.mockResolvedValue({
      projectId: 'proj-upload-1',
      videoUrl: '/uploads/kids-video-hf/proj-upload-1/story-render.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-upload-1',
        scenes: [{ id: 1, title: 'Scene 1' }],
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .field('prompt', 'A brave kid explores a forest')
      .field('storyTitle', 'Forest Quest')
      .field(
        'characters',
        JSON.stringify([
          { name: 'Ari', role: 'Hero', appearance: 'curly hair, blue shirt' },
        ])
      )
      .attach('characterImages', Buffer.from('fake-image-content'), {
        filename: 'ari-face.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.uploadedCharacterImages?.length).toBe(1);
    expect(generateKidsVideoFromPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        providedCharacters: expect.arrayContaining([
          expect.objectContaining({
            name: 'Ari',
            appearance: expect.stringContaining('Match uploaded face reference image'),
          }),
        ]),
      })
    );
  });

  test('POST /api/kids-video-hf/generate honors forced cogvideox even with structured scenes', async () => {
    generateKidsVideoFromCogVideoXPrompt.mockResolvedValue({
      projectId: 'proj-cog-forced-1',
      videoUrl: '/uploads/kids-video-hf/proj-cog-forced-1/story-render.mp4',
      aiImagesEnabled: true,
      project: {
        projectId: 'proj-cog-forced-1',
        workflowType: 'kids-video-cogvideox-text-to-video',
      },
    });

    const response = await request(app)
      .post('/api/kids-video-hf/generate')
      .send({
        prompt: 'lion and cat story',
        enhancedPrompt: 'ENHANCED lion cat storyboard prompt',
        engine: 'cogvideox',
        strictCogVideoX: true,
        forceEngine: true,
        scenes: [{ id: 1, title: 'Forest' }],
        characters: [{ name: 'Lion' }, { name: 'Cat' }],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(generateKidsVideoFromCogVideoXPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'ENHANCED lion cat storyboard prompt',
        strict: true,
      })
    );
    expect(generateKidsVideoFromPrompt).not.toHaveBeenCalled();
  });
});
