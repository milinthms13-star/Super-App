const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const { sanitizeText, safeFileName } = require('../utils/helpers');
const { parseStory } = require('./storyParserService');
const { generateCharacterReference, ensureCharacterConsistency } = require('./cartoonCharacterService');
const { generateAllSceneImages } = require('./cartoonSceneGenerator');
const { generateAllSceneAudio } = require('./cartoonVoiceService');

const execAsync = promisify(exec);

/**
 * Cartoon Video Composer Service
 * Orchestrates the complete story-to-video pipeline
 */

const DEFAULT_FPS = 24;
const DEFAULT_TRANSITION_DURATION = 0.5;

/**
 * Create subtitle file (SRT format)
 */
async function createSubtitleFile(scenes, outputPath) {
  let currentTime = 0;
  const subtitles = [];

  scenes.forEach((scene, index) => {
    const duration = scene.durationSeconds || 5;
    const startTime = currentTime;
    const endTime = currentTime + duration;

    // Format time as SRT format (HH:MM:SS,mmm)
    const formatTime = (seconds) => {
      const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const s = Math.floor(seconds % 60).toString().padStart(2, '0');
      const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
      return `${h}:${m}:${s},${ms}`;
    };

    const subtitle = [
      index + 1,
      `${formatTime(startTime)} --> ${formatTime(endTime)}`,
      sanitizeText(scene.description || scene.title),
      '',
    ].join('\n');

    subtitles.push(subtitle);
    currentTime = endTime;
  });

  await fs.writeFile(outputPath, subtitles.join('\n'), 'utf-8');
  return outputPath;
}

/**
 * Create FFmpeg concat file
 */
async function createConcatFile(sceneResults, outputPath) {
  const lines = sceneResults
    .filter(r => r.success)
    .map(r => {
      const duration = 5; // Default duration
      return `file '${r.fileName}'\nduration ${duration}`;
    });

  // Add last image again (FFmpeg concat requirement)
  const lastScene = sceneResults.filter(r => r.success).pop();
  if (lastScene) {
    lines.push(`file '${lastScene.fileName}'`);
  }

  await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
  return outputPath;
}

/**
 * Combine scene images into video with transitions
 */
async function createVideoFromScenes(sceneResults, outputPath, options = {}) {
  const {
    fps = DEFAULT_FPS,
    transitionDuration = DEFAULT_TRANSITION_DURATION,
    width = 1280,
    height = 720,
  } = options;

  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  const workingDir = path.dirname(outputPath);
  const concatFile = path.join(workingDir, 'concat-list.txt');

  await createConcatFile(sceneResults, concatFile);

  // Create video from images with crossfade transitions
  const command = [
    `"${ffmpegPath}"`,
    '-f concat',
    '-safe 0',
    `-i "${concatFile}"`,
    `-vf "fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2"`,
    '-c:v libx264',
    '-pix_fmt yuv420p',
    '-preset medium',
    '-crf 23',
    `"${outputPath}"`,
  ].join(' ');

  console.log('Creating video from scenes...');
  await execAsync(command, { cwd: workingDir });

  // Clean up concat file
  try {
    await fs.unlink(concatFile);
  } catch {}

  return outputPath;
}

/**
 * Add audio to video
 */
async function addAudioToVideo(videoPath, audioPath, outputPath, options = {}) {
  const {
    audioVolume = 1.0,
    fadeIn = 0.5,
    fadeOut = 0.5,
  } = options;

  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

  const command = [
    `"${ffmpegPath}"`,
    `-i "${videoPath}"`,
    `-i "${audioPath}"`,
    '-c:v copy',
    '-c:a aac',
    '-b:a 192k',
    `-af "afade=t=in:st=0:d=${fadeIn},afade=t=out:st=0:d=${fadeOut},volume=${audioVolume}"`,
    '-shortest',
    `"${outputPath}"`,
  ].join(' ');

  console.log('Adding audio to video...');
  await execAsync(command);

  return outputPath;
}

/**
 * Add subtitles to video
 */
async function addSubtitlesToVideo(videoPath, subtitlePath, outputPath) {
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

  const command = [
    `"${ffmpegPath}"`,
    `-i "${videoPath}"`,
    `-vf "subtitles='${subtitlePath.replace(/\\/g, '/')}':force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=1'"`,
    '-c:a copy',
    `"${outputPath}"`,
  ].join(' ');

  console.log('Adding subtitles to video...');
  await execAsync(command);

  return outputPath;
}

/**
 * Generate complete cartoon video from story text
 */
