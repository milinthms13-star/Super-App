const { sanitizeText } = require('../utils/helpers');

/**
 * Cartoon Character Generator Service
 * Creates consistent character designs for story videos using free APIs
 */

// Character appearance templates
const APPEARANCE_TEMPLATES = {
  hero: [
    'brave young child with bright eyes, colorful adventure outfit, confident expression',
    'curious explorer with backpack, friendly smile, determined look',
    'clever problem-solver with creative outfit, thoughtful expression',
  ],
  friend: [
    'supportive companion with warm smile, casual colorful clothes, kind eyes',
    'loyal helper with gentle expression, comfortable outfit, caring demeanor',
    'encouraging sidekick with playful look, friendly attire, cheerful face',
  ],
  animal: [
    'cute friendly animal character with expressive eyes, cartoon style',
    'adorable creature with big eyes, soft fur, happy expression',
    'charming animal friend with personality, bright colors, animated look',
  ],
  wise: [
    'wise elder with gentle smile, traditional clothing, warm expression',
    'knowledgeable guide with kind eyes, simple robes, peaceful demeanor',
    'experienced mentor with understanding look, aged but vibrant',
  ],
};

// Color palettes for different character types
const COLOR_PALETTES = {
  hero: ['#FF6B9D', '#FFD93D', '#6BCF7F', '#4ECDC4'],
  friend: ['#95E1D3', '#F38181', '#FCEA8B', '#AA96DA'],
  animal: ['#FFB6B9', '#FEC8D8', '#FFDEE2', '#8ECAE6'],
  wise: ['#D4A373', '#BC9B6A', '#A8926C', '#8B7355'],
};

/**
 * Determine character type from name and role
 */
function determineCharacterType(name, role) {
  const nameLower = sanitizeText(name).toLowerCase();
  const roleLower = sanitizeText(role).toLowerCase();
  
  // Check for animal names
  const animalKeywords = ['rabbit', 'turtle', 'fox', 'bear', 'bird', 'cat', 'dog', 'lion'];
  if (animalKeywords.some(animal => nameLower.includes(animal))) {
    return 'animal';
  }
  
  // Check for wise characters
  const wiseKeywords = ['elder', 'wise', 'teacher', 'mentor', 'grandfather', 'grandmother', 'sage'];
  if (wiseKeywords.some(keyword => roleLower.includes(keyword))) {
    return 'wise';
  }
  
  // Check for companion/friend roles
  const friendKeywords = ['friend', 'companion', 'helper', 'sidekick', 'guide'];
  if (friendKeywords.some(keyword => roleLower.includes(keyword))) {
    return 'friend';
  }
  
  // Default to hero
  return 'hero';
}

/**
 * Generate character appearance description
 */
function generateCharacterAppearance(character, index = 0) {
  const type = determineCharacterType(character.name, character.role);
  const templates = APPEARANCE_TEMPLATES[type] || APPEARANCE_TEMPLATES.hero;
  const template = templates[index % templates.length];
  
  const customAppearance = sanitizeText(character.appearance || '');
  if (customAppearance) {
    return `${customAppearance}, ${template}`;
  }
  
  return template;
}

/**
 * Generate character color palette
 */
function generateColorPalette(character) {
  const type = determineCharacterType(character.name, character.role);
  return COLOR_PALETTES[type] || COLOR_PALETTES.hero;
}

/**
 * Build image prompt for character design
 */
function buildCharacterPrompt(character, style = 'cartoon') {
  const name = sanitizeText(character.name);
  const appearance = generateCharacterAppearance(character);
  const type = determineCharacterType(character.name, character.role);
  
  const basePrompt = `character design sheet, ${style} style for children's animation`;
  const detailPrompt = `${name} character, ${appearance}`;
  const stylePrompt = 'full body view, expressive face, bright colors, child-friendly, clean lines, no text, white background';
  
  return {
    full: `${basePrompt}, ${detailPrompt}, ${stylePrompt}`,
    compact: `kids ${style} character ${name} ${type} ${appearance} full-body colorful no-text`,
    type,
  };
}

