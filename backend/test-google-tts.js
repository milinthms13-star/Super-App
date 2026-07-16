/**
 * Google Cloud TTS Test Script
 * 
 * Tests Google Cloud Text-to-Speech configuration and generates sample audio.
 * Run this after setting up your TTS credentials.
 */

const fs = require('fs');
const path = require('path');
const { 
  initializeGoogleTTS, 
  getTTSStatus, 
  testTTSConnection 
} = require('./services/googleTTSCredentialLoader');
const { synthesizeSpeech } = require('./services/videoStudioRealCartoonRenderer');

// ANSI colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
  log('\n========================================', 'blue');
  log('Google Cloud TTS Configuration Test', 'blue');
  log('========================================\n', 'blue');

  // Test 1: Check configuration
  log('📋 Test 1: Checking TTS Configuration...', 'yellow');
  const status = getTTSStatus();
  
  console.log('   Configuration Status:');
  console.log(`   - GOOGLE_APPLICATION_CREDENTIALS: ${status.environmentVariable ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - GOOGLE_TTS_CREDENTIALS_JSON: ${status.credentialsJson ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - Config file exists: ${status.configFileExists ? '✅ Yes' : '❌ No'}`);
  console.log(`   - TTS Client initialized: ${status.enabled ? '✅ Yes' : '❌ No'}`);
  console.log(`   - Fallback mode: ${status.fallbackMode ? '⚠️  Yes (using silent audio)' : '✅ No'}`);

  if (!status.enabled) {
    log('\n❌ TTS NOT CONFIGURED', 'red');
    log('   Action needed: Set up Google Cloud TTS credentials', 'yellow');
    log('   See: backend/GOOGLE_TTS_SETUP_GUIDE.md\n', 'yellow');
    log('   Current behavior: Videos will use silent audio with ambient sound', 'reset');
    return;
  }

  log('\n✅ TTS Configuration found!', 'green');

  // Test 2: Test connection
  log('\n📡 Test 2: Testing Google Cloud API Connection...', 'yellow');
  try {
    const connectionResult = await testTTSConnection();
    
    if (connectionResult.success) {
      log(`✅ API Connection successful!`, 'green');
      console.log(`   Available voices: ${connectionResult.voicesAvailable}`);
      console.log(`   Free tier: ${connectionResult.freeCharactersPerMonth.toLocaleString()} characters/month`);
    } else {
      log(`❌ API Connection failed: ${connectionResult.error}`, 'red');
      log(`   Suggestion: ${connectionResult.suggestion}`, 'yellow');
      return;
    }
  } catch (error) {
    log(`❌ Connection test failed: ${error.message}`, 'red');
    return;
  }

  // Test 3: Generate sample audio
  log('\n🎤 Test 3: Generating Sample Audio...', 'yellow');
  
  const testTexts = [
    { text: "Hello! Welcome to our magical adventure story!", voice: 'child-friendly' },
    { text: "Once upon a time, in a land far away, there lived a brave explorer.", voice: 'narrator' },
    { text: "Let's be friends and go on an amazing journey together!", voice: 'young' },
    { text: "Remember, kindness and courage can change the world.", voice: 'friendly' }
  ];

  let successCount = 0;
  const outputDir = path.join(__dirname, 'test-tts-output');
  
  try {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (let i = 0; i < testTexts.length; i++) {
      const test = testTexts[i];
      console.log(`\n   Testing voice ${i + 1}/4: "${test.voice}"...`);
      
      try {
        const audioBuffer = await synthesizeSpeech(test.text, test.voice);
        
        if (audioBuffer) {
          const outputFile = path.join(outputDir, `sample-${test.voice}.mp3`);
          fs.writeFileSync(outputFile, audioBuffer);
          log(`   ✅ Generated: ${outputFile}`, 'green');
          successCount++;
        } else {
          log(`   ❌ Failed to generate audio for ${test.voice}`, 'red');
        }
      } catch (voiceError) {
        log(`   ❌ Error: ${voiceError.message}`, 'red');
      }
    }

    log(`\n📊 Results: ${successCount}/${testTexts.length} voices tested successfully`, 'blue');

    if (successCount === testTexts.length) {
      log('\n🎉 All tests passed!', 'green');
      log(`   Sample audio files saved to: ${outputDir}`, 'green');
      log(`   You can play these files to hear the different voices\n`, 'reset');
    } else if (successCount > 0) {
      log('\n⚠️  Some tests failed', 'yellow');
      log(`   ${successCount} out of ${testTexts.length} voices working`, 'yellow');
    } else {
      log('\n❌ All audio generation failed', 'red');
      log('   Check API quotas and permissions in Google Cloud Console', 'yellow');
    }

  } catch (error) {
    log(`\n❌ Audio generation test failed: ${error.message}`, 'red');
  }

  // Test 4: Usage estimate
  log('\n💰 Test 4: Free Tier Usage Estimate', 'yellow');
  console.log('   Free tier limit: 1,000,000 characters/month');
  console.log('   Average story: ~200 characters');
  console.log('   Estimated videos: ~5,000 per month');
  console.log('   Cost: $0 (within free tier)');
  console.log('   Overage cost: $4 per 1M characters\n');

  // Summary
  log('========================================', 'blue');
  log('Summary', 'blue');
  log('========================================\n', 'blue');

  if (status.enabled && successCount > 0) {
    log('✅ Google Cloud TTS is working correctly!', 'green');
    log('   Your Kids Video Maker will use spoken dialogue', 'green');
    log(`   Sample audio files: ${outputDir}`, 'reset');
    log('\n📝 Next steps:', 'yellow');
    log('   1. Start your backend server: npm start', 'reset');
    log('   2. Create a test video with /api/video-studio/create', 'reset');
    log('   3. Monitor usage in Google Cloud Console', 'reset');
  } else if (status.fallbackMode) {
    log('ℹ️  TTS not configured - using silent audio fallback', 'yellow');
    log('   Videos will work but without spoken dialogue', 'reset');
    log('\n   To enable TTS:', 'yellow');
    log('   1. Follow setup guide: backend/GOOGLE_TTS_SETUP_GUIDE.md', 'reset');
    log('   2. Run this test again: node test-google-tts.js', 'reset');
  } else {
    log('⚠️  TTS configured but not working properly', 'yellow');
    log('   Check the error messages above', 'reset');
    log('   See troubleshooting: backend/GOOGLE_TTS_SETUP_GUIDE.md', 'reset');
  }

  log('\n========================================\n', 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test script failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
