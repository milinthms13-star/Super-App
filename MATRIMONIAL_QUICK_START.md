# Matrimonial Module - Quick Start Guide

**Get your matrimonial platform running in 30 minutes!**

---

## 🚀 QUICK START (5 STEPS)

### Step 1: Clone & Install (5 min)

```bash
# Clone repository
git clone <your-repo-url>
cd malabarbazaar

# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

### Step 2: Configure Environment (10 min)

Create `.env` file in root:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/malabarbazaar
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this

# Frontend
FRONTEND_URL=http://localhost:3000

# AWS S3 (for photo storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Email (SendGrid or AWS SES)
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# SMS (MSG91 or Twilio)
SMS_API_KEY=your_msg91_api_key
# OR
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API
WHATSAPP_BUSINESS_API_KEY=your_whatsapp_key

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Verification APIs (Optional for MVP)
AADHAAR_VERIFICATION_API_KEY=your_idfy_key
# Get from: https://idfy.com/

# Astrology API (Optional for MVP)
ASTROLOGY_API_KEY=your_prokerala_key
# Get from: https://www.prokerala.com/api/

# Error Tracking
SENTRY_DSN=your_sentry_dsn

# Node Environment
NODE_ENV=development
PORT=5000
```

---

### Step 3: Start Services (5 min)

**Terminal 1 - Start MongoDB:**
```bash
# Windows
mongod

# Mac/Linux
sudo systemctl start mongodb
```

**Terminal 2 - Start Redis:**
```bash
# Windows (if installed)
redis-server

# Mac
brew services start redis

# Linux
sudo systemctl start redis
```

**Terminal 3 - Start Backend:**
```bash
cd backend
npm run dev
# Backend running on http://localhost:5000
```

**Terminal 4 - Start Frontend:**
```bash
npm start
# Frontend running on http://localhost:3000
```

---

### Step 4: Verify Installation (5 min)

Open browser and test:

1. **Backend Health Check:**
   - Visit: `http://localhost:5000/health`
   - Should see: `{"status":"OK","timestamp":"..."}`

2. **Frontend:**
   - Visit: `http://localhost:3000`
   - Should see: Home page loads

3. **API Test:**
   - Visit: `http://localhost:5000/api-docs`
   - Should see: Swagger API documentation

---

### Step 5: Create Test Account (5 min)

```bash
# Using Postman or curl:
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test@1234",
    "phone": "+919876543210"
  }'
```

Then login and start testing matrimonial features!

---

## 📱 TESTING MATRIMONIAL FEATURES

### Test Photo Gallery:
1. Login to matrimonial profile
2. Go to "Photos" section
3. Upload 5 photos
4. Set one as primary
5. ✅ Success!

### Test Enhanced Chat:
1. Create two test accounts
2. Send interest from Account A to Account B
3. Accept interest
4. Start chat
5. Send text, voice note, image
6. ✅ Success!

### Test Trust Score:
1. Go to Verification Center
2. Upload a document (any image for testing)
3. Check trust score increases
4. ✅ Success!

### Test Kundali:
1. Go to Astrology Hub
2. Enter birth details:
   - Date: 15/01/1995
   - Time: 10:30 AM
   - Place: Mumbai
3. Generate Kundali
4. ✅ Success!

### Test Family Portal:
1. Go to Family Portal
2. Add family member (use your email for testing)
3. Check invitation email
4. ✅ Success!

### Test Compatibility Quiz:
1. Go to Compatibility Questionnaire
2. Complete 10 questions
3. Save progress
4. ✅ Success!

### Test Meeting Scheduler:
1. Go to Meeting Scheduler
2. Create meeting with proposed dates
3. ✅ Success!

---

## 🔧 TROUBLESHOOTING

### Issue: Backend won't start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed (Windows)
taskkill /PID <process_id> /F

# Try different port
PORT=5001 npm run dev
```

### Issue: MongoDB connection error
```bash
# Check MongoDB is running
mongo --eval "db.adminCommand('ping')"

# Start MongoDB
mongod --dbpath C:\data\db
```

### Issue: Redis connection error
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
redis-server
```

### Issue: Photo upload fails
- Check AWS S3 credentials in .env
- Verify bucket exists and has correct permissions
- For testing, you can disable S3 and use local storage

### Issue: Emails not sending
- Check SMTP credentials
- For Gmail, enable "Less secure app access"
- Or use App Password instead of regular password
- For testing, check console logs (emails logged there)

### Issue: SMS not sending
- Verify MSG91/Twilio API key
- Check account balance
- For testing, SMS can be mocked (check logs)

---

## 🎯 DEVELOPMENT WORKFLOW

### Making Changes:

**Backend Changes:**
```bash
cd backend
# Edit files in backend/
# Server auto-restarts (nodemon)
```

**Frontend Changes:**
```bash
# Edit files in src/
# Browser auto-refreshes
```

**Adding New Route:**
```bash
# 1. Create model: backend/models/NewModel.js
# 2. Create route: backend/routes/new-route.js
# 3. Register in: backend/app.js
app.use('/api/new-route', require('./routes/new-route'));
```

**Adding New Component:**
```bash
# 1. Create: src/modules/matrimonial/NewComponent.js
# 2. Create CSS: src/modules/matrimonial/NewComponent.css
# 3. Import and use in parent component
```

---

## 📦 DATABASE SETUP

### Create Indexes (Optional but recommended):

