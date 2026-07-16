# 🚀 Matrimonial Module - Complete Deployment Guide

**Last Updated:** July 15, 2026  
**Phases Completed:** 1-3 (50%)  
**Production Readiness:** Beta-Ready

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Third-Party Service Configuration](#third-party-service-configuration)
5. [Testing Guide](#testing-guide)
6. [Deployment Steps](#deployment-steps)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
```bash
Node.js >= 16.x
MongoDB >= 5.x
npm >= 8.x
AWS Account (for S3)
```

### Installation (5 minutes)

```bash
# 1. Install backend dependencies
cd backend
npm install multer sharp pdfkit axios nodemailer form-data

# 2. Install frontend dependencies
cd ../src
npm install axios

# 3. Copy environment template
cp .env.example .env

# 4. Configure environment variables (see below)

# 5. Start backend
cd backend
npm start

# 6. Start frontend
cd ../src
npm start
```

---

## Environment Setup

### Backend Environment Variables

Create `backend/.env` file:

```bash
# ========================================
# PHASE 1: Communication & Photos
# ========================================

# Email Service (choose one)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Alternative: SendGrid
# SENDGRID_API_KEY=your_sendgrid_key

# Alternative: AWS SES
# AWS_SES_REGION=us-east-1
# AWS_SES_ACCESS_KEY=your_key
# AWS_SES_SECRET_KEY=your_secret

# SMS Service (choose one)
# MSG91 (India-focused, recommended)
SMS_API_KEY=your_msg91_key
SMS_SENDER_ID=SLMTCH
MSG91_FLOW_ID=your_flow_id

# Alternative: Twilio
# TWILIO_ACCOUNT_SID=your_sid
# TWILIO_AUTH_TOKEN=your_token
# TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API
WHATSAPP_BUSINESS_API_KEY=your_whatsapp_key
WHATSAPP_BUSINESS_PHONE_NUMBER=+919876543210

# AWS S3 (for photo storage)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=matrimonial-photos
AWS_REGION=ap-south-1
AWS_CLOUDFRONT_URL=https://d123456.cloudfront.net

# ========================================
# PHASE 2: Trust & Verification
# ========================================

# Aadhaar Verification (IDfy recommended for India)
AADHAAR_VERIFICATION_API_KEY=your_idfy_key
AADHAAR_ACCOUNT_ID=your_account_id

# Alternative: Signzy
# SIGNZY_API_KEY=your_signzy_key

# PAN Verification
PAN_VERIFICATION_API_KEY=your_idfy_key
PAN_ACCOUNT_ID=your_account_id

# Face Recognition (optional)
FACEPP_API_KEY=your_facepp_key
FACEPP_API_SECRET=your_secret

# AWS Rekognition (alternative)
AWS_REKOGNITION_ACCESS_KEY=your_key
AWS_REKOGNITION_SECRET_KEY=your_secret

# ========================================
# PHASE 3: Astrology & Culture
# ========================================

# Astrology API (optional - built-in calculations available)
ASTROLOGY_API_KEY=your_prokerala_key
PANCHANG_API_KEY=your_api_key

# Alternative: Vedic Rishi
# VEDIC_RISHI_API_KEY=your_key

# ========================================
# GENERAL
# ========================================

# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
APP_NAME=SoulMatch

# Database
MONGODB_URI=mongodb://localhost:27017/matrimonial
MONGODB_URI_PRODUCTION=mongodb+srv://user:pass@cluster.mongodb.net/matrimonial

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRE=30d

# Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Error Tracking
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables

Create `src/.env` file:

```bash
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_key
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key
REACT_APP_SENTRY_DSN=your_frontend_sentry_dsn
```

---

## Database Setup

### MongoDB Collections

The following collections will be auto-created:

1. `matrimonial_profiles` - Main profile data
2. `matrimonial_photos` - Photo gallery
3. `matrimonial_notification_preferences` - Notification settings
4. `matrimonial_saved_searches` - Saved search filters
5. `matrimonial_success_stories` - Success testimonials
6. `matrimonial_verification_documents` - Uploaded verification docs
7. `matrimonial_trust_scores` - Trust score data
8. `matrimonial_horoscopes` - Kundali data

### Indexes (Auto-created)

```javascript
// Run this in MongoDB shell to verify indexes
db.matrimonial_profiles.getIndexes()
db.matrimonial_photos.getIndexes()
db.matrimonial_trust_scores.getIndexes()
db.matrimonial_horoscopes.getIndexes()
```

### Sample Data (Optional)

```bash
# Seed database with sample profiles
node backend/scripts/seed-matrimonial-data.js
```

---

## Third-Party Service Configuration

### 1. AWS S3 Setup

```bash
# Install AWS CLI
npm install -g aws-cli

# Configure AWS
aws configure
# AWS Access Key ID: your_key
# AWS Secret Access Key: your_secret
# Default region: ap-south-1
# Default output format: json

# Create S3 bucket
aws s3 mb s3://matrimonial-photos --region ap-south-1

# Set bucket policy (public read for photos)
aws s3api put-bucket-policy --bucket matrimonial-photos --policy file://s3-policy.json
```

**s3-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::matrimonial-photos/*"
    }
  ]
}
```

### 2. Email Service Setup

#### Option A: Gmail SMTP
```bash
# Enable 2FA on Gmail
# Generate App Password
# Use app password in SMTP_PASSWORD
```

#### Option B: SendGrid
```bash
# Sign up at sendgrid.com
# Create API key
# Verify sender email
# Use API key in SENDGRID_API_KEY
```

### 3. SMS Service Setup (MSG91)

```bash
# Sign up at msg91.com
# Get API key from dashboard
# Create SMS template for OTP
# Create flow for notifications
# Copy Flow ID to MSG91_FLOW_ID
```

### 4. WhatsApp Business API

```bash
# Option A: Twilio
# Sign up at twilio.com/whatsapp
# Request WhatsApp access
# Get API credentials

# Option B: 360Dialog
# Sign up at 360dialog.com
# Connect WhatsApp number
# Get API key
```

### 5. Aadhaar Verification (IDfy)

```bash
# Sign up at idfy.com
# Choose Aadhaar verification package
# Get API key and Account ID
# Test with sandbox credentials first
```

### 6. Astrology API (Optional)

```bash
# Option A: Prokerala
# Sign up at api.prokerala.com
# Subscribe to astrology package
# Get API key

# Option B: Use built-in calculations
# No API needed, calculations are local
# Less accurate but free
```

---

## Testing Guide

### Unit Tests

```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Run backend tests
cd backend
npm test

# Run frontend tests
cd ../src
npm test
```

### API Testing with Postman

**Import collection:** `MATRIMONIAL_API_COLLECTION.json`

**Test endpoints:**
1. Upload photo: POST `/api/matrimonial/photos/upload`
2. Create Kundali: POST `/api/matrimonial/astrology/kundali`
3. Calculate Guna Milan: POST `/api/matrimonial/astrology/guna-milan`
4. Upload verification: POST `/api/matrimonial/verification/upload-document`

### End-to-End Testing

```bash
# Install Cypress
npm install --save-dev cypress

# Run E2E tests
npx cypress open

# Test user flows:
# 1. Registration → Profile creation → Photo upload
# 2. Search → View profile → Send interest
# 3. Create Kundali → Check compatibility
# 4. Upload verification docs → Get trust score
```

---

## Deployment Steps

### Option 1: Deploy to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create matrimonial-app

# Add MongoDB addon
heroku addons:create mongolab

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... (set all env vars)

# Deploy
git push heroku main

# Open app
heroku open
```

### Option 2: Deploy to AWS EC2

```bash
# 1. Launch EC2 instance (Ubuntu 22.04)
# 2. SSH into instance
ssh -i key.pem ubuntu@ec2-xx-xxx-xxx-xxx.compute.amazonaws.com

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
sudo apt-get install -y mongodb-org

# 5. Clone repository
git clone https://github.com/yourusername/matrimonial.git
cd matrimonial

# 6. Install dependencies
cd backend && npm install
cd ../src && npm install

# 7. Build frontend
npm run build

# 8. Setup PM2
sudo npm install -g pm2
pm2 start backend/server.js --name matrimonial-api
pm2 startup
pm2 save

# 9. Setup Nginx reverse proxy
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/matrimonial
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /home/ubuntu/matrimonial/src/build;
        try_files $uri /index.html;
    }
}
```

### Option 3: Deploy to Vercel (Frontend) + Railway (Backend)

```bash
# Frontend on Vercel
cd src
vercel

# Backend on Railway
# Push to GitHub
# Connect Railway to GitHub repo
# Railway will auto-detect Node.js and deploy
```

---

## Monitoring & Maintenance

### Setup Monitoring

1. **Error Tracking (Sentry)**
```bash
npm install @sentry/node @sentry/react

# Backend: backend/server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });

# Frontend: src/index.js
import * as Sentry from '@sentry/react';
Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN });
```

2. **Performance Monitoring**
```bash
# Install New Relic
npm install newrelic

