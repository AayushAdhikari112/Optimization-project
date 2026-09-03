#include "cpu_optimizer.h"
#include "utils.h"
#include <stdio.h>

bool set_cpu_power_state(int min_state, int max_state) {
    char cmd[256];
    // This is a simplified wrapper. Windows requires GUIDs for power schemes.
    // We would typically use: powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN %d
    snprintf(cmd, sizeof(cmd), "powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN %d", min_state);
    if (!run_command(cmd)) return false;
    
    snprintf(cmd, sizeof(cmd), "powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX %d", max_state);
    if (!run_command(cmd)) return false;
    
    return run_command("powercfg -setactive SCHEME_CURRENT");
}

bool apply_cpu_gaming_profile(void) {
    printf("[*] Applying CPU Gaming Profile (Min: 5%%, Max: 100%%)...\n");
    return set_cpu_power_state(5, 100);
}

bool reset_cpu_settings(void) {
    printf("[*] Resetting CPU Settings to Safe Defaults...\n");
    return set_cpu_power_state(5, 100);
}
