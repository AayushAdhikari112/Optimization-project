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

void clear_temp_folder(void) {
    char temp_path[MAX_PATH];
    DWORD length = GetTempPathA(MAX_PATH, temp_path);
    
    if (length == 0 || length > MAX_PATH) {
        print_error("Failed to get temp path");
        return;
    }
    
    printf("[*] Clearing Temp folder: %s\n", temp_path);
    
    // Construct command to delete files in temp folder silently
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "del /q /f /s \"%s*\"", temp_path);
    
    if (run_command(cmd)) {
        printf("[+] Temp files clearing command executed.\n");
    } else {
        printf("[-] Temp files clearing command failed.\n");
    }
}

void run_disk_cleaner(void) {
    empty_recycle_bin();
    clear_temp_folder();
    printf("[+] Disk Cleaner finished.\n");
}
