#include "gpu_optimizer.h"
#include "utils.h"
#include <stdio.h>

bool set_gpu_power_profile(bool performance_mode) {
    if (performance_mode) {
        printf("[*] Setting GPU to Performance Profile...\n");
        // Windows doesn't have a simple CLI for GPU power, usually done via control panels.
        // We can simulate or set Windows power plan which indirectly affects it.
        return run_command("powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"); // High Performance GUID
    } else {
        printf("[*] Setting GPU to Optimal Power Profile...\n");
        return run_command("powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e"); // Balanced GUID
    }
}

bool toggle_hags(bool enable) {
    printf("[*] Toggling Hardware-Accelerated GPU Scheduling: %s\n", enable ? "ON" : "OFF");
    char cmd[256];
    snprintf(cmd, sizeof(cmd), 
        "reg add \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\" /v HwSchMode /t REG_DWORD /d %d /f", 
        enable ? 2 : 1);
    return run_command(cmd);
}
