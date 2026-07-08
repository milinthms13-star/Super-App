# Voice Friend Module - Verification Script
# Checks if all components are properly configured

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Voice Friend Module Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"
$issuesFound = 0
$warningsFound = 0

function Test-Component {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$ErrorMessage,
        [string]$SuccessMessage,
        [bool]$IsWarning = $false
    )
    
    Write-Host "Checking: $Name..." -ForegroundColor Yellow -NoNewline
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host " ✓" -ForegroundColor Green
            if ($SuccessMessage) {
                Write-Host "  → $SuccessMessage" -ForegroundColor Gray
            }
            return $true
        } else {
            if ($IsWarning) {
                Write-Host " ⚠" -ForegroundColor Yellow
                Write-Host "  → $ErrorMessage" -ForegroundColor Yellow
                $script:warningsFound++
            } else {
                Write-Host " ✗" -ForegroundColor Red
                Write-Host "  → $ErrorMessage" -ForegroundColor Red
                $script:issuesFound++
            }
            return $false
        }
    } catch {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  → Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:issuesFound++
        return $false
    }
}

# 1. Check Avatar Files
Write-Host "`n[1] Avatar Images" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

$avatarFiles = @("nila.png", "arjun.png", "anya.png")
foreach ($file in $avatarFiles) {
    $path = "public\avatars\$file"
    Test-Component -Name "Avatar: $file" -Test {
        (Test-Path $path) -and ((Get-Item $path).Length -gt 1KB)
    } -ErrorMessage "Missing or invalid file: $path" -SuccessMessage "$('{0:N0}' -f (Get-Item $path).Length) bytes"
}

# 2. Check Backend Environment
Write-Host "`n[2] Backend Configuration" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

Test-Component -Name "Backend .env file" -Test {
    Test-Path "backend\.env"
} -ErrorMessage "backend\.env file not found!" -SuccessMessage "File exists"

if (Test-Path "backend\.env") {
    $backendEnv = Get-Content "backend\.env" -Raw
    
    Test-Component -Name "FREE_MODE setting" -Test {
        $backendEnv -match "FREE_MODE\s*=\s*false"
    } -ErrorMessage "FREE_MODE is not set to 'false' - AI features may be disabled" -IsWarning $true
    
    Test-Component -Name "GEMINI_API_KEY" -Test {
        $backendEnv -match "GEMINI_API_KEY\s*=\s*AIza\w+"
    } -ErrorMessage "GEMINI_API_KEY not configured - get key from https://aistudio.google.com/app/apikey" -SuccessMessage "API key configured"
    
    Test-Component -Name "MongoDB URI" -Test {
        $backendEnv -match "MONGODB_URI\s*=\s*.+"
    } -ErrorMessage "MONGODB_URI not configured" -SuccessMessage "Database connection configured"
}

# 3. Check Frontend Environment
Write-Host "`n[3] Frontend Configuration" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

$frontendEnvExists = Test-Component -Name "Frontend environment file" -Test {
    (Test-Path ".env") -or (Test-Path ".env.local")
} -ErrorMessage "No .env or .env.local file found" -IsWarning $true

if ($frontendEnvExists) {
    $frontendEnvPath = if (Test-Path ".env.local") { ".env.local" } else { ".env" }
    $frontendEnv = Get-Content $frontendEnvPath -Raw
    
    Test-Component -Name "Local API URL configured" -Test {
        $frontendEnv -match "REACT_APP_API_URL.*localhost:5000" -or
        $frontendEnv -match "REACT_APP_BACKEND_URL.*localhost:5000"
    } -ErrorMessage "Local development URLs not configured in $frontendEnvPath" -IsWarning $true
}

# 4. Check Required Directories
Write-Host "`n[4] Directory Structure" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

$directories = @(
    @{path="backend\data"; name="Backend data storage"},
    @{path="backend\uploads\voicefriend"; name="Avatar uploads directory"},
    @{path="public\avatars"; name="Default avatars directory"}
)

foreach ($dir in $directories) {
    Test-Component -Name $dir.name -Test {
        Test-Path $dir.path
    } -ErrorMessage "Directory not found: $($dir.path)" -SuccessMessage "Directory exists"
}

# 5. Check Backend Source Files
Write-Host "`n[5] Backend Source Files" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

$backendFiles = @(
    @{path="backend\services\voiceFriendService.js"; name="VoiceFriend service"},
    @{path="backend\routes\voiceFriendRoutes.js"; name="VoiceFriend routes"},
    @{path="backend\app.js"; name="Main server file"}
)

