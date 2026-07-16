const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const { sanitizeText } = require('../utils/helpers');
const { formatDialogueForTTS } = require('./storyParserService');

const execAsync = promisify(exec);

/**
 * Cartoon Voice Service
 * Generates voice audio for characters using available TTS options
 */

// Voice mapping for different TTS engines
const VOICE_PROFILES = {
  'kid-female': {
    google: 'en-US-Standard-A',
    windows: 'Microsoft Zira Desktop',
    webSpeech: 'Google US English',
  },
  'kid-male': {
    google: 'en-US-Standard-B',
    windows: 'Microsoft David Desktop',
    webSpeech: 'Google UK English Male',
  },
  'soft-female': {
    google: 'en-US-Standard-E',
    windows: 'Microsoft Zira Desktop',
    webSpeech: 'Google US English',
  },
  'warm-male': {
    google: 'en-US-Standard-D',
    windows: 'Microsoft David Desktop',
    webSpeech: 'Google UK English Male',
  },
};

/**
 * Check if Google Cloud TTS is available
 */
async function isGoogleTTSAvailable() {
  try {
    // Check if credentials are set
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credsPath) return false;
    
    // Check if credentials file exists
    await fs.access(credsPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Windows TTS (PowerShell) is available
 */
function isWindowsTTSAvailable() {
  return process.platform === 'win32';
}

/**
 * Generate audio using Google Cloud TTS
 */
async function generateGoogleTTS(text, outputPath, voiceProfile = 'kid-female') {
  const textToSpeech = require('@google-cloud/text-to-speech');
  const client = new textToSpeech.TextToSpeechClient();

  const voiceName = VOICE_PROFILES[voiceProfile]?.google || 'en-US-Standard-A';
  const [languageCode, ...rest] = voiceName.split('-');

  const request = {
    input: { text: sanitizeText(text) },
    voice: {
      languageCode: `${languageCode}-${rest[0]}`,
      name: voiceName,
      ssmlGender: voiceProfile.includes('female') ? 'FEMALE' : 'MALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 2.0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  await fs.writeFile(outputPath, response.audioContent, 'binary');
  return outputPath;
}

/**
 * Generate audio using Windows PowerShell TTS
 */
async function generateWindowsTTS(text, outputPath, voiceProfile = 'kid-female') {
  const voiceName = VOICE_PROFILES[voiceProfile]?.windows || 'Microsoft Zira Desktop';
  const cleanText = sanitizeText(text).replace(/'/g, "''");
  const wavePath = outputPath.replace('.mp3', '.wav');

  // PowerShell script to generate speech
  const psScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $synth.SelectVoice('${voiceName}')
} catch {
  Write-Host "Voice not found, using default"
}
$synth.SetOutputToWaveFile('${wavePath}')
$synth.Speak('${cleanText}')
$synth.Dispose()
`;

  // Execute PowerShell
  const psCommand = `powershell -Command "${psScript.replace(/\n/g, '; ')}"`;
  await execAsync(psCommand);

  // Convert WAV to MP3 using FFmpeg
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  await execAsync(`"${ffmpegPath}" -i "${wavePath}" -codec:a libmp3lame -b:a 128k "${outputPath}"`);

  // Clean up WAV file
  try {
    await fs.unlink(wavePath);
  } catch {}

  return outputPath;
}

/**
 * Generate simple tone audio as fallback
 */
async function generateFallbackAudio(text, outputPath, duration = 3) {
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  
  // Generate a simple tone based on text length
  const textLength = sanitizeText(text).length;
  const frequency = 300 + (textLength % 200);
  
  const command = `"${ffmpegPath}" -f lavfi -i "sine=frequency=${frequency}:duration=${duration}" -codec:a libmp3lame -b:a 96k "${outputPath}"`;
  await execAsync(command);
  
  return outputPath;
}

/**
 * Generate voice audio for a single dialogue line
 */
async function generateDialogueAudio(dialogueLine, outputPath, options = {}) {
  const {
    voiceProfile = 'kid-female',
    preferredEngine = 'auto',
  } = options;

  const text = sanitizeText(dialogueLine.text);
  if (!text) {
    throw new Error('Dialogue text is empty');
  }

  // Determine which TTS engine to use
  let engine = preferredEngine;
  
  if (engine === 'auto') {
    if (await isGoogleTTSAvailable()) {
      engine = 'google';
    } else if (isWindowsTTSAvailable()) {
      engine = 'windows';
    } else {
      engine = 'fallback';
    }
  }

  console.log(`Generating audio for "${text.slice(0, 50)}..." using ${engine}`);

  try {
    switch (engine) {
      case 'google':
        return await generateGoogleTTS(text, outputPath, voiceProfile);
      
      case 'windows':
        return await generateWindowsTTS(text, outputPath, voiceProfile);
      
      case 'fallback':
      default:
        const duration = Math.min(10, Math.max(2, text.length / 20));
        return await generateFallbackAudio(text, outputPath, duration);
    }
  } catch (error) {
    console.error(`TTS generation failed with ${engine}:`, error.message);
    
    // Try fallback if primary method fails
    if (engine !== 'fallback') {
      console.log('Attempting fallback audio generation...');
      const duration = Math.min(10, Math.max(2, text.length / 20));
      return await generateFallbackAudio(text, outputPath, duration);
    }
    
    throw error;
  }
}

/**
 * Generate audio for all dialogue in a scene
 */
async function generateSceneDialogueAudio(scene, characters, outputDir, options = {}) {
  const dialogueLines = formatDialogueForTTS(scene, characters);
  const audioFiles = [];

  for (let i = 0; i < dialogueLines.length; i++) {
    const line = dialogueLines[i];
    const fileName = `scene-${scene.id}-dialogue-${i + 1}.mp3`;
    const outputPath = path.join(outputDir, fileName);

    try {
      await generateDialogueAudio(line, outputPath, {
        voiceProfile: line.voiceProfile,
        ...options,
      });

      audioFiles.push({
        index: i,
        speaker: line.speaker,
        text: line.text,
        filePath: outputPath,
        fileName,
        success: true,
      });

      console.log(`✓ Generated audio for ${line.speaker}: "${line.text.slice(0, 30)}..."`);
    } catch (error) {
      console.error(`✗ Failed to generate audio for line ${i + 1}:`, error.message);
      
      audioFiles.push({
        index: i,
        speaker: line.speaker,
        text: line.text,
        success: false,
        error: error.message,
      });
    }
  }

  return audioFiles;
}

/**
 * Generate audio for all scenes
 */
async function generateAllSceneAudio(scenes, characters, outputDir, options = {}) {
  const results = [];

  for (const scene of scenes) {
    console.log(`\nGenerating audio for Scene ${scene.id}: ${scene.title}`);
    
    try {
      const audioFiles = await generateSceneDialogueAudio(scene, characters, outputDir, options);
      
      results.push({
        sceneId: scene.id,
        title: scene.title,
        audioFiles,
        success: true,
      });
    } catch (error) {
      console.error(`Failed to generate audio for Scene ${scene.id}:`, error.message);
      
      results.push({
        sceneId: scene.id,
        title: scene.title,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Merge multiple audio files into one
 */
async function mergeAudioFiles(audioFiles, outputPath) {
  if (!audioFiles || audioFiles.length === 0) {
    throw new Error('No audio files to merge');
  }

  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  
  if (audioFiles.length === 1) {
    // Just copy the file
    await fs.copyFile(audioFiles[0], outputPath);
    return outputPath;
  }

  // Create concat file
  const concatListPath = outputPath.replace('.mp3', '-list.txt');
  const concatContent = audioFiles
    .map(file => `file '${file.replace(/\\/g, '/')}'`)
    .join('\n');
  
  await fs.writeFile(concatListPath, concatContent, 'utf-8');

  // Merge using FFmpeg
  const command = `"${ffmpegPath}" -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}"`;
  await execAsync(command);

  // Clean up concat list
  try {
    await fs.unlink(concatListPath);
  } catch {}

  return outputPath;
}

/**
 * Create narration audio for entire story
 */
async function generateNarrationAudio(narrationText, outputPath, options = {}) {
  const {
    voiceProfile = 'soft-female',
    preferredEngine = 'auto',
  } = options;

  return await generateDialogueAudio(
    { text: narrationText, speaker: 'Narrator' },
    outputPath,
    { voiceProfile, preferredEngine }
  );
}

/**
 * Get available TTS engines on this system
 */
async function getAvailableTTSEngines() {
  const engines = [];

  if (await isGoogleTTSAvailable()) {
    engines.push({
      name: 'google',
      label: 'Google Cloud TTS',
      quality: 'high',
      free: false,
    });
  }

  if (isWindowsTTSAvailable()) {
    engines.push({
      name: 'windows',
      label: 'Windows Speech Synthesis',
      quality: 'medium',
      free: true,
    });
  }

  engines.push({
    name: 'fallback',
    label: 'Tone Generator (Fallback)',
    quality: 'low',
    free: true,
  });

  return engines;
}

module.exports = {
  generateDialogueAudio,
  generateSceneDialogueAudio,
  generateAllSceneAudio,
  generateNarrationAudio,
  mergeAudioFiles,
  getAvailableTTSEngines,
  isGoogleTTSAvailable,
  isWindowsTTSAvailable,
};
