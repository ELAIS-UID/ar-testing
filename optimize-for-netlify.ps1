# Project Size Optimization Script for Netlify Deployment
# PowerShell script to safely optimize your Next.js project

Write-Host "🚀 Starting Next.js Project Optimization for Netlify..." -ForegroundColor Green
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Step 1: Analyze current project size
Write-Host "`n📊 Step 1: Running project analysis..." -ForegroundColor Cyan
node project-size-analyzer.js

# Step 2: Backup package.json
Write-Host "`n💾 Step 2: Creating backup..." -ForegroundColor Cyan
Copy-Item "package.json" "package.json.backup"
Write-Host "✅ Backup created: package.json.backup"

# Step 3: Remove potentially unused dependencies
Write-Host "`n🧹 Step 3: Removing potentially unused dependencies..." -ForegroundColor Cyan

# Remove conflicting frameworks (keeping React)
$unusedFrameworks = @("vue", "vue-router", "svelte", "@sveltejs/kit", "@remix-run/react")
foreach ($framework in $unusedFrameworks) {
    Write-Host "Removing $framework..." -ForegroundColor Yellow
    npm uninstall $framework 2>$null
}

# Step 4: Pin "latest" versions to specific versions for better caching
Write-Host "`n📌 Step 4: Pinning dependency versions..." -ForegroundColor Cyan
Write-Host "⚠️  Manual action required: Replace 'latest' versions in package.json with specific versions"

# Step 5: Remove development files
Write-Host "`n🗑️  Step 5: Removing development files..." -ForegroundColor Cyan
$devFiles = @(
    "README.md",
    "CHANGELOG.md",
    ".env.local",
    ".env.development",
    "jest.config.*",
    "cypress.config.*"
)

foreach ($pattern in $devFiles) {
    $files = Get-ChildItem -Path "." -Name $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Write-Host "Removing $file..." -ForegroundColor Yellow
        Remove-Item $file -ErrorAction SilentlyContinue
    }
}

# Step 6: Optimize Next.js configuration
Write-Host "`n⚙️  Step 6: Updating Next.js configuration..." -ForegroundColor Cyan
if (Test-Path "next.config.optimized.mjs") {
    Copy-Item "next.config.mjs" "next.config.mjs.backup" -ErrorAction SilentlyContinue
    Copy-Item "next.config.optimized.mjs" "next.config.mjs"
    Write-Host "✅ Next.js configuration optimized"
} else {
    Write-Host "⚠️  Optimized config not found. Using existing configuration."
}

# Step 7: Install bundle analyzer for future analysis
Write-Host "`n📦 Step 7: Installing bundle analyzer..." -ForegroundColor Cyan
npm install --save-dev @next/bundle-analyzer

# Step 8: Build the project
Write-Host "`n🏗️  Step 8: Building optimized production build..." -ForegroundColor Cyan
npm run build

# Step 9: Analyze build output
Write-Host "`n📈 Step 9: Analyzing build size..." -ForegroundColor Cyan
if (Test-Path ".next") {
    $buildSize = (Get-ChildItem -Path ".next" -Recurse | Measure-Object -Property Length -Sum).Sum
    $buildSizeMB = [math]::Round($buildSize / 1MB, 2)
    Write-Host "Build size: $buildSizeMB MB" -ForegroundColor $(if ($buildSizeMB -lt 100) { "Green" } else { "Red" })
    
    if ($buildSizeMB -lt 100) {
        Write-Host "✅ Build size is under 100MB - suitable for Netlify!" -ForegroundColor Green
    } else {
        Write-Host "❌ Build size exceeds 100MB - additional optimization needed" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Build failed or .next directory not found" -ForegroundColor Red
}

# Step 10: Generate optimization report
Write-Host "`n📋 Step 10: Final optimization report..." -ForegroundColor Cyan
node project-size-analyzer.js

# Step 11: Create deployment package
Write-Host "`n📦 Step 11: Creating deployment package..." -ForegroundColor Cyan
$deployFiles = @(".next", "public", "package.json", "next.config.mjs")
$deployExists = $true
foreach ($file in $deployFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ Required file missing: $file" -ForegroundColor Red
        $deployExists = $false
    }
}

if ($deployExists) {
    Write-Host "✅ All required files present for deployment" -ForegroundColor Green
    Write-Host "Files ready for Netlify deployment:" -ForegroundColor Cyan
    foreach ($file in $deployFiles) {
        Write-Host "  - $file" -ForegroundColor White
    }
} else {
    Write-Host "❌ Some required files are missing" -ForegroundColor Red
}

Write-Host "`n🎉 Optimization complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the analysis report above" -ForegroundColor White
Write-Host "2. Test your application locally: npm start" -ForegroundColor White
Write-Host "3. Deploy to Netlify using the optimized build" -ForegroundColor White
Write-Host "4. Monitor bundle size with: ANALYZE=true npm run build" -ForegroundColor White