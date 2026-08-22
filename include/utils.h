#ifndef UTILS_H
#define UTILS_H

#include <windows.h>
#include <stdio.h>
#include <stdbool.h>

// Print error message with Windows error code
void print_error(const char* context);

// Helper for running command line processes (useful for network reset, etc.)
bool run_command(const char* cmd);

// Check if the current process has administrative privileges
bool is_run_as_admin(void);

#endif // UTILS_H
