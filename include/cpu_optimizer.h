#ifndef CPU_OPTIMIZER_H
#define CPU_OPTIMIZER_H

#include <stdbool.h>

// Set CPU power states via Windows API (powercfg)
bool set_cpu_power_state(int min_state, int max_state);

// Apply recommended gaming profile for CPU
bool apply_cpu_gaming_profile(void);

// Reset CPU settings to safe defaults
bool reset_cpu_settings(void);

#endif // CPU_OPTIMIZER_H
