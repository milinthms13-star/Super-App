# Healthcare Module - Dependencies & Setup

## 📦 Complete Dependency Guide

This document lists all dependencies required for the Healthcare Module, including installation instructions and configuration details.

---

## 🎯 Core Dependencies

### Frontend Dependencies

#### React Ecosystem
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.15.0",
  "react-scripts": "5.0.1"
}
```

**Installation**:
```bash
npm install react react-dom react-router-dom
```

**Purpose**: Core React framework for building UI components

---

#### HTTP Client
```json
{
  "axios": "^1.5.0"
}
```

**Installation**:
```bash
npm install axios
```

**Purpose**: HTTP client for API calls

**Configuration** (`src/modules/healthcare/services/healthcareApi.js`):
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

#### WebRTC for Video Consultations
```json
{
  "simple-peer": "^9.11.1",
  "socket.io-client": "^4.7.2"
}
```

**Installation**:
```bash
npm install simple-peer socket.io-client
```

**Purpose**: Real-time peer-to-peer video communication

**Configuration**:
```javascript
// Frontend - Video Consultation Component
import Peer from 'simple-peer';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const peer = new Peer({
  initiator: true,
  trickle: false,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: process.env.REACT_APP_TURN_SERVER_URL,
        username: process.env.REACT_APP_TURN_USERNAME,
        credential: process.env.REACT_APP_TURN_PASSWORD,
      },
    ],
  },
});
```

---

#### OCR Library (Optional - Production)
```json
{
  "tesseract.js": "^5.0.0"
}
```

**Installation**:
```bash
npm install tesseract.js
```

**Purpose**: Optical Character Recognition for lab reports

**Usage**:
```javascript
import Tesseract from 'tesseract.js';

const processImage = async (imageFile) => {
  const { data: { text } } = await Tesseract.recognize(
    imageFile,
    'eng',
    {
      logger: (m) => console.log(m),
    }
  );
  return text;
};
```

**Note**: Currently simulated in development mode for faster testing.

---

### Backend Dependencies

#### Core Framework
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "body-parser": "^1.20.2",
  "express-validator": "^7.0.1"
}
```

**Installation**:
```bash
npm install express cors dotenv body-parser express-validator
```

**Purpose**: Backend server framework and middleware

**Configuration** (`backend/server.js`):
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

---

#### Database
```json
{
  "mongoose": "^7.5.0"
}
```

**Installation**:
```bash
npm install mongoose
```

**Purpose**: MongoDB ODM for data modeling

**Configuration** (`backend/config/database.js`):
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

**MongoDB Installation**:
```bash
# Windows
# Download from https://www.mongodb.com/try/download/community
# Or use installer: choco install mongodb

# macOS
brew tap mongodb/brew
brew install mongodb-community

# Linux (Ubuntu)
sudo apt-get install mongodb
```

---

