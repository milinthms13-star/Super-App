# 🚀 Deploy All 35 Microservices - Instructions

## ✅ Pre-Deployment Checklist

### 1. Prerequisites
- [ ] Google Cloud SDK installed (`gcloud`)
- [ ] Logged in to Google Cloud (`gcloud auth login`)
- [ ] Project created in Google Cloud Console
- [ ] Billing enabled on your project
- [ ] Cloud Run API enabled
- [ ] MongoDB Atlas cluster ready (or MongoDB instance)
- [ ] Redis instance ready (Google Memorystore or Redis Labs)

### 2. Required Information
Gather these before running deployment:

- **MongoDB URI**: `mongodb+srv://user:pass@cluster.mongodb.net/malabarbazaar`
- **Redis Host**: Your Redis hostname
- **Redis Port**: Usually `6379`
- **Redis Password**: Your Redis password
- **JWT Secret**: Generate a secure 32+ character string

---

## 🎯 Deployment Options

### Option A: PowerShell (Windows) - RECOMMENDED FOR YOU

```powershell
# Make script executable and run
.\deploy-all-services.ps1
```

### Option B: Bash (Linux/Mac)

```bash
# Make script executable
chmod +x deploy-all-services.sh

# Run deployment
./deploy-all-services.sh
```

### Option C: Manual Deployment (One Service at a Time)

```bash
cd microservices/auth-service
npm install

gcloud run deploy auth-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "MONGO_URI=your-mongo-uri,JWT_SECRET=your-secret"
```

---

## 📋 Step-by-Step Deployment (Windows PowerShell)

### Step 1: Prepare Environment

```powershell
# Check gcloud is installed
gcloud --version

# If not installed, download from:
# https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project superapp-495816

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Step 2: Prepare MongoDB

**Option A: MongoDB Atlas** (Recommended - Free tier available)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow from anywhere)
5. Get connection string:
   ```
   mongodb+srv://<user>:<password>@cluster.mongodb.net/malabarbazaar
   ```

**Option B: Existing MongoDB**

Use your existing MongoDB URI.

### Step 3: Prepare Redis

**Option A: Google Cloud Memorystore**

```powershell
gcloud redis instances create malabarbazaar-redis \
  --size=1 \
  --region=asia-south1 \
  --redis-version=redis_6_x

# Get Redis host
gcloud redis instances describe malabarbazaar-redis \
  --region=asia-south1 \
  --format="value(host)"
```

**Option B: Redis Labs** (Free tier available)

1. Go to https://redis.com/try-free/
2. Create free database
3. Get host, port, and password

### Step 4: Generate JWT Secret

```powershell
# Generate secure random string (32+ characters)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

Or use: https://randomkeygen.com/ (CodeIgniter Encryption Keys)

### Step 5: Run Deployment Script

```powershell
# Navigate to your project root
cd C:\Users\Dhanya\malabarbazaar

# Run deployment
.\deploy-all-services.ps1
```

**You will be prompted for**:
1. MongoDB URI
2. Redis Host
3. Redis Port (press Enter for default 6379)
4. Redis Password
5. JWT Secret

### Step 6: Monitor Deployment

The script will:
- Deploy each service to Cloud Run
- Show progress for all 35 services
- Test health endpoints
- Generate deployment log
- Create API Gateway configuration

**This will take approximately 45-60 minutes** for all 35 services.

---

## 📊 What Happens During Deployment

For each service:

1. ✅ Checks service directory exists
2. ✅ Installs npm dependencies
3. ✅ Builds Docker container (automatic)
4. ✅ Uploads to Google Container Registry
5. ✅ Deploys to Cloud Run
6. ✅ Sets environment variables
7. ✅ Configures auto-scaling (0-10 instances)
8. ✅ Sets up health checks
9. ✅ Tests deployment

**Each service gets**:
- Unique Cloud Run URL
- Automatic HTTPS
- Auto-scaling
- Load balancing
- Health monitoring

---

## 💰 Cost During Deployment

**One-time costs**:
- Container builds: ~$2-5
- Storage: ~$0.50

**Ongoing monthly costs**:
- Services: ~$270/month (based on usage)
- Infrastructure: ~$110/month
- **Total**: ~$380/month

**Cost optimization**:
- Services scale to zero when not used
- Only pay for actual usage
- Can disable low-priority services

---

## 🔍 Verify Deployment

After deployment completes:

### 1. Check Cloud Console

```
https://console.cloud.google.com/run?project=superapp-495816
```

You should see all 35 services listed.

### 2. Test Health Endpoints

```powershell
# Test a few services
curl https://auth-service-xxxx.run.app/health
curl https://user-service-xxxx.run.app/health
curl https://ecommerce-service-xxxx.run.app/health
```

