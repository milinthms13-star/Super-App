#!/usr/bin/env node

/**
 * Interactive Google Cloud TTS Setup Script
 * 
 * Helps users configure Google Cloud Text-to-Speech credentials
 * with step-by-step guidance.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupTTS() {
  log('\n========================================', 'blue');
  log('Google Cloud TTS Setup Wizard', 'blue');
  log('========================================\n', 'blue');

  log('This wizard will help you set up FREE spoken dialogue for Kids Video Maker.', 'reset');
  log('Free Tier: 1,000,000 characters per month at $0 cost\n', 'green');

  // Check current status
  const envFile = path.join(__dirname, '.env');
  const configFile = path.join(__dirname, 'config', 'google-tts-credentials.json');
  const hasEnvVar = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasConfigFile = fs.existsSync(configFile);
  const hasEnvCredentials = !!process.env.GOOGLE_TTS_CREDENTIALS_JSON;

  log('📋 Current Status:', 'yellow');
  console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${hasEnvVar ? '✅ Set' : '❌ Not set'}`);
  console.log(`   Config file (config/google-tts-credentials.json): ${hasConfigFile ? '✅ Exists' : '❌ Not found'}`);
  console.log(`   GOOGLE_TTS_CREDENTIALS_JSON: ${hasEnvCredentials ? '✅ Set' : '❌ Not set'}\n`);

  if (hasEnvVar || hasConfigFile || hasEnvCredentials) {
    const reconfigure = await question('TTS appears to be configured. Reconfigure? (y/n): ');
    if (reconfigure.toLowerCase() !== 'y') {
      log('\n✓ Setup cancelled. Run test-google-tts.js to verify your configuration.\n', 'green');
      rl.close();
      return;
    }
  }

  log('\n📚 Setup Methods:', 'yellow');
  console.log('   1. Environment Variable (GOOGLE_APPLICATION_CREDENTIALS) - Recommended');
  console.log('   2. Config File (backend/config/google-tts-credentials.json)');
  console.log('   3. View Setup Guide (backend/GOOGLE_TTS_SETUP_GUIDE.md)');
  console.log('   4. Skip TTS Setup (use silent audio fallback)\n');

  const choice = await question('Choose setup method (1-4): ');

  switch (choice.trim()) {
    case '1':
      await setupEnvironmentVariable();
      break;
    case '2':
      await setupConfigFile();
      break;
    case '3':
      showSetupGuide();
      break;
    case '4':
      log('\n✓ Skipping TTS setup. Videos will use silent audio fallback.\n', 'yellow');
      break;
    default:
      log('\n❌ Invalid choice. Please run the script again.\n', 'red');
  }

  rl.close();
}

async function setupEnvironmentVariable() {
  log('\n📝 Method 1: Environment Variable Setup', 'blue');
  log('════════════════════════════════════════\n', 'blue');

  log('First, you need to get your credentials JSON file from Google Cloud:', 'reset');
  log('1. Go to https://console.cloud.google.com/', 'reset');
  log('2. Create/select a project', 'reset');
  log('3. Enable Text-to-Speech API', 'reset');
  log('4. Create a Service Account with "Cloud Text-to-Speech User" role', 'reset');
  log('5. Download the JSON key file\n', 'reset');

  const hasCredentials = await question('Do you have the credentials JSON file? (y/n): ');
  
  if (hasCredentials.toLowerCase() !== 'y') {
    log('\n📖 See detailed guide: backend/GOOGLE_TTS_SETUP_GUIDE.md', 'yellow');
    log('Run this script again after downloading credentials.\n', 'reset');
    return;
  }

  const credPath = await question('\nEnter the full path to your credentials JSON file: ');
  const expandedPath = credPath.trim().replace(/^~/, require('os').homedir());

  if (!fs.existsSync(expandedPath)) {
    log(`\n❌ File not found: ${expandedPath}`, 'red');
    log('Please check the path and try again.\n', 'reset');
    return;
  }

  // Validate JSON
  try {
    const content = fs.readFileSync(expandedPath, 'utf8');
    const parsed = JSON.parse(content);
    
    if (!parsed.type || !parsed.project_id || !parsed.private_key) {
      log('\n❌ Invalid credentials file. Missing required fields.', 'red');
      return;
    }

    log('\n✅ Credentials file is valid!', 'green');
    log(`   Project: ${parsed.project_id}`, 'reset');
    log(`   Service Account: ${parsed.client_email}\n`, 'reset');

  } catch (error) {
    log(`\n❌ Invalid JSON file: ${error.message}`, 'red');
    return;
  }

  // Set environment variable
  log('Setting environment variable...', 'yellow');
  
  const envFile = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf8');
  }

  // Update or add GOOGLE_APPLICATION_CREDENTIALS
  const credentialLine = `GOOGLE_APPLICATION_CREDENTIALS=${expandedPath}`;
  
  if (envContent.includes('GOOGLE_APPLICATION_CREDENTIALS=')) {
    envContent = envContent.replace(
      /GOOGLE_APPLICATION_CREDENTIALS=.*/,
      credentialLine
    );
  } else {
    envContent += `\n# Google Cloud TTS Credentials\n${credentialLine}\n`;
  }

  // Ensure VIDEO_STUDIO_ENABLE_GOOGLE_TTS is true
  if (!envContent.includes('VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true')) {
    if (envContent.includes('VIDEO_STUDIO_ENABLE_GOOGLE_TTS=')) {
      envContent = envContent.replace(
        /VIDEO_STUDIO_ENABLE_GOOGLE_TTS=.*/,
        'VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true'
      );
    } else {
      envContent += 'VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true\n';
    }
  }

  fs.writeFileSync(envFile, envContent);

  log('\n✅ Setup complete!', 'green');
  log(`   Added GOOGLE_APPLICATION_CREDENTIALS to .env`, 'reset');
  log(`   Path: ${expandedPath}\n`, 'reset');
  log('📝 Next Steps:', 'yellow');
  log('   1. Restart your backend server', 'reset');
  log('   2. Run: node test-google-tts.js (to verify)', 'reset');
  log('   3. Create a video with spoken dialogue!\n', 'reset');
}

