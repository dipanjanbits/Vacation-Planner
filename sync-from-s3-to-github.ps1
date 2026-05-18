# Sync from S3 bucket
# Usage: .\sync-from-s3-to-github.ps1

# Configuration
# $S3_BUCKET = "dipanjan-docs-personalproject"  # Set this env var or hardcode: "my-bucket-name"
# $S3_PATH = "vacation-planner"
# $LOCAL_PATH = Get-Location

# if (-not $S3_BUCKET) {
#     Write-Error "❌ S3_BUCKET environment variable not set. Please set it first."
#     Write-Host "Example: `$env:S3_BUCKET = 'my-bucket-name'"
#     exit 1
# }

Write-Host "🚀 Starting S3 sync"
# Write-Host "📁 Local path: $LOCAL_PATH"
# Write-Host "📦 S3 source: s3://$S3_BUCKET/$S3_PATH/"
# Write-Host ""

# Step 1: Sync from S3
Write-Host "Step 1️⃣  Syncing from S3..."
# $syncDir = Join-Path $env:TEMP "s3-sync-$(Get-Random)"
# New-Item -ItemType Directory -Path $syncDir | Out-Null

aws s3 sync s3://dipanjan-docs-personalproject/vacation-planner/ D:\HP_Backup\genai-project/temp_vac/

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ S3 sync failed"
    exit 1
}

Write-Host "✅ Downloaded from S3 to temp directory"

# # Step 2: Merge with local (copy everything from S3)
# Write-Host ""
# Write-Host "Step 2️⃣  Merging S3 files with local..."
# Copy-Item -Path "$syncDir/*" -Destination $LOCAL_PATH -Recurse -Force
# Remove-Item -Path $syncDir -Recurse -Force

# Write-Host "✅ Files merged"

Write-Host ""
Write-Host "=========================================="
Write-Host "✅ S3 sync complete!"
Write-Host "=========================================="
Write-Host ""
Write-Host "📋 Summary:"
Write-Host "  • S3 changes synced locally"
Write-Host ""
Write-Host "Next: Manually handle GitHub push"
