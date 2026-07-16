/**
 * Google Cloud TTS Credential Loader
 * 
 * Supports multiple credential configuration methods:
 * 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (recommended)
 * 2. GOOGLE_TTS_CREDENTIALS_JSON environment variable (JSON string)
 * 3. Credentials file at ./config/google-tts-credentials.json
 * 4. Graceful fallback when no credentials available
 */

const fs = require('fs');
const path = require('path');

let cachedClient = null;
let initializationAttempted = false;

/**
 * Initialize Google Cloud TTS client with multiple credential sources
 * @returns {Object|null} TTS client or null if not available
 */
function initializeGoogleTTS() {
  // Return cached client if already initialized
  if (cachedClient !== null) {
    return cachedClient;
  }

  // Only attempt initialization once
  if (initializationAttempted) {
    return null;
  }

  initializationAttempted = true;

  // Check if TTS is explicitly disabled
  if (process.env.VIDEO_STUDIO_ENABLE_GOOGLE_TTS === 'false') {
    console.log('ℹ️  Google Cloud TTS is disabled via environment variable');
    return null;
  }

  try {
    const textToSpeech = require('@google-cloud/text-to-speech');

    // Method 1: GOOGLE_APPLICATION_CREDENTIALS (standard Google Cloud approach)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (fs.existsSync(credPath)) {
        cachedClient = new textToSpeech.TextToSpeechClient();
        console.log('✅ Google Cloud TTS initialized via GOOGLE_APPLICATION_CREDENTIALS');
        console.log(`   Credentials: ${credPath}`);
        return cachedClient;
      } else {
        console.warn(`⚠️  GOOGLE_APPLICATION_CREDENTIALS points to non-existent file: ${credPath}`);
      }
    }

    // Method 2: GOOGLE_TTS_CREDENTIALS_JSON (JSON string in environment)
    if (process.env.GOOGLE_TTS_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS_JSON);
        cachedClient = new textToSpeech.TextToSpeechClient({ credentials });
        console.log('✅ Google Cloud TTS initialized via GOOGLE_TTS_CREDENTIALS_JSON');
        console.log(`   Project: ${credentials.project_id || 'unknown'}`);
        return cachedClient;
      } catch (parseError) {
        console.warn('⚠️  Failed to parse GOOGLE_TTS_CREDENTIALS_JSON:', parseError.message);
      }
    }

    // Method 3: Local config file
    const configPath = path.join(__dirname, '../config/google-tts-credentials.json');
    if (fs.existsSync(configPath)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        cachedClient = new textToSpeech.TextToSpeechClient({ credentials });
        console.log('✅ Google Cloud TTS initialized via local config file');
        console.log(`   Config: ${configPath}`);
        return cachedClient;
      } catch (fileError) {
        console.warn(`⚠️  Failed to load credentials from ${configPath}:`, fileError.message);
      }
    }

    // Method 4: Try Application Default Credentials (for Google Cloud environments)
    try {
      cachedClient = new textToSpeech.TextToSpeechClient();
      console.log('✅ Google Cloud TTS initialized via Application Default Credentials');
      console.log('   (Running in Google Cloud environment)');
      return cachedClient;
    } catch (adcError) {
      // ADC not available, continue to fallback
    }

    // No credentials available - use fallback
    console.log('ℹ️  Google Cloud TTS credentials not found. Using silent audio fallback.');
    console.log('   To enable spoken dialogue, see: backend/GOOGLE_TTS_SETUP_GUIDE.md');
    return null;

  } catch (error) {
    console.warn('⚠️  Failed to initialize Google Cloud TTS:', error.message);
    console.log('   Using silent audio fallback. See: backend/GOOGLE_TTS_SETUP_GUIDE.md');
    return null;
  }
}

/**
 * Get TTS client status
 * @returns {Object} Status information
 */
function getTTSStatus() {
  return {
    enabled: cachedClient !== null,
    initialized: initializationAttempted,
    environmentVariable: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    credentialsJson: !!process.env.GOOGLE_TTS_CREDENTIALS_JSON,
    configFileExists: fs.existsSync(path.join(__dirname, '../config/google-tts-credentials.json')),
    fallbackMode: cachedClient === null && initializationAttempted
  };
}

/**
 * Test TTS connection
 * @returns {Promise<Object>} Test result
 */
async function testTTSConnection() {
  const client = initializeGoogleTTS();
  
  if (!client) {
    return {
      success: false,
      error: 'TTS client not initialized',
      suggestion: 'Configure credentials to enable spoken dialogue'
    };
  }

  try {
    const [voices] = await client.listVoices({ languageCode: 'en-US' });
    return {
      success: true,
      voicesAvailable: voices.voices.length,
      message: 'Google Cloud TTS is working correctly',
      freeCharactersPerMonth: 1000000
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      suggestion: 'Check credentials and API enablement in Google Cloud Console'
    };
  }
}

/**
 * Reset cached client (useful for testing)
 */
function resetTTSClient() {
  cachedClient = null;
  initializationAttempted = false;
}

module.exports = {
  initializeGoogleTTS,
  getTTSStatus,
  testTTSConnection,
  resetTTSClient
};
