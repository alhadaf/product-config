#!/bin/bash

# Qoder Reset Tool
# A comprehensive terminal-only script to reset Qoder application identity information
# Pure bash script with no external dependencies

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[${timestamp}] ℹ️  ${message}${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[${timestamp}] ✅ ${message}${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}"
            ;;
        "ERROR")
            echo -e "${RED}[${timestamp}] ❌ ${message}${NC}"
            ;;
        "HEADER")
            echo -e "${BLUE}[${timestamp}] 🔍 ${message}${NC}"
            ;;
        "STEP")
            echo -e "${CYAN}[${timestamp}] 📋 ${message}${NC}"
            ;;
        "CLEAN")
            echo -e "${PURPLE}[${timestamp}] 🧹 ${message}${NC}"
            ;;
        *)
            echo -e "[${timestamp}] ${message}"
            ;;
    esac
}

# Print banner
print_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Qoder Reset Tool                         ║"
    echo "║              Complete Identity Reset Solution               ║"
    echo "║                    Pure Bash Script                        ║"
    echo "║                Mac apps, visit: http://macbunny.co          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    echo -e "${BLUE}  ██████╗   ██████╗  ██████╗  ███████╗ ██████╗ ${NC}"
    echo -e "${BLUE} ██╔═══██╗ ██╔═══██╗ ██╔══██╗ ██╔════╝ ██╔══██╗${NC}"
    echo -e "${BLUE} ██║██╗██║ ██║   ██║ ██║  ██║ █████╗   ██████╔╝${NC}"
    echo -e "${BLUE} ██║╚═╝██║ ██║   ██║ ██║  ██║ ██╔══╝   ██╔══██╗${NC}"
    echo -e "${BLUE} ╚██████╔╝ ╚██████╔╝ ██████╔╝ ███████╗ ██║  ██║${NC}"
    echo -e "${BLUE}  ╚═════╝   ╚═════╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═╝${NC}"
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Identity Reset Solution                   ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${NC}"
    echo
    echo -e "${CYAN}Repository: https://github.com/bunnysayzz/qoder-reset.git${NC}"
    echo -e "${CYAN}Author: @bunnysayzz${NC}"
    echo
    echo -e "${YELLOW}This tool will reset all Qoder application identity information${NC}"
    echo -e "${YELLOW}including machine ID, telemetry data, hardware fingerprints,${NC}"
    echo -e "${YELLOW}and network traces to make Qoder recognize your device as new.${NC}"
    echo
    echo -e "${GREEN}Get Qoder from: https://qoder.com${NC}"
    echo
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                        ⚠️  WARNING ⚠️                        ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${YELLOW}This tool will permanently delete Qoder identity data.${NC}"
    echo -e "${YELLOW}Make sure to close Qoder completely before proceeding.${NC}"
    echo
}

