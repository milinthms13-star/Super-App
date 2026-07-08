# Astrology Module Deployment Guide

## Overview
Comprehensive guide for deploying the AstroNila astrology module to production environments including cloud platforms, Docker, and traditional servers.

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Cloud Deployment](#cloud-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Traditional Server Deployment](#traditional-server-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Rollback Procedures](#rollback-procedures)
10. [Security Hardening](#security-hardening)

---

## Pre-Deployment Checklist

### Code & Build
- [ ] All tests passing (backend + frontend)
- [ ] Test coverage meets requirements (>85%)
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Version tagged in Git
- [ ] Build optimized for production
- [ ] Source maps generated and stored securely
- [ ] Dependencies audited for vulnerabilities

### Configuration
- [ ] Environment variables set for production
- [ ] Razorpay live keys configured
- [ ] Email service credentials configured
- [ ] SMS service credentials (if used)
- [ ] Database connection strings verified
- [ ] Redis connection configured
- [ ] CORS settings updated
- [ ] Rate limiting configured appropriately

### External Services
- [ ] Razorpay account verified and activated
- [ ] Razorpay webhook URL configured
- [ ] Email service domain verified
- [ ] SMS service credits available
- [ ] MongoDB cluster provisioned
- [ ] Redis instance available
- [ ] CDN configured for static assets
- [ ] SSL certificates installed

### Documentation
- [ ] API documentation up to date
- [ ] Deployment runbook prepared
- [ ] Rollback procedures documented
- [ ] Support team briefed
- [ ] User guide available

---

## Environment Configuration

### Production Environment Variables

Create `/etc/astronila/production.env`:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://astronila.com
API_BASE_URL=https://api.astronila.com

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/astronila?retryWrites=true&w=majority
MONGODB_DB_NAME=astronila_production
MONGO_POOL_SIZE=50

# Redis
REDIS_URL=redis://redis.astronila.internal:6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS_ENABLED=true

# JWT Authentication
JWT_SECRET=your_production_jwt_secret_min_32_chars
JWT_EXPIRE=7d

# Razorpay (LIVE KEYS)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_KEYS_ROTATED_AT=2026-07-01T00:00:00.000Z

# Email Service - SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@astronila.com
SENDGRID_FROM_NAME=AstroNila

# SMS Service - Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/astronila/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=30

# Security
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Background Services
DISABLE_BACKGROUND_SERVICES=false
CRON_TIMEZONE=Asia/Kolkata

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
NEW_RELIC_LICENSE_KEY=your_newrelic_key
ENABLE_APM=true

# CDN
CDN_URL=https://cdn.astronila.com
STATIC_ASSETS_URL=https://cdn.astronila.com/static
```

### Security Best Practices

**DO:**
- Store secrets in environment variables or secret managers
- Use different keys for each environment
- Rotate keys every 90 days
- Enable HTTPS/TLS everywhere
- Use strong, unique passwords

**DON'T:**
- Commit secrets to version control
- Use test keys in production
- Share keys via email/chat
- Disable security features
- Use default passwords

---

## Database Setup

### MongoDB Production Configuration

```javascript
// MongoDB connection with production options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  readPreference: 'primaryPreferred',
  compressors: ['snappy', 'zlib'],
};
```

### Database Migration

```bash
# Backup existing data
mongodump --uri="mongodb://localhost:27017/astronila_staging" --out=/backup/staging_$(date +%Y%m%d)

# Restore to production
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/astronila" /backup/staging_20260707

# Run migration scripts
node backend/migrations/001_add_astrology_indexes.js
node backend/migrations/002_migrate_consultant_data.js
```

### Database Indexes

Create indexes for optimal performance:

```javascript
// AstrologyUserProfile indexes
db.astrologyuserprofiles.createIndex({ userId: 1 }, { unique: true });
db.astrologyuserprofiles.createIndex({ sign: 1 });
db.astrologyuserprofiles.createIndex({ 'notifications.dailyHoroscope': 1 });

// AstrologyConsultationBooking indexes
db.astrologyconsultationbookings.createIndex({ userId: 1, status: 1 });
db.astrologyconsultationbookings.createIndex({ consultantId: 1, bookingDate: 1 });
db.astrologyconsultationbookings.createIndex({ paymentStatus: 1 });
db.astrologyconsultationbookings.createIndex({ status: 1, bookingDate: -1 });
db.astrologyconsultationbookings.createIndex({ paymentOrderId: 1 }, { sparse: true });

// AstrologyConsultant indexes
db.astrologyconsultants.createIndex({ email: 1 }, { unique: true });
db.astrologyconsultants.createIndex({ isActive: 1, rating: -1 });
```

---

## Cloud Deployment

### AWS Deployment

#### EC2 Instance Setup

```bash
# Connect to EC2 instance
ssh -i astronila-key.pem ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 16
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/astronila.git
cd astronila

# Install dependencies
npm ci --production

# Build application
npm run build

# Configure PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'astronila-backend',
    script: './backend/server.js',
    instances: 4,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/astronila/backend-error.log',
    out_file: '/var/log/astronila/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/astronila`:

```nginx
upstream backend {
    least_conn;
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.astronila.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.astronila.com;

    ssl_certificate /etc/letsencrypt/live/astronila.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/astronila.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/astrology/payments/webhook {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Razorpay webhook specific
        allow 52.66.162.215;
        allow 13.232.109.75;
        deny all;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/astronila /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### MongoDB Atlas Setup

1. **Create Cluster**:
   - Log in to MongoDB Atlas
   - Create new M10+ cluster for production
   - Select region closest to your servers
   - Enable backups (continuous and snapshots)

2. **Network Access**:
   - Add IP addresses of your servers
   - Or use VPC peering for better security

3. **Database Users**:
   - Create read-write user for application
   - Create read-only user for analytics
   - Use strong, unique passwords

4. **Connection String**:
```
mongodb+srv://astronila_app:PASSWORD@cluster.mongodb.net/astronila?retryWrites=true&w=majority
```

### Redis Configuration

Use AWS ElastiCache or Redis Cloud:

```bash
# Test Redis connection
redis-cli -h astronila-redis.xxxxx.cache.amazonaws.com -p 6379 -a your_password ping
```

---

## Docker Deployment

### Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:16-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Build step if needed
RUN npm run build || true

FROM node:16-alpine

WORKDIR /app

# Copy from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 5000

CMD ["node", "server.js"]
```

### Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=${MONGO_URI}
      - REDIS_URL=redis://redis:6379
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - astronila-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    networks:
      - astronila-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - astronila-network

volumes:
  redis-data:

networks:
  astronila-network:
    driver: bridge
```

### Deploy with Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=4
```

---

## Traditional Server Deployment

### Prerequisites

```bash
# Install required software
sudo apt update
sudo apt install -y build-essential
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Deployment Steps

```bash
# 1. Create application directory
sudo mkdir -p /var/www/astronila
sudo chown $USER:$USER /var/www/astronila

# 2. Clone or upload code
cd /var/www/astronila
git clone https://github.com/yourusername/astronila.git .

# 3. Install dependencies
npm ci --production

# 4. Create environment file
sudo nano /etc/astronila/production.env
# Paste production environment variables

# 5. Start with PM2
pm2 start ecosystem.config.js --env production

# 6. Configure PM2 startup
pm2 save
pm2 startup

# 7. Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Check backend health
curl https://api.astronila.com/health

# Check astrology module health
curl https://api.astronila.com/api/astrology/health

# Check database connection
curl https://api.astronila.com/api/astrology/status
```

### Smoke Tests

```bash
# Test user profile retrieval
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.astronila.com/api/astrology/profile

# Test consultant listing
curl https://api.astronila.com/api/astrology/consultations/consultants

# Test payment order creation (should require auth)
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.astronila.com/api/astrology/payments/BOOKING_ID/create-order
```

### Verify External Services

```bash
# Test Razorpay connection
curl -u rzp_live_key:secret https://api.razorpay.com/v1/payments

# Test email service
# Send test email via admin panel or API

# Check Redis connection
redis-cli -h redis.astronila.com ping
```

---

## Monitoring & Maintenance

### Application Monitoring

**PM2 Monitoring**:
```bash
# View application status
pm2 status

# Monitor in real-time
pm2 monit

# View logs
pm2 logs astronila-backend

# View metrics
pm2 show astronila-backend
```

**Log Analysis**:
```bash
# View error logs
tail -f /var/log/astronila/backend-error.log

# Search for payment errors
grep "payment" /var/log/astronila/backend-error.log | grep "error"

# Count errors by type
awk '/error/ {print $5}' /var/log/astronila/backend-error.log | sort | uniq -c
```

### Database Monitoring

```javascript
// Check slow queries
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(10);

// Check collection stats
db.astrologyconsultationbookings.stats();

// Check index usage
db.astrologyconsultationbookings.aggregate([
  { $indexStats: {} }
]);
```

### Performance Monitoring

**Install New Relic**:
```bash
npm install newrelic --save
```

Add to `server.js`:
```javascript
require('newrelic');
```

**Sentry Error Tracking**:
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Stop current version
pm2 stop astronila-backend

# Checkout previous version
git checkout tags/v1.0.0

# Install dependencies
npm ci --production

# Restart application
pm2 restart astronila-backend

# Verify health
curl https://api.astronila.com/health
```

### Database Rollback

```bash
# Restore from backup
mongorestore --uri="mongodb+srv://..." --drop /backup/backup_20260707
```

### Blue-Green Deployment Rollback

```bash
# Switch traffic back to blue environment
# Update load balancer or DNS to point to previous version
```

---

## Security Hardening

### Server Hardening

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable root SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# Install fail2ban
sudo apt install -y fail2ban
```

### Application Security

1. **Enable Helmet**:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

2. **Rate Limiting**:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

3. **Input Validation**:
```javascript
// Already implemented in route validation
```

4. **CORS Configuration**:
```javascript
const cors = require('cors');

app.use(cors({
  origin: 'https://astronila.com',
  credentials: true,
}));
```

### SSL/TLS Configuration

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.astronila.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Support & Troubleshooting

### Common Issues

**Issue: Payment webhook not receiving events**
- Verify webhook URL in Razorpay dashboard
- Check server firewall allows Razorpay IPs
- Verify webhook secret matches

**Issue: High memory usage**
- Check for memory leaks with `pm2 monit`
- Increase max_memory_restart in PM2 config
- Optimize database queries

**Issue: Slow API responses**
- Enable Redis caching
- Add database indexes
- Optimize N+1 queries

### Contact Information

- **Support Email**: support@astronila.com
- **DevOps Team**: devops@astronila.com
- **Emergency Hotline**: +91-XXXX-XXXXXX

---

## Deployment Timeline

**Recommended deployment schedule**:
- **Week 1**: Deploy to staging, run full test suite
- **Week 2**: Load testing, security audit
- **Week 3**: Deploy to production (off-peak hours)
- **Week 4**: Monitor and stabilize

**Best deployment time**:
- Low-traffic hours (2 AM - 6 AM local time)
- Weekdays (avoid weekends for initial deployment)
- Outside of major festivals/events

---

This deployment guide should be updated regularly as the infrastructure evolves. Last updated: July 7, 2026.
