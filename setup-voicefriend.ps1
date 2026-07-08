# Voice Friend Module - Automated Setup Script
# Run this script from the project root directory

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Voice Friend Module Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# Step 1: Create avatars directory
Write-Host "[1/5] Creating avatars directory..." -ForegroundColor Yellow
$avatarsPath = "public\avatars"
if (Test-Path $avatarsPath) {
    Write-Host "  ✓ Avatars directory already exists" -ForegroundColor Green
} else {
    New-Item -ItemType Directory -Force -Path $avatarsPath | Out-Null
    Write-Host "  ✓ Created: $avatarsPath" -ForegroundColor Green
}

# Step 2: Download placeholder avatar images
Write-Host "`n[2/5] Downloading placeholder avatars..." -ForegroundColor Yellow

$avatars = @(
    @{name="nila"; bg="c7d2fe"; color="4338ca"; label="Nila (Caring companion)"},
    @{name="arjun"; bg="a7f3d0"; color="065f46"; label="Arjun (Motivating buddy)"},
    @{name="anya"; bg="fbcfe8"; color="9f1239"; label="Anya (Soothing guide)"}
)

$downloadCount = 0
foreach ($avatar in $avatars) {
    $filePath = "public\avatars\$($avatar.name).png"
    
    if (Test-Path $filePath) {
        Write-Host "  ✓ $($avatar.label) - Already exists" -ForegroundColor Gray
    } else {
        try {
            $url = "https://ui-avatars.com/api/?name=$($avatar.name)&size=512&background=$($avatar.bg)&color=$($avatar.color)&bold=true&format=png"
            Invoke-WebRequest -Uri $url -OutFile $filePath -UseBasicParsing
            Write-Host "  ✓ $($avatar.label) - Downloaded" -ForegroundColor Green
            $downloadCount++
        } catch {
            Write-Host "  ✗ Failed to download $($avatar.name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if ($downloadCount -gt 0) {
    Write-Host "  → Downloaded $downloadCount new avatar(s)" -ForegroundColor Green
}

# Step 3: Check backend environment
Write-Host "`n[3/5] Checking backend environment..." -ForegroundColor Yellow

$backendEnvPath = "backend\.env"
if (Test-Path $backendEnvPath) {
    Write-Host "  ✓ Backend .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content $backendEnvPath -Raw
    
    # Check FREE_MODE
    if ($envContent -match "FREE_MODE\s*=\s*true") {
        Write-Host "  ⚠ FREE_MODE is enabled (AI features disabled)" -ForegroundColor Yellow
        Write-Host "    To enable AI: Set FREE_MODE=false and add GEMINI_API_KEY" -ForegroundColor Yellow
    } elseif ($envContent -match "FREE_MODE\s*=\s*false") {
        Write-Host "  ✓ FREE_MODE is disabled (AI enabled)" -ForegroundColor Green
    }
    
    # Check GEMINI_API_KEY
    if ($envContent -match "GEMINI_API_KEY\s*=\s*AIza\w+") {
        Write-Host "  ✓ GEMINI_API_KEY is configured" -ForegroundColor Green
    } elseif ($envContent -match "GEMINI_API_KEY\s*=\s*$") {
        Write-Host "  ⚠ GEMINI_API_KEY is empty" -ForegroundColor Yellow
    } else {
        Write-Host "  ⚠ GEMINI_API_KEY not found in .env" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "  ✗ Backend .env file not found!" -ForegroundColor Red
}

# Step 4: Check/Create frontend environment
Write-Host "`n[4/5] Checking frontend environment..." -ForegroundColor Yellow

$frontendEnvPath = ".env.local"
$frontendEnvContent = @"
# Local development configuration for Voice Friend
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_BACKEND_URL=http://localhost:5000
"@

if (Test-Path $frontendEnvPath) {
    Write-Host "  ✓ Frontend .env.local already exists" -ForegroundColor Green
    $content = Get-Content $frontendEnvPath -Raw
    if ($content -match "REACT_APP_API_URL.*localhost:5000") {
        Write-Host "  ✓ Local development URLs configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ .env.local exists but may need localhost URLs" -ForegroundColor Yellow
    }
} else {
    try {
        Set-Content -Path $frontendEnvPath -Value $frontendEnvContent
        Write-Host "  ✓ Created .env.local with local development URLs" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to create .env.local: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 5: Verify directory structure
Write-Host "`n[5/5] Verifying directory structure..." -ForegroundColor Yellow

$requiredDirs = @(
    @{path="backend\data"; desc="Backend data storage"},
    @{path="backend\uploads\voicefriend"; desc="Avatar uploads"},
    @{path="public\avatars"; desc="Default avatars"}
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir.path) {
        Write-Host "  ✓ $($dir.desc): $($dir.path)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Missing: $($dir.path)" -ForegroundColor Yellow
        try {
            New-Item -ItemType Directory -Force -Path $dir.path | Out-Null
            Write-Host "    → Created directory" -ForegroundColor Green
        } catch {
            Write-Host "    ✗ Failed to create: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Summary and next steps
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ Avatars directory created" -ForegroundColor Green
Write-Host "✅ Placeholder avatars downloaded" -ForegroundColor Green
Write-Host "✅ Directory structure verified" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Get Gemini API key: https://aistudio.google.com/app/apikey" -ForegroundColor White
Write-Host "  2. Add to backend/.env:" -ForegroundColor White
Write-Host "     GEMINI_API_KEY=your_key_here" -ForegroundColor Gray
Write-Host "     FREE_MODE=false" -ForegroundColor Gray
Write-Host "  3. Start backend: cd backend && npm start" -ForegroundColor White
Write-Host "  4. Start frontend: npm start" -ForegroundColor White
Write-Host "  5. Navigate to: http://localhost:3000/voice-friend" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "  • Full analysis: VOICEFRIEND_MODULE_ANALYSIS.md" -ForegroundColor White
Write-Host "  • Quick start: VOICEFRIEND_QUICKSTART.md" -ForegroundColor White

Write-Host "`n🎯 To verify setup, run:" -ForegroundColor Cyan
Write-Host "  .\verify-voicefriend.ps1`n" -ForegroundColor White

# Check if API key needs to be configured
$backendEnvPath = "backend\.env"
if (Test-Path $backendEnvPath) {
    $envContent = Get-Content $backendEnvPath -Raw
    if ($envContent -match "FREE_MODE\s*=\s*true" -or $envContent -notmatch "GEMINI_API_KEY\s*=\s*AIza\w+") {
        Write-Host "⚠️  IMPORTANT: Voice Friend needs Gemini API key to work!" -ForegroundColor Yellow
        Write-Host "   Without it, you'll only get basic fallback responses.`n" -ForegroundColor Yellow
    }
}
