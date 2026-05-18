# Laptop A: Sync local changes to S3
# Usage: .\sync-to-s3.ps1
#new comment   s
# Configuration
$S3_BUCKET = "dipanjan-docs-personalproject"  # Set this env var or hardcode: "my-bucket-name"
$S3_PATH = "vacation-planner"
$LOCAL_PATH = Get-Location

if (-not $S3_BUCKET) {
    Write-Error "❌ S3_BUCKET environment variable not set. Please set it first."
    Write-Host "Example: `$env:S3_BUCKET = 'my-bucket-name'"
    exit 1
}

Write-Host "🚀 Starting S3 sync from local to s3://$S3_BUCKET/$S3_PATH/"
Write-Host "📁 Local path: $LOCAL_PATH"
Write-Host ""

# Build exclude filter
$excludeFilter = $EXCLUDE_PATTERNS -join " --exclude "
$excludeFilter = "--exclude " + $excludeFilter

# Run sync
Write-Host "⏳ Syncing files to S3..."
aws s3 sync $LOCAL_PATH "s3://$S3_BUCKET/$S3_PATH/" `
    --region us-west-2 `
    --no-verify-ssl `
    --exclude ".venv/*" `
    --exclude ".github/*" `
    --delete

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Sync complete!"
    Write-Host "📤 Changes uploaded to s3://$S3_BUCKET/$S3_PATH/"
    Write-Host ""
    Write-Host "Next step: Run the sync script on Laptop B to pull these changes and push to GitHub"
} else {
    Write-Host "❌ Sync failed with exit code $LASTEXITCODE"
    exit 1
}