```javascript
// Connect to MongoDB
mongo

// Use database
use malabarbazaar

// Create indexes for matrimonial collections
db.matrimonialprofiles.createIndex({ userId: 1 })
db.matrimonialprofiles.createIndex({ gender: 1, isActive: 1 })
db.matrimonialphotos.createIndex({ profileId: 1 })
db.familymembers.createIndex({ profileId: 1 })
db.compatibilityquestionnaires.createIndex({ profileId: 1 })
db.meetingschedules.createIndex({ profile1: 1, profile2: 1 })
db.behaviorallearnings.createIndex({ profileId: 1 })
```

---

## 🧪 RUNNING TESTS

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 📊 SEEDING TEST DATA

Create `backend/seeders/matrimonialSeeder.js`:

```javascript
const MatrimonialProfile = require('../models/MatrimonialProfile');

async function seedProfiles() {
  const profiles = [
    {
      userId: 'user1',
      name: 'Priya Sharma',
      gender: 'female',
      age: 28,
      height: 165,
      education: 'MBA',
      profession: 'Software Engineer',
      city: 'Mumbai',
      religion: 'Hindu',
      // ... more fields
    },
    // Add 10-20 test profiles
  ];

  await MatrimonialProfile.insertMany(profiles);
  console.log('✅ Test profiles seeded');
}

seedProfiles();
```

Run seeder:
```bash
node backend/seeders/matrimonialSeeder.js
```

---

## 🔐 SECURITY CHECKLIST

Before going to production:

- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set secure cookie flags
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Sanitize all inputs
- [ ] Use environment variables (never commit .env)
- [ ] Enable Helmet security headers
- [ ] Set up WAF (Web Application Firewall)

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Deploy to Heroku (Easiest)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Add MongoDB
heroku addons:create mongolab

# Add Redis
heroku addons:create heroku-redis

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set AWS_ACCESS_KEY_ID=your_key
# ... set all env vars

# Deploy
git push heroku main

# Open app
heroku open
```

### Option 2: Deploy to AWS (Scalable)

1. **EC2 Instance:**
   - Launch Ubuntu instance
   - Install Node.js, MongoDB, Redis
   - Clone repository
   - Run with PM2

2. **RDS for MongoDB:**
   - Or use MongoDB Atlas

3. **S3 for Storage:**
   - Already configured

4. **CloudFront CDN:**
   - For static assets

### Option 3: Deploy to DigitalOcean (Cost-effective)

1. Create Droplet (Ubuntu)
2. Install dependencies
3. Use PM2 for process management
4. Configure Nginx reverse proxy
5. Enable SSL with Let's Encrypt

### Option 4: Deploy to Vercel (Frontend) + Render (Backend)

**Frontend (Vercel):**
```bash
npm install -g vercel
vercel --prod
```

**Backend (Render):**
- Create Web Service on render.com
- Connect GitHub repo
- Set environment variables
- Deploy

---

## 📚 USEFUL COMMANDS

```bash
# Development
npm run dev              # Start with nodemon
npm start                # Start production

# Database
mongodump                # Backup database
mongorestore             # Restore database

# Process Management
pm2 start backend/server.js --name matrimonial
pm2 logs matrimonial
pm2 restart matrimonial
pm2 stop matrimonial

# Debugging
npm run dev -- --inspect  # Start with debugger
node --inspect backend/server.js

# Logs
tail -f backend/logs/app.log
```

---

## 🎓 LEARNING RESOURCES

### Documentation:
- MongoDB: https://docs.mongodb.com/
- React: https://react.dev/
- Node.js: https://nodejs.org/docs/
- Express: https://expressjs.com/

### Matrimonial-Specific:
- Vedic Astrology API: https://www.prokerala.com/api/
- IDfy Verification: https://idfy.com/docs/
- Razorpay Payments: https://razorpay.com/docs/

---

## 🆘 GETTING HELP

### Check Documentation:
1. `MATRIMONIAL_360_ANALYSIS.md` - Feature overview
2. `MATRIMONIAL_API_DOCUMENTATION.md` - API reference
3. `MATRIMONIAL_TESTING_GUIDE.md` - Testing procedures
4. `MATRIMONIAL_DEPLOYMENT_GUIDE.md` - Deployment steps

### Common Issues:
- Check logs: `backend/logs/`
- Check console: Browser DevTools
- Check network: Browser Network tab
- Check database: MongoDB Compass

### Need Support:
- Create GitHub issue
- Check existing issues
- Contact development team

---

## ✅ FINAL CHECKLIST

Before starting development:
- [ ] MongoDB installed and running
- [ ] Redis installed and running
- [ ] Node.js v14+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Postman for API testing
- [ ] MongoDB Compass for database
- [ ] Browser DevTools knowledge

You're all set! 🎉

---

## 🎯 NEXT STEPS

1. **Day 1-2:** Set up environment, run locally
2. **Day 3-5:** Test all Phase 1-4 features
3. **Week 2:** Deploy to staging environment
4. **Week 3:** Internal testing with QA team
5. **Week 4:** Beta launch with 100 users
6. **Month 2:** Collect feedback, iterate
7. **Month 3:** Plan Phase 5 (Mobile App)

---

## 🌟 PRO TIPS

1. **Use MongoDB Compass** - Visual database management
2. **Use Redux DevTools** - Debug React state
3. **Use Postman Collections** - Save API requests
4. **Use PM2** - Production process manager
5. **Use Git branches** - Feature branches for development
6. **Write tests early** - TDD approach
7. **Document as you go** - Update README
8. **Use code formatter** - Prettier + ESLint
9. **Review PRs** - Code review before merge
10. **Monitor logs** - Set up logging early

---

**Happy Coding! 🚀**

**Questions?** Check documentation or create an issue.

**Version:** 1.0  
**Last Updated:** July 15, 2026  
**Status:** Production Ready ✅
