/**
 * Test Script for Cartoon Video Generator
 * Run with: node backend/test/testCartoonVideoGenerator.js
 */

const { parseStory, formatDialogueForTTS } = require('../services/storyParserService');
const { generateCharacterReference, buildSceneCharacterPrompt } = require('../services/cartoonCharacterService');
const { testImageGeneration } = require('../services/cartoonSceneGenerator');
const { getAvailableTTSEngines } = require('../services/cartoonVoiceService');
const { getSampleStory, generateTestStory } = require('../data/sampleStories');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

/**
 * Test 1: Story Parser Service
 */
async function testStoryParser() {
  logSection('Test 1: Story Parser Service');
  
  try {
    const sampleStory = getSampleStory('simple');
    logInfo(`Testing with: "${sampleStory.title}"`);
    
    const parsed = parseStory(sampleStory.text, {
      storyTitle: sampleStory.title,
      maxScenes: 6,
    });

    logInfo(`Parsed ${parsed.characters.length} characters`);
    parsed.characters.forEach((char, index) => {
      console.log(`  ${index + 1}. ${char.name} (${char.role})`);
    });

    logInfo(`Parsed ${parsed.scenes.length} scenes`);
    parsed.scenes.forEach((scene, index) => {
      console.log(`  Scene ${index + 1}: ${scene.title}`);
      console.log(`    Dialogue: ${scene.dialogue.substring(0, 50)}...`);
    });

    // Test dialogue formatting
    const formattedDialogue = formatDialogueForTTS(parsed.scenes[0]);
    logInfo('Sample formatted dialogue:');
    console.log(`  ${formattedDialogue.substring(0, 100)}...`);

    logSuccess('Story parser test passed');
    return true;
  } catch (error) {
    logError(`Story parser test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test 2: Character Service
 */
async function testCharacterService() {
  logSection('Test 2: Character Service');
  
  try {
    // Test character reference generation
    const testCharacter = {
      name: 'Luna',
      role: 'hero',
      appearance: 'brave young girl with bright eyes',
    };

    const characterRef = generateCharacterReference(testCharacter, 'cartoon');
    logInfo(`Generated character reference for ${testCharacter.name}:`);
    console.log(`  Type: ${characterRef.type}`);
    console.log(`  Colors: ${characterRef.colors.join(', ')}`);
    console.log(`  Voice: ${characterRef.voice}`);

    // Test scene prompt building
    const scenePrompt = buildSceneCharacterPrompt(
      characterRef,
      'happy',
      'magical forest',
      'cartoon'
    );
    logInfo('Generated scene prompt:');
    console.log(`  ${scenePrompt.substring(0, 100)}...`);

    logSuccess('Character service test passed');
    return true;
  } catch (error) {
    logError(`Character service test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test 3: Image Generation Service
 */
async function testImageGenerationService() {
  logSection('Test 3: Image Generation Service');
  
  try {
    logInfo('Testing Pollinations API...');
    const pollinationsResult = await testImageGeneration('pollinations');
    
    if (pollinationsResult.success) {
      logSuccess('Pollinations API is working');
      logInfo(`Response time: ${pollinationsResult.responseTime}ms`);
    } else {
      logWarning(`Pollinations API failed: ${pollinationsResult.error}`);
    }

    // Test HuggingFace if API key is available
    if (process.env.HUGGINGFACE_API_KEY) {
      logInfo('Testing HuggingFace API...');
      const hfResult = await testImageGeneration('huggingface');
      
      if (hfResult.success) {
        logSuccess('HuggingFace API is working');
        logInfo(`Response time: ${hfResult.responseTime}ms`);
      } else {
        logWarning(`HuggingFace API failed: ${hfResult.error}`);
      }
    } else {
      logWarning('HuggingFace API key not configured (optional)');
    }

    logSuccess('Image generation service test completed');
    return true;
  } catch (error) {
    logError(`Image generation test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test 4: Voice Service
 */
async function testVoiceService() {
  logSection('Test 4: Voice Service');
  
  try {
    const engines = await getAvailableTTSEngines();
    
    logInfo(`Found ${engines.length} TTS engine(s):`);
    engines.forEach((engine, index) => {
      console.log(`  ${index + 1}. ${engine.name} - ${engine.description}`);
      console.log(`     Available: ${engine.available ? 'Yes' : 'No'}`);
      if (!engine.available) {
        console.log(`     Reason: ${engine.reason}`);
      }
    });

    const availableEngines = engines.filter(e => e.available);
    if (availableEngines.length > 0) {
      logSuccess(`${availableEngines.length} TTS engine(s) available`);
    } else {
      logWarning('No TTS engines available - will use fallback');
    }

    logSuccess('Voice service test completed');
    return true;
  } catch (error) {
    logError(`Voice service test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test 5: Sample Stories
 */
async function testSampleStories() {
  logSection('Test 5: Sample Stories');
  
  try {
    const categories = ['simple', 'educational', 'moral', 'funny', 'mythology'];
    
    logInfo('Testing sample story retrieval...');
    categories.forEach(category => {
      const story = getSampleStory(category);
      console.log(`  ${category}: "${story.title}" (${story.text.length} chars)`);
    });

    logInfo('Testing story generation...');
    const generatedStory = generateTestStory({
      characterCount: 3,
      sceneCount: 5,
      language: 'en',
      mode: 'bedtime',
    });
    console.log(`  Generated: "${generatedStory.title}"`);
    console.log(`  Length: ${generatedStory.text.length} characters`);
    console.log(`  Characters: 3, Scenes: 5`);

    logSuccess('Sample stories test passed');
    return true;
  } catch (error) {
    logError(`Sample stories test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test 6: End-to-End Integration
 */
async function testEndToEndIntegration() {
  logSection('Test 6: End-to-End Integration');
  
  try {
    logInfo('Running complete pipeline test...');
    
    // 1. Get sample story
    const story = getSampleStory('simple');
    logInfo(`Using story: "${story.title}"`);

    // 2. Parse story
    const parsed = parseStory(story.text, {
      storyTitle: story.title,
      maxScenes: 6,
    });
    logSuccess(`Parsed: ${parsed.characters.length} characters, ${parsed.scenes.length} scenes`);

    // 3. Generate character references
    const characterRefs = parsed.characters.map(char =>
      generateCharacterReference(char, story.style)
    );
    logSuccess(`Generated ${characterRefs.length} character references`);

    // 4. Build scene prompts
    const scenePrompts = parsed.scenes.map((scene, index) => {
      const char = characterRefs[index % characterRefs.length];
      return buildSceneCharacterPrompt(
        char,
        scene.emotion || 'happy',
        scene.description,
        story.style
      );
    });
    logSuccess(`Built ${scenePrompts.length} scene prompts`);

    // 5. Format dialogue
    const dialogues = parsed.scenes.map(scene => formatDialogueForTTS(scene));
    logSuccess(`Formatted ${dialogues.length} dialogue sections`);

    logInfo('Pipeline stages completed:');
    console.log('  1. Story parsing ✓');
    console.log('  2. Character extraction ✓');
    console.log('  3. Character design ✓');
    console.log('  4. Scene prompt generation ✓');
    console.log('  5. Dialogue formatting ✓');
    console.log('  6. Image generation - API test only');
    console.log('  7. Audio generation - requires TTS engines');
    console.log('  8. Video composition - requires FFmpeg');

    logSuccess('End-to-end integration test passed');
    return true;
  } catch (error) {
    logError(`End-to-end test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Cartoon Video Generator - Comprehensive Test Suite    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  const results = {
    storyParser: await testStoryParser(),
    characterService: await testCharacterService(),
    imageGeneration: await testImageGenerationService(),
    voiceService: await testVoiceService(),
    sampleStories: await testSampleStories(),
    endToEnd: await testEndToEndIntegration(),
  };

  // Summary
  logSection('Test Summary');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✓ PASS' : '✗ FAIL';
    const color = result ? 'green' : 'red';
    log(`${status} - ${test}`, color);
  });

  console.log('\n');
  if (passed === total) {
    logSuccess(`All ${total} tests passed! 🎉`);
  } else {
    logWarning(`${passed}/${total} tests passed`);
  }
  console.log('\n');

  return passed === total;
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = {
  testStoryParser,
  testCharacterService,
  testImageGenerationService,
  testVoiceService,
  testSampleStories,
  testEndToEndIntegration,
  runAllTests,
};
