# Laptop B: Sync from S3, merge with local changes, and push to GitHub
# Usage: .\sync-from-s3-to-github.ps1

# Configuration
$S3_BUCKET = $env:S3_BUCKET  # Set this env var or hardcode: "my-bucket-name"
$S3_PATH = "vacation-planner"
$LOCAL_PATH = Get-Location
$GITHUB_BRANCH = "main"

if (-not $S3_BUCKET) {
    Write-Error "❌ S3_BUCKET environment variable not set. Please set it first."
    Write-Host "Example: `$env:S3_BUCKET = 'my-bucket-name'"
    exit 1
}

Write-Host "🚀 Starting S3 to GitHub sync workflow"
Write-Host "📁 Local path: $LOCAL_PATH"
Write-Host "📦 S3 source: s3://$S3_BUCKET/$S3_PATH/"
Write-Host ""

# Step 1: Check git status
Write-Host "Step 1️⃣  Checking git status..."
$gitStatus = & git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  Local uncommitted changes detected:"
    Write-Host $gitStatus
    Write-Host ""
    Write-Host "⚡ Stashing local changes..."
    & git stash push -m "Auto-stash before S3 sync - $(Get-Date -Format 'yyyy-MM-dd HHmmss')"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Failed to stash changes"
        exit 1
    }
} else {
    Write-Host "✅ No local uncommitted changes"
}

Write-Host ""

# Step 2: Sync from S3
Write-Host "Step 2️⃣  Syncing from S3..."
$syncDir = Join-Path $env:TEMP "s3-sync-$(Get-Random)"
New-Item -ItemType Directory -Path $syncDir | Out-Null

aws s3 sync "s3://$S3_BUCKET/$S3_PATH/" $syncDir `
    --region us-west-2 `
    --exclude ".git/*" `
    --exclude ".github/*" `
    --exclude ".env" `
    --exclude "*.log"

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ S3 sync failed"
    exit 1
}

Write-Host "✅ Downloaded from S3 to temp directory"

# Step 3: Merge with local (keep local .git, .env, logs)
Write-Host ""
Write-Host "Step 3️⃣  Merging S3 files with local (preserving git, .env, logs)..."
Copy-Item -Path "$syncDir/*" -Destination $LOCAL_PATH -Recurse -Force -Exclude @(".git", ".env*", "*.log")
Remove-Item -Path $syncDir -Recurse -Force

Write-Host "✅ Files merged"

# Step 4: Check what changed
Write-Host ""
Write-Host "Step 4️⃣  Reviewing changes..."
$changes = & git status --porcelain
if ($changes) {
    Write-Host "📝 Changes from S3:"
    Write-Host $changes
} else {
    Write-Host "✅ No changes from S3"
}

Write-Host ""

# Step 5: Commit and push
Write-Host "Step 5️⃣  Preparing git commit..."
& git add -A
$hasChanges = & git diff --cached --quiet; $hasChanges = $LASTEXITCODE -ne 0

if ($hasChanges) {
    $commitMessage = "Sync from S3 bucket - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    Write-Host "💾 Creating commit..."
    & git commit -m "$commitMessage"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Commit failed"
        exit 1
    }
    
    Write-Host "📤 Pushing to GitHub ($GITHUB_BRANCH)..."
    & git push origin $GITHUB_BRANCH
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Push failed"
        Write-Host "💡 Check: Do you have git credentials configured? Run: git config --global user.name 'Your Name' && git config --global user.email 'your@email.com'"
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Pushed to GitHub!"
} else {
    Write-Host "✅ No changes to commit"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "✅ Sync workflow complete!"
Write-Host "=========================================="
Write-Host ""
Write-Host "📋 Summary:"
Write-Host "  • S3 changes synced locally"
Write-Host "  • Changes committed to git"
Write-Host "  • Pushed to GitHub ($GITHUB_BRANCH)"
Write-Host ""
Write-Host "Next: Both laptops are now in sync with GitHub"
