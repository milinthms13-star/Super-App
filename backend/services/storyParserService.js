const { sanitizeText } = require('../utils/helpers');

/**
 * Story Parser Service
 * Extracts structured data from story text: characters, scenes, dialogue, and emotions
 */

const CHARACTER_PATTERNS = [
  /(?:a|an|the)\s+(?:young|old|little|brave|kind|clever|wise)\s+(\w+)/gi,
  /(?:named|called)\s+(\w+)/gi,
  /(\w+)\s+(?:said|asked|replied|shouted|whispered|cried)/gi,
  /(\w+):\s*/g, // Dialogue format
];

const SCENE_INDICATORS = [
  'once upon a time',
  'one day',
  'suddenly',
  'then',
  'meanwhile',
  'after that',
  'finally',
  'in the end',
  'later',
  'the next morning',
];

const EMOTION_KEYWORDS = {
  happy: ['happy', 'joyful', 'delighted', 'cheerful', 'glad', 'excited', 'laughed', 'smiled'],
  sad: ['sad', 'unhappy', 'crying', 'tears', 'sorrowful', 'melancholy'],
  angry: ['angry', 'mad', 'furious', 'upset', 'annoyed'],
  scared: ['scared', 'afraid', 'frightened', 'terrified', 'worried', 'nervous'],
  surprised: ['surprised', 'amazed', 'shocked', 'astonished', 'stunned'],
  brave: ['brave', 'courageous', 'bold', 'fearless', 'determined'],
  curious: ['curious', 'wondering', 'interested', 'questioning'],
};

/**
 * Extract character names from story text
 */
function extractCharacters(storyText) {
  const text = sanitizeText(storyText);
  const characterNames = new Set();
  
  // Try each pattern
  CHARACTER_PATTERNS.forEach(pattern => {
    const matches = text.matchAll(new RegExp(pattern));
    for (const match of matches) {
      const name = sanitizeText(match[1] || '');
      if (name && name.length >= 3 && name.length <= 20) {
        // Capitalize first letter
        characterNames.add(name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
      }
    }
  });

  // Convert to array and limit to top 4 characters
  const characters = Array.from(characterNames).slice(0, 4);
  
  // If no characters found, provide defaults
  if (characters.length === 0) {
    return [
      { name: 'Hero', role: 'Main Character', appearance: 'brave child with colorful clothes' },
      { name: 'Friend', role: 'Companion', appearance: 'friendly helper with warm smile' },
    ];
  }

  // Assign roles
  return characters.map((name, index) => ({
    name,
    role: index === 0 ? 'Hero' : index === 1 ? 'Friend' : `Character ${index + 1}`,
    appearance: `cartoon ${name.toLowerCase()} character with expressive features`,
  }));
}

/**
 * Detect emotion from text segment
 */
function detectEmotion(text) {
  const normalized = sanitizeText(text).toLowerCase();
  let maxScore = 0;
  let detectedEmotion = 'wonder';

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0;
    keywords.forEach(keyword => {
      if (normalized.includes(keyword)) {
        score += 1;
      }
    });
    if (score > maxScore) {
      maxScore = score;
      detectedEmotion = emotion;
    }
  }

  return detectedEmotion;
}

/**
 * Split story into scenes based on narrative structure
 */
function splitIntoScenes(storyText, maxScenes = 6) {
  const text = sanitizeText(storyText);
  
  // Split by sentences first
  const sentences = text.split(/[.!?]+/).map(s => sanitizeText(s)).filter(Boolean);
  
  if (sentences.length === 0) {
    return [];
  }

  // Group sentences into scenes
  const scenes = [];
  let currentScene = [];
  let sceneCount = 0;

  sentences.forEach((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    
    // Check if this sentence starts a new scene
    const startsNewScene = SCENE_INDICATORS.some(indicator => 
      lowerSentence.includes(indicator)
    ) || (currentScene.length >= 3 && sceneCount < maxScenes - 1);

    if (startsNewScene && currentScene.length > 0) {
      scenes.push(currentScene.join('. ') + '.');
      currentScene = [sentence];
      sceneCount++;
    } else {
      currentScene.push(sentence);
    }

    // Last sentence
    if (index === sentences.length - 1 && currentScene.length > 0) {
      scenes.push(currentScene.join('. ') + '.');
    }
  });

  // Ensure we have at least one scene
  if (scenes.length === 0) {
    scenes.push(text);
  }

  // Limit to maxScenes
  return scenes.slice(0, maxScenes);
}

/**
 * Extract dialogue from text
 */
