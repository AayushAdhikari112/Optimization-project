#include "safety_engine.h"
#include "utils.h"
#include <stdio.h>

bool create_restore_point(const char* description) {
    printf("[*] Creating System Restore Point: %s...\n", description);
    
    // We invoke PowerShell to create a restore point
    char cmd[512];
    snprintf(cmd, sizeof(cmd), 
        "powershell -Command \"Checkpoint-Computer -Description '%s' -RestorePointType 'MODIFY_SETTINGS'\"", 
        description);
        
    return run_command(cmd);
}

bool backup_registry_key(const char* key_path, const char* backup_file_path) {
    printf("[*] Backing up Registry Key: %s to %s\n", key_path, backup_file_path);
    char cmd[512];
    snprintf(cmd, sizeof(cmd), "reg export \"%s\" \"%s\" /y", key_path, backup_file_path);
    return run_command(cmd);
}
