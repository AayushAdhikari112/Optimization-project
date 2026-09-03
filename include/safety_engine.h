#ifndef SAFETY_ENGINE_H
#define SAFETY_ENGINE_H

#include <stdbool.h>

// Create a system restore point
bool create_restore_point(const char* description);

// Backup specific registry key
bool backup_registry_key(const char* key_path, const char* backup_file_path);

#endif // SAFETY_ENGINE_H