# Check if Qoder is running
check_qoder_running() {
    log "HEADER" "Checking Qoder process status..."
    
    local qoder_pids=()
    local system=$(uname -s)
    
    # Check for Qoder processes based on platform
    if [[ "$system" == MINGW* ]] || [[ "$system" == MSYS* ]] || [[ "$system" == CYGWIN* ]] || [[ "$system" == Windows* ]]; then
        # Windows: Use tasklist if available, otherwise ps
        if command -v tasklist >/dev/null 2>&1; then
            qoder_pids=($(tasklist /FI "IMAGENAME eq Qoder.exe" 2>/dev/null | grep -i "Qoder.exe" | awk '{print $2}' 2>/dev/null || true))
        else
            qoder_pids=($(ps aux | grep -i "Qoder" | grep -v grep | awk '{print $2}' 2>/dev/null || true))
        fi
    else
        # macOS/Linux: Use pgrep or ps
        if command -v pgrep >/dev/null 2>&1; then
            qoder_pids=($(pgrep -f "Qoder" 2>/dev/null || true))
        else
            qoder_pids=($(ps aux | grep -i "Qoder" | grep -v grep | awk '{print $2}' 2>/dev/null || true))
        fi
    fi
    
    if [ ${#qoder_pids[@]} -gt 0 ]; then
        log "ERROR" "Qoder is currently running (PIDs: ${qoder_pids[*]})"
        log "WARNING" "Please close Qoder completely before proceeding"
        if [[ "$system" == MINGW* ]] || [[ "$system" == MSYS* ]] || [[ "$system" == CYGWIN* ]] || [[ "$system" == Windows* ]]; then
            log "WARNING" "On Windows: Close from taskbar or Task Manager"
        elif [[ "$system" == "Darwin" ]]; then
            log "WARNING" "On macOS: Cmd+Q or Quit from menu"
        else
            log "WARNING" "On Linux: Close from application menu"
        fi
        echo
        read -p "Press Enter after closing Qoder, or Ctrl+C to cancel: "
        
        # Check again
        if [[ "$system" == MINGW* ]] || [[ "$system" == MSYS* ]] || [[ "$system" == CYGWIN* ]] || [[ "$system" == Windows* ]]; then
            if command -v tasklist >/dev/null 2>&1; then
                qoder_pids=($(tasklist /FI "IMAGENAME eq Qoder.exe" 2>/dev/null | grep -i "Qoder.exe" | awk '{print $2}' 2>/dev/null || true))
            else
                qoder_pids=($(ps aux | grep -i "Qoder" | grep -v grep | awk '{print $2}' 2>/dev/null || true))
            fi
        else
            if command -v pgrep >/dev/null 2>&1; then
                qoder_pids=($(pgrep -f "Qoder" 2>/dev/null || true))
            else
                qoder_pids=($(ps aux | grep -i "Qoder" | grep -v grep | awk '{print $2}' 2>/dev/null || true))
            fi
        fi
        
        if [ ${#qoder_pids[@]} -gt 0 ]; then
            log "ERROR" "Qoder is still running. Please close it completely."
            exit 1
        fi
    fi
    
    log "SUCCESS" "Qoder is not running"
}

# Get Qoder data directory based on platform
get_qoder_data_dir() {
    local system=$(uname -s)
    local qoder_dir=""
    
    case $system in
        "Darwin")  # macOS
            qoder_dir="$HOME/Library/Application Support/Qoder"
            ;;
        "Linux")
            qoder_dir="$HOME/.config/Qoder"
            ;;
        "MINGW"*|"MSYS"*|"CYGWIN"*|"Windows"*)
            # Windows: Check multiple possible locations
            if [ -n "$APPDATA" ] && [ -d "$APPDATA/Qoder" ]; then
                qoder_dir="$APPDATA/Qoder"
                log "INFO" "Found Qoder in APPDATA: $qoder_dir"
            elif [ -n "$LOCALAPPDATA" ] && [ -d "$LOCALAPPDATA/Qoder" ]; then
                qoder_dir="$LOCALAPPDATA/Qoder"
                log "INFO" "Found Qoder in LOCALAPPDATA: $qoder_dir"
            elif [ -n "$USERPROFILE" ] && [ -d "$USERPROFILE/AppData/Roaming/Qoder" ]; then
                qoder_dir="$USERPROFILE/AppData/Roaming/Qoder"
                log "INFO" "Found Qoder in USERPROFILE/Roaming: $qoder_dir"
            elif [ -n "$USERPROFILE" ] && [ -d "$USERPROFILE/AppData/Local/Qoder" ]; then
                qoder_dir="$USERPROFILE/AppData/Local/Qoder"
                log "INFO" "Found Qoder in USERPROFILE/Local: $qoder_dir"
            else
                log "ERROR" "Qoder directory not found in any Windows location"
                log "ERROR" "Searched: APPDATA, LOCALAPPDATA, USERPROFILE/AppData/Roaming, USERPROFILE/AppData/Local"
                exit 1
            fi
            ;;
        *)
            log "ERROR" "Unsupported operating system: $system"
            exit 1
            ;;
    esac
    
    echo "$qoder_dir"
}

