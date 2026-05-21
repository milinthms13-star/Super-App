const {
  buildKidsRenderMatrix,
  STORY_PROMPTS,
  LANGUAGE_SET,
  ENGINE_SET,
} = require('./kidsVideoRenderQa');

describe('kidsVideoRenderQa', () => {
  it('builds 10 stories x 3 languages x 3 engines matrix', () => {
    const matrix = buildKidsRenderMatrix();
    expect(matrix.length).toBe(STORY_PROMPTS.length * LANGUAGE_SET.length * ENGINE_SET.length);
    expect(matrix[0]).toEqual(
      expect.objectContaining({
        prompt: expect.any(String),
        language: expect.any(String),
        engine: expect.any(String),
      })
    );
  });
});