async function setupConfigFile() {
  log('\n📝 Method 2: Config File Setup', 'blue');
  log('════════════════════════════════════════\n', 'blue');

  const configDir = path.join(__dirname, 'config');
  const configFile = path.join(configDir, 'google-tts-credentials.json');

  log('This method copies your credentials to: backend/config/google-tts-credentials.json\n', 'reset');

  const hasCredentials = await question('Do you have the credentials JSON file from Google Cloud? (y/n): ');
  
  if (hasCredentials.toLowerCase() !== 'y') {
    log('\n📖 See detailed guide: backend/GOOGLE_TTS_SETUP_GUIDE.md', 'yellow');
    return;
  }

  const sourcePath = await question('\nEnter the full path to your credentials JSON file: ');
  const expandedPath = sourcePath.trim().replace(/^~/, require('os').homedir());

  if (!fs.existsSync(expandedPath)) {
    log(`\n❌ File not found: ${expandedPath}`, 'red');
    return;
  }

  // Validate JSON
  try {
    const content = fs.readFileSync(expandedPath, 'utf8');
    const parsed = JSON.parse(content);
    
    if (!parsed.type || !parsed.project_id || !parsed.private_key) {
      log('\n❌ Invalid credentials file. Missing required fields.', 'red');
      return;
    }

    // Create config directory if needed
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Copy credentials
    fs.copyFileSync(expandedPath, configFile);

    // Update .env to enable TTS
    const envFile = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
    
    if (!envContent.includes('VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true')) {
      if (envContent.includes('VIDEO_STUDIO_ENABLE_GOOGLE_TTS=')) {
        envContent = envContent.replace(
          /VIDEO_STUDIO_ENABLE_GOOGLE_TTS=.*/,
          'VIDEO_STUDIO_ENABLE_GOOGLE_TTS=true'
        );
      } else {
        envContent += '\nVIDEO_STUDIO_ENABLE_GOOGLE_TTS=true\n';
      }
      fs.writeFileSync(envFile, envContent);
    }

    log('\n✅ Setup complete!', 'green');
    log(`   Credentials copied to: ${configFile}`, 'reset');
    log(`   Project: ${parsed.project_id}`, 'reset');
    log(`   Service Account: ${parsed.client_email}\n`, 'reset');
    log('🔒 Security Note:', 'yellow');
    log('   The credentials file is in .gitignore (will not be committed)', 'reset');
    log('   Keep this file secure and never share it publicly\n', 'reset');
    log('📝 Next Steps:', 'yellow');
    log('   1. Restart your backend server', 'reset');
    log('   2. Run: node test-google-tts.js (to verify)', 'reset');
    log('   3. Create a video with spoken dialogue!\n', 'reset');

  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
  }
}

function showSetupGuide() {
  log('\n📖 Setup Guide Location', 'blue');
  log('════════════════════════════════════════\n', 'blue');

  const guidePath = path.join(__dirname, 'GOOGLE_TTS_SETUP_GUIDE.md');
  
  log('Detailed setup instructions:', 'reset');
  log(`   ${guidePath}\n`, 'green');
  log('The guide includes:', 'reset');
  log('   ✓ Step-by-step Google Cloud setup', 'reset');
  log('   ✓ Multiple configuration methods', 'reset');
  log('   ✓ Troubleshooting tips', 'reset');
  log('   ✓ Cost management', 'reset');
  log('   ✓ Security best practices\n', 'reset');

  if (process.platform === 'win32') {
    log('To open the guide:', 'yellow');
    log(`   notepad "${guidePath}"`, 'reset');
  } else {
    log('To open the guide:', 'yellow');
    log(`   cat "${guidePath}"`, 'reset');
    log(`   # or`, 'reset');
    log(`   nano "${guidePath}"\n`, 'reset');
  }
}

// Run setup
setupTTS().catch(error => {
  log(`\n❌ Setup failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