# Check Qoder directory and files
check_qoder_directory() {
    log "HEADER" "Checking Qoder directory and files..."
    
    local qoder_dir=$(get_qoder_data_dir)
    
    if [ ! -d "$qoder_dir" ]; then
        log "ERROR" "Qoder directory not found: $qoder_dir"
        log "ERROR" "Please ensure Qoder is installed and has been run at least once"
        exit 1
    fi
    
    log "SUCCESS" "Qoder directory found: $qoder_dir"
    
    # Check key files
    local key_files=("machineid" "User/globalStorage/storage.json")
    for file in "${key_files[@]}"; do
        if [ -f "$qoder_dir/$file" ]; then
            log "SUCCESS" "Found: $file"
        else
            log "WARNING" "Missing: $file"
        fi
    done
    
    # Check cache directories
    local cache_dirs=("Cache" "GPUCache" "Code Cache" "SharedClientCache")
    local found_cache=0
    for dir in "${cache_dirs[@]}"; do
        if [ -d "$qoder_dir/$dir" ]; then
            found_cache=$((found_cache + 1))
        fi
    done
    
    log "INFO" "Found $found_cache/${#cache_dirs[@]} cache directories"
}

# Generate UUID
generate_uuid() {
    local system=$(uname -s)
    
    if command -v uuidgen >/dev/null 2>&1; then
        uuidgen
    elif command -v python3 >/dev/null 2>&1; then
        python3 -c "import uuid; print(str(uuid.uuid4()))"
    elif command -v python >/dev/null 2>&1; then
        python -c "import uuid; print(str(uuid.uuid4()))"
    elif [[ "$system" == MINGW* ]] || [[ "$system" == MSYS* ]] || [[ "$system" == CYGWIN* ]] || [[ "$system" == Windows* ]]; then
        # Windows fallback: generate a simple random string
        echo "$RANDOM-$RANDOM-$RANDOM-$RANDOM"
    else
        # Unix fallback: generate a simple random string
        cat /dev/urandom 2>/dev/null | tr -dc 'a-f0-9' | fold -w 32 | head -n 1 | sed 's/./&-/g' | sed 's/-$//' 2>/dev/null || echo "$RANDOM-$RANDOM-$RANDOM-$RANDOM"
    fi
}

# Generate SHA256 hash
generate_sha256() {
    local input="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        echo -n "$input" | sha256sum | cut -d' ' -f1
    elif command -v shasum >/dev/null 2>&1; then
        echo -n "$input" | shasum -a 256 | cut -d' ' -f1
    elif command -v openssl >/dev/null 2>&1; then
        echo -n "$input" | openssl dgst -sha256 | cut -d' ' -f2
    else
        log "ERROR" "No SHA256 hash tool available"
        exit 1
    fi
}

