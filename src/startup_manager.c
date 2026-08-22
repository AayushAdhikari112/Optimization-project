#include "startup_manager.h"
#include "utils.h"
#include <windows.h>
#include <stdio.h>

void list_startup_apps(HKEY root_key, const char* subkey_path, const char* key_name) {
    HKEY hKey;
    if (RegOpenKeyExA(root_key, subkey_path, 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        printf("\n--- %s ---\n", key_name);
        
        DWORD index = 0;
        char value_name[MAX_PATH];
        DWORD value_name_size = MAX_PATH;
        DWORD type;
        
        while (RegEnumValueA(hKey, index, value_name, &value_name_size, NULL, &type, NULL, NULL) == ERROR_SUCCESS) {
            printf("  - %s\n", value_name);
            index++;
            value_name_size = MAX_PATH;
        }
        
        if (index == 0) {
            printf("  (None found)\n");
        }
        RegCloseKey(hKey);
    } else {
        printf("[-] Failed to open registry key: %s\n", key_name);
    }
}

void run_startup_manager(void) {
    printf("[*] Analyzing Startup Applications...\n");
    
    const char* run_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    
    list_startup_apps(HKEY_CURRENT_USER, run_key, "Current User Startup Apps");
    list_startup_apps(HKEY_LOCAL_MACHINE, run_key, "Local Machine Startup Apps (Requires Admin to modify)");
    
    printf("\n[i] Note: Modifying these keys requires a dedicated UI or specific commands. Currently, we just list them for review.\n");
    printf("[+] Startup Manager finished.\n");
}
