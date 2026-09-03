#ifndef POWER_OPTIMIZER_H
#define POWER_OPTIMIZER_H

#include <stdbool.h>

// Predefined Power Profiles
typedef enum {
    PROFILE_PERFORMANCE,
    PROFILE_BALANCED,
    PROFILE_BATTERY_SAVER,
    PROFILE_GAMING,
    PROFILE_QUIET
} PowerProfile;

// Set the active power profile
bool set_power_profile(PowerProfile profile);

// Configure USB Selective Suspend
bool toggle_usb_selective_suspend(bool enable);

#endif // POWER_OPTIMIZER_H
