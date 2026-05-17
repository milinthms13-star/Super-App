jest.mock('../services/videoStudioService', () => ({
  createStudioProject: jest.fn(),
  createAutopilotProject: jest.fn(),
  getStudioProject: jest.fn(),
  renderVideo: jest.fn(),
  renderCartoonVideo: jest.fn(),
  patchStudioProject: jest.fn(),
  regenerateProjectStage: jest.fn(),
  generateCharacterSheet: jest.fn(),
  generateSceneImage: jest.fn(),
  regenerateProjectScene: jest.fn(),
  regenerateProjectSceneDialogue: jest.fn(),
  animateScene: jest.fn(),
  generateVoice: jest.fn(),
  generateSfx: jest.fn(),
  lipSync: jest.fn(),
  composeFinalVideo: jest.fn(),
  diagnoseImageGeneration: jest.fn(),
}));

const request = require('supertest');
const app = require('../app');
const {
  createStudioProject,
  createAutopilotProject,
} = require('../services/videoStudioService');

describe('Video studio Hugging Face provider wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('passes aiProvider to createStudioProject for full story prompt flow', async () => {
    createStudioProject.mockResolvedValue({
      projectId: 'hf-proj-1',
      title: 'HF Story',
      storyPrompt: 'A full kids story prompt that is definitely longer than forty characters.',
      scenes: [
        { id: 1, title: 'Start', description: 'Kids start journey', dialogue: 'Hello!', durationSeconds: 4 },
      ],
      aiProvider: 'huggingface',
    });

    const response = await request(app)
      .post('/api/video-studio/create')
      .send({
        storyTitle: 'HF Story',
        storyPrompt: 'A full kids story prompt that is definitely longer than forty characters.',
        languageId: 'english',
        styleId: 'cartoon',
        voiceType: 'kid-female',
        videoSizeId: 'youtube',
        storyMode: 'adventure',
        safeMode: true,
        ageFilter: '8-11',
        storySource: 'paste',
        aiProvider: 'huggingface',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(createStudioProject).toHaveBeenCalledWith(
      expect.objectContaining({
        aiProvider: 'huggingface',
      })
    );
  });

  test('passes aiProvider to createAutopilotProject for short subject flow', async () => {
    createAutopilotProject.mockResolvedValue({
      projectId: 'hf-proj-2',
      subject: 'Lost star',
      scenes: [
        { id: 1, title: 'Start', description: 'A star is lost', dialogue: 'Help me!', durationSeconds: 4 },
      ],
      aiProvider: 'huggingface',
    });

    const response = await request(app)
      .post('/api/video-studio/autopilot/create')
      .send({
        subject: 'Lost star',
        languageId: 'english',
        styleId: 'cartoon',
        voiceType: 'kid-female',
        videoSizeId: 'youtube',
        storyMode: 'adventure',
        safeMode: true,
        ageFilter: '8-11',
        sceneCount: 5,
        aiProvider: 'huggingface',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(createAutopilotProject).toHaveBeenCalledWith(
      expect.objectContaining({
        aiProvider: 'huggingface',
      })
    );
  });
});

