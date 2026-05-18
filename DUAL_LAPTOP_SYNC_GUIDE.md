# Dual-Laptop Sync Setup Guide

This guide enables you to develop on two laptops and keep them synchronized via S3 as a bridge to GitHub.

## 🏗️ Architecture

```
Laptop A (No GitHub push)  ──S3 sync──>  S3 Bucket
                                              ↓
Laptop B (Can push)  <───S3 sync───  S3 Bucket  →  GitHub
```

## 📋 Prerequisites

- AWS CLI configured on both laptops (`aws configure`)
- S3 bucket created in your AWS account
- Git installed on Laptop B
- GitHub credentials configured on Laptop B

## 🚀 Setup

### Step 1: Set environment variable on both laptops

PowerShell:
```powershell
$env:S3_BUCKET = "your-bucket-name"
# To make it permanent, add to your PowerShell profile:
# [Environment]::SetEnvironmentVariable("S3_BUCKET", "your-bucket-name", "User")
```

Bash/Linux/Mac:
```bash
export S3_BUCKET="your-bucket-name"
# Add to ~/.bashrc or ~/.zshrc to make it permanent
```

### Step 2: Copy sync scripts to your local repo

Both scripts are already in the repo root:
- `sync-to-s3.ps1` (for Laptop A)
- `sync-from-s3-to-github.ps1` (for Laptop B)

## 💻 Usage Workflow

### On Laptop A (Can upload to S3, but cannot push to GitHub)

**After making code changes:**

```powershell
cd C:\path\to\vacation_planner_mcp
$env:S3_BUCKET = "your-bucket-name"
.\sync-to-s3.ps1
```

What it does:
1. ✅ Compresses all local changes (excluding `.git`, logs, `.env`)
2. ✅ Uploads to `s3://your-bucket-name/vacation-planner/`
3. ✅ Deletes removed files from S3 (keeps S3 in sync)

### On Laptop B (Can sync from S3 and push to GitHub)

**After Laptop A uploads to S3:**

```powershell
cd C:\path\to\vacation_planner_mcp
$env:S3_BUCKET = "your-bucket-name"
.\sync-from-s3-to-github.ps1
```

What it does:
1. ✅ Stashes any local uncommitted changes
2. ✅ Downloads latest code from S3
3. ✅ Merges with local (preserves `.git`, `.env`, logs)
4. ✅ Commits changes with timestamp
5. ✅ Pushes to GitHub `main` branch
6. ✅ Restores local stashed changes if needed

## 📊 Complete Daily Workflow Example

### Day 1 - Laptop A makes changes:

```powershell
# Laptop A
cd C:\projects\vacation_planner_mcp
# ... edit files ...
$env:S3_BUCKET = "my-bucket"
.\sync-to-s3.ps1
# Output: ✅ Changes uploaded to S3
```

### Day 1 - Laptop B syncs and pushes:

```powershell
# Laptop B
cd C:\projects\vacation_planner_mcp
$env:S3_BUCKET = "my-bucket"
.\sync-from-s3-to-github.ps1
# Output: ✅ Synced from S3, pushed to GitHub
```

### Day 2 - Laptop A pulls latest from S3:

```powershell
# Laptop A
cd C:\projects\vacation_planner_mcp
$env:S3_BUCKET = "my-bucket"
# Just run the sync script again (Laptop A is S3-only)
.\sync-to-s3.ps1
```

Wait, Laptop A needs to **pull** from S3 when Laptop B makes changes. Let me create a script for that.

---

## 🔄 Advanced: Keeping Laptop A Updated

If Laptop A needs to pull latest changes (after Laptop B pushes), create a pull script:

```powershell
# sync-from-s3-laptop-a.ps1
# For Laptop A: Pull latest from S3 (after Laptop B synced)

$S3_BUCKET = $env:S3_BUCKET
$S3_PATH = "vacation-planner"
$LOCAL_PATH = Get-Location

Write-Host "📥 Syncing latest from S3 to local..."
aws s3 sync "s3://$S3_BUCKET/$S3_PATH/" $LOCAL_PATH `
    --region us-west-2 `
    --exclude ".git/*" `
    --exclude ".env*" `
    --exclude "*.log" `
    --delete

Write-Host "✅ Laptop A is now up to date with S3!"
```

## 🛡️ Safety & Best Practices

1. **Always commit before syncing**: The scripts auto-stash on Laptop B
2. **Review changes**: Check `git diff` before committing
3. **Use meaningful commit messages**: Scripts auto-add timestamps
4. **Backup your S3 bucket**: Enable versioning in S3 console
5. **Never commit secrets**: Keep `.env` file locally, not in git
6. **Test on small changes first**: Before syncing large projects

## ⚠️ Conflict Resolution

If both laptops edit the same file:
- **Laptop A**: Your local version stays in sync folder
- **Laptop B**: Git handles it (will warn about merge conflicts)

To resolve conflicts on Laptop B:
```bash
git status          # See conflicted files
# Edit files manually to resolve
git add .
git commit -m "Merge conflict resolution"
git push
```

## 🐛 Troubleshooting

### "S3_BUCKET not set"
```powershell
$env:S3_BUCKET = "your-bucket-name"
```

### "AWS credentials not configured"
```bash
aws configure
# Enter your AWS Access Key ID and Secret
```

### "Push failed" on Laptop B
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git config --global credential.helper store  # Save credentials
```

### "Sync slower than expected"
- Check internet connection
- Check file count: Large repos take longer
- S3 suggests versioning adds overhead; disable if not needed

## 📈 Monitoring S3 Sync

Check what's in your S3 bucket:
```bash
aws s3 ls s3://your-bucket-name/vacation-planner/ --recursive
```

Check S3 sync history:
```bash
aws s3api get-bucket-versioning --bucket your-bucket-name
```

## 🔗 Integration with GitHub Actions

Your deployment workflow in `.github/workflows/deploy.yml` already syncs to S3 after building Docker images. This creates a secondary backup of your deployment artifacts.

To sync FROM S3 back to repo (optional):
- Add a workflow step that runs `aws s3 sync s3://bucket/ . --exclude .git/*` on a schedule
- Useful if you want GitHub to always have latest build artifacts

---

## 📝 Quick Reference

| Task | Laptop A | Laptop B |
|------|----------|----------|
| Make code changes | ✅ Yes | ✅ Yes |
| Upload to S3 | ✅ `sync-to-s3.ps1` | ❌ |
| Pull from S3 | ⚠️ Overwrite local | ✅ `sync-from-s3-to-github.ps1` |
| Push to GitHub | ❌ No network access | ✅ Yes |

