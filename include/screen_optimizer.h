#ifndef SCREEN_OPTIMIZER_H
#define SCREEN_OPTIMIZER_H

#include <stdbool.h>

// Refresh rates typically require Windows API (EnumDisplaySettings / ChangeDisplaySettingsEx)
// This is a stub for the interface.

bool get_current_refresh_rate(int* out_hz);
bool set_display_refresh_rate(int hz);

#endif // SCREEN_OPTIMIZER_H
