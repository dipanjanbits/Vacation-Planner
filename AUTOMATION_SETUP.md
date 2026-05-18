# Automation Setup: Schedule Sync Scripts with Windows Task Scheduler

This guide helps you automate the sync scripts so they run on a schedule without manual intervention.

## 📅 Option 1: Laptop B Auto-Sync to GitHub (Recommended)

Set this to run periodically (e.g., every 1 hour or daily) to automatically pull from S3 and push to GitHub.

### Step 1: Create Scheduled Task

Open PowerShell as Administrator and run:

```powershell
$taskName = "VacationPlanner-S3-to-GitHub"
$scriptPath = "C:\path\to\vacation_planner_mcp\sync-from-s3-to-github.ps1"
$workDir = "C:\path\to\vacation_planner_mcp"

# Create trigger: Every 1 hour
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 1) -At (Get-Date) -RepetitionDuration (New-TimeSpan -Days 365)

# Create action: Run PowerShell script
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -NoExit -File `"$scriptPath`"" `
    -WorkingDirectory $workDir

# Set environment variable for S3_BUCKET (add before script runs)
$settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable

# Create the task
Register-ScheduledTask -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Description "Auto-sync vacation planner from S3 to GitHub every hour"

Write-Host "✅ Task created: $taskName"
```

### Step 2: Set Environment Variable in Task

1. Open Task Scheduler: `Win+R` → type `taskschd.msc` → Enter
2. Find and right-click your task (`VacationPlanner-S3-to-GitHub`)
3. Select "Edit..." → Go to "Actions" tab
4. Edit the action and set the full script path with environment variable:

```
powershell.exe -NoProfile -Command "& {
    $env:S3_BUCKET='your-bucket-name'
    & 'C:\path\to\vacation_planner_mcp\sync-from-s3-to-github.ps1'
}"
```

### Step 3: Test the Task

```powershell
Start-ScheduledTask -TaskName "VacationPlanner-S3-to-GitHub"
```

View logs:
```powershell
Get-ScheduledTaskInfo -TaskName "VacationPlanner-S3-to-GitHub"
```

---

## 📅 Option 2: Laptop A Auto-Upload to S3

Run this after you save files (e.g., every 30 minutes or on file changes).

### Step 1: Create Scheduled Task

```powershell
$taskName = "VacationPlanner-Upload-S3"
$scriptPath = "C:\path\to\vacation_planner_mcp\sync-to-s3.ps1"
$workDir = "C:\path\to\vacation_planner_mcp"

# Trigger: Every 30 minutes
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 30) -At (Get-Date) -RepetitionDuration (New-TimeSpan -Days 365)

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -NoExit -File `"$scriptPath`"" `
    -WorkingDirectory $workDir

$settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Description "Auto-upload vacation planner to S3 every 30 minutes"

Write-Host "✅ Task created: $taskName"
```

---

## ⏱️ Trigger Options

### Run on Schedule
```powershell
# Every 1 hour
New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 1) -At (Get-Date) -RepetitionDuration (New-TimeSpan -Days 365)

# Every 30 minutes
New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 30) -At (Get-Date) -RepetitionDuration (New-TimeSpan -Days 365)

# Every day at 9 AM
New-ScheduledTaskTrigger -Daily -At "09:00:00"

# Every 15 minutes between 8 AM - 6 PM
New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 15) -At "08:00:00" -RepetitionDuration (New-TimeSpan -Hours 10)
```

### Run on Event
```powershell
# Run at login
New-ScheduledTaskTrigger -AtLogOn

# Run at startup
New-ScheduledTaskTrigger -AtStartup
```

---

## 🗑️ Remove Scheduled Tasks

```powershell
# List all vacation planner tasks
Get-ScheduledTask -TaskName "VacationPlanner*"

# Remove a task
Unregister-ScheduledTask -TaskName "VacationPlanner-S3-to-GitHub" -Confirm:$false
```

---

## 📊 Monitor Scheduled Tasks

```powershell
# View task details
Get-ScheduledTask -TaskName "VacationPlanner-S3-to-GitHub" | Format-List

# View task history
Get-ScheduledTaskInfo -TaskName "VacationPlanner-S3-to-GitHub"

# View task run history (last 10 runs)
Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" | Where-Object {$_.Message -like "*VacationPlanner*"} | Select-Object -First 10 TimeCreated, Message
```

---

## 🔧 Troubleshooting Scheduled Tasks

### Task doesn't run automatically
- Check: "Run with highest privileges" is enabled
- Check: Task Scheduler service is running (`services.msc` → Task Scheduler)
- Check: Network is available when task is scheduled to run

### PowerShell script execution policy
If you get "execution policy" error, add to your task:
```powershell
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "C:\path\to\script.ps1"
```

### View detailed error logs
1. Open Task Scheduler
2. Right-click task → View Results
3. Check "Last Run Time" and "Last Run Result" (0 = success, non-zero = error)

---

## 🚀 Advanced: GitHub Actions Alternative

Instead of Laptop B running scripts locally, use GitHub Actions to automatically sync from S3 and push:

```yaml
name: Auto-sync from S3

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
      
      - name: Sync from S3
        run: |
          aws s3 sync s3://${{ secrets.S3_BUCKET }}/vacation-planner/ . \
            --exclude ".git/*" --exclude ".env*" --exclude "*.log" --delete
      
      - name: Commit and push
        run: |
          git config user.name "Auto-Sync Bot"
          git config user.email "noreply@github.com"
          git add -A
          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Auto-sync from S3 - $(date)"
            git push
          fi
```

Add this as `.github/workflows/auto-sync-s3.yml` to automate Laptop B's job entirely!

---

## 📋 Complete Setup Checklist

### Laptop A (Upload to S3)
- [ ] AWS CLI configured with credentials
- [ ] S3_BUCKET env var set
- [ ] `sync-to-s3.ps1` in repo
- [ ] (Optional) Windows Task Scheduler task created for auto-upload

### Laptop B (S3 → GitHub)
- [ ] AWS CLI configured with credentials
- [ ] S3_BUCKET env var set
- [ ] Git configured with credentials
- [ ] `sync-from-s3-to-github.ps1` in repo
- [ ] (Optional) Windows Task Scheduler task created for auto-sync
- [ ] (Optional) GitHub Actions workflow added for server-side sync

---

## 🎯 Recommended Schedule

**Laptop A:** Auto-upload every 30 minutes (quick, local operation)
**Laptop B:** Auto-sync every 1 hour (pulls S3, commits, pushes to GitHub)

This ensures changes flow: Laptop A → S3 → Laptop B → GitHub within 1.5 hours max.

