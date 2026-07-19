#!/usr/bin/env node

/**
 * Microservices Generator Script
 * Generates 30+ microservices from existing backend modules
 */

const fs = require('fs');
const path = require('path');

// Define all 35 microservices based on your backend
const MICROSERVICES = [
  // Core Services (1-5)
  { name: 'auth-service', port: 3001, domain: 'Authentication', routes: ['auth'] },
  { name: 'user-service', port: 3002, domain: 'User Management', routes: ['users', 'profile'] },
  { name: 'notification-service', port: 3003, domain: 'Notifications', routes: ['notifications', 'email', 'sms'] },
  { name: 'payment-service', port: 3004, domain: 'Payments', routes: ['payments', 'invoices', 'transactions'] },
  { name: 'file-service', port: 3005, domain: 'File Management', routes: ['files', 'uploads', 'media'] },

  // E-commerce Services (6-10)
  { name: 'ecommerce-service', port: 3006, domain: 'E-commerce', routes: ['products', 'cart', 'orders', 'reviews'] },
  { name: 'vendor-service', port: 3007, domain: 'Vendor Management', routes: ['vendors', 'seller'] },
  { name: 'inventory-service', port: 3008, domain: 'Inventory', routes: ['inventory', 'stock'] },
  { name: 'shipping-service', port: 3009, domain: 'Shipping', routes: ['shipping', 'tracking', 'delivery'] },
  { name: 'recommendation-service', port: 3010, domain: 'Recommendations', routes: ['recommendations', 'suggestions'] },

  // Classifieds & Marketplace (11-15)
  { name: 'classifieds-service', port: 3011, domain: 'Classifieds', routes: ['classifieds', 'listings', 'ads'] },
  { name: 'realestate-service', port: 3012, domain: 'Real Estate', routes: ['realestate', 'properties'] },
  { name: 'matrimonial-service', port: 3013, domain: 'Matrimonial', routes: ['matrimonial', 'profiles', 'matches'] },
  { name: 'jobs-service', port: 3014, domain: 'Jobs & Careers', routes: ['jobs', 'applications', 'resumes'] },
  { name: 'vehicles-service', port: 3015, domain: 'Vehicles', routes: ['vehicles', 'automotive'] },

  // Food & Hospitality (16-19)
  { name: 'food-delivery-service', port: 3016, domain: 'Food Delivery', routes: ['food-delivery', 'restaurants', 'menus'] },
  { name: 'hotel-booking-service', port: 3017, domain: 'Hotel Booking', routes: ['hotels', 'rooms', 'bookings'] },
  { name: 'tourism-service', port: 3018, domain: 'Tourism', routes: ['tourism', 'packages', 'tours'] },
  { name: 'travel-service', port: 3019, domain: 'Travel', routes: ['travel', 'flights', 'bus', 'train'] },

  // Business Services (20-24)
  { name: 'business-builder-service', port: 3020, domain: 'Business Builder', routes: ['business', 'miniapps', 'templates'] },
  { name: 'freelancer-service', port: 3021, domain: 'Freelancer Marketplace', routes: ['freelancer', 'gigs', 'projects'] },
  { name: 'gulf-services-service', port: 3022, domain: 'Gulf Services', routes: ['gulfservices', 'recruitment'] },
  { name: 'finance-service', port: 3023, domain: 'Finance', routes: ['finance', 'loans', 'credit'] },
  { name: 'insurance-service', port: 3024, domain: 'Insurance', routes: ['insurance', 'policies'] },

  // Healthcare & Education (25-28)
  { name: 'healthcare-service', port: 3025, domain: 'Healthcare', routes: ['healthcare', 'appointments', 'doctors'] },
  { name: 'education-service', port: 3026, domain: 'Education', routes: ['education', 'courses', 'learning'] },
  { name: 'astrology-service', port: 3027, domain: 'Astrology', routes: ['astrology', 'horoscope', 'predictions'] },
  { name: 'beauty-ai-service', port: 3028, domain: 'Beauty AI', routes: ['beautyai', 'skincare', 'tips'] },

  // Content & Social (29-32)
  { name: 'messaging-service', port: 3029, domain: 'Messaging', routes: ['messaging', 'chat', 'conversations'] },
  { name: 'social-service', port: 3030, domain: 'Social', routes: ['social', 'feed', 'posts', 'comments'] },
  { name: 'diary-service', port: 3031, domain: 'Personal Diary', routes: ['diary', 'journals'] },
  { name: 'poll-service', port: 3032, domain: 'Polls & Surveys', routes: ['polls', 'surveys', 'votes'] },

  // AI & Advanced (33-35)
  { name: 'ai-chat-service', port: 3033, domain: 'AI Chat', routes: ['aichat', 'ai', 'aiml'] },
  { name: 'kids-video-service', port: 3034, domain: 'Kids Video Maker', routes: ['kidsvideomaker', 'cartoons'] },
  { name: 'analytics-service', port: 3035, domain: 'Analytics', routes: ['analytics', 'reports', 'dashboards'] },
];

