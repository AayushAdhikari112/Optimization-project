#include "storage_optimizer.h"
#include "utils.h"
#include <stdio.h>

bool run_ssd_trim(const char* drive_letter) {
    printf("[*] Running SSD TRIM on %s...\n", drive_letter);
    char cmd[128];
    snprintf(cmd, sizeof(cmd), "defrag %s /L /O", drive_letter);
    return run_command(cmd);
}

bool run_hdd_defrag(const char* drive_letter) {
    printf("[*] Running HDD Defragmentation on %s...\n", drive_letter);
    char cmd[128];
    snprintf(cmd, sizeof(cmd), "defrag %s /O", drive_letter);
    return run_command(cmd);
}

bool check_storage_health(const char* drive_letter) {
    printf("[*] Checking Storage Health via WMI for %s...\n", drive_letter);
    // Simplified: would use wmic diskdrive get status in reality
    return run_command("wmic diskdrive get status");
}
