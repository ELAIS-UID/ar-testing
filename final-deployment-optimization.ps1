# Final Deployment Optimization Script
# This script prepares the project for Netlify deployment under 100MB

Write-Host "🚀 Final Deployment Optimization for Netlify" -ForegroundColor Green

# Step 1: Remove development dependencies
Write-Host "`n🧹 Removing development dependencies..." -ForegroundColor Cyan
npm prune --production

# Step 2: Clean cache and temporary files
Write-Host "`n🗑️  Cleaning cache and temporary files..." -ForegroundColor Cyan
npm cache clean --force
Remove-Item ".next/cache" -Recurse -ErrorAction SilentlyContinue
Remove-Item "node_modules/.cache" -Recurse -ErrorAction SilentlyContinue

# Step 3: Reinstall only production dependencies
Write-Host "`n📦 Reinstalling production dependencies..." -ForegroundColor Cyan
Remove-Item "node_modules" -Recurse -Force
npm ci --production --prefer-offline

# Step 4: Build the optimized version
Write-Host "`n🏗️  Building optimized production version..." -ForegroundColor Cyan
npm run build

# Step 5: Remove unnecessary build artifacts
Write-Host "`n🧹 Removing unnecessary build artifacts..." -ForegroundColor Cyan
Remove-Item ".next/cache" -Recurse -ErrorAction SilentlyContinue
Remove-Item ".next/trace" -Recurse -ErrorAction SilentlyContinue
Remove-Item ".next/**/*.map" -Recurse -ErrorAction SilentlyContinue

# Step 6: Check final sizes
Write-Host "`n📊 Final size analysis..." -ForegroundColor Cyan
$nextSize = (Get-ChildItem -Path ".next" -Recurse | Measure-Object -Property Length -Sum).Sum
$nodeModulesSize = (Get-ChildItem -Path "node_modules" -Recurse | Measure-Object -Property Length -Sum).Sum
$totalSize = $nextSize + $nodeModulesSize

$nextSizeMB = [math]::Round($nextSize / 1MB, 2)
$nodeModulesSizeMB = [math]::Round($nodeModulesSize / 1MB, 2)
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host "Build size (.next): $nextSizeMB MB" -ForegroundColor White
Write-Host "Dependencies size (node_modules): $nodeModulesSizeMB MB" -ForegroundColor White
Write-Host "Total deployment size: $totalSizeMB MB" -ForegroundColor $(if ($totalSizeMB -lt 100) { "Green" } else { "Red" })

if ($totalSizeMB -lt 100) {
    Write-Host "✅ SUCCESS! Project is under 100MB and ready for Netlify deployment!" -ForegroundColor Green
} else {
    Write-Host "❌ Project still exceeds 100MB. Additional optimization needed." -ForegroundColor Red
    Write-Host "Consider removing more unused dependencies or using dynamic imports." -ForegroundColor Yellow
}

# Step 7: Create deployment package info
Write-Host "`n📋 Deployment package contents:" -ForegroundColor Cyan
Write-Host "Required files for deployment:" -ForegroundColor White
Write-Host "  - .next/ (build output): $nextSizeMB MB" -ForegroundColor White
Write-Host "  - public/ (static assets): $(([math]::Round((Get-ChildItem -Path 'public' -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB, 2)))KB" -ForegroundColor White
Write-Host "  - package.json (dependencies info)" -ForegroundColor White
Write-Host "  - next.config.mjs (configuration)" -ForegroundColor White

Write-Host "`nFor further optimization:" -ForegroundColor Yellow
Write-Host "1. Use Netlify Functions for server-side logic instead of full Node.js runtime" -ForegroundColor White
Write-Host "2. Move large assets to CDN" -ForegroundColor White
Write-Host "3. Use dynamic imports for heavy components" -ForegroundColor White
Write-Host "4. Consider using Next.js static export for completely static sites" -ForegroundColor White