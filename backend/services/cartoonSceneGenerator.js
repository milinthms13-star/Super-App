const fetch = require('node-fetch');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { sanitizeText } = require('../utils/helpers');
const { buildSceneCharacterPrompt, buildConsistencyPrompt } = require('./cartoonCharacterService');
const { generateScenePrompts } = require('./storyParserService');

/**
 * Cartoon Scene Generator Service
 * Generates scene images with characters using free APIs (Pollinations/HuggingFace)
 */

// API Configuration
const POLLINATIONS_BASE_URL = process.env.POLLINATIONS_API_BASE_URL || 'https://image.pollinations.ai/prompt';
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY || '';

const HUGGINGFACE_API_BASE = process.env.HUGGINGFACE_API_BASE_URL || 'https://api-inference.huggingface.co/models';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';

// Image generation settings
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const TIMEOUT_MS = 30000;

/**
 * Generate image using Pollinations AI (Free, no API key required)
 */
async function generateImagePollinations(prompt, options = {}) {
  const {
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    seed = Math.floor(Math.random() * 1000000),
    nologo = true,
    enhance = true,
  } = options;

  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) {
    throw new Error('Prompt is required for image generation');
  }

  // Build URL with parameters
  const encodedPrompt = encodeURIComponent(cleanPrompt);
  const params = new URLSearchParams({
    width: width.toString(),
    height: height.toString(),
    seed: seed.toString(),
    nologo: nologo.toString(),
    enhance: enhance.toString(),
  });

  const url = `${POLLINATIONS_BASE_URL}/${encodedPrompt}?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Pollinations API error: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();
    return buffer;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate image using HuggingFace Inference API
 */
async function generateImageHuggingFace(prompt, options = {}) {
  const {
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    model = HUGGINGFACE_MODEL,
  } = options;

  if (!HUGGINGFACE_API_KEY) {
    throw new Error('HuggingFace API key is required. Set HUGGINGFACE_API_KEY environment variable.');
  }

  const cleanPrompt = sanitizeText(prompt);
  const url = `${HUGGINGFACE_API_BASE}/${model}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: cleanPrompt,
        parameters: {
          width,
          height,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
    }

    const buffer = await response.buffer();
    return buffer;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate scene image with character(s)
 */
async function generateSceneImage(scene, characters, options = {}) {
  const {
    style = 'cartoon',
    provider = 'pollinations',
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    seed,
  } = options;

  // Build comprehensive prompt
  const scenePrompts = generateScenePrompts(scene, characters, style);
  const characterPrompts = scene.characters
    .map(char => {
      const charRef = characters.find(c => c.name === char.name);
      if (charRef) {
        return buildConsistencyPrompt(charRef);
      }
      return char.appearance || `${char.name} character`;
    })
    .join(', ');

  const fullPrompt = `${scenePrompts.imagePrompt}, characters: ${characterPrompts}, high quality children's illustration, vibrant colors, clear details`;

  // Try primary provider first
  try {
    if (provider === 'pollinations') {
      const buffer = await generateImagePollinations(fullPrompt, { width, height, seed });
      return buffer;
    } else if (provider === 'huggingface') {
      const buffer = await generateImageHuggingFace(fullPrompt, { width, height });
      return buffer;
    }
  } catch (error) {
    console.warn(`Primary provider ${provider} failed:`, error.message);
    
    // Fallback to alternate provider
    const fallbackProvider = provider === 'pollinations' ? 'huggingface' : 'pollinations';
    console.log(`Attempting fallback to ${fallbackProvider}...`);
    
    try {
      if (fallbackProvider === 'pollinations') {
        return await generateImagePollinations(fullPrompt, { width, height, seed });
      } else {
        return await generateImageHuggingFace(fullPrompt, { width, height });
      }
    } catch (fallbackError) {
      console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError.message);
      throw new Error(`Image generation failed with both providers: ${error.message}, ${fallbackError.message}`);
    }
  }
}

/**
 * Generate fallback scene image (simple SVG when APIs fail)
 */
async function generateFallbackSceneImage(scene, characters, options = {}) {
  const { width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT } = options;
  
  const backgroundColor = scene.emotion === 'happy' ? '#FFF9E6' : 
                          scene.emotion === 'sad' ? '#E6F3FF' : 
                          scene.emotion === 'brave' ? '#FFE6E6' : '#F0F0FF';
  
  const title = sanitizeText(scene.title || 'Scene');
  const description = sanitizeText(scene.description || '').slice(0, 150);
  const characterNames = scene.characters.map(c => c.name).join(', ');

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  
  <!-- Content card -->
  <rect x="40" y="40" width="${width - 80}" height="${height - 80}" 
        fill="white" rx="20" opacity="0.95"/>
  
  <!-- Title -->
  <text x="${width / 2}" y="100" 
        font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
        fill="#2C3E50" text-anchor="middle">${title}</text>
  
  <!-- Characters -->
  <text x="${width / 2}" y="160" 
        font-family="Arial, sans-serif" font-size="24" 
        fill="#7F8C8D" text-anchor="middle">Characters: ${characterNames}</text>
  
  <!-- Description -->
  <foreignObject x="80" y="200" width="${width - 160}" height="${height - 280}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; font-size: 20px; color: #34495E; line-height: 1.6;">
      ${description}
    </div>
  </foreignObject>
  
  <!-- Character avatars (simple circles) -->
  ${scene.characters.map((char, i) => {
    const x = 120 + (i * 180);
    const y = height - 140;
    const colors = ['#FF6B9D', '#4ECDC4', '#FFD93D', '#95E1D3'];
    const color = colors[i % colors.length];
    const initial = char.name.charAt(0).toUpperCase();
    
    return `
      <circle cx="${x}" cy="${y}" r="50" fill="${color}" opacity="0.8"/>
      <text x="${x}" y="${y + 15}" font-family="Arial" font-size="36" 
            font-weight="bold" fill="white" text-anchor="middle">${initial}</text>
    `;
  }).join('')}
</svg>`;

  return Buffer.from(svg);
}

/**
 * Generate all scene images for a story
 */
async function generateAllSceneImages(scenes, characters, options = {}) {
  const {
    outputDir,
    style = 'cartoon',
    provider = 'pollinations',
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    useFallback = false,
  } = options;

  const results = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneNumber = i + 1;
    
    console.log(`Generating scene ${sceneNumber}/${scenes.length}: ${scene.title}`);

    try {
      let imageBuffer;
      
      if (useFallback) {
        imageBuffer = await generateFallbackSceneImage(scene, characters, { width, height });
      } else {
        imageBuffer = await generateSceneImage(scene, characters, {
          style,
          provider,
          width,
          height,
          seed: Date.now() + i,
        });
      }

      // Save image
      const fileName = `scene-${String(sceneNumber).padStart(2, '0')}.png`;
      const filePath = path.join(outputDir, fileName);
      
      // Process with sharp for consistent format
      await sharp(imageBuffer)
        .resize(width, height, { fit: 'cover' })
        .png()
        .toFile(filePath);

      results.push({
        sceneId: scene.id,
        sceneNumber,
        title: scene.title,
        filePath,
        fileName,
        success: true,
      });

      console.log(`✓ Scene ${sceneNumber} generated successfully`);

    } catch (error) {
      console.error(`✗ Scene ${sceneNumber} generation failed:`, error.message);
      
      // Generate fallback for failed scene
      try {
        const fallbackBuffer = await generateFallbackSceneImage(scene, characters, { width, height });
        const fileName = `scene-${String(sceneNumber).padStart(2, '0')}.png`;
        const filePath = path.join(outputDir, fileName);
        
        await sharp(fallbackBuffer)
          .resize(width, height, { fit: 'cover' })
          .png()
          .toFile(filePath);

        results.push({
          sceneId: scene.id,
          sceneNumber,
          title: scene.title,
          filePath,
          fileName,
          success: true,
          fallback: true,
        });

        console.log(`✓ Scene ${sceneNumber} fallback generated`);
      } catch (fallbackError) {
        results.push({
          sceneId: scene.id,
          sceneNumber,
          title: scene.title,
          success: false,
          error: fallbackError.message,
        });
      }
    }

    // Small delay between requests to avoid rate limiting
    if (i < scenes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Test image generation with a simple prompt
 */
async function testImageGeneration(provider = 'pollinations') {
  const testPrompt = 'cute cartoon rabbit character, colorful, children\'s book style, white background';
  
  console.log(`Testing ${provider} image generation...`);
  
  try {
    if (provider === 'pollinations') {
      const buffer = await generateImagePollinations(testPrompt, {
        width: 512,
        height: 512,
      });
      return { success: true, size: buffer.length, provider: 'pollinations' };
    } else {
      const buffer = await generateImageHuggingFace(testPrompt, {
        width: 512,
        height: 512,
      });
      return { success: true, size: buffer.length, provider: 'huggingface' };
    }
  } catch (error) {
    return { success: false, error: error.message, provider };
  }
}

module.exports = {
  generateSceneImage,
  generateFallbackSceneImage,
  generateAllSceneImages,
  generateImagePollinations,
  generateImageHuggingFace,
  testImageGeneration,
};
