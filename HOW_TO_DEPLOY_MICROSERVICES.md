# 🚀 Complete Guide: How to Deploy the Microservices

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Quick Start (Recommended)](#quick-start-recommended)
5. [Detailed Deployment Steps](#detailed-deployment-steps)
6. [Local Development](#local-development)
7. [Testing](#testing)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Your application has **35 microservices** that can be deployed to:
- **Google Cloud Run** (Production - Recommended)
- **Docker Compose** (Local Development)
- **Kubernetes** (Advanced)
- **Individual Servers** (Manual)

### Available Microservices (35 Total)

#### Core Services (5)
1. **auth-service** - Authentication & JWT tokens
2. **user-service** - User profiles & management
3. **notification-service** - Email, SMS, Push notifications
4. **payment-service** - Payment processing & transactions
5. **file-service** - File uploads & media management

#### E-commerce Services (5)
6. **ecommerce-service** - Products, cart, orders
7. **vendor-service** - Vendor management
8. **inventory-service** - Stock & inventory tracking
9. **shipping-service** - Shipping & tracking
10. **recommendation-service** - Product recommendations

#### Marketplace Services (5)
11. **classifieds-service** - Classifieds & listings
12. **realestate-service** - Real estate properties
13. **matrimonial-service** - Matrimonial profiles
14. **jobs-service** - Jobs & career portal
15. **vehicles-service** - Vehicles & automotive

#### Food & Hospitality (4)
16. **food-delivery-service** - Food delivery platform
17. **hotel-booking-service** - Hotel bookings
18. **tourism-service** - Tourism packages
19. **travel-service** - Travel booking

#### Business Services (5)
20. **business-builder-service** - Business builder tools
21. **freelancer-service** - Freelancer marketplace
22. **gulf-services-service** - Gulf region services
23. **finance-service** - Financial services
24. **insurance-service** - Insurance management

#### Healthcare & Education (4)
25. **healthcare-service** - Healthcare & appointments
26. **education-service** - Education & courses
27. **astrology-service** - Astrology predictions
28. **beauty-ai-service** - Beauty AI & skincare

#### Content & Social (4)
29. **messaging-service** - Chat & messaging
30. **social-service** - Social feed & posts
31. **diary-service** - Personal diary
32. **poll-service** - Polls & surveys

#### AI & Advanced (3)
33. **ai-chat-service** - AI chatbot
34. **kids-video-service** - Kids video maker
35. **analytics-service** - Analytics & reports

---

## Prerequisites

### Required Tools
- [x] **Node.js** (v18+) - Already installed
- [x] **npm** or **yarn** - For package management
- [ ] **Google Cloud SDK** (`gcloud`) - For Cloud Run deployment
- [ ] **Docker** - For local containerized development
- [ ] **MongoDB** - Database (Atlas or self-hosted)
- [ ] **Redis** - Caching layer

### Required Accounts
- [ ] **Google Cloud Platform** account (with billing enabled)
- [ ] **MongoDB Atlas** account (free tier available)
- [ ] **Redis Labs** account (free tier available) OR Google Memorystore

### Installation Links
- **Google Cloud SDK**: https://cloud.google.com/sdk/docs/install
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas/register
- **Redis Labs**: https://redis.com/try-free/

---

## Deployment Options

### 1. Cloud Run (Production) ⭐ RECOMMENDED
**Best for**: Production deployment with auto-scaling

**Pros**:
- ✅ Auto-scaling (0-10 instances per service)
- ✅ Automatic HTTPS & SSL certificates
- ✅ Pay per use (cost-effective)
- ✅ Managed infrastructure
- ✅ Global load balancing
- ✅ Built-in monitoring

**Cons**:
- ❌ Monthly costs (~$380/month estimated)
- ❌ Requires GCP account & billing

**Time**: 45-60 minutes (automated script)

### 2. Docker Compose (Local Development)
**Best for**: Local development and testing

**Pros**:
- ✅ Free (runs on your machine)
- ✅ Fast development iteration
- ✅ Complete environment isolation
- ✅ Easy to start/stop

**Cons**:
- ❌ Not suitable for production
- ❌ Limited to single machine
- ❌ Resource intensive

**Time**: 10-15 minutes

### 3. Kubernetes (Advanced)
**Best for**: Large-scale production with custom infrastructure

**Pros**:
- ✅ Maximum control & flexibility
- ✅ Multi-cloud support
- ✅ Advanced orchestration

**Cons**:
- ❌ Complex setup & management
- ❌ Requires Kubernetes expertise
- ❌ Higher infrastructure costs

**Time**: Several hours to days

---

## Quick Start (Recommended)

### Option A: Deploy to Google Cloud Run (Production)

#### Step 1: Install Google Cloud SDK (5 min)
```powershell
# Windows - Download installer from:
# https://cloud.google.com/sdk/docs/install-sdk#windows

# Or using Chocolatey
choco install gcloudsdk

# Verify installation
gcloud --version
```

#### Step 2: Login & Setup (5 min)
```powershell
# Login to Google Cloud
gcloud auth login

# Set your project ID (replace with your actual project ID)
gcloud config set project superapp-495816

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### Step 3: Setup MongoDB (5 min)
**Option A: MongoDB Atlas (Free Tier)**
1. Visit: https://www.mongodb.com/cloud/atlas/register
2. Create a free M0 cluster (512MB)
3. Create database user (username/password)
4. Network Access → Add IP: `0.0.0.0/0` (allow from anywhere)
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/malabarbazaar
   ```

#### Step 4: Setup Redis (5 min)
**Option A: Redis Labs (Free Tier)**
1. Visit: https://redis.com/try-free/
2. Create free 30MB database
3. Copy: Host, Port (6379), Password

**Option B: Google Memorystore**
```powershell
gcloud redis instances create malabarbazaar-redis `
  --size=1 `
  --region=asia-south1 `
  --redis-version=redis_6_x
```

#### Step 5: Generate JWT Secret
```powershell
# Generate secure 40-character random string
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```
Copy the output - you'll need it!

#### Step 6: Deploy All Services (45-60 min) ☕
```powershell
# Navigate to project root
cd C:\Users\Dhanya\malabarbazaar

# Run deployment script
.\deploy-all-services.ps1
```

**You will be prompted for**:
1. MongoDB URI
2. Redis Host
3. Redis Port (press Enter for default 6379)
4. Redis Password
5. JWT Secret

The script will:
- Deploy all 35 microservices to Cloud Run
- Configure environment variables
- Setup auto-scaling
- Test health endpoints
- Generate deployment log

**Time**: ~45-60 minutes total

### Option B: Docker Compose (Local Development)

#### Step 1: Install Docker Desktop
Download from: https://www.docker.com/products/docker-desktop/

#### Step 2: Create Environment File
```powershell
# Copy example environment file
Copy-Item .env.example .env

# Edit .env file with your configuration
notepad .env
```

Required variables in `.env`:
```env
# MongoDB (will use Docker container)
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=changeme
MONGO_DATABASE=malabarbazaar

# Redis (will use Docker container)
REDIS_PASSWORD=changeme

# JWT Secret
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters

# Email (optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Razorpay (optional - for payments)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

#### Step 3: Start All Services
```powershell
# Start all containers
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

#### Step 4: Verify Services
```powershell
# Backend should be running on port 5000
curl http://localhost:5000/health

# Frontend should be running on port 3000
# Open browser: http://localhost:3000
```

#### Stop Services
```powershell
# Stop all containers
docker-compose down

# Stop and remove volumes (clean start)
docker-compose down -v
```

---

## Detailed Deployment Steps

### Cloud Run Deployment (Detailed)

#### 1. Pre-Deployment Checklist
```powershell
# Check gcloud is installed
gcloud --version

# Check you're logged in
gcloud auth list

# Check project is set
gcloud config get-value project

# Enable all required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

#### 2. Configure MongoDB
**If using MongoDB Atlas**:
```bash
Connection String Format:
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

Example:
mongodb+srv://admin:SecurePass123@cluster0.abc123.mongodb.net/malabarbazaar?retryWrites=true&w=majority
```

**Database Setup**:
- Database Name: `malabarbazaar`
- Collections: Auto-created by services
- Whitelist IPs: `0.0.0.0/0` (or specific Cloud Run IPs)

#### 3. Configure Redis
**If using Redis Labs**:
```
Host: redis-12345.c1.us-east-1.redislabs.com
Port: 12345
Password: YourRedisPassword123
```

**If using Google Memorystore**:
```powershell
# Create instance
gcloud redis instances create malabarbazaar-redis `
  --size=1 `
  --region=asia-south1 `
  --redis-version=redis_6_x `
  --network=default

# Get connection info
gcloud redis instances describe malabarbazaar-redis `
  --region=asia-south1 `
  --format="value(host,port)"
```

#### 4. Run Deployment Script

The `deploy-all-services.ps1` script does the following for each service:

1. **Checks service directory** exists
2. **Installs npm packages** (`npm install --production`)
3. **Builds Docker container** (automatically via Cloud Build)
4. **Deploys to Cloud Run** with configuration:
   - Region: `asia-south1`
   - Memory: `512Mi`
   - CPU: `1`
   - Min instances: `0` (scales to zero)
   - Max instances: `10`
   - Timeout: `300s` (5 minutes)
   - Port: Service-specific (3001-3035)
5. **Sets environment variables**:
   - `MONGO_URI`
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `SERVICE_NAME`
   - `PORT`
6. **Tests deployment** (health check)
7. **Logs results** to `deployment-YYYYMMDD-HHMMSS.log`

#### 5. Monitor Deployment
```powershell
# Watch the deployment progress
# The script will show real-time status

# Example output:
# [1/35] Deploying: auth-service
# ✅ Deployed successfully!
#    URL: https://auth-service-abc123.run.app
```

#### 6. Verify Deployment
```powershell
# List all deployed services
gcloud run services list --region asia-south1

# Test a specific service health endpoint
$authUrl = gcloud run services describe auth-service --region asia-south1 --format="value(status.url)"
curl "$authUrl/health"

# Test authentication endpoint
Invoke-RestMethod -Uri "$authUrl/api/auth/health" -Method Get
```

---

## Local Development

### Using Docker Compose

#### Architecture
```
┌─────────────────────────────────────────┐
│           Docker Network                │
│  ┌──────────────────────────────────┐  │
│  │  Frontend (React) - Port 3000    │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Backend (Node.js) - Port 5000   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  MongoDB - Port 27017            │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Redis - Port 6379               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### Services Included
- **MongoDB**: Database server
- **Redis**: Caching layer
- **Backend**: Modular monolith (all business logic)
- **Frontend**: React application
- **Nginx**: Reverse proxy (optional, production profile)

#### Common Commands
```powershell
# Start all services
docker-compose up -d

# Start specific service
docker-compose up backend

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove everything (including volumes)
docker-compose down -v

# Rebuild containers after code changes
docker-compose up --build

# Check service status
docker-compose ps

# Execute commands in container
docker-compose exec backend npm run seed
docker-compose exec mongodb mongosh

# Scale a service (multiple instances)
docker-compose up --scale backend=3
```

#### Accessing Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **API Docs**: http://localhost:5000/api-docs

---

## Testing

### Health Checks

#### Cloud Run Services
```powershell
# Function to test all services
function Test-AllServices {
    $services = @(
        "auth-service", "user-service", "notification-service",
        "payment-service", "file-service", "ecommerce-service"
        # ... add all 35 services
    )
    
    foreach ($svc in $services) {
        try {
            $url = gcloud run services describe $svc --region asia-south1 --format="value(status.url)"
            $response = Invoke-RestMethod "$url/health"
            Write-Host "✅ $svc : OK" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ $svc : FAILED" -ForegroundColor Red
        }
    }
}

# Run the test
Test-AllServices
```

#### Docker Compose Services
```powershell
# Test backend health
curl http://localhost:5000/health

# Test all service routes
curl http://localhost:5000/api/auth/health
curl http://localhost:5000/api/users/health
curl http://localhost:5000/api/ecommerce/health
```

### API Testing

#### Test Authentication Flow
```powershell
# Register new user
$registerBody = @{
    name = "Test User"
    email = "test@example.com"
    password = "SecurePass123!"
    phone = "9876543210"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
    -Method Post `
    -ContentType "application/json" `
    -Body $registerBody

# Login
$loginBody = @{
    email = "test@example.com"
    password = "SecurePass123!"
} | ConvertTo-Json

$loginResult = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResult.token

# Get user profile (authenticated)
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:5000/api/users/profile" `
    -Headers $headers
```

### Load Testing

#### Using Apache Bench
```powershell
# Install Apache Bench (comes with Apache)
choco install apache-httpd

# Test health endpoint
ab -n 1000 -c 10 http://localhost:5000/health

# Test with authentication
ab -n 100 -c 5 -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/users/profile
```

---

## Monitoring & Maintenance

### Cloud Run Monitoring

#### View Logs
```powershell
# View recent logs for a service
gcloud run services logs read auth-service --region asia-south1 --limit 50

# Follow logs (real-time)
gcloud run services logs tail auth-service --region asia-south1

# Filter logs by severity
gcloud run services logs read auth-service --region asia-south1 --log-filter="severity=ERROR"
```

#### View Metrics
```powershell
# Open Cloud Console
start https://console.cloud.google.com/run?project=superapp-495816

# Or use gcloud
gcloud run services describe auth-service --region asia-south1
```

#### Key Metrics to Monitor
- **Request Count**: Number of requests per minute
- **Request Latency**: Average response time
- **Error Rate**: Percentage of failed requests
- **Instance Count**: Number of running instances
- **CPU Utilization**: CPU usage percentage
- **Memory Usage**: Memory consumption

### Docker Monitoring

#### Resource Usage
```powershell
# View container resource usage
docker stats

# View specific container
docker stats nilahub-backend

# Check disk usage
docker system df
```

#### Container Logs
```powershell
# View logs
docker logs nilahub-backend

# Follow logs
docker logs -f nilahub-backend

# Last 100 lines
docker logs --tail 100 nilahub-backend
```

### Database Monitoring

#### MongoDB
```powershell
# Connect to MongoDB (Docker)
docker-compose exec mongodb mongosh -u admin -p changeme

# Check database size
db.stats()

# Check collections
show collections

# Check collection stats
db.users.stats()
```

#### Redis
```powershell
# Connect to Redis (Docker)
docker-compose exec redis redis-cli -a changeme

# Get info
INFO

# Check memory usage
INFO memory

# Check keys
KEYS *

# Monitor commands
MONITOR
```

### Maintenance Tasks

#### Update a Single Service
```powershell
# Make your code changes in microservices/service-name/

# Redeploy to Cloud Run
cd microservices/auth-service
gcloud run deploy auth-service `
  --source . `
  --region asia-south1 `
  --set-env-vars "MONGO_URI=$MONGO_URI,JWT_SECRET=$JWT_SECRET"

# For Docker Compose
docker-compose up -d --build backend
```

#### Scale Services
```powershell
# Increase max instances for high-traffic service
gcloud run services update ecommerce-service `
  --region asia-south1 `
  --max-instances 20

# Set minimum instances (always warm)
gcloud run services update auth-service `
  --region asia-south1 `
  --min-instances 1
```

#### Backup Database
```powershell
# MongoDB backup (Docker)
docker-compose exec -T mongodb mongodump `
  --username admin `
  --password changeme `
  --authenticationDatabase admin `
  --out /backup

# MongoDB backup (Atlas)
# Use Atlas UI or mongodump with Atlas connection string
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/malabarbazaar" --out ./backup
```

---

## Troubleshooting

### Common Issues & Solutions

#### Issue: "gcloud: command not found"
**Solution**:
```powershell
# Install Google Cloud SDK
# Download from: https://cloud.google.com/sdk/docs/install

# Or using Chocolatey
choco install gcloudsdk

# Restart PowerShell after installation
```

#### Issue: "Permission denied" during deployment
**Solution**:
```powershell
# Login again
gcloud auth login

# Check you're authenticated
gcloud auth list

# Set project
gcloud config set project superapp-495816
```

#### Issue: "API not enabled"
**Solution**:
```powershell
# Enable all required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### Issue: MongoDB connection fails
**Solution**:
1. Check connection string format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/database
   ```
2. Verify credentials in MongoDB Atlas
3. Whitelist IP addresses: Network Access → Add `0.0.0.0/0`
4. Check database user has read/write permissions

#### Issue: Service deployment fails
**Solution**:
```powershell
# Check deployment logs
gcloud run services logs read service-name --region asia-south1

# Try manual deployment
cd microservices/service-name
npm install
gcloud run deploy service-name --source . --region asia-south1

# Check build logs
gcloud builds list --limit 5
gcloud builds log BUILD_ID
```

#### Issue: Out of memory error
**Solution**:
```powershell
# Increase memory allocation
gcloud run services update service-name `
  --region asia-south1 `
  --memory 1Gi

# Or specify during deployment
gcloud run deploy service-name `
  --source . `
  --region asia-south1 `
  --memory 1Gi
```

#### Issue: Service timeout
**Solution**:
```powershell
# Increase timeout (max 3600s)
gcloud run services update service-name `
  --region asia-south1 `
  --timeout 600
```

#### Issue: Docker build fails
**Solution**:
```powershell
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache

# Check logs
docker-compose logs backend
```

#### Issue: Port already in use
**Solution**:
```powershell
# Find process using the port
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <process_id> /F

# Or change the port in docker-compose.yml
```

### Getting Help

#### View Deployment Logs
```powershell
# Check the deployment log file
Get-Content "deployment-YYYYMMDD-HHMMSS.log" -Tail 50
```

#### Cloud Run Documentation
- Official Docs: https://cloud.google.com/run/docs
- Quickstarts: https://cloud.google.com/run/docs/quickstarts
- Samples: https://github.com/GoogleCloudPlatform/cloud-run-samples

#### Useful Commands
```powershell
# List all services
gcloud run services list --region asia-south1

# Describe a service (full details)
gcloud run services describe service-name --region asia-south1

# Delete a service
gcloud run services delete service-name --region asia-south1

# Update environment variables
gcloud run services update service-name `
  --region asia-south1 `
  --set-env-vars "NEW_VAR=value"

# View service revisions
gcloud run revisions list --service service-name --region asia-south1

# Rollback to previous revision
gcloud run services update-traffic service-name `
  --region asia-south1 `
  --to-revisions REVISION_NAME=100
```

---

## Cost Estimation

### Cloud Run Costs

#### Pricing Components
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests
- **Networking**: $0.12 per GB (outbound)

#### Monthly Estimate (35 Services)

**Tier 1: Critical Services (5 services)** - $15 each
- Always warm (min 1 instance)
- High traffic
- **Subtotal**: $75/month

**Tier 2: High Traffic Services (10 services)** - $10 each
- Moderate traffic
- Scale to zero when idle
- **Subtotal**: $100/month

**Tier 3: Medium Traffic Services (10 services)** - $7 each
- Low-medium traffic
- **Subtotal**: $70/month

**Tier 4: Low Traffic Services (10 services)** - $4 each
- Minimal traffic
- **Subtotal**: $40/month

**Infrastructure**:
- MongoDB Atlas (M10): $57/month
- Redis Labs (1GB): $20/month
- Networking & Storage: $30/month
- **Subtotal**: $107/month

**Total Estimated**: **$392/month**

#### Cost Optimization Tips
1. Scale services to zero when not in use
2. Use shared MongoDB and Redis
3. Optimize container size (remove dev dependencies)
4. Set appropriate memory limits
5. Use caching to reduce database calls
6. Monitor and disable unused services

### Docker Compose Costs
**Free** - runs on your local machine

---

## Summary

### Recommended Deployment Path

**For Production**:
1. ✅ Use Cloud Run deployment
2. ✅ MongoDB Atlas (M0 free tier initially)
3. ✅ Redis Labs (free 30MB tier initially)
4. ✅ Run deployment script: `.\deploy-all-services.ps1`
5. ✅ Monitor with Cloud Console
6. ✅ Scale based on usage

**For Development**:
1. ✅ Use Docker Compose
2. ✅ Run: `docker-compose up -d`
3. ✅ Develop and test locally
4. ✅ Deploy to Cloud Run when ready

### Quick Reference

```powershell
# Deploy to Cloud Run (Production)
.\deploy-all-services.ps1

# Start local development (Docker)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop local development
docker-compose down

# Update a Cloud Run service
cd microservices/service-name
gcloud run deploy service-name --source . --region asia-south1

# View Cloud Run logs
gcloud run services logs read service-name --region asia-south1
```

---

## 🎉 You're Ready to Deploy!

Choose your deployment method and follow the steps above. Good luck! 🚀
