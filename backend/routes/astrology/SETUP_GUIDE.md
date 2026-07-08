# Astrology Module Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Razorpay Integration](#razorpay-integration)
5. [Email Service Setup](#email-service-setup)
6. [SMS Service Setup](#sms-service-setup)
7. [Notification Scheduler](#notification-scheduler)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **MongoDB**: v5.x or higher
- **Redis**: v6.x or higher (optional, for caching)

### Required Accounts
- **Razorpay Account**: For payment processing
- **Email Service**: SendGrid, AWS SES, or SMTP server
- **SMS Service**: Twilio, AWS SNS, or similar (optional)

---

## Environment Configuration

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGO_URI=mongodb://localhost:27017/malabarbazaar
MONGODB_DB_NAME=malabarbazaar

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_key
RAZORPAY_KEYS_ROTATED_AT=2026-07-01T00:00:00.000Z

# Email Service (Choose one)
# Option 1: SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@astronila.com
SENDGRID_FROM_NAME=AstroNila

# Option 2: AWS SES
AWS_SES_ACCESS_KEY_ID=your_aws_access_key
AWS_SES_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@astronila.com

# Option 3: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@astronila.com

# SMS Service (Optional)
# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS SNS
AWS_SNS_ACCESS_KEY_ID=your_aws_access_key
AWS_SNS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_SNS_REGION=us-east-1

# Background Services
DISABLE_BACKGROUND_SERVICES=false

# Logging
LOG_LEVEL=info
```

---

## Database Setup

### 1. Install MongoDB

**On Ubuntu/Debian:**
```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**On macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**On Windows:**
Download and install from: https://www.mongodb.com/try/download/community

### 2. Create Database

```bash
# Connect to MongoDB
mongosh

# Create database
use malabarbazaar

# Create collections
db.createCollection("astrologyuserprofiles")
db.createCollection("astrologyconsultationbookings")
db.createCollection("astrologyconsultants")
db.createCollection("astrologyoperationalevents")
db.createCollection("astrologywebhookaudits")

# Exit
exit
```

### 3. Seed Initial Data

```bash
npm run seed:astrology
```

This will create:
- Default consultants
- Sample availability slots
- Test user profiles (in development only)

---

## Razorpay Integration

### 1. Create Razorpay Account

1. Visit https://razorpay.com
2. Sign up for an account
3. Complete KYC verification
4. Navigate to Settings → API Keys

### 2. Get API Credentials

**Test Mode:**
- Key ID: `rzp_test_xxxxxxxxxx`
- Key Secret: Available in dashboard

**Live Mode:**
- Key ID: `rzp_live_xxxxxxxxxx`
- Key Secret: Available in dashboard (keep secure!)

### 3. Configure Webhooks

1. Go to Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/astrology/payments/webhook/razorpay`
3. Select events to receive:
   - `payment.captured`
   - `payment.authorized`
   - `payment.failed`
   - `order.paid`
   - `refund.processed`
4. Save webhook secret to environment variable

### 4. Test Payment Flow

```bash
# Run test payment script
npm run test:payment

# Or use Razorpay's test cards:
# Card Number: 4111 1111 1111 1111
# Expiry: Any future date
# CVV: Any 3 digits
```

### 5. Security Best Practices

✅ **DO:**
- Store keys in environment variables
- Use test keys in development
- Rotate keys every 90 days
- Verify webhook signatures
- Use HTTPS in production

❌ **DON'T:**
- Commit keys to version control
- Share keys in chat/email
- Use live keys in development
- Skip signature verification
- Log sensitive payment data

---

## Email Service Setup

### Option 1: SendGrid

1. **Create Account**: https://sendgrid.com
2. **Verify Domain**: Settings → Sender Authentication
3. **Create API Key**: Settings → API Keys → Create API Key
4. **Test Email**:

```bash
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer YOUR_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@astronila.com"},
    "subject": "Test Email",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

### Option 2: Gmail SMTP

1. **Enable 2FA**: On your Google account
2. **Generate App Password**: 
   - Go to Google Account → Security
   - 2-Step Verification → App passwords
   - Select "Mail" and "Other"
3. **Use credentials**:
   - Host: smtp.gmail.com
   - Port: 587
   - User: your-email@gmail.com
   - Pass: generated app password

### Option 3: AWS SES

1. **Create AWS Account**
2. **Verify Email/Domain**: SES → Verified identities
3. **Create IAM User**: With SES permissions
4. **Generate Access Keys**
5. **Move out of Sandbox**: Request production access

---

## SMS Service Setup (Optional)

### Twilio Setup

1. **Create Account**: https://www.twilio.com
2. **Get Phone Number**: Buy a number or use trial
3. **Get Credentials**:
   - Account SID
   - Auth Token
4. **Test SMS**:

```bash
npm run test:sms
```

### AWS SNS Setup

1. **Enable SNS**: In AWS Console
2. **Create Topic**: For SMS
3. **Request SMS Limit Increase**
4. **Generate IAM Credentials**

---

## Notification Scheduler

The notification scheduler runs automatically on server start.

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Horoscope | 6:00 AM | Send personalized horoscopes |
| Festival Reminders | 8:00 AM | Upcoming festival notifications |
| Dasha Alerts | 9:00 AM | Planetary period changes |
| Muhurat Alerts | 7:00 AM | Auspicious timing notifications |
| Consultation Reminders | Every 15 min | 30-minute reminders before sessions |

### Enable/Disable Schedulers

**Disable all background services:**
```env
DISABLE_BACKGROUND_SERVICES=true
```

**Check scheduler status:**
```bash
npm run scheduler:status
```

**Manually trigger jobs (testing):**
```bash
# Send daily horoscopes
npm run scheduler:horoscope

# Send festival reminders
npm run scheduler:festivals

# Send consultation reminders
npm run scheduler:consultations
```

---

## Testing

### 1. Install Test Dependencies

```bash
npm install --save-dev jest supertest @testing-library/react @testing-library/jest-dom
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- profile.routes.test.js

# Run with coverage
npm test -- --coverage

# Watch mode (development)
npm test -- --watch
```

### 3. Test Coverage Goals

- **Backend Routes**: >80% coverage
- **Frontend Hooks**: >75% coverage
- **Frontend Components**: >70% coverage
- **Services**: >80% coverage

### 4. Integration Testing

```bash
# Run integration tests
npm run test:integration

# Test payment flow
npm run test:payment-flow

# Test notification system
npm run test:notifications
```

---

## Deployment

### Production Checklist

#### Security
- [ ] Change all default passwords/secrets
- [ ] Use HTTPS/SSL certificates
- [ ] Enable CORS with specific origins
- [ ] Set secure cookie options
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerting

#### Environment
- [ ] Set `NODE_ENV=production`
- [ ] Use production database
- [ ] Configure production email service
- [ ] Set up error logging (Sentry, etc.)
- [ ] Enable compression
- [ ] Set up CDN for static assets

#### Database
- [ ] Enable MongoDB authentication
- [ ] Set up database backups
- [ ] Create database indexes
- [ ] Configure replica sets (if needed)

#### Razorpay
- [ ] Switch to live API keys
- [ ] Update webhook URLs
- [ ] Complete KYC verification
- [ ] Set up settlement account

### Deployment Steps

#### 1. Build Application

```bash
# Install dependencies
npm ci --production

# Build frontend
npm run build

# Run database migrations
npm run migrate
```

#### 2. Environment Setup

```bash
# Copy production env file
cp .env.production .env

# Verify configuration
npm run config:verify
```

#### 3. Start Services

```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Or using systemd
sudo systemctl start astronila
sudo systemctl enable astronila
```

#### 4. Verify Deployment

```bash
# Health check
curl https://yourdomain.com/health

# Test API
curl https://yourdomain.com/api/astrology/consultants

# Check logs
pm2 logs astronila
# or
sudo journalctl -u astronila -f
```

---

## Troubleshooting

### Common Issues

#### 1. "Razorpay credentials not configured"

**Solution:**
```bash
# Check environment variables
echo $RAZORPAY_KEY_ID
echo $RAZORPAY_KEY_SECRET

# Ensure .env is loaded
node -e "require('dotenv').config(); console.log(process.env.RAZORPAY_KEY_ID)"
```

#### 2. "Unable to connect to MongoDB"

**Solution:**
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Test connection
mongosh mongodb://localhost:27017/malabarbazaar

# Check firewall
sudo ufw status
sudo ufw allow 27017
```

#### 3. "Emails not sending"

**Solution:**
```bash
# Test email service
npm run test:email

# Check SMTP credentials
# Verify sender email is authenticated
# Check spam folder
# Review email service logs
```

#### 4. "Webhook signature validation failed"

**Solution:**
```bash
# Verify webhook secret matches Razorpay dashboard
# Check webhook URL is publicly accessible
# Verify HTTPS is configured
# Review webhook audit logs in database
```

#### 5. "Scheduler not running"

**Solution:**
```bash
# Check if background services are enabled
echo $DISABLE_BACKGROUND_SERVICES

# Check server logs
tail -f logs/combined.log | grep scheduler

# Manually trigger scheduler
npm run scheduler:test
```

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
DEBUG=astrology:*
```

View detailed logs:
```bash
npm run dev:debug
```

---

## Monitoring

### Health Checks

```bash
# Server health
curl http://localhost:5000/health

# Database health
curl http://localhost:5000/health/db

# Scheduler health
curl http://localhost:5000/health/scheduler
```

### Metrics to Monitor

- API response times
- Payment success rate
- Webhook processing time
- Email delivery rate
- SMS delivery rate
- Scheduler execution time
- Database query performance
- Error rates by endpoint

### Recommended Tools

- **Application**: PM2, Forever
- **Logging**: Winston, Sentry
- **Monitoring**: New Relic, Datadog
- **Uptime**: UptimeRobot, Pingdom
- **Analytics**: Google Analytics, Mixpanel

---

## Support

### Documentation
- API Documentation: `backend/routes/astrology/API_DOCUMENTATION.md`
- Notification System: `backend/services/ASTROLOGY_NOTIFICATIONS_README.md`

### Contact
- Technical Support: tech-support@astronila.com
- API Issues: api-support@astronila.com
- Emergency: +91-XXXX-XXXXXX

---

**Last Updated**: July 7, 2026
**Version**: 1.0.0
