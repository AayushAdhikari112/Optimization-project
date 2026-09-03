#include "screen_optimizer.h"
#include "utils.h"
#include <stdio.h>
#include <windows.h>

bool get_current_refresh_rate(int* out_hz) {
    DEVMODEA dm;
    ZeroMemory(&dm, sizeof(dm));
    dm.dmSize = sizeof(dm);
    if (EnumDisplaySettingsA(NULL, ENUM_CURRENT_SETTINGS, &dm)) {
        if (out_hz) *out_hz = dm.dmDisplayFrequency;
        return true;
    }
    return false;
}

bool set_display_refresh_rate(int hz) {
    DEVMODEA dm;
    ZeroMemory(&dm, sizeof(dm));
    dm.dmSize = sizeof(dm);
    if (EnumDisplaySettingsA(NULL, ENUM_CURRENT_SETTINGS, &dm)) {
        dm.dmDisplayFrequency = hz;
        LONG result = ChangeDisplaySettingsA(&dm, CDS_UPDATEREGISTRY);
        if (result == DISP_CHANGE_SUCCESSFUL) {
            printf("[*] Successfully changed refresh rate to %d Hz\n", hz);
            return true;
        } else {
            printf("[!] Failed to change refresh rate (Error %ld)\n", result);
        }
    }
    return false;
}
