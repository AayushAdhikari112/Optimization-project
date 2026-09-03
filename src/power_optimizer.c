#include "power_optimizer.h"
#include "utils.h"
#include <stdio.h>

bool set_power_profile(PowerProfile profile) {
    const char* guid = NULL;
    switch (profile) {
        case PROFILE_PERFORMANCE:
        case PROFILE_GAMING:
            guid = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"; // High Performance
            break;
        case PROFILE_BALANCED:
            guid = "381b4222-f694-41f0-9685-ff5bb260df2e"; // Balanced
            break;
        case PROFILE_BATTERY_SAVER:
        case PROFILE_QUIET:
            guid = "a1841308-3541-4fab-bc81-f71556f20b4a"; // Power Saver
            break;
    }
    
    if (guid) {
        printf("[*] Setting Power Profile GUID: %s\n", guid);
        char cmd[128];
        snprintf(cmd, sizeof(cmd), "powercfg -setactive %s", guid);
        return run_command(cmd);
    }
    return false;
}

bool toggle_usb_selective_suspend(bool enable) {
    printf("[*] Toggling USB Selective Suspend: %s\n", enable ? "ON" : "OFF");
    char cmd[256];
    // AC Setting
    snprintf(cmd, sizeof(cmd), "powercfg -setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 %d", enable ? 1 : 0);
    run_command(cmd);
    // DC Setting
    snprintf(cmd, sizeof(cmd), "powercfg -setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 %d", enable ? 1 : 0);
    run_command(cmd);
    return run_command("powercfg -setactive SCHEME_CURRENT");
}