# Reset machine ID
reset_machine_id() {
    log "STEP" "Resetting machine ID..."
    
    local qoder_dir=$(get_qoder_data_dir)
    local new_machine_id=$(generate_uuid)
    
    # Create new machine ID file
    echo "$new_machine_id" > "$qoder_dir/machineid"
    log "SUCCESS" "Created new machine ID: $new_machine_id"
    
    # Create additional ID files for better coverage
    local additional_ids=("deviceid" "hardware_uuid" "system_uuid" "platform_id" "installation_id")
    for id_file in "${additional_ids[@]}"; do
        echo "$(generate_uuid)" > "$qoder_dir/$id_file"
        log "SUCCESS" "Created: $id_file"
    done
    
    # Update storage.json if it exists
    local storage_file="$qoder_dir/User/globalStorage/storage.json"
    if [ -f "$storage_file" ]; then
        local temp_file=$(mktemp)
        if command -v python3 >/dev/null 2>&1; then
            python3 -c "
import json
import sys
try:
    with open('$storage_file', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Update machine ID related fields
    data['telemetry.machineId'] = '$(generate_sha256 "$new_machine_id")'
    data['telemetry.devDeviceId'] = '$(generate_uuid)'
    data['telemetry.sqmId'] = '$(generate_uuid)'
    data['telemetry.sessionId'] = '$(generate_uuid)'
    data['telemetry.installationId'] = '$(generate_uuid)'
    data['telemetry.clientId'] = '$(generate_uuid)'
    data['telemetry.userId'] = '$(generate_uuid)'
    data['telemetry.anonymousId'] = '$(generate_uuid)'
    data['hardwareId'] = '$(generate_uuid)'
    data['platformId'] = '$(generate_uuid)'
    data['cpuId'] = '$(generate_uuid)'
    data['gpuId'] = '$(generate_uuid)'
    data['memoryId'] = '$(generate_uuid)'
    
    # Update system information
    import platform
    system_type = platform.system()
    if system_type == 'Darwin':
        data['system.platform'] = 'macos'
        data['system.arch'] = platform.machine()
        data['system.version'] = '14.0.0'
        data['system.build'] = '23A344'
        data['system.locale'] = 'en-US'
        data['system.timezone'] = 'America/New_York'
    elif system_type == 'Windows':
        data['system.platform'] = 'windows'
        data['system.arch'] = platform.machine()
        data['system.version'] = '10.0.22621'
        data['system.build'] = '22621'
        data['system.locale'] = 'en-US'
        data['system.timezone'] = 'Eastern Standard Time'
    else:
        data['system.platform'] = 'linux'
        data['system.arch'] = platform.machine()
        data['system.version'] = '6.0.0'
        data['system.build'] = '6.0.0'
        data['system.locale'] = 'en-US'
        data['system.timezone'] = 'UTC'
    
    with open('$storage_file', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    
    print('Storage.json updated successfully')
except Exception as e:
    print(f'Error updating storage.json: {e}')
    sys.exit(1)
"
            if [ $? -eq 0 ]; then
                log "SUCCESS" "Updated storage.json with new identifiers"
            else
                log "WARNING" "Failed to update storage.json"
            fi
        else
            log "WARNING" "Python3 not available, skipping storage.json update"
        fi
    fi
}

# Reset telemetry data
reset_telemetry() {
    log "STEP" "Resetting telemetry data..."
    
    local qoder_dir=$(get_qoder_data_dir)
    
    # Create new telemetry files
    local telemetry_files=(
        "telemetry.machineId:$(generate_sha256 "$(generate_uuid)")"
        "telemetry.devDeviceId:$(generate_uuid)"
        "telemetry.sqmId:$(generate_uuid)"
        "telemetry.sessionId:$(generate_uuid)"
        "telemetry.installationId:$(generate_uuid)"
        "telemetry.clientId:$(generate_uuid)"
        "telemetry.userId:$(generate_uuid)"
        "telemetry.anonymousId:$(generate_uuid)"
    )
    
    for telemetry_item in "${telemetry_files[@]}"; do
        local key="${telemetry_item%:*}"
        local value="${telemetry_item#*:}"
        echo "$value" > "$qoder_dir/$key"
        log "SUCCESS" "Created: $key"
    done
}

# Clean cache directories
clean_cache_directories() {
    log "STEP" "Cleaning cache directories..."
    
    local qoder_dir=$(get_qoder_data_dir)
    local cache_dirs=(
        "Cache" "Code Cache" "GPUCache" "DawnGraphiteCache" "DawnWebGPUCache"
        "ShaderCache" "DawnCache" "MediaCache" "CachedData" "CachedProfilesData"
        "CachedExtensions" "IndexedDB" "CacheStorage" "WebSQL"
    )
    
    local cleaned_count=0
    for dir in "${cache_dirs[@]}"; do
        local dir_path="$qoder_dir/$dir"
        if [ -d "$dir_path" ]; then
            rm -rf "$dir_path"
            log "CLEAN" "Cleaned: $dir"
            cleaned_count=$((cleaned_count + 1))
        fi
    done
    
    log "SUCCESS" "Cleaned $cleaned_count cache directories"
}

# Clean identity files
clean_identity_files() {
    log "STEP" "Cleaning identity files..."
    
    local qoder_dir=$(get_qoder_data_dir)
    local identity_files=(
        "Network Persistent State" "TransportSecurity" "Trust Tokens" "Trust Tokens-journal"
        "SharedStorage" "SharedStorage-wal" "Local Storage" "Session Storage"
        "WebStorage" "Shared Dictionary" "Cookies" "Cookies-journal"
        "Login Credentials" "Login Data" "Login Data-journal"
        "DeviceMetadata" "HardwareInfo" "SystemInfo" "AutofillStrikeDatabase"
        "AutofillStrikeDatabase-journal" "Feature Engagement Tracker"
        "Platform Notifications" "VideoDecodeStats" "OriginTrials"
        "BrowserMetrics" "SafeBrowsing" "QuotaManager" "QuotaManager-journal"
        "Network Action Predictor"
    )
    
    local cleaned_count=0
    for file in "${identity_files[@]}"; do
        local file_path="$qoder_dir/$file"
        if [ -e "$file_path" ]; then
            if [ -d "$file_path" ]; then
                rm -rf "$file_path"
            else
                rm -f "$file_path"
            fi
            log "CLEAN" "Cleaned: $file"
            cleaned_count=$((cleaned_count + 1))
        fi
    done
    
    log "SUCCESS" "Cleaned $cleaned_count identity files"
}

# Clean SharedClientCache
clean_shared_client_cache() {
    log "STEP" "Cleaning SharedClientCache..."
    
    local qoder_dir=$(get_qoder_data_dir)
    local shared_cache="$qoder_dir/SharedClientCache"
    
    if [ -d "$shared_cache" ]; then
        # Clean specific files
        local cache_files=(".info" ".lock" "mcp.json" "server.json" "auth.json")
        for file in "${cache_files[@]}"; do
            local file_path="$shared_cache/$file"
            if [ -f "$file_path" ]; then
                rm -f "$file_path"
                log "CLEAN" "Cleaned: SharedClientCache/$file"
            fi
        done
        
        # Clean temporary files
        find "$shared_cache" -name "tmp*" -type f -delete 2>/dev/null || true
        log "CLEAN" "Cleaned temporary files in SharedClientCache"
        
        # Clean cache subdirectories but preserve index if preserving chat
        if [ "$PRESERVE_CHAT" = "true" ]; then
            if [ -d "$shared_cache/cache" ]; then
                rm -rf "$shared_cache/cache"
                log "CLEAN" "Cleaned: SharedClientCache/cache"
            fi
        else
            # Clean everything in SharedClientCache
            find "$shared_cache" -mindepth 1 -maxdepth 1 -not -name "index" -exec rm -rf {} + 2>/dev/null || true
            log "CLEAN" "Cleaned SharedClientCache (preserving index for chat)"
        fi
    fi
}

# Reset hardware fingerprints
reset_hardware_fingerprints() {
    log "STEP" "Resetting hardware fingerprints..."
    
    local qoder_dir=$(get_qoder_data_dir)
    local system=$(uname -s)
    
    # Remove existing hardware ID files
    local hardware_files=("cpu_id" "gpu_id" "memory_id" "board_serial" "bios_uuid")
    for file in "${hardware_files[@]}"; do
        local file_path="$qoder_dir/$file"
        if [ -f "$file_path" ]; then
            rm -f "$file_path"
            log "CLEAN" "Removed: $file"
        fi
    done
    
    # Create new hardware ID files
    for file in "${hardware_files[@]}"; do
        echo "$(generate_uuid)" > "$qoder_dir/$file"
        log "SUCCESS" "Created: $file"
    done
    
    # Create fake hardware detection files
    local fake_hardware_file="$qoder_dir/hardware_detection.json"
    local fake_device_file="$qoder_dir/device_capabilities.json"
    local fake_system_file="$qoder_dir/system_features.json"
    
    # Generate fake hardware info based on system
    if [ "$system" = "Darwin" ]; then
        # macOS
        cat > "$fake_hardware_file" << EOF
{
    "cpu": {
        "name": "Apple M3 Pro",
        "cores": 12,
        "threads": 12,
        "frequency": "3.2GHz"
    },
    "gpu": {
        "name": "Apple M3 Pro GPU",
        "memory": "24GB",
        "cores": 19
    },
    "memory": {
        "total": "32GB",
        "type": "LPDDR5",
        "speed": "7467MT/s"
    }
}
EOF
    elif [[ "$system" == MINGW* ]] || [[ "$system" == MSYS* ]] || [[ "$system" == CYGWIN* ]]; then
        # Windows
        cat > "$fake_hardware_file" << EOF
{
    "cpu": {
        "name": "Intel Core i7-13700K",
        "cores": 16,
        "threads": 24,
        "frequency": "3.4GHz"
    },
    "gpu": {
        "name": "NVIDIA GeForce RTX 4070",
        "memory": "12GB",
        "driver_version": "545.84"
    },
    "memory": {
        "total": "32GB",
        "type": "DDR5",
        "speed": "5600MHz"
    }
}
EOF
    else
        # Linux
        cat > "$fake_hardware_file" << EOF
{
    "cpu": {
        "name": "AMD Ryzen 7 7700X",
        "cores": 8,
        "threads": 16,
        "frequency": "3.8GHz"
    },
    "gpu": {
        "name": "NVIDIA GeForce RTX 4060",
        "memory": "8GB",
        "cores": 1024
    },
    "memory": {
        "total": "32GB",
        "type": "DDR5",
        "speed": "4800MHz"
    }
}
EOF
    fi
    
    log "SUCCESS" "Created fake hardware detection files"
    
    # Create additional fake files
    echo '{"capabilities": ["gpu_acceleration", "hardware_video_decode", "webgl2"]}' > "$fake_device_file"
    echo '{"features": ["avx2", "sse4", "aes_ni", "virtualization"]}' > "$fake_system_file"
}

# Clean chat history (if requested)
clean_chat_history() {
    if [ "$PRESERVE_CHAT" = "false" ]; then
        log "STEP" "Cleaning chat history..."
        
        local qoder_dir=$(get_qoder_data_dir)
        local chat_dirs=(
            "User/workspaceStorage/*/chatSessions"
            "User/workspaceStorage/*/chatEditingSessions"
        )
        
        local cleaned_count=0
        for pattern in "${chat_dirs[@]}"; do
            for dir in "$qoder_dir/$pattern"; do
                if [ -d "$dir" ]; then
                    rm -rf "$dir"
                    log "CLEAN" "Cleaned chat directory: ${dir#$qoder_dir/}"
                    cleaned_count=$((cleaned_count + 1))
                fi
            done
        done
        
        if [ $cleaned_count -gt 0 ]; then
            log "SUCCESS" "Cleaned $cleaned_count chat directories"
        else
            log "INFO" "No chat directories found to clean"
        fi
    else
        log "INFO" "Preserving chat history as requested"
    fi
}

# Perform complete reset
perform_complete_reset() {
    log "HEADER" "Starting complete Qoder reset..."
    echo
    
    # Check Qoder status
    check_qoder_running
    check_qoder_directory
    
    echo
    log "HEADER" "Performing reset operations..."
    echo
    
    # Execute all reset operations
    reset_machine_id
    echo
    
    reset_telemetry
    echo
    
    clean_cache_directories
    echo
    
    clean_identity_files
    echo
    
    clean_shared_client_cache
    echo
    
    reset_hardware_fingerprints
    echo
    
    clean_chat_history
    echo
    
    log "SUCCESS" "Complete reset finished successfully!"
    log "INFO" "You can now restart Qoder and it will recognize your device as new"
}

# Show menu
show_menu() {
    echo
    echo -e "${CYAN}Available operations:${NC}"
    echo "1) Complete Reset (Recommended)"
    echo "2) Reset Machine ID only"
    echo "3) Reset Telemetry only"
    echo "4) Clean Cache only"
    echo "5) Clean Identity Files only"
    echo "6) Reset Hardware Fingerprints only"
    echo "7) Exit"
    echo
}

# Main function
main() {
    print_banner
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        log "WARNING" "Running as root is not recommended"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check dependencies
    log "HEADER" "Checking system dependencies..."
    
    # Check for basic commands
    local required_commands=("rm" "cp" "mv" "mkdir" "find")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log "ERROR" "Required command not found: $cmd"
            exit 1
        fi
    done
    
    log "SUCCESS" "System dependencies check passed"
    
    # Show warning and ask for confirmation
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ⚠️  IMPORTANT ⚠️                        ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${YELLOW}This tool will permanently delete Qoder identity data.${NC}"
    echo -e "${YELLOW}Make sure to close Qoder completely before proceeding.${NC}"
    echo
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "INFO" "Operation cancelled by user"
        exit 0
    fi
    
    # Ask about preserving chat
    echo
    read -p "Do you want to preserve chat history? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        PRESERVE_CHAT="false"
        log "INFO" "Chat history will be cleaned"
    else
        PRESERVE_CHAT="true"
        log "INFO" "Chat history will be preserved"
    fi
    
    # Main menu loop
    while true; do
        show_menu
        read -p "Select operation (1-7): " -n 1 -r
        echo
        echo
        
        case $REPLY in
            1)
                perform_complete_reset
                break
                ;;
            2)
                check_qoder_running
                check_qoder_directory
                reset_machine_id
                break
                ;;
            3)
                check_qoder_running
                check_qoder_directory
                reset_telemetry
                break
                ;;
            4)
                check_qoder_running
                check_qoder_directory
                clean_cache_directories
                break
                ;;
            5)
                check_qoder_running
                check_qoder_directory
                clean_identity_files
                break
                ;;
            6)
                check_qoder_running
                check_qoder_directory
                reset_hardware_fingerprints
                break
                ;;
            7)
                log "INFO" "Exiting..."
                exit 0
                ;;
            *)
                log "ERROR" "Invalid selection. Please choose 1-7."
                ;;
        esac
    done
    
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✅ SUCCESS ✅                             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${GREEN}Operation completed successfully!${NC}"
    echo -e "${GREEN}You can now restart Qoder and it will recognize your device as new.${NC}"
    echo
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    🔥 IMPORTANT NEXT STEP 🔥                ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${YELLOW}⚠️  Download fingerprint browser and set as default!${NC}"
    echo -e "${CYAN}📥 Best Options: Mullvad Browser, Firefox+Arkenfox, Brave${NC}"
    echo -e "${CYAN}🔗 Download: https://www.privacyguides.org/en/desktop-browsers/${NC}"
    echo -e "${YELLOW}🔧 Use fingerprint browser for new Qoder signup to avoid detection!${NC}"
    echo
    log "SUCCESS" "Operation completed successfully!"
    log "INFO" "You can now restart Qoder"
    echo
}

# Handle script interruption
trap 'echo -e "\n${RED}Script interrupted by user${NC}"; exit 1' INT TERM

# Print footer
print_footer() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    Qoder Reset Tool                         ║${NC}"
    echo -e "${CYAN}║              Complete Identity Reset Solution               ║"
    echo -e "${CYAN}║                Mac apps, visit: http://macbunny.co          ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${CYAN}Repository: https://github.com/bunnysayzz/qoder-reset.git${NC}"
    echo -e "${CYAN}Author: @bunnysayzz${NC}"
    echo -e "${CYAN}⭐ Give a star if this project helped you!${NC}"
    echo
}

# Run main function
main "$@"

# Print footer on exit
trap 'print_footer' EXIT 