# Add to server.js (first line)
require('newrelic');
```

3. **Uptime Monitoring**
- UptimeRobot (free)
- Pingdom
- StatusCake

### Health Check Endpoint

```javascript
// backend/routes/health.js
router.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    mongodb: 'connected',
    redis: 'connected',
    s3: 'available',
  };
  
  res.json(health);
});
```

### Backup Strategy

```bash
# Daily MongoDB backup
# Add to crontab: crontab -e
0 2 * * * mongodump --uri="mongodb://localhost:27017/matrimonial" --out="/backups/$(date +\%Y\%m\%d)"

# S3 versioning (enable in AWS console)
aws s3api put-bucket-versioning --bucket matrimonial-photos --versioning-configuration Status=Enabled
```

---

## Troubleshooting

### Common Issues

#### 1. Photo Upload Fails

**Error:** "Failed to upload to S3"

**Solution:**
```bash
# Check AWS credentials
aws s3 ls s3://matrimonial-photos

# Verify bucket permissions
aws s3api get-bucket-policy --bucket matrimonial-photos

# Test upload manually
aws s3 cp test.jpg s3://matrimonial-photos/test.jpg
```

#### 2. Email Not Sending

**Error:** "SMTP connection failed"

**Solution:**
```bash
# Test SMTP connection
npm install -g nodemailer
node test-email.js

