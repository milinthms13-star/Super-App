# ⚡ Quick Deploy Guide - 35 Microservices

## 🎯 Deploy in 5 Steps (15 minutes setup + 45 minutes deployment)

### Step 1: Prerequisites (5 min)
```powershell
# Install gcloud (if not already)
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Set project
gcloud config set project superapp-495816

# Enable APIs
gcloud services enable run.googleapis.com
```

### Step 2: Get MongoDB (5 min)
**Option A: MongoDB Atlas Free Tier**
1. Go to https://mongodb.com/cloud/atlas
2. Create free M0 cluster
3. Create user & whitelist `0.0.0.0/0`
4. Copy connection string

**Connection String Format**:
```
mongodb+srv://user:password@cluster.mongodb.net/malabarbazaar
```

### Step 3: Get Redis (5 min)
**Option A: Redis Labs Free Tier**
1. Go to https://redis.com/try-free/
2. Create free 30MB database
3. Copy host, port (6379), password

**OR**

**Option B: Google Memorystore**
```powershell
gcloud redis instances create redis --size=1 --region=asia-south1
```

### Step 4: Generate JWT Secret
```powershell
# Run this to generate a 40-character random string
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

### Step 5: Deploy! (45-60 min)
```powershell
cd C:\Users\Dhanya\malabarbazaar
.\deploy-all-services.ps1
```

**Enter when prompted**:
- MongoDB URI
- Redis Host
- Redis Port (press Enter for 6379)
- Redis Password
- JWT Secret

☕ **Grab coffee** - deployment takes 45-60 minutes

---

## ✅ What You'll Get

After deployment:
- ✅ 35 services running on Cloud Run
- ✅ Each with unique HTTPS URL
- ✅ Auto-scaling (0-10 instances)
- ✅ Health monitoring
- ✅ Automatic HTTPS certificates
- ✅ Load balancing
- ✅ Deployment log file
- ✅ API Gateway configuration file

---

## 💰 Cost

**One-time**: ~$5 (builds & storage)  
**Monthly**: ~$380 ($270 services + $110 infrastructure)

**Free tier eligible**:
- MongoDB Atlas: Free M0 cluster
- Redis Labs: Free 30MB database
- Cloud Run: Free tier (2 million requests/month)

---

## 🧪 Test After Deployment

```powershell
# Find your auth service URL
$authUrl = gcloud run services describe auth-service --region asia-south1 --format="value(status.url)"

# Test health
Invoke-RestMethod "$authUrl/health"

# Test registration
Invoke-RestMethod -Uri "$authUrl/api/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","name":"Test User"}'
```

---

## 🎉 Success!

After successful deployment:

1. Check Cloud Console: https://console.cloud.google.com/run
2. All 35 services should be listed
3. Each service has a URL like: `https://service-name-xxx.run.app`
4. Test health endpoints: `https://service-name-xxx.run.app/health`

---

## 📋 Service List

**Core (5)**:
- auth-service, user-service, notification-service, payment-service, file-service

**E-commerce (5)**:
- ecommerce-service, vendor-service, inventory-service, shipping-service, recommendation-service

**Marketplace (5)**:
- classifieds-service, realestate-service, matrimonial-service, jobs-service, vehicles-service

**Food & Travel (4)**:
- food-delivery-service, hotel-booking-service, tourism-service, travel-service

**Business (5)**:
- business-builder-service, freelancer-service, gulf-services-service, finance-service, insurance-service

**Healthcare & Education (4)**:
- healthcare-service, education-service, astrology-service, beauty-ai-service

**Social (4)**:
- messaging-service, social-service, diary-service, poll-service

**AI (3)**:
- ai-chat-service, kids-video-service, analytics-service

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "gcloud not found" | Install from cloud.google.com/sdk |
| "Permission denied" | Run `gcloud auth login` |
| "API not enabled" | Run `gcloud services enable run.googleapis.com` |
| Service fails to deploy | Check deployment log file |
| MongoDB connection fails | Whitelist 0.0.0.0/0 in MongoDB Atlas |
| Out of memory | Services restart automatically, no action needed |

---

## 🔄 Update a Service

```powershell
cd microservices/service-name
# Make your changes
gcloud run deploy service-name --source . --region asia-south1
```

---

## 🗑️ Delete All Services

```powershell
# List all services
gcloud run services list --region asia-south1

# Delete all (careful!)
gcloud run services list --region asia-south1 --format="value(name)" | ForEach-Object {
    gcloud run services delete $_ --region asia-south1 --quiet
}
```

---

## 📞 Get Help

**Deployment issues**: Check `deployment-YYYYMMDD-HHMMSS.log`

**Service issues**: 
```powershell
gcloud run services logs read service-name --region asia-south1
```

**Cloud Console**: https://console.cloud.google.com/run

---

## 🚀 Ready to Deploy?

Run this now:

```powershell
.\deploy-all-services.ps1
```

**Time**: ~1 hour  
**Difficulty**: Easy (script handles everything)  
**Cost**: ~$5 one-time + $380/month

Good luck! 🎉