/**
 * Build scene-specific character prompt
 */
function buildSceneCharacterPrompt(character, scene, style = 'cartoon') {
  const name = sanitizeText(character.name);
  const appearance = generateCharacterAppearance(character);
  const emotion = sanitizeText(scene.emotion || 'happy');
  const sceneDesc = sanitizeText(scene.description || '').slice(0, 80);
  
  const prompt = `${style} style children's book illustration, ${name} character (${appearance}) with ${emotion} expression, ${sceneDesc}, colorful, child-safe, expressive face, no text`;
  
  return {
    full: prompt,
    compact: `kids ${style} ${name} ${emotion} ${sceneDesc} colorful no-text`,
  };
}

/**
 * Generate consistent character reference
 */
function generateCharacterReference(character, index = 0, options = {}) {
  const {
    style = 'cartoon',
    voiceType = 'kid-female',
  } = options;
  
  const name = sanitizeText(character.name || `Character ${index + 1}`);
  const role = sanitizeText(character.role || 'Character');
  const appearance = generateCharacterAppearance(character, index);
  const colorPalette = generateColorPalette(character);
  const type = determineCharacterType(name, role);
  const prompt = buildCharacterPrompt({ name, role, appearance }, style);
  
  return {
    id: `char-${sanitizeText(name).toLowerCase().replace(/\s+/g, '-')}`,
    name,
    role,
    type,
    appearance,
    colorPalette,
    voiceProfile: character.voiceProfile || voiceType,
    emotionStyle: type === 'wise' ? 'calm' : type === 'friend' ? 'supportive' : 'energetic',
    imagePrompt: prompt.full,
    compactPrompt: prompt.compact,
    locked: true,
  };
}

/**
 * Ensure character consistency across scenes
 */
function ensureCharacterConsistency(characters, scenes) {
  const characterMap = new Map();
  
  // Create reference for each character
  characters.forEach((char, index) => {
    const ref = generateCharacterReference(char, index);
    characterMap.set(char.name.toLowerCase(), ref);
  });
  
  // Apply consistent references to scenes
  return scenes.map(scene => {
    const sceneCharacters = (scene.characters || []).map(char => {
      const name = sanitizeText(char.name).toLowerCase();
      const ref = characterMap.get(name);
      
      if (ref) {
        return {
          ...char,
          ...ref,
          appearance: ref.appearance,
          colorPalette: ref.colorPalette,
        };
      }
      
      return char;
    });
    
    return {
      ...scene,
      characters: sceneCharacters,
    };
  });
}

/**
 * Build character consistency prompt for image generation
 */
function buildConsistencyPrompt(characterRef) {
  const features = [
    `${characterRef.name} has consistent appearance`,
    characterRef.appearance,
    `color scheme: ${characterRef.colorPalette.join(', ')}`,
    'same face and outfit in every scene',
    'maintain character identity',
  ];
  
  return features.join(', ');
}

/**
 * Generate character poses for animation
 */
function generateCharacterPoses(character) {
  const poses = [
    { name: 'standing', description: 'standing neutral pose, front view' },
    { name: 'talking', description: 'talking animation pose, mouth open' },
    { name: 'happy', description: 'happy expression, arms raised' },
    { name: 'thinking', description: 'thinking pose, hand on chin' },
    { name: 'walking', description: 'walking pose, mid-step' },
  ];
  
  return poses.map(pose => ({
    ...pose,
    prompt: `${character.appearance}, ${pose.description}, cartoon style, full body, white background`,
  }));
}

/**
 * Validate character for rendering
 */
function validateCharacter(character) {
  const errors = [];
  
  if (!character.name || sanitizeText(character.name).length < 2) {
    errors.push('Character name is required and must be at least 2 characters');
  }
  
  if (!character.role) {
    errors.push('Character role is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  generateCharacterReference,
  generateCharacterAppearance,
  generateColorPalette,
  buildCharacterPrompt,
  buildSceneCharacterPrompt,
  ensureCharacterConsistency,
  buildConsistencyPrompt,
  generateCharacterPoses,
  validateCharacter,
  determineCharacterType,
};
