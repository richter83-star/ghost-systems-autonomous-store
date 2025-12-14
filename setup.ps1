Write-Host "================================================"
Write-Host "   GHOST SYSTEMS - FULL PROJECT INTEGRATION"
Write-Host "================================================"
Write-Host ""

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectDir = if ($env:PROJECT_DIR) { $env:PROJECT_DIR } else { $scriptDir }
$sourceDir = if ($env:GHOST_SYSTEMS_DIR) { $env:GHOST_SYSTEMS_DIR } else { $scriptDir }

Write-Host "Step 1: Creating integration workspace at $projectDir..."
if (-not (Test-Path $projectDir)) { New-Item -ItemType Directory -Path $projectDir | Out-Null }
Set-Location $projectDir

if ($sourceDir -ne $projectDir) {
    Write-Host "Step 2: Copying GhostSystems core files..."
    Copy-Item -Path (Join-Path $sourceDir '*') -Destination $projectDir -Recurse -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "Step 2: Using existing project workspace (no copy needed)..."
}

Write-Host "Step 3: Installing dependencies..."
if (Test-Path "package.json") {
    npm install
    Write-Host "✓ Dependencies installed"
} else {
    Write-Error "✗ No package.json found"
}

Write-Host "Step 4: Checking environment configuration..."
if (-not (Test-Path ".env")) {
    Write-Error "✗ .env file not found! Please create .env file with required credentials"
}

Write-Host "Step 5: Validating Shopify connection..."
node (Join-Path $scriptDir 'scripts' 'shopify-connection-check.js')

Write-Host ""
Write-Host "================================================"
Write-Host "   INTEGRATION SETUP COMPLETE"
Write-Host "================================================"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Configure Firebase credentials in .env"
Write-Host "2. Add Gemini API key in .env"
Write-Host "3. Run: npm start"
Write-Host ""