#### Authentication
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3"
}
```

**Installation**:
```bash
npm install jsonwebtoken bcryptjs
```

**Purpose**: User authentication and password hashing

**Configuration**:
```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate token
const token = jwt.sign(
  { userId: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Hash password
const hashedPassword = await bcrypt.hash(password, 10);
```

---

#### Payment Gateways

##### Razorpay (Primary)
```json
{
  "razorpay": "^2.9.2"
}
```

**Installation**:
```bash
npm install razorpay
```

**Configuration**:
```javascript
const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
```

**Sign Up**: https://razorpay.com/  
**Docs**: https://razorpay.com/docs/

##### Stripe (International)
```json
{
  "stripe": "^13.6.0"
}
```

**Installation**:
```bash
npm install stripe
```

**Configuration**:
```javascript
const Stripe = require('stripe');

const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);
```

**Sign Up**: https://stripe.com/  
**Docs**: https://stripe.com/docs

---

#### PDF Generation
```json
{
  "pdfkit": "^0.13.0"
}
```

**Installation**:
```bash
npm install pdfkit
```

**Purpose**: Generate health reports and invoices

**Usage**:
```javascript
const PDFDocument = require('pdfkit');

const doc = new PDFDocument();
doc.fontSize(20).text('Health Report', { align: 'center' });
doc.end();
```

---

#### File Upload & Storage
```json
{
  "multer": "^1.4.5-lts.1",
  "aws-sdk": "^2.1450.0"
}
```

**Installation**:
```bash
npm install multer aws-sdk
```

**Purpose**: Handle file uploads and store in AWS S3

**Configuration**:
```javascript
const multer = require('multer');
const AWS = require('aws-sdk');

// Local storage
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// AWS S3 storage
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
```

---

#### Real-time Communication
```json
{
  "socket.io": "^4.7.2"
}
```

**Installation**:
```bash
npm install socket.io
```

**Purpose**: Real-time notifications and WebRTC signaling

**Configuration** (`backend/server.js`):
```javascript
const http = require('http');
const socketIO = require('socket.io');

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

---

#### Security
```json
{
  "helmet": "^7.0.0",
  "express-rate-limit": "^6.10.0",
  "express-mongo-sanitize": "^2.2.0"
}
```

**Installation**:
```bash
npm install helmet express-rate-limit express-mongo-sanitize
```

**Purpose**: Security headers, rate limiting, input sanitization

**Configuration**:
```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

app.use(helmet());
app.use(mongoSanitize());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

---

#### Logging
```json
{
  "winston": "^3.10.0",
  "morgan": "^1.10.0"
}
```

**Installation**:
```bash
npm install winston morgan
```

**Purpose**: Application logging and HTTP request logging

**Configuration**:
```javascript
const winston = require('winston');
const morgan = require('morgan');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

app.use(morgan('combined'));
```

---

## 🔧 Development Dependencies

```json
{
  "nodemon": "^3.0.1",
  "concurrently": "^8.2.1",
  "eslint": "^8.50.0",
  "prettier": "^3.0.3",
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.1.3",
  "jest": "^29.7.0"
}
```

**Installation**:
```bash
npm install --save-dev nodemon concurrently eslint prettier
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

**Purpose**: Development tools, testing, and code quality

---

## 📋 Complete Installation Script

### One-Command Install (All Dependencies)

```bash
# Install all frontend dependencies
npm install react react-dom react-router-dom axios simple-peer socket.io-client

# Install all backend dependencies
npm install express cors dotenv body-parser express-validator mongoose jsonwebtoken bcryptjs razorpay stripe pdfkit multer aws-sdk socket.io helmet express-rate-limit express-mongo-sanitize winston morgan

# Install development dependencies
npm install --save-dev nodemon concurrently eslint prettier @testing-library/react @testing-library/jest-dom jest

# Optional: Install OCR library for production
npm install tesseract.js
```

### Or Use package.json

Create a `package.json` with all dependencies:

```json
{
  "name": "malabarbazaar-healthcare",
  "version": "1.0.0",
  "description": "Healthcare Module for Malabar Bazaar",
  "scripts": {
    "start": "node backend/server.js",
    "server": "nodemon backend/server.js",
    "client": "react-scripts start",
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "build": "react-scripts build",
    "test": "jest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "axios": "^1.5.0",
    "simple-peer": "^9.11.1",
    "socket.io-client": "^4.7.2",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "body-parser": "^1.20.2",
    "express-validator": "^7.0.1",
    "mongoose": "^7.5.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "razorpay": "^2.9.2",
    "stripe": "^13.6.0",
    "pdfkit": "^0.13.0",
    "multer": "^1.4.5-lts.1",
    "aws-sdk": "^2.1450.0",
    "socket.io": "^4.7.2",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "express-mongo-sanitize": "^2.2.0",
    "winston": "^3.10.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "concurrently": "^8.2.1",
    "eslint": "^8.50.0",
    "prettier": "^3.0.3",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.3",
    "jest": "^29.7.0"
  }
}
```

Then simply run:
```bash
npm install
```

---

## 🌍 External Services & APIs

### Required External Services

#### 1. MongoDB Atlas (Production Database)
**Sign Up**: https://www.mongodb.com/cloud/atlas  
**Purpose**: Cloud-hosted MongoDB database  
**Cost**: Free tier available (512MB)  

**Setup**:
1. Create account at MongoDB Atlas
2. Create cluster
3. Get connection string
4. Add to `.env`: `MONGODB_URI=mongodb+srv://...`

---

#### 2. AWS S3 (File Storage)
**Sign Up**: https://aws.amazon.com/  
**Purpose**: Store medical records and images  
**Cost**: Pay-as-you-go (free tier available)  

**Setup**:
1. Create AWS account
2. Create S3 bucket
3. Generate access keys (IAM)
4. Add to `.env`:
   ```
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_S3_BUCKET=your_bucket_name
   AWS_REGION=us-east-1
   ```

---

#### 3. Razorpay (Payment Gateway)
**Sign Up**: https://razorpay.com/  
**Purpose**: Process payments in India  
**Cost**: 2% transaction fee  

**Setup**:
1. Create Razorpay account
2. Get API keys from dashboard
3. Add to `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   ```

---

#### 4. Stripe (International Payments)
**Sign Up**: https://stripe.com/  
**Purpose**: Process international payments  
**Cost**: 2.9% + 30¢ per transaction  

**Setup**:
1. Create Stripe account
2. Get API keys from dashboard
3. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

---

### Optional External Services

#### 5. Twilio (SMS/Voice)
**Sign Up**: https://www.twilio.com/  
**Purpose**: SMS notifications and voice calls  
**Cost**: Pay-as-you-go  

**Setup**:
```bash
npm install twilio

# .env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

#### 6. SendGrid (Email)
**Sign Up**: https://sendgrid.com/  
**Purpose**: Transactional emails  
**Cost**: Free tier (100 emails/day)  

**Setup**:
```bash
npm install @sendgrid/mail

# .env
SENDGRID_API_KEY=your_api_key
```

---

#### 7. Firebase (Push Notifications)
**Sign Up**: https://firebase.google.com/  
**Purpose**: Mobile push notifications  
**Cost**: Free tier available  

**Setup**:
```bash
npm install firebase-admin

# Add Firebase service account JSON
FIREBASE_SERVICE_ACCOUNT=path/to/serviceAccount.json
```

---

## 🔒 Environment Variables Checklist

### Required Variables
```bash
# Database
✅ MONGODB_URI=mongodb://localhost:27017/malabarbazaar

# Server
✅ PORT=5000
✅ NODE_ENV=development
✅ JWT_SECRET=your_secret_key_here

# Payment (choose one)
✅ PAYMENT_PROVIDER=razorpay
✅ RAZORPAY_KEY_ID=your_key
✅ RAZORPAY_KEY_SECRET=your_secret
```

### Optional Variables
```bash
# File Storage
⬜ AWS_ACCESS_KEY_ID=your_key
⬜ AWS_SECRET_ACCESS_KEY=your_secret
⬜ AWS_S3_BUCKET=your_bucket
⬜ AWS_REGION=us-east-1

# WebRTC (for production)
⬜ TURN_SERVER_URL=turn:your-server.com
⬜ TURN_USERNAME=username
⬜ TURN_PASSWORD=password

# Email
⬜ SENDGRID_API_KEY=your_key

# SMS
⬜ TWILIO_ACCOUNT_SID=your_sid
⬜ TWILIO_AUTH_TOKEN=your_token
```

---

## 📊 Dependency Size Analysis

### Frontend Bundle Size
```
React Core: ~40 KB (gzipped)
React Router: ~12 KB
Axios: ~15 KB
Simple-Peer: ~30 KB
Socket.io-client: ~50 KB
Total Frontend: ~500 KB (including all components)
```

### Backend Bundle Size
```
Express: ~200 KB
Mongoose: ~600 KB
Socket.io: ~300 KB
Payment SDKs: ~400 KB
Total Backend: ~2 MB
```

---

## 🚀 Performance Optimization

### Reduce Bundle Size
```bash
# Use production build
npm run build

# Analyze bundle
npm install --save-dev webpack-bundle-analyzer
```

### Lazy Loading
```javascript
// Lazy load components
const VideoConsultation = React.lazy(() => 
  import('./components/VideoConsultation')
);
```

### Code Splitting
```javascript
// Split vendor chunks
// In webpack config
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
      },
    },
  },
}
```

---

## ✅ Dependency Health Check

### Check for Updates
```bash
# Check outdated packages
npm outdated

# Update packages
npm update

# Update to latest versions
npx npm-check-updates -u
npm install
```

### Security Audit
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may break compatibility)
npm audit fix --force
```

---

## 📞 Troubleshooting

### Common Dependency Issues

**Issue**: `Cannot find module 'xxx'`
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Version conflicts
```bash
# Solution: Clear cache and reinstall
npm cache clean --force
npm install
```

**Issue**: Native module compilation errors
```bash
# Solution: Install build tools
# Windows
npm install --global windows-build-tools

# macOS
xcode-select --install

# Linux
sudo apt-get install build-essential
```

---

## 🎉 Ready to Go!

Once all dependencies are installed, you're ready to start developing!

```bash
# Verify installation
npm list --depth=0

# Start development
npm run dev
```

---

**Last Updated**: July 7, 2026  
**Version**: 1.0.0  
**Total Dependencies**: 40+  
**Estimated Install Time**: 5-10 minutes
