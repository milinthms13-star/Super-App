/**
 * Setup script for Finance Module services
 * Run this after installing dependencies to verify configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Finance Module Setup Verification\n');

// Check if required directories exist
const requiredDirs = [
  'backend/services',
  'backend/routes',
  'backend/models',
  'backend/locales',
  'backend/middleware',
  'backend/private/finance-docs',
];

console.log('📁 Checking directories...');
requiredDirs.forEach((dir) => {
  const dirPath = path.join(__dirname, '../..', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✅ ${dir}`);
  } else {
    console.log(`  ❌ ${dir} - MISSING!`);
    // Create if missing
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`     Created: ${dir}`);
  }
});

// Check if required files exist
const requiredFiles = [
  'backend/services/notificationService.js',
  'backend/services/creditBureauService.js',
  'backend/services/documentVerificationService.js',
  'backend/services/fraudDetectionService.js',
  'backend/services/reportingService.js',
  'backend/services/workflowService.js',
  'backend/services/crmService.js',
  'backend/routes/institutionPortal.js',
  'backend/middleware/i18n.js',
  'backend/models/FinanceCRMActivity.js',
  'backend/locales/en.json',
  'backend/locales/ml.json',
  'backend/locales/te.json',
  'backend/locales/ta.json',
  'backend/locales/hi.json',
  'backend/locales/kn.json',
];

console.log('\n📄 Checking required files...');
requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, '../..', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
  }
});

// Check environment variables
console.log('\n🔧 Checking environment configuration...');

const envVars = {
  // Email
  SENDGRID_API_KEY: 'SendGrid API Key',
  SENDGRID_FROM_EMAIL: 'SendGrid From Email',
  
  // SMS/WhatsApp
  TWILIO_ACCOUNT_SID: 'Twilio Account SID',
  TWILIO_AUTH_TOKEN: 'Twilio Auth Token',
  TWILIO_PHONE_NUMBER: 'Twilio Phone Number',
  
  // Credit Bureau (Optional)
  CIBIL_API_KEY: 'CIBIL API Key (Optional)',
  EXPERIAN_API_KEY: 'Experian API Key (Optional)',
  
  // DigiLocker (Optional)
  DIGILOCKER_CLIENT_ID: 'DigiLocker Client ID (Optional)',
  DIGILOCKER_CLIENT_SECRET: 'DigiLocker Client Secret (Optional)',
};

Object.entries(envVars).forEach(([key, description]) => {
  if (process.env[key]) {
    console.log(`  ✅ ${key} - ${description}`);
  } else {
    const isOptional = description.includes('Optional');
    const symbol = isOptional ? '⚠️' : '❌';
    console.log(`  ${symbol} ${key} - ${description} ${isOptional ? '(will use mock mode)' : '(REQUIRED for production)'}`);
  }
});

// Check dependencies
console.log('\n📦 Checking npm dependencies...');

const requiredDeps = [
  '@sendgrid/mail',
  'twilio',
  'tesseract.js',
  'pdfkit',
  'exceljs',
];

const packageJsonPath = path.join(__dirname, '../package.json');
let packageJson = {};

try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.log('  ⚠️  Could not read package.json');
}

const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

requiredDeps.forEach((dep) => {
  if (allDeps[dep]) {
    console.log(`  ✅ ${dep} - ${allDeps[dep]}`);
  } else {
    console.log(`  ❌ ${dep} - NOT INSTALLED`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Setup Summary\n');

const missingDeps = requiredDeps.filter((dep) => !allDeps[dep]);
const missingEnvVars = Object.keys(envVars).filter(
  (key) => !process.env[key] && !envVars[key].includes('Optional')
);

if (missingDeps.length > 0) {
  console.log('⚠️  Missing Dependencies:');
  console.log('   Run: npm install ' + missingDeps.join(' '));
  console.log('');
}

if (missingEnvVars.length > 0) {
  console.log('⚠️  Missing Required Environment Variables:');
  missingEnvVars.forEach((key) => {
    console.log(`   - ${key}`);
  });
  console.log('   Add these to your .env file');
  console.log('');
}

if (missingDeps.length === 0 && missingEnvVars.length === 0) {
  console.log('✅ All required dependencies and configuration are present!');
  console.log('   Finance module is ready for production deployment.');
} else if (missingDeps.length === 0) {
  console.log('✅ All dependencies installed!');
  console.log('⚠️  Some environment variables missing.');
  console.log('   Services will run in MOCK MODE for development.');
  console.log('   Add API keys for production deployment.');
} else {
  console.log('❌ Setup incomplete. Please install missing dependencies.');
}

console.log('\n📚 Documentation:');
console.log('   - FINANCE_IMPLEMENTATION_SUMMARY.md - Complete overview');
console.log('   - backend/FINANCE_NEW_DEPENDENCIES.md - Dependencies guide');
console.log('   - FINANCE_MODULE_ANALYSIS.md - Original gap analysis');

console.log('\n🚀 Next Steps:');
console.log('   1. Install missing dependencies (if any)');
console.log('   2. Configure environment variables in .env');
console.log('   3. Restart your server');
console.log('   4. Test API endpoints');
console.log('   5. Build frontend components to consume APIs');

console.log('\n' + '='.repeat(60));
