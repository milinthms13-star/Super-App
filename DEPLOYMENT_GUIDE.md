# Finance Module - Deployment Guide

## 🚀 Production Deployment Checklist

Complete step-by-step guide to deploy the Finance Module to production.

---

## Pre-Deployment Requirements

### System Requirements
- Node.js 16.x or higher
- MongoDB 4.4 or higher
- 2GB RAM minimum (4GB recommended)
- 10GB disk space

### Services (Optional - for production features)
- Twilio account (SMS/WhatsApp)
- SendGrid account (Email)
- CIBIL/Experian API access (Credit Bureau)
- Google Cloud Vision API (OCR)
- DigiLocker API access

---

## 1️⃣ Backend Deployment

### Step 1: Environment Configuration

Create `backend/.env` file:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://your-mongodb-host:27017/finance_production
MONGODB_OPTIONS=retryWrites=true&w=majority

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRE=30d

# CORS Settings
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=.pdf,.jpg,.jpeg,.png,.doc,.docx

# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SENDGRID_FROM_NAME=Your Company Name

# Credit Bureau
CIBIL_API_KEY=your_cibil_api_key
CIBIL_API_SECRET=your_cibil_api_secret
CIBIL_MEMBER_ID=your_member_id
EXPERIAN_API_KEY=your_experian_api_key
EXPERIAN_API_SECRET=your_experian_api_secret

# Google Cloud (OCR)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_CREDENTIALS_PATH=/path/to/credentials.json

# DigiLocker
DIGILOCKER_CLIENT_ID=your_client_id
DIGILOCKER_CLIENT_SECRET=your_client_secret
DIGILOCKER_REDIRECT_URI=https://your-domain.com/api/digilocker/callback

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
ERROR_LOG_FILE=./logs/error.log

# Mock Mode (set to false in production)
MOCK_MODE=false
```

### Step 2: Install Dependencies

```bash
cd backend
npm install --production
```

### Step 3: Database Setup

```bash
# Create indexes
node scripts/setupFinanceServices.js

# Verify MongoDB connection
npm run test:db
```

### Step 4: Build (if using TypeScript)

```bash
npm run build
```

### Step 5: Start Backend

#### Option A: PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'finance-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### Option B: Docker
```bash
# Build Docker image
docker build -t finance-backend .

# Run container
docker run -d \
  --name finance-backend \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/logs:/app/logs \
  finance-backend
```

**Dockerfile:**
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p uploads logs

EXPOSE 5000

CMD ["node", "server.js"]
```

### Step 6: Setup Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/finance-api

upstream backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name api.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # File upload size
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
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://backend;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/finance-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Setup SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal is set up automatically
```

---

## 2️⃣ Frontend Deployment

### Step 1: Environment Configuration

Create `.env.production` file:

```bash
# API Configuration
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_API_TIMEOUT=30000

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_CHARTS=true
REACT_APP_ENABLE_NOTIFICATIONS=true

# External Services
REACT_APP_GOOGLE_ANALYTICS_ID=UA-XXXXX-Y
REACT_APP_SENTRY_DSN=https://your-sentry-dsn

# App Info
REACT_APP_VERSION=2.0.0
REACT_APP_BUILD_DATE=2024-12-15
```

### Step 2: Install Dependencies

```bash
# Install all dependencies including optional chart libraries
npm install

# Optional: Install chart library
npm install recharts

# Optional: Install date picker
npm install @mui/x-date-pickers date-fns
```

### Step 3: Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Step 4: Deploy Frontend

#### Option A: Static Hosting (Netlify/Vercel)

**Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=build
```

**Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option B: Nginx Static Files

```nginx
# /etc/nginx/sites-available/finance-frontend

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /var/www/finance-frontend/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional, if not using separate API domain)
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Deploy files:
```bash
# Copy build files to server
scp -r build/* user@server:/var/www/finance-frontend/build/

# Or use rsync
rsync -avz --delete build/ user@server:/var/www/finance-frontend/build/
```

#### Option C: Docker

```dockerfile
# Dockerfile
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run
docker build -t finance-frontend .
docker run -d -p 80:80 finance-frontend
```

---

## 3️⃣ Database Setup

### MongoDB Production Configuration

```bash
# Connect to MongoDB
mongo

# Switch to database
use finance_production

# Create indexes
db.leads.createIndex({ phone: 1 })
db.leads.createIndex({ leadId: 1 }, { unique: true })
db.leads.createIndex({ status: 1 })
db.leads.createIndex({ consultantId: 1 })
db.leads.createIndex({ institutionId: 1 })
db.leads.createIndex({ createdAt: -1 })

db.crmActivities.createIndex({ leadId: 1, createdAt: -1 })
db.crmActivities.createIndex({ activityType: 1 })

db.tasks.createIndex({ assignedTo: 1, status: 1 })
db.tasks.createIndex({ dueDate: 1 })

db.institutions.createIndex({ name: 1 })
db.institutions.createIndex({ status: 1 })

# Create TTL index for audit logs (30 days)
db.auditLogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
```

### Backup Strategy

```bash
# Create backup script
cat > /usr/local/bin/backup-finance-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/finance"
mkdir -p $BACKUP_DIR

mongodump \
  --uri="mongodb://localhost:27017/finance_production" \
  --out=$BACKUP_DIR/backup_$DATE \
  --gzip

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/backup-finance-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /usr/local/bin/backup-finance-db.sh >> /var/log/finance-backup.log 2>&1
```

---

## 4️⃣ Monitoring & Logging

### Setup PM2 Monitoring

```bash
# View logs
pm2 logs finance-backend

# Monitor resources
pm2 monit

# View status
pm2 status

# Restart if needed
pm2 restart finance-backend
```

### Setup Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/finance

# Add configuration
/var/www/finance/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reload finance-backend
    endscript
}
```

### Setup Health Checks

Add health check endpoint in backend:

```javascript
// backend/routes/health.js
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV
  });
});
```

Setup monitoring with cron:

```bash
# Add to crontab
*/5 * * * * curl -f https://api.your-domain.com/health || echo "Health check failed" | mail -s "Finance API Down" admin@your-domain.com
```

### Setup Error Tracking (Sentry)

```bash
npm install @sentry/node @sentry/tracing
```

```javascript
// backend/server.js
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Add before routes
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Add after routes
app.use(Sentry.Handlers.errorHandler());
```

---

## 5️⃣ Security Hardening

### Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443

# Block direct access to backend port
sudo ufw deny 5000

# Enable firewall
sudo ufw enable
```

