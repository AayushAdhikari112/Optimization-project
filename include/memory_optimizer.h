#ifndef MEMORY_OPTIMIZER_H
#define MEMORY_OPTIMIZER_H

#include <windows.h>
#include <stddef.h>
#include <stdint.h>

#define MEMORY_MAX_STEPS 8

typedef struct MemoryStats {
	uint64_t totalBytes;
	uint64_t usedBytes;
	uint64_t availableBytes;
	uint64_t commitBytes;
	uint64_t commitLimitBytes;
	uint64_t standbyBytes;
	uint64_t modifiedBytes;
	uint64_t freeBytes;
	BOOL nativeCounters;
} MemoryStats;

typedef struct MemoryCleanOptions {
	BOOL workingSets;
	BOOL modifiedList;
	BOOL standbyList;
	BOOL lowPriorityStandbyOnly;
	BOOL fileCache;
} MemoryCleanOptions;

typedef struct MemoryStepResult {
	char step[80];
	char status[16];
	char error[256];
} MemoryStepResult;

typedef struct MemoryCleanResult {
	BOOL success;
	MemoryStats before;
	MemoryStats after;
	uint64_t freedBytes;
	uint64_t durationMs;
	MemoryStepResult perStep[MEMORY_MAX_STEPS];
	size_t stepCount;
} MemoryCleanResult;

void run_memory_optimizer(void);
BOOL memory_optimizer_is_elevated(void);
BOOL memory_optimizer_get_stats(MemoryStats *stats);
MemoryCleanResult memory_optimizer_clean(const MemoryCleanOptions *options);
int memory_optimizer_cli(int argc, char **argv);

#endif // MEMORY_OPTIMIZER_H
