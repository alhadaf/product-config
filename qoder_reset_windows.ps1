# Qoder Reset Tool - Windows PowerShell Version
# Fixed Windows path handling for Qoder data directory
# Repository: https://github.com/bunnysayzz/qoder-reset.git
# Author: @bunnysayzz

param(
    [switch]$Force,
    [switch]$NoBackup
)

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "           Qoder Reset Tool - Windows" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Function to write colored output
function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "INFO"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Type) {
        "SUCCESS" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor Green }
        "ERROR"   { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "[$timestamp] ⚠️  $Message" -ForegroundColor Yellow }
        "INFO"    { Write-Host "[$timestamp] ℹ️  $Message" -ForegroundColor Blue }
        "CLEAN"   { Write-Host "[$timestamp] 🧹 $Message" -ForegroundColor Magenta }
        default   { Write-Host "[$timestamp] $Message" }
    }
}

# Check if Qoder is running
Write-Status "Checking if Qoder is running..." "INFO"
$qoderProcesses = Get-Process -Name "Qoder" -ErrorAction SilentlyContinue

if ($qoderProcesses) {
    Write-Status "Qoder is currently running! Please close it completely." "ERROR"
    Write-Host "Process IDs: $($qoderProcesses.Id -join ', ')" -ForegroundColor Red
    Write-Host "Please close Qoder and run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Status "Qoder is not running" "SUCCESS"

# Get Qoder data directory with correct Windows paths
Write-Status "Locating Qoder data directory..." "INFO"

$qoderDir = $null
$searchedPaths = @()

# Try APPDATA first (most common)
if ($env:APPDATA) {
    $searchedPaths += "$env:APPDATA\Qoder"
    if (Test-Path "$env:APPDATA\Qoder") {
        $qoderDir = "$env:APPDATA\Qoder"
        Write-Status "Found Qoder in: $qoderDir" "SUCCESS"
    }
}

# Try LOCALAPPDATA if APPDATA not found
if (-not $qoderDir -and $env:LOCALAPPDATA) {
    $searchedPaths += "$env:LOCALAPPDATA\Qoder"
    if (Test-Path "$env:LOCALAPPDATA\Qoder") {
        $qoderDir = "$env:LOCALAPPDATA\Qoder"
        Write-Status "Found Qoder in: $qoderDir" "SUCCESS"
    }
}

# Try USERPROFILE as fallback
if (-not $qoderDir -and $env:USERPROFILE) {
    $searchedPaths += "$env:USERPROFILE\AppData\Roaming\Qoder"
    $searchedPaths += "$env:USERPROFILE\AppData\Local\Qoder"
    
    if (Test-Path "$env:USERPROFILE\AppData\Roaming\Qoder") {
        $qoderDir = "$env:USERPROFILE\AppData\Roaming\Qoder"
        Write-Status "Found Qoder in: $qoderDir" "SUCCESS"
    } elseif (Test-Path "$env:USERPROFILE\AppData\Local\Qoder") {
        $qoderDir = "$env:USERPROFILE\AppData\Local\Qoder"
        Write-Status "Found Qoder in: $qoderDir" "SUCCESS"
    }
}

# Check if we found the directory
if (-not $qoderDir) {
    Write-Status "Qoder directory not found!" "ERROR"
    Write-Host "Searched in:" -ForegroundColor Red
    foreach ($path in $searchedPaths) {
        Write-Host "  - $path" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please ensure Qoder is installed and has been run at least once" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Show directory contents
Write-Status "Qoder directory contents:" "INFO"
Get-ChildItem $qoderDir | Select-Object Name, LastWriteTime | Format-Table -AutoSize

# Create backup
if (-not $NoBackup) {
    Write-Status "Creating backup..." "INFO"
    $backupPath = "$qoderDir.backup"
    
    if (-not (Test-Path $backupPath)) {
        try {
            Copy-Item -Path $qoderDir -Destination $backupPath -Recurse -Force
            Write-Status "Backup created successfully: $backupPath" "SUCCESS"
        } catch {
            Write-Status "Warning: Backup creation failed, but continuing..." "WARNING"
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Status "Backup already exists: $backupPath" "SUCCESS"
    }
}

# Reset machine ID
Write-Status "Resetting machine ID..." "INFO"
$machineIdFile = Join-Path $qoderDir "machineid"

if (Test-Path $machineIdFile) {
    Write-Status "Backing up current machine ID..." "INFO"
    Copy-Item $machineIdFile "$machineIdFile.backup" -Force
    $oldId = Get-Content $machineIdFile -Raw
    Write-Status "Old machine ID: $oldId" "INFO"
}

# Generate new machine ID
$newId = [System.Guid]::NewGuid().ToString()
Set-Content -Path $machineIdFile -Value $newId -Force
Write-Status "New machine ID created: $newId" "SUCCESS"

# Clean cache directories
Write-Status "Cleaning cache directories..." "INFO"
$cacheDirs = @("Cache", "Code Cache", "GPUCache", "DawnGraphiteCache", "DawnWebGPUCache", "CachedData", "CachedProfilesData")
$cleanedCount = 0

foreach ($dir in $cacheDirs) {
    $dirPath = Join-Path $qoderDir $dir
    if (Test-Path $dirPath) {
        try {
            Remove-Item $dirPath -Recurse -Force
            Write-Status "Cleaned: $dir" "CLEAN"
            $cleanedCount++
        } catch {
            Write-Status "Failed to clean: $dir" "WARNING"
        }
    }
}

Write-Status "Cleaned $cleanedCount cache directories" "SUCCESS"

# Clean identity files
Write-Status "Cleaning identity files..." "INFO"
$identityFiles = @("Network Persistent State", "Cookies", "SharedStorage", "Trust Tokens", "TransportSecurity", "Preferences")

foreach ($file in $identityFiles) {
    $filePath = Join-Path $qoderDir $file
    if (Test-Path $filePath) {
        try {
            if (Test-Path $filePath -PathType Container) {
                Remove-Item $filePath -Recurse -Force
            } else {
                Remove-Item $filePath -Force
            }
            Write-Status "Cleaned: $file" "CLEAN"
        } catch {
            Write-Status "Failed to clean: $file" "WARNING"
        }
    }
}

# Clean SharedClientCache
$sharedCachePath = Join-Path $qoderDir "SharedClientCache"
if (Test-Path $sharedCachePath) {
    Write-Status "Cleaning SharedClientCache..." "INFO"
    
    # Clean specific files
    $cacheFiles = @(".info", ".lock", "mcp.json", "server.json", "auth.json")
    foreach ($file in $cacheFiles) {
        $filePath = Join-Path $sharedCachePath $file
        if (Test-Path $filePath) {
            try {
                Remove-Item $filePath -Force
                Write-Status "Cleaned: SharedClientCache/$file" "CLEAN"
            } catch {
                Write-Status "Failed to clean: SharedClientCache/$file" "WARNING"
            }
        }
    }
    
    # Clean cache subdirectory
    $cacheSubPath = Join-Path $sharedCachePath "cache"
    if (Test-Path $cacheSubPath) {
        try {
            Remove-Item $cacheSubPath -Recurse -Force
            Write-Status "Cleaned: SharedClientCache/cache" "CLEAN"
        } catch {
            Write-Status "Failed to clean: SharedClientCache/cache" "WARNING"
        }
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "           ✅ RESET COMPLETED ✅" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Qoder has been reset successfully!" -ForegroundColor Green
Write-Host "- Machine ID: $newId" -ForegroundColor Cyan
Write-Host "- Cache directories cleaned: $cleanedCount" -ForegroundColor Cyan
if (-not $NoBackup) {
    Write-Host "- Backup created: $backupPath" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "You can now restart Qoder and it will recognize" -ForegroundColor Yellow
Write-Host "your device as new." -ForegroundColor Yellow
Write-Host ""

Write-Host "==================================================" -ForegroundColor Red
Write-Host "           🔥 IMPORTANT NEXT STEP 🔥" -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Red
Write-Host "⚠️  Download fingerprint browser and set as default!" -ForegroundColor Yellow
Write-Host "📥 Best Options: Mullvad Browser, Firefox+Arkenfox, Brave" -ForegroundColor Cyan
Write-Host "🔗 Download: https://www.privacyguides.org/en/desktop-browsers/" -ForegroundColor Cyan
Write-Host "🔧 Use fingerprint browser for new Qoder signup to avoid detection!" -ForegroundColor Yellow
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "           Qoder Reset Tool - Windows" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Repository: https://github.com/bunnysayzz/qoder-reset.git" -ForegroundColor Cyan
Write-Host "Author: @bunnysayzz" -ForegroundColor Cyan
Write-Host "⭐ Give a star if this project helped you!" -ForegroundColor Yellow
Write-Host "Mac apps: http://macbunny.co" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit" 