### Fail2Ban Setup

```bash
# Install fail2ban
sudo apt install fail2ban

# Configure for nginx
sudo nano /etc/fail2ban/jail.local

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600
bantime = 3600
```

### Security Headers

Already added in Nginx config above. Verify:

```bash
curl -I https://your-domain.com
```

Should see:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

---

## 6️⃣ Performance Optimization

### Enable Caching

```javascript
// backend/middleware/cache.js
const apicache = require('apicache');
const cache = apicache.middleware;

app.use('/api/finance/institutions', cache('5 minutes'));
app.use('/api/finance/schemes', cache('1 hour'));
```

### Enable Compression

```javascript
// backend/server.js
const compression = require('compression');
app.use(compression());
```

### Database Query Optimization

```javascript
// Use lean() for read-only queries
Lead.find().lean().exec();

// Select only needed fields
Lead.find().select('leadId phone status').exec();

// Add pagination
Lead.find().limit(20).skip(page * 20).exec();
```

---

## 7️⃣ Post-Deployment Verification

### Checklist

- [ ] Backend health check returns 200 OK
- [ ] Frontend loads without errors
- [ ] API calls work from frontend
- [ ] Database connections successful
- [ ] File uploads work
- [ ] Notifications send (if configured)
- [ ] SSL certificates valid
- [ ] CORS configured correctly
- [ ] Logs are writing
- [ ] Backups are running
- [ ] Monitoring is active
- [ ] Error tracking works

### Test in Production

```bash
# Test API
curl https://api.your-domain.com/health

# Test frontend
curl https://your-domain.com

# Test lead creation
curl -X POST https://api.your-domain.com/api/finance/leads \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","phone":"9876543210",...}'
```

---

## 8️⃣ Rollback Plan

If deployment fails:

### Backend Rollback

```bash
# PM2
pm2 stop finance-backend
pm2 delete finance-backend
# Restore previous version
pm2 start ecosystem.config.js

# Docker
docker stop finance-backend
docker rm finance-backend
docker run -d --name finance-backend previous-image-tag
```

### Frontend Rollback

```bash
# Restore previous build
cp -r /var/www/finance-frontend/build.backup/* /var/www/finance-frontend/build/
sudo systemctl reload nginx
```

### Database Rollback

```bash
# Restore from backup
mongorestore --gzip --uri="mongodb://localhost:27017" /backups/finance/backup_DATE
```

---

## 9️⃣ Maintenance Windows

### Update Procedure

1. **Notify users** (24 hours advance)
2. **Backup database and files**
3. **Deploy to staging first**
4. **Test thoroughly on staging**
5. **Schedule maintenance window** (low traffic hours)
6. **Deploy to production**
7. **Monitor for 1 hour post-deployment**
8. **Update documentation**

### Update Commands

```bash
# Backend
cd backend
git pull
npm install
pm2 restart finance-backend

# Frontend
cd frontend
git pull
npm install
npm run build
rsync -avz build/ /var/www/finance-frontend/build/
```

---

## 🔟 Support & Troubleshooting

### Common Issues

#### Issue: 502 Bad Gateway
**Solution:** Backend not running or crashed
```bash
pm2 status
pm2 logs finance-backend --lines 50
pm2 restart finance-backend
```

#### Issue: MongoDB connection failed
**Solution:** Check MongoDB status
```bash
sudo systemctl status mongod
sudo systemctl restart mongod
```

#### Issue: High memory usage
**Solution:** Restart PM2 with memory limit
```bash
pm2 restart finance-backend --max-memory-restart 1G
```

#### Issue: CORS errors
**Solution:** Check environment variables
```bash
echo $CORS_ORIGIN
# Update if needed
pm2 restart finance-backend
```

---

## 📞 Emergency Contacts

- **DevOps Team:** devops@your-company.com
- **Database Admin:** dba@your-company.com
- **Security Team:** security@your-company.com
- **On-Call:** +1-XXX-XXX-XXXX

---

## 📝 Deployment Checklist

Print this checklist and check off each item during deployment:

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Staging deployment successful
- [ ] Database migrations ready
- [ ] Backup current production
- [ ] Notify users of maintenance
- [ ] Environment variables configured

### Deployment
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Run database migrations
- [ ] Clear caches
- [ ] Restart services
- [ ] Verify health checks

### Post-Deployment
- [ ] Test critical user flows
- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Verify integrations working
- [ ] Update documentation
- [ ] Send completion notification

### Rollback (if needed)
- [ ] Stop new version
- [ ] Restore previous version
- [ ] Restore database backup
- [ ] Clear caches
- [ ] Notify users
- [ ] Create incident report

---

*Deployment Date: [DATE]*  
*Deployed By: [NAME]*  
*Version: [VERSION]*  
*Status: [SUCCESS / FAILED]*

