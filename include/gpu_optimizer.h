#ifndef GPU_OPTIMIZER_H
#define GPU_OPTIMIZER_H

#include <stdbool.h>

// Set GPU power profile (e.g., Performance, Optimal Power)
bool set_gpu_power_profile(bool performance_mode);

// Enable or disable GPU hardware acceleration in Windows (HAGS)
bool toggle_hags(bool enable);

#endif // GPU_OPTIMIZER_H
