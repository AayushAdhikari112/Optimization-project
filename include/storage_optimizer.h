#ifndef STORAGE_OPTIMIZER_H
#define STORAGE_OPTIMIZER_H

#include <stdbool.h>

// Trigger a TRIM command on the specified drive letter (e.g., "C:")
bool run_ssd_trim(const char* drive_letter);

// Trigger standard defragmentation on HDD
bool run_hdd_defrag(const char* drive_letter);

// Run standard storage health checks
bool check_storage_health(const char* drive_letter);

#endif // STORAGE_OPTIMIZER_H
