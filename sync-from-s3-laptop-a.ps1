# Laptop A: Pull latest changes from S3 (after Laptop B syncs)
# Usage: .\sync-from-s3-laptop-a.ps1

# Configuration
$S3_BUCKET = "dipanjan-docs-personalproject"  # Set this env var or hardcode: "my-bucket-name"
$S3_PATH = "vacation-planner"
$LOCAL_PATH = Get-Location

if (-not $S3_BUCKET) {
    Write-Error "❌ S3_BUCKET environment variable not set. Please set it first."
    Write-Host "Example: `$env:S3_BUCKET = 'my-bucket-name'"
    exit 1
}

Write-Host "📥 Pulling latest from S3 to Laptop A"
Write-Host "📁 Local path: $LOCAL_PATH"
Write-Host "📦 S3 source: s3://$S3_BUCKET/$S3_PATH/"
Write-Host ""

Write-Host "⬇️  Syncing from S3..."
aws s3 sync "s3://$S3_BUCKET/$S3_PATH/" $LOCAL_PATH `
    --region us-west-2 `
    --no-verify-ssl `
    --delete

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ S3 sync failed"
    exit 1
}

Write-Host ""
Write-Host "=========================================="
Write-Host "✅ Laptop A is now up to date!"
Write-Host "=========================================="
