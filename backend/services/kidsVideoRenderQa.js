const fs = require('fs');

const STORY_PROMPTS = [
  'A rabbit and tortoise learn patience and teamwork.',
  'Two siblings help a lost star return to the sky.',
  'A friendly robot teaches recycling in school.',
  'A village festival story about kindness and sharing.',
  'A curious child explores a magical forest trail.',
  'A lion and cat solve a puzzle near a river.',
  'A space mission where friends cooperate bravely.',
  'A bedtime story about honesty and gratitude.',
  'A science fair adventure with safe experiments.',
  'A mythology-inspired story about courage and dharma.',
];

const LANGUAGE_SET = ['en', 'hi', 'ml'];
const ENGINE_SET = ['hybrid_phase2', 'hybrid_motion_cogvideox', 'scene_script_video'];

const buildKidsRenderMatrix = () => {
  const matrix = [];
  for (const prompt of STORY_PROMPTS) {
    for (const language of LANGUAGE_SET) {
      for (const engine of ENGINE_SET) {
        matrix.push({
          prompt,
          language,
          engine,
          sceneCount: 5,
          videoSize: 'youtube',
          storyMode: 'moral',
        });
      }
    }
  }
  return matrix;
};

const validateKidsRenderOutput = (project = {}) => {
  const errors = [];
  const outputFile = String(project?.outputFile || '').trim();
  const sceneRenderMeta = Array.isArray(project?.sceneRenderMeta) ? project.sceneRenderMeta : [];

  if (!outputFile) {
    errors.push('Missing outputFile in project.');
  } else if (!fs.existsSync(outputFile)) {
    errors.push(`Output MP4 does not exist: ${outputFile}`);
  } else {
    const stats = fs.statSync(outputFile);
    if (!stats?.size || stats.size < 2048) {
      errors.push('Output MP4 is too small to be a valid render.');
    }
  }

  if (!sceneRenderMeta.length) {
    errors.push('sceneRenderMeta is empty.');
  }

  for (const scene of sceneRenderMeta) {
    const subtitleStatus = String(scene?.subtitleStatus || '').toLowerCase();
    if (subtitleStatus && subtitleStatus !== 'ok') {
      errors.push(`Subtitle legibility issue in scene ${scene?.sceneId || 'unknown'}: ${subtitleStatus}`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  STORY_PROMPTS,
  LANGUAGE_SET,
  ENGINE_SET,
  buildKidsRenderMatrix,
  validateKidsRenderOutput,
};