function extractDialogue(text, characters) {
  const lines = text.split('\n').map(l => sanitizeText(l)).filter(Boolean);
  const dialogue = [];
  const characterNames = characters.map(c => c.name.toLowerCase());

  lines.forEach(line => {
    // Check for "Name: dialogue" format
    const directMatch = line.match(/^([A-Z][a-zA-Z]+):\s*(.+)$/);
    if (directMatch) {
      const speaker = sanitizeText(directMatch[1]);
      const text = sanitizeText(directMatch[2]);
      dialogue.push({ speaker, text });
      return;
    }

    // Check for "Name said/asked" format
    const saidMatch = line.match(/([A-Z][a-zA-Z]+)\s+(said|asked|replied|shouted|whispered|cried)[,:]?\s*"([^"]+)"/i);
    if (saidMatch) {
      const speaker = sanitizeText(saidMatch[1]);
      const text = sanitizeText(saidMatch[3]);
      dialogue.push({ speaker, text });
      return;
    }

    // If line contains quotes, attribute to first character
    const quoteMatch = line.match(/"([^"]+)"/);
    if (quoteMatch && characters.length > 0) {
      const text = sanitizeText(quoteMatch[1]);
      dialogue.push({ speaker: characters[0].name, text });
    }
  });

  // If no dialogue found, create from scene description
  if (dialogue.length === 0 && characters.length > 0) {
    const summary = text.slice(0, 150);
    dialogue.push({ speaker: characters[0].name, text: summary });
  }

  return dialogue;
}

/**
 * Parse complete story into structured format
 */
function parseStory(storyText, options = {}) {
  const {
    maxScenes = 6,
    storyTitle = 'Kids Story',
    language = 'english',
    voiceType = 'kid-female',
  } = options;

  const text = sanitizeText(storyText);
  
  if (!text || text.length < 10) {
    throw new Error('Story text is too short to parse.');
  }

  // Extract characters
  const characters = extractCharacters(text);
  
  // Split into scenes
  const sceneTexts = splitIntoScenes(text, maxScenes);
  
  // Build scene objects
  const scenes = sceneTexts.map((sceneText, index) => {
    const emotion = detectEmotion(sceneText);
    const dialogue = extractDialogue(sceneText, characters);
    
    return {
      id: index + 1,
      title: `Scene ${index + 1}`,
      description: sceneText.slice(0, 200),
      dialogue: dialogue.map(d => `${d.speaker}: ${d.text}`).join('\n'),
      emotion,
      characters: characters.slice(0, 2), // Limit to 2 per scene
      cameraActions: 'soft pan',
      durationSeconds: 5,
    };
  });

  // Generate narration
  const narration = `${storyTitle}. ${sceneTexts.join(' ')}`.slice(0, 500);

  return {
    title: storyTitle,
    characters,
    scenes,
    narration,
    language,
    voiceType,
    totalScenes: scenes.length,
    estimatedDuration: scenes.length * 5,
  };
}

/**
 * Generate scene-specific prompts for image generation
 */
function generateScenePrompts(scene, characters, style = 'cartoon') {
  const characterDesc = characters
    .map(c => `${c.name} (${c.appearance})`)
    .join(', ');
  
  const basePrompt = `${style} style illustration for children's story`;
  const sceneDesc = sanitizeText(scene.description).slice(0, 100);
  const emotion = scene.emotion || 'happy';

  return {
    imagePrompt: `${basePrompt}, ${sceneDesc}, showing ${characterDesc}, ${emotion} mood, colorful, child-safe, no text`,
    compactPrompt: `kids ${style} ${sceneDesc} ${characterDesc} ${emotion} colorful no-text`,
    backgroundPrompt: `${style} children's book background, ${emotion} atmosphere, colorful, safe`,
  };
}

/**
 * Format dialogue for voice synthesis
 */
function formatDialogueForTTS(scene, characters) {
  const dialogueLines = scene.dialogue.split('\n').filter(Boolean);
  
  return dialogueLines.map(line => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const speaker = sanitizeText(match[1]);
      const text = sanitizeText(match[2]);
      const character = characters.find(c => 
        c.name.toLowerCase() === speaker.toLowerCase()
      );
      
      return {
        speaker,
        text,
        voiceProfile: character?.voiceProfile || 'kid-female',
      };
    }
    
    // Fallback: assign to first character
    return {
      speaker: characters[0]?.name || 'Narrator',
      text: sanitizeText(line),
      voiceProfile: characters[0]?.voiceProfile || 'kid-female',
    };
  });
}

module.exports = {
  parseStory,
  extractCharacters,
  splitIntoScenes,
  extractDialogue,
  detectEmotion,
  generateScenePrompts,
  formatDialogueForTTS,
};