async function generateCartoonVideo(storyText, outputDir, options = {}) {
  const {
    storyTitle = 'Kids Story',
    style = 'cartoon',
    provider = 'pollinations',
    voiceEngine = 'auto',
    includeSubtitles = true,
    width = 1280,
    height = 720,
  } = options;

  console.log('\n=== Starting Cartoon Video Generation ===\n');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Step 1: Parse story
  console.log('Step 1: Parsing story...');
  const parsedStory = parseStory(storyText, { storyTitle, maxScenes: 6 });
  console.log(`✓ Parsed ${parsedStory.totalScenes} scenes with ${parsedStory.characters.length} characters`);

  // Step 2: Generate character references
  console.log('\nStep 2: Generating character designs...');
  const characters = parsedStory.characters.map((char, i) =>
    generateCharacterReference(char, i, { style })
  );
  console.log(`✓ Generated ${characters.length} character references`);

  // Step 3: Ensure character consistency across scenes
  console.log('\nStep 3: Ensuring character consistency...');
  const consistentScenes = ensureCharacterConsistency(characters, parsedStory.scenes);
  console.log('✓ Applied consistent character references to all scenes');

  // Step 4: Generate scene images
  console.log('\nStep 4: Generating scene images...');
  const sceneResults = await generateAllSceneImages(consistentScenes, characters, {
    outputDir,
    style,
    provider,
    width,
    height,
  });
  const successfulScenes = sceneResults.filter(r => r.success).length;
  console.log(`✓ Generated ${successfulScenes}/${sceneResults.length} scene images`);

  // Step 5: Generate dialogue audio
  console.log('\nStep 5: Generating dialogue audio...');
  const audioResults = await generateAllSceneAudio(consistentScenes, characters, outputDir, {
    preferredEngine: voiceEngine,
  });
  console.log(`✓ Generated audio for ${audioResults.length} scenes`);

  // Step 6: Collect audio files for each scene
  const sceneAudioFiles = audioResults.map(result => {
    if (!result.success || !result.audioFiles) return null;
    const successfulAudio = result.audioFiles.filter(a => a.success);
    return successfulAudio.length > 0 ? successfulAudio[0].filePath : null;
  }).filter(Boolean);

  // Step 7: Create video from images
  console.log('\nStep 6: Creating video from scene images...');
  const videoWithoutAudioPath = path.join(outputDir, 'video-no-audio.mp4');
  await createVideoFromScenes(sceneResults, videoWithoutAudioPath, { width, height });
  console.log('✓ Created base video');

  // Step 8: Merge all audio files
  console.log('\nStep 7: Merging audio tracks...');
  const mergedAudioPath = path.join(outputDir, 'merged-audio.mp3');
  
  if (sceneAudioFiles.length > 0) {
    const { mergeAudioFiles } = require('./cartoonVoiceService');
    await mergeAudioFiles(sceneAudioFiles, mergedAudioPath);
    console.log('✓ Merged dialogue audio');
  } else {
    // Create silent audio if no dialogue
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const duration = consistentScenes.length * 5;
    await execAsync(`"${ffmpegPath}" -f lavfi -i anullsrc=r=44100:cl=stereo -t ${duration} -q:a 9 -acodec libmp3lame "${mergedAudioPath}"`);
    console.log('⚠ Created silent audio (no dialogue generated)');
  }

  // Step 9: Add audio to video
  console.log('\nStep 8: Adding audio to video...');
  const videoWithAudioPath = path.join(outputDir, 'video-with-audio.mp4');
  await addAudioToVideo(videoWithoutAudioPath, mergedAudioPath, videoWithAudioPath);
  console.log('✓ Added audio track');

  // Step 10: Add subtitles (optional)
  let finalVideoPath = videoWithAudioPath;
  
  if (includeSubtitles) {
    console.log('\nStep 9: Adding subtitles...');
    const subtitlePath = path.join(outputDir, 'subtitles.srt');
    await createSubtitleFile(consistentScenes, subtitlePath);
    
    const videoWithSubtitlesPath = path.join(outputDir, 'final-video.mp4');
    try {
      await addSubtitlesToVideo(videoWithAudioPath, subtitlePath, videoWithSubtitlesPath);
      finalVideoPath = videoWithSubtitlesPath;
      console.log('✓ Added subtitles');
    } catch (error) {
      console.warn('⚠ Could not add subtitles (optional):', error.message);
      finalVideoPath = videoWithAudioPath;
    }
  }

  // Step 11: Generate metadata
  const metadata = {
    title: storyTitle,
    generatedAt: new Date().toISOString(),
    duration: consistentScenes.length * 5,
    scenes: consistentScenes.length,
    characters: characters.length,
    resolution: `${width}x${height}`,
    style,
    provider,
    voiceEngine,
    sceneResults,
    audioResults,
  };

  await fs.writeFile(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  console.log('\n=== Video Generation Complete ===');
  console.log(`Final video: ${finalVideoPath}`);
  console.log(`Duration: ~${metadata.duration} seconds`);
  console.log(`Scenes: ${metadata.scenes}`);
  console.log(`Characters: ${metadata.characters}`);
  
  return {
    success: true,
    videoPath: finalVideoPath,
    metadata,
  };
}

/**
 * Quick test with a sample story
 */
async function testVideoGeneration() {
  const sampleStory = `Once upon a time, there was a brave rabbit named Robby. He loved to explore the forest.
  
One day, Robby met a wise old turtle named Shelly. "Hello, young rabbit," said Shelly.

"Hello!" replied Robby. "Can you show me the secret garden?"

Shelly smiled. "Follow me, and I'll teach you the way."

Together, they journeyed through the forest. Robby learned about patience and friendship.

In the end, Robby found the beautiful garden and thanked Shelly for the wonderful adventure.`;

  const testOutputDir = path.join(__dirname, '../../test-output/cartoon-video-test');
  
  try {
    const result = await generateCartoonVideo(sampleStory, testOutputDir, {
      storyTitle: 'Robby and Shelly\'s Adventure',
      style: 'cartoon',
      provider: 'pollinations',
      width: 854,
      height: 480,
    });
    
    console.log('\n✓ Test completed successfully!');
    return result;
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    throw error;
  }
}

module.exports = {
  generateCartoonVideo,
  createVideoFromScenes,
  addAudioToVideo,
  addSubtitlesToVideo,
  createSubtitleFile,
  testVideoGeneration,
};
