#include "disk_cleaner.h"
#include "utils.h"
#include <windows.h>
#include <stdio.h>
#include <shellapi.h>

void empty_recycle_bin(void) {
    printf("[*] Emptying Recycle Bin...\n");
    // SHERB_NOCONFIRMATION = No prompt, SHERB_NOPROGRESSUI = No progress bar, SHERB_NOSOUND = No sound
    HRESULT result = SHEmptyRecycleBinA(NULL, NULL, SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND);
    if (result == S_OK) {
        printf("[+] Recycle Bin emptied successfully.\n");
    } else {
        printf("[-] Failed to empty Recycle Bin (it might already be empty or require elevation).\n");
    }
}

static void clear_directory(const char* dir_path) {
    printf("[*] Clearing folder: %s\n", dir_path);
    char cmd[1024];
    
    size_t len = strlen(dir_path);
    
    // Delete files
    if (len > 0 && dir_path[len - 1] == '\\') {
        snprintf(cmd, sizeof(cmd), "del /q /f /s \"%s*\" >nul 2>&1", dir_path);
    } else {
        snprintf(cmd, sizeof(cmd), "del /q /f /s \"%s\\*\" >nul 2>&1", dir_path);
    }
    run_command(cmd);
    
    // Delete subdirectories
    if (len > 0 && dir_path[len - 1] == '\\') {
        snprintf(cmd, sizeof(cmd), "for /d %%x in (\"%s*\") do rmdir /s /q \"%%x\" >nul 2>&1", dir_path);
    } else {
        snprintf(cmd, sizeof(cmd), "for /d %%x in (\"%s\\*\") do rmdir /s /q \"%%x\" >nul 2>&1", dir_path);
    }
    run_command(cmd);
}

void clear_temp_folder(void) {
    char temp_path[MAX_PATH];
    DWORD length = GetTempPathA(MAX_PATH, temp_path);
    
    if (length > 0 && length <= MAX_PATH) {
        clear_directory(temp_path);
    } else {
        print_error("Failed to get user temp path");
    }

    char win_dir[MAX_PATH];
    if (GetWindowsDirectoryA(win_dir, MAX_PATH)) {
        char target_dir[MAX_PATH];
        
        // Windows Temp
        snprintf(target_dir, sizeof(target_dir), "%s\\Temp", win_dir);
        clear_directory(target_dir);
        
        // Windows Prefetch
        snprintf(target_dir, sizeof(target_dir), "%s\\Prefetch", win_dir);
        clear_directory(target_dir);
        
        // Windows SoftwareDistribution\Download
        snprintf(target_dir, sizeof(target_dir), "%s\\SoftwareDistribution\\Download", win_dir);
        clear_directory(target_dir);
    } else {
        print_error("Failed to get Windows directory");
    }
}

void run_disk_cleaner(void) {
    empty_recycle_bin();
    clear_temp_folder();
    printf("[+] Disk Cleaner finished.\n");
}
