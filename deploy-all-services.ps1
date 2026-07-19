# PowerShell script for Windows
# Deploy All 35 Microservices to Google Cloud Run

param(
    [string]$Region = "asia-south1",
    [string]$ProjectId = "superapp-495816"
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Deploying 35 Microservices to Cloud Run     ║" -ForegroundColor Green
Write-Host "║   Region: $Region                        ║" -ForegroundColor Green
Write-Host "║   Project: $ProjectId              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Check gcloud
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ gcloud CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set project
Write-Host "📋 Setting project..." -ForegroundColor Blue
gcloud config set project $ProjectId

# Get environment variables
Write-Host ""
Write-Host "🔐 Please provide shared environment variables:" -ForegroundColor Yellow
Write-Host ""

$MONGO_URI = Read-Host "MongoDB URI (MONGO_URI)"
$REDIS_HOST = Read-Host "Redis Host (REDIS_HOST)"
$REDIS_PORT = Read-Host "Redis Port (REDIS_PORT) [6379]"
if ([string]::IsNullOrEmpty($REDIS_PORT)) { $REDIS_PORT = "6379" }
$REDIS_PASSWORD = Read-Host "Redis Password (REDIS_PASSWORD)" -AsSecureString
$REDIS_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($REDIS_PASSWORD))
$JWT_SECRET = Read-Host "JWT Secret (min 32 chars)" -AsSecureString
$JWT_SECRET_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWT_SECRET))

# Validate
if ([string]::IsNullOrEmpty($MONGO_URI) -or [string]::IsNullOrEmpty($JWT_SECRET_PLAIN)) {
    Write-Host "❌ MongoDB URI and JWT Secret are required!" -ForegroundColor Red
    exit 1
}

if ($JWT_SECRET_PLAIN.Length -lt 32) {
    Write-Host "❌ JWT Secret must be at least 32 characters!" -ForegroundColor Red
    exit 1
}

# All services
$services = @(
    @{Name="auth-service"; Port=3001},
    @{Name="user-service"; Port=3002},
    @{Name="notification-service"; Port=3003},
    @{Name="payment-service"; Port=3004},
    @{Name="file-service"; Port=3005},
    @{Name="ecommerce-service"; Port=3006},
    @{Name="vendor-service"; Port=3007},
    @{Name="inventory-service"; Port=3008},
    @{Name="shipping-service"; Port=3009},
    @{Name="recommendation-service"; Port=3010},
    @{Name="classifieds-service"; Port=3011},
    @{Name="realestate-service"; Port=3012},
    @{Name="matrimonial-service"; Port=3013},
    @{Name="jobs-service"; Port=3014},
    @{Name="vehicles-service"; Port=3015},
    @{Name="food-delivery-service"; Port=3016},
    @{Name="hotel-booking-service"; Port=3017},
    @{Name="tourism-service"; Port=3018},
    @{Name="travel-service"; Port=3019},
    @{Name="business-builder-service"; Port=3020},
    @{Name="freelancer-service"; Port=3021},
    @{Name="gulf-services-service"; Port=3022},
    @{Name="finance-service"; Port=3023},
    @{Name="insurance-service"; Port=3024},
    @{Name="healthcare-service"; Port=3025},
    @{Name="education-service"; Port=3026},
    @{Name="astrology-service"; Port=3027},
    @{Name="beauty-ai-service"; Port=3028},
    @{Name="messaging-service"; Port=3029},
    @{Name="social-service"; Port=3030},
    @{Name="diary-service"; Port=3031},
    @{Name="poll-service"; Port=3032},
    @{Name="ai-chat-service"; Port=3033},
    @{Name="kids-video-service"; Port=3034},
    @{Name="analytics-service"; Port=3035}
)

$total = $services.Count
$successful = 0
$failed = 0
$failedServices = @()

$logFile = "deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
"Deployment started at $(Get-Date)" | Out-File $logFile
"Project: $ProjectId" | Out-File $logFile -Append
"Region: $Region" | Out-File $logFile -Append
"" | Out-File $logFile -Append

# Deploy each service
foreach ($service in $services) {
    $current = $successful + $failed + 1
    $serviceName = $service.Name
    $port = $service.Port
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "[$current/$total] Deploying: $serviceName" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    
    $servicePath = "microservices\$serviceName"
    
    if (!(Test-Path $servicePath)) {
        Write-Host "❌ Service directory not found: $servicePath" -ForegroundColor Red
        $failed++
        $failedServices += $serviceName
        "FAILED: $serviceName (directory not found)" | Out-File $logFile -Append
        continue
    }
    
    Push-Location $servicePath
    
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install --production *>> "..\..\$logFile"
    
    Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
    
    $envVars = "NODE_ENV=production,PORT=$port,SERVICE_NAME=$serviceName,MONGO_URI=$MONGO_URI,REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT,REDIS_PASSWORD=$REDIS_PASSWORD_PLAIN,JWT_SECRET=$JWT_SECRET_PLAIN,LOG_LEVEL=info"
    
    $deployCmd = "gcloud run deploy $serviceName " +
                "--source . " +
                "--region $Region " +
                "--platform managed " +
                "--allow-unauthenticated " +
                "--port $port " +
                "--memory 512Mi " +
                "--cpu 1 " +
                "--min-instances 0 " +
                "--max-instances 10 " +
                "--timeout 300 " +
                "--set-env-vars `"$envVars`" " +
                "--quiet"
    
    $result = Invoke-Expression $deployCmd 2>> "..\..\$logFile"
    
    if ($LASTEXITCODE -eq 0) {
        $serviceUrl = gcloud run services describe $serviceName --region $Region --format="value(status.url)" 2>$null
        
        Write-Host "✅ Deployed successfully!" -ForegroundColor Green
        Write-Host "   URL: $serviceUrl" -ForegroundColor Green
        
        $successful++
        "SUCCESS: $serviceName -> $serviceUrl" | Out-File "..\..\$logFile" -Append
    }
    else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        $failed++
        $failedServices += $serviceName
        "FAILED: $serviceName" | Out-File "..\..\$logFile" -Append
    }
    
    Pop-Location
    Start-Sleep -Seconds 2
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           Deployment Complete!                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Deployment Summary:" -ForegroundColor Blue
Write-Host "   ✅ Successful: $successful" -ForegroundColor Green
Write-Host "   ❌ Failed: $failed" -ForegroundColor Red
Write-Host "   📝 Total: $total"
Write-Host ""

if ($failed -gt 0) {
    Write-Host "❌ Failed services:" -ForegroundColor Red
    foreach ($failedSvc in $failedServices) {
        Write-Host "   • $failedSvc"
    }
    Write-Host ""
}

Write-Host "📝 Full deployment log saved to: $logFile" -ForegroundColor Yellow
Write-Host ""

if ($successful -eq $total) {
    Write-Host "🎉 All services deployed successfully!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "⚠️  Some services failed. Check the log file." -ForegroundColor Yellow
    exit 1
}