### 3. Check Logs

```powershell
# View logs for a service
gcloud run services logs read auth-service --region asia-south1 --limit 50
```

### 4. Test API Endpoints

```powershell
# Register a user (Auth service)
Invoke-RestMethod -Uri "https://auth-service-xxxx.run.app/api/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","name":"Test User"}'
```

---

## 🐛 Troubleshooting

### Issue: "gcloud: command not found"

**Solution**: Install Google Cloud SDK
```
https://cloud.google.com/sdk/docs/install
```

### Issue: "Permission denied"

**Solution**: Login and set project
```powershell
gcloud auth login
gcloud config set project superapp-495816
```

### Issue: "API not enabled"

**Solution**: Enable Cloud Run API
```powershell
gcloud services enable run.googleapis.com
```

### Issue: Deployment fails for specific service

**Solution**: Deploy that service manually
```powershell
cd microservices/service-name
npm install
gcloud run deploy service-name --source . --region asia-south1
```

### Issue: MongoDB connection fails

**Solution**: Check MongoDB URI and whitelist IP
```
1. Verify connection string format
2. Check database user credentials
3. Whitelist 0.0.0.0/0 in MongoDB Atlas
```

### Issue: Out of memory during build

**Solution**: Increase Cloud Build resources
```powershell
# Use larger machine type for builds
gcloud config set builds/use_kaniko True
```

---

## 📝 Post-Deployment Tasks

### 1. Save Service URLs

After deployment, save all service URLs:

```powershell
# Get all service URLs
$services = @("auth-service", "user-service", "ecommerce-service")
foreach ($svc in $services) {
    $url = gcloud run services describe $svc --region asia-south1 --format="value(status.url)"
    Write-Host "$svc : $url"
}
```

### 2. Update Frontend

Update your frontend `.env`:

```env
# If using API Gateway
REACT_APP_API_URL=https://your-api-gateway.com

# Or direct service URLs (temporarily)
REACT_APP_AUTH_URL=https://auth-service-xxxx.run.app
REACT_APP_API_URL=https://ecommerce-service-xxxx.run.app
```

### 3. Set Up API Gateway

Use the generated `api-gateway-config.yaml`:

```powershell
# Install Kong (if using Kong)
# Or configure Nginx

# Apply configuration
kubectl apply -f api-gateway-config.yaml
```

### 4. Configure Custom Domain

```powershell
# Map custom domain to API Gateway
gcloud run domain-mappings create \
  --service=api-gateway \
  --domain=api.malabarbazaar.com \
  --region=asia-south1
```

### 5. Set Up Monitoring

```powershell
# Enable Cloud Monitoring
gcloud services enable monitoring.googleapis.com

# Create uptime checks for critical services
```

---

## 🎯 Next Steps

After successful deployment:

1. ✅ **Test all services** - Health checks and API endpoints
2. ✅ **Set up API Gateway** - Kong or Nginx for unified endpoint
3. ✅ **Update frontend** - Point to new service URLs
4. ✅ **Configure monitoring** - Set up alerts and dashboards
5. ✅ **Test end-to-end** - Complete user flows
6. ✅ **Optimize costs** - Adjust min/max instances
7. ✅ **Set up CI/CD** - Automated deployments
8. ✅ **Documentation** - Update team docs with service URLs

---

## 🆘 Support & Resources

### Official Documentation
- Cloud Run: https://cloud.google.com/run/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com/
- Redis: https://redis.io/documentation

### Helpful Commands

```powershell
# List all deployed services
gcloud run services list --region asia-south1

# Delete a service
gcloud run services delete service-name --region asia-south1

# Update service configuration
gcloud run services update service-name \
  --region asia-south1 \
  --set-env-vars "NEW_VAR=value"

# View service details
gcloud run services describe service-name --region asia-south1

# View logs
gcloud run services logs read service-name --region asia-south1

# Scale service
gcloud run services update service-name \
  --region asia-south1 \
  --min-instances 1 \
  --max-instances 20
```

---

## ✅ Success Criteria

Deployment is successful when:

- [x] All 35 services deployed to Cloud Run
- [x] Health endpoints return 200 OK
- [x] Services connect to MongoDB
- [x] Services connect to Redis
- [x] JWT authentication works
- [x] API endpoints respond correctly
- [x] Logs show no errors
- [x] Auto-scaling works
- [x] Frontend can connect to services

---

## 🚀 Ready to Deploy!

**Run the deployment script now**:

```powershell
.\deploy-all-services.ps1
```

Estimated time: **45-60 minutes**

Good luck! 🎉