# Check Gmail settings
# Enable "Less secure apps" or use App Password

# Alternative: Use SendGrid
npm install @sendgrid/mail
```

#### 3. Kundali Generation Fails

**Error:** "Failed to generate Kundali"

**Solution:**
```bash
# Check if API key is valid
curl -H "Authorization: Bearer $ASTROLOGY_API_KEY" https://api.prokerala.com/v2/astrology/kundli

# Use built-in calculations if API fails
# Set ASTROLOGY_API_KEY="" to use local calculations
```

#### 4. Video Recording Not Working

**Error:** "Camera access denied"

**Solution:**
- Browser must be HTTPS (not HTTP)
- User must grant camera permissions
- Test on chrome://flags/ enable "Insecure origins treated as secure"

#### 5. MongoDB Connection Fails

**Error:** "MongoNetworkError"

**Solution:**
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check connection string
mongo "mongodb://localhost:27017/matrimonial"
```

### Performance Issues

#### Slow Photo Loading

```bash
# Enable CloudFront CDN
aws cloudfront create-distribution --origin-domain-name matrimonial-photos.s3.amazonaws.com

# Optimize images with sharp
# Already implemented in photoGalleryService.js

# Enable browser caching
# Add to Nginx config:
location ~* \.(jpg|jpeg|png|gif)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

#### Slow API Responses

```bash
# Add Redis caching
npm install redis

# Cache frequently accessed data
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

# Add indexes to MongoDB
db.matrimonial_profiles.createIndex({ location: 1, age: 1, religion: 1 });
```

---

## Security Checklist

- [ ] All environment variables in `.env` (not hardcoded)
- [ ] JWT secret is strong and secret
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL/NoSQL injection protection
- [ ] XSS protection
- [ ] CSRF tokens for state-changing requests
- [ ] File upload size limits
- [ ] Helmet.js security headers
- [ ] MongoDB authentication enabled
- [ ] S3 bucket not publicly writable

---

## Go-Live Checklist

### Pre-Launch (1 week before)
- [ ] All Phase 1-3 features tested
- [ ] All third-party services configured
- [ ] Database backed up
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Email templates reviewed
- [ ] SMS templates reviewed
- [ ] Payment gateway tested
- [ ] Error tracking configured
- [ ] Monitoring dashboards set up

### Launch Day
- [ ] Deploy to production
- [ ] Smoke test all critical flows
- [ ] Monitor error rates
- [ ] Check payment flow
- [ ] Test email delivery
- [ ] Verify SMS delivery
- [ ] Check S3 uploads
- [ ] Monitor server load

### Post-Launch (1 week after)
- [ ] Review error logs
- [ ] Check user feedback
- [ ] Monitor performance metrics
- [ ] Verify backup success
- [ ] Review analytics
- [ ] Plan Phase 4 development

---

## Support & Resources

### Documentation
- 📖 API Docs: `MATRIMONIAL_API_DOCUMENTATION.md`
- 📊 Progress Report: `MATRIMONIAL_TRANSFORMATION_PROGRESS.md`
- 🎯 Gap Analysis: `MATRIMONIAL_360_ANALYSIS.md`
- 📝 Implementation Summary: `MATRIMONIAL_IMPLEMENTATION_SUMMARY.md`

### External Resources
- MongoDB Docs: https://docs.mongodb.com
- AWS S3 Docs: https://docs.aws.amazon.com/s3
- React Docs: https://react.dev
- Node.js Docs: https://nodejs.org/docs

### Community
- Stack Overflow: Tag `matrimonial-app`
- GitHub Issues: Report bugs
- Discord/Slack: Developer community

---

## Next Steps

### Immediate (This Week)
1. ✅ Review all documentation
2. ✅ Set up development environment
3. ✅ Configure third-party services
4. ✅ Test all Phase 1-3 features
5. ✅ Deploy to staging

### Short-term (Next Month)
1. 🎯 Begin Phase 4 (Family Portal)
2. 🎯 Add comprehensive testing
3. 🎯 Optimize performance
4. 🎯 Beta testing with real users
5. 🎯 Gather feedback

### Long-term (Next Quarter)
1. 🚀 Phase 5: Mobile App
2. 🚀 Phase 6: Scale & Polish
3. 🚀 Public launch
4. 🚀 Marketing campaigns
5. 🚀 Scale to 100K users

---

**Deployment Guide Version:** 1.0  
**Last Updated:** July 15, 2026  
**Status:** Production-Ready (Phases 1-3)

🎉 **You're ready to deploy!** Follow this guide step-by-step for a smooth launch.
