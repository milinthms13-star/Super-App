jest.mock('../services/videoStudioService', () => ({
  safeGoogleAI: jest.fn(async (messages) => {
    const systemMessage = messages.find((message) => message.role === 'system')?.content || '';
    const userMessage = messages.find((message) => message.role === 'user')?.content || '';
    const languageMatch = systemMessage.match(/into ([^\s]+) exactly/);
    const languageName = languageMatch ? languageMatch[1] : 'target language';
    return `${userMessage} [translated to ${languageName}]`;
  }),
}));

const {
  localizeStoryForLanguage,
  translateTextToLanguage,
} = require('./kidsVideoGeneratorHFService');

describe('kidsVideoGeneratorHFService localization', () => {
  it('translates story fields for a non-English target language', async () => {
    const story = {
      title: 'The Rabbit and the Tortoise',
      synopsis: 'A speedy rabbit laughs at a calm tortoise.',
      moral: 'Slow and steady wins the race.',
      scenes: [
        {
          id: 1,
          title: 'Opening',
          description: 'Rabbit boasts about speed.',
          dialogue: 'Rabbit: I am the fastest.\nTortoise: I will keep trying.',
        },
      ],
    };

    const localized = await localizeStoryForLanguage(story, 'hi');

    expect(localized.title).toContain('[translated to Hindi]');
    expect(localized.synopsis).toContain('[translated to Hindi]');
    expect(localized.moral).toContain('[translated to Hindi]');
    expect(localized.scenes[0].title).toContain('[translated to Hindi]');
    expect(localized.scenes[0].description).toContain('[translated to Hindi]');
    expect(localized.scenes[0].dialogue).toContain('[translated to Hindi]');
  });

  it('does not translate when target language is English', async () => {
    const story = {
      title: 'The Rabbit and the Tortoise',
      synopsis: 'A speedy rabbit laughs at a calm tortoise.',
      moral: 'Slow and steady wins the race.',
      scenes: [
        {
          id: 1,
          title: 'Opening',
          description: 'Rabbit boasts about speed.',
          dialogue: 'Rabbit: I am the fastest.\nTortoise: I will keep trying.',
        },
      ],
    };

    const localized = await localizeStoryForLanguage(story, 'en');

    expect(localized.title).toBe(story.title);
    expect(localized.synopsis).toBe(story.synopsis);
    expect(localized.moral).toBe(story.moral);
    expect(localized.scenes[0].title).toBe(story.scenes[0].title);
    expect(localized.scenes[0].description).toBe(story.scenes[0].description);
    expect(localized.scenes[0].dialogue).toBe(story.scenes[0].dialogue);
  });
});
