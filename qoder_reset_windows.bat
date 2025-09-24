@echo off
REM Qoder Reset Tool - Windows Batch Version
REM Fixed Windows path handling for Qoder data directory
REM Repository: https://github.com/bunnysayzz/qoder-reset.git
REM Author: @bunnysayzz

setlocal enabledelayedexpansion

REM Set console to UTF-8
chcp 65001 >nul

echo ==================================================
echo           Qoder Reset Tool - Windows
echo ==================================================
echo.

REM Check if Qoder is running
echo [1/6] Checking if Qoder is running...
tasklist /FI "IMAGENAME eq Qoder.exe" 2>NUL | find /I /N "Qoder.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ❌ ERROR: Qoder is currently running!
    echo Please close Qoder completely before proceeding
    echo.
    pause
    exit /b 1
)
echo ✅ Qoder is not running

REM Get Qoder data directory with correct Windows paths
echo [2/6] Locating Qoder data directory...
set "QODER_DIR="

REM Try APPDATA first (most common)
if defined APPDATA (
    if exist "%APPDATA%\Qoder" (
        set "QODER_DIR=%APPDATA%\Qoder"
        echo ✅ Found Qoder in: %QODER_DIR%
    )
)

REM Try LOCALAPPDATA if APPDATA not found
if not defined QODER_DIR (
    if defined LOCALAPPDATA (
        if exist "%LOCALAPPDATA%\Qoder" (
            set "QODER_DIR=%LOCALAPPDATA%\Qoder"
            echo ✅ Found Qoder in: %QODER_DIR%
        )
    )
)

REM Try USERPROFILE as fallback
if not defined QODER_DIR (
    if defined USERPROFILE (
        if exist "%USERPROFILE%\AppData\Roaming\Qoder" (
            set "QODER_DIR=%USERPROFILE%\AppData\Roaming\Qoder"
            echo ✅ Found Qoder in: %QODER_DIR%
        ) else if exist "%USERPROFILE%\AppData\Local\Qoder" (
            set "QODER_DIR=%USERPROFILE%\AppData\Local\Qoder"
            echo ✅ Found Qoder in: %QODER_DIR%
        )
    )
)

REM Check if we found the directory
if not defined QODER_DIR (
    echo ❌ ERROR: Qoder directory not found!
    echo Searched in:
    echo   - %APPDATA%\Qoder
    echo   - %LOCALAPPDATA%\Qoder
    echo   - %USERPROFILE%\AppData\Roaming\Qoder
    echo   - %USERPROFILE%\AppData\Local\Qoder
    echo.
    echo Please ensure Qoder is installed and has been run at least once
    pause
    exit /b 1
)

REM Create backup
echo [3/6] Creating backup...
if not exist "%QODER_DIR%.backup" (
    echo Creating backup in: %QODER_DIR%.backup
    xcopy "%QODER_DIR%" "%QODER_DIR%.backup" /E /I /H /Y >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo ✅ Backup created successfully
    ) else (
        echo ⚠️  Warning: Backup creation failed, but continuing...
    )
) else (
    echo ✅ Backup already exists
)

REM Reset machine ID
echo [4/6] Resetting machine ID...
if exist "%QODER_DIR%\machineid" (
    echo Backing up current machine ID...
    copy "%QODER_DIR%\machineid" "%QODER_DIR%\machineid.backup" >nul 2>&1
)

REM Generate new machine ID (simple UUID-like format)
set "NEW_ID=%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%"
echo %NEW_ID% > "%QODER_DIR%\machineid"
echo ✅ New machine ID created: %NEW_ID%

REM Clean cache directories
echo [5/6] Cleaning cache directories...
set "CLEANED_COUNT=0"
for %%d in (Cache "Code Cache" GPUCache DawnGraphiteCache DawnWebGPUCache CachedData CachedProfilesData) do (
    if exist "%QODER_DIR%\%%d" (
        rmdir /S /Q "%QODER_DIR%\%%d" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo ✅ Cleaned: %%d
            set /a CLEANED_COUNT+=1
        )
    )
)

REM Clean identity files
echo [6/6] Cleaning identity files...
for %%f in ("Network Persistent State" "Cookies" "SharedStorage" "Trust Tokens" "TransportSecurity") do (
    if exist "%QODER_DIR%\%%f" (
        if exist "%QODER_DIR%\%%f\*" (
            rmdir /S /Q "%QODER_DIR%\%%f" >nul 2>&1
        ) else (
            del "%QODER_DIR%\%%f" >nul 2>&1
        )
        if !ERRORLEVEL! EQU 0 (
            echo ✅ Cleaned: %%f
        )
    )
)

echo.
echo ==================================================
echo           ✅ RESET COMPLETED ✅
echo ==================================================
echo.
echo Qoder has been reset successfully!
echo - Machine ID: %NEW_ID%
echo - Cache directories cleaned: %CLEANED_COUNT%
echo - Backup created: %QODER_DIR%.backup
echo.
echo You can now restart Qoder and it will recognize
echo your device as new.
echo.
echo ==================================================
echo           🔥 IMPORTANT NEXT STEP 🔥
echo ==================================================
echo ⚠️  Download fingerprint browser and set as default!
echo 📥 Best Options: Mullvad Browser, Firefox+Arkenfox, Brave
echo 🔗 Download: https://www.privacyguides.org/en/desktop-browsers/
echo 🔧 Use fingerprint browser for new Qoder signup to avoid detection!
echo.
echo ==================================================
echo           Qoder Reset Tool - Windows
echo ==================================================
echo Repository: https://github.com/bunnysayzz/qoder-reset.git
echo Author: @bunnysayzz
echo ⭐ Give a star if this project helped you!
echo Mac apps: http://macbunny.co
echo.
pause 