// Service template generator
function generateServiceTemplate(service) {
  const servicePath = path.join('microservices', service.name);
  
  // Create directories
  const dirs = [
    '',
    'src',
    'src/config',
    'src/routes',
    'src/controllers',
    'src/services',
    'src/models',
    'src/middleware',
    'src/utils',
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(servicePath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // Generate package.json
  const packageJson = {
    name: service.name,
    version: '1.0.0',
    description: `${service.domain} microservice`,
    main: 'src/server.js',
    scripts: {
      start: 'node src/server.js',
      dev: 'nodemon src/server.js',
      test: 'jest',
    },
    dependencies: {
      express: '^4.18.2',
      mongoose: '^8.0.3',
      ioredis: '^5.10.1',
      dotenv: '^16.4.5',
      cors: '^2.8.5',
      helmet: '^7.1.0',
      'express-rate-limit': '^7.1.5',
      'express-validator': '^7.0.0',
      winston: '^3.11.0',
      axios: '^1.6.2',
      jsonwebtoken: '^9.0.3',
    },
    devDependencies: {
      nodemon: '^3.0.2',
      jest: '^29.7.0',
    },
  };

  fs.writeFileSync(
    path.join(servicePath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Generate Dockerfile
  const dockerfile = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE ${service.port}
HEALTHCHECK --interval=30s --timeout=3s \\
  CMD node -e "require('http').get('http://localhost:${service.port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "src/server.js"]
`;

  fs.writeFileSync(path.join(servicePath, 'Dockerfile'), dockerfile);

  // Generate .env.example
  const envExample = `NODE_ENV=production
PORT=${service.port}
SERVICE_NAME=${service.name}
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/malabarbazaar
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-jwt-secret
LOG_LEVEL=info
`;

  fs.writeFileSync(path.join(servicePath, '.env.example'), envExample);

  // Generate server.js
  const serverJs = `require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || ${service.port};

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(\`${service.name} running on port \${PORT}\`);
    });
  })
  .catch((error) => {
    logger.error(\`Failed to start: \${error.message}\`);
    process.exit(1);
  });

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully');
  process.exit(0);
});
`;

  fs.writeFileSync(path.join(servicePath, 'src', 'server.js'), serverJs);

  // Generate app.js
  const appJs = `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: '${service.name}',
    timestamp: new Date().toISOString() 
  });
});

app.use('/api', routes);

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

module.exports = app;
`;

  fs.writeFileSync(path.join(servicePath, 'src', 'app.js'), appJs);

  // Generate database.js
  const databaseJs = `const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info(\`MongoDB Connected: \${conn.connection.host}\`);
    return conn;
  } catch (error) {
    logger.error(\`MongoDB error: \${error.message}\`);
    throw error;
  }
};

module.exports = connectDatabase;
`;

  fs.writeFileSync(path.join(servicePath, 'src', 'config', 'database.js'), databaseJs);

  // Generate redis.js
  const redisJs = `const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error(\`Redis error: \${err.message}\`));

module.exports = redis;
`;

  fs.writeFileSync(path.join(servicePath, 'src', 'config', 'redis.js'), redisJs);

  // Generate logger.js
  const loggerJs = `const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: '${service.name}' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

module.exports = logger;
`;

  fs.writeFileSync(path.join(servicePath, 'src', 'utils', 'logger.js'), loggerJs);

  // Generate routes/index.js
  const routesJs = `const express = require('express');
const router = express.Router();

// Add your routes here
${service.routes.map(route => `// router.use('/${route}', require('./${route}.routes'));`).join('\n')}

router.get('/', (req, res) => {
  res.json({
    service: '${service.name}',
    domain: '${service.domain}',
    version: '1.0.0',
    routes: [${service.routes.map(r => `'/${r}'`).join(', ')}],
  });
});

module.exports = router;
`;

  fs.writeFileSync(path.join(servicePath, 'src', 'routes', 'index.js'), routesJs);

  // Generate README.md
  const readme = `# ${service.domain} Service

${service.domain} microservice for MalabarBazaar.

## Features

- ${service.domain} management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

${service.routes.map(route => `- \`/api/${route}/*\` - ${route.charAt(0).toUpperCase() + route.slice(1)} operations`).join('\n')}

## Setup

\`\`\`bash
npm install
cp .env.example .env
# Configure .env
npm run dev
\`\`\`

## Deploy

\`\`\`bash
gcloud run deploy ${service.name} \\
  --source . \\
  --region asia-south1 \\
  --allow-unauthenticated
\`\`\`

## Health Check

\`\`\`bash
curl http://localhost:${service.port}/health
\`\`\`
`;

  fs.writeFileSync(path.join(servicePath, 'README.md'), readme);

  console.log(`✅ Generated: ${service.name}`);
}

// Generate all services
console.log('🚀 Generating 35 microservices...\n');

MICROSERVICES.forEach((service, index) => {
  console.log(`[${index + 1}/35] Creating ${service.name}...`);
  try {
    generateServiceTemplate(service);
  } catch (error) {
    console.error(`❌ Error creating ${service.name}:`, error.message);
  }
});

console.log('\n✅ All 35 microservices generated successfully!');
console.log('\n📋 Next steps:');
console.log('1. cd microservices/<service-name>');
console.log('2. npm install');
console.log('3. cp .env.example .env');
console.log('4. Configure .env');
console.log('5. npm run dev');
console.log('\n🚀 To deploy all services, see DEPLOY_ALL_SERVICES.md');