foreach ($file in $backendFiles) {
    Test-Component -Name $file.name -Test {
        Test-Path $file.path
    } -ErrorMessage "Missing file: $($file.path)"
}

# 6. Check Frontend Source Files
Write-Host "`n[6] Frontend Source Files" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

$frontendFiles = @(
    @{path="src\modules\voicefriend\VoiceFriend.js"; name="VoiceFriend component"},
    @{path="src\modules\voicefriend\VoiceFriend.css"; name="VoiceFriend styles"},
    @{path="src\App.js"; name="App router"}
)

foreach ($file in $frontendFiles) {
    Test-Component -Name $file.name -Test {
        Test-Path $file.path
    } -ErrorMessage "Missing file: $($file.path)"
}

# 7. Check Route Integration
Write-Host "`n[7] Route Integration" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

if (Test-Path "backend\app.js") {
    $appJs = Get-Content "backend\app.js" -Raw
    Test-Component -Name "Backend route registered" -Test {
        $appJs -match "ai-voice-friend.*voiceFriendRoutes"
    } -ErrorMessage "VoiceFriend routes not registered in backend\app.js" -SuccessMessage "Route: /api/ai-voice-friend"
}

if (Test-Path "src\App.js") {
    $srcAppJs = Get-Content "src\App.js" -Raw
    Test-Component -Name "Frontend route registered" -Test {
        $srcAppJs -match "voice-friend.*VoiceFriend"
    } -ErrorMessage "VoiceFriend not registered in src\App.js" -SuccessMessage "Route: /voice-friend"
}

# 8. Check Dependencies
Write-Host "`n[8] Dependencies" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

if (Test-Path "backend\package.json") {
    $backendPkg = Get-Content "backend\package.json" -Raw | ConvertFrom-Json
    
    $requiredDeps = @("@google/genai", "@google-cloud/text-to-speech", "multer", "express")
    foreach ($dep in $requiredDeps) {
        Test-Component -Name "Backend dependency: $dep" -Test {
            $backendPkg.dependencies.PSObject.Properties.Name -contains $dep
        } -ErrorMessage "Missing dependency: $dep" -SuccessMessage "v$($backendPkg.dependencies.$dep)"
    }
}

# 9. Check Node Modules
Write-Host "`n[9] Installation Status" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

Test-Component -Name "Backend node_modules" -Test {
    Test-Path "backend\node_modules"
} -ErrorMessage "Run: cd backend && npm install" -SuccessMessage "Dependencies installed"

Test-Component -Name "Frontend node_modules" -Test {
    Test-Path "node_modules"
} -ErrorMessage "Run: npm install" -SuccessMessage "Dependencies installed"

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Verification Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($issuesFound -eq 0 -and $warningsFound -eq 0) {
    Write-Host "✅ All checks passed! Voice Friend is ready to use." -ForegroundColor Green
    Write-Host "`n🚀 To start the application:" -ForegroundColor Cyan
    Write-Host "   Terminal 1: cd backend && npm start" -ForegroundColor White
    Write-Host "   Terminal 2: npm start" -ForegroundColor White
    Write-Host "   Navigate to: http://localhost:3000/voice-friend`n" -ForegroundColor White
} else {
    if ($issuesFound -gt 0) {
        Write-Host "❌ Found $issuesFound critical issue(s)" -ForegroundColor Red
    }
    if ($warningsFound -gt 0) {
        Write-Host "⚠️  Found $warningsFound warning(s)" -ForegroundColor Yellow
    }
    Write-Host "`n📚 Solutions:" -ForegroundColor Cyan
    Write-Host "   • Run setup script: .\setup-voicefriend.ps1" -ForegroundColor White
    Write-Host "   • Check quick start: VOICEFRIEND_QUICKSTART.md" -ForegroundColor White
    Write-Host "   • Full details: VOICEFRIEND_MODULE_ANALYSIS.md`n" -ForegroundColor White
}

# Show additional recommendations
Write-Host "💡 Recommendations:" -ForegroundColor Cyan
if (Test-Path "backend\.env") {
    $backendEnv = Get-Content "backend\.env" -Raw
    if ($backendEnv -notmatch "GEMINI_API_KEY\s*=\s*AIza\w+") {
        Write-Host "   • Get Gemini API key for AI features (free)" -ForegroundColor Yellow
        Write-Host "     https://aistudio.google.com/app/apikey" -ForegroundColor Gray
    }
}

Write-Host "   • Replace placeholder avatars with professional images" -ForegroundColor White
Write-Host "   • Test on Chrome/Edge for best voice support" -ForegroundColor White
Write-Host "   • Enable microphone for voice input features`n" -ForegroundColor White
