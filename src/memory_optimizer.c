#include "memory_optimizer.h"
#include <windows.h>
#include <psapi.h>
#include <pdh.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

typedef LONG NTSTATUS;
typedef NTSTATUS (NTAPI *NtQuerySystemInformationFn)(ULONG, PVOID, ULONG, PULONG);
typedef NTSTATUS (NTAPI *NtSetSystemInformationFn)(ULONG, PVOID, ULONG);

#define SYSTEM_MEMORY_LIST_INFORMATION 80
#define MEMORY_EMPTY_WORKING_SETS 2
#define MEMORY_FLUSH_MODIFIED_LIST 3
#define MEMORY_PURGE_STANDBY_LIST 4
#define MEMORY_PURGE_LOW_PRIORITY_STANDBY_LIST 5
#define STATUS_ACCESS_DENIED ((NTSTATUS)0xC0000022L)
#define STATUS_PRIVILEGE_NOT_HELD ((NTSTATUS)0xC0000061L)

typedef struct SystemMemoryListInformation {
    ULONG_PTR zeroPageCount;
    ULONG_PTR freePageCount;
    ULONG_PTR modifiedPageCount;
    ULONG_PTR modifiedNoWritePageCount;
    ULONG_PTR badPageCount;
    ULONG_PTR standbyPageCount[8];
    ULONG_PTR repurposedPagesByPriority[8];
    ULONG_PTR modifiedPageCountPageFile;
} SystemMemoryListInformation;

static uint64_t pages_to_bytes(ULONG_PTR pages, ULONG pageSize) {
    return (uint64_t)pages * (uint64_t)pageSize;
}

static BOOL enable_privilege(HANDLE token, const wchar_t *name, const char *label, char *error, size_t errorSize) {
    LUID luid;
    TOKEN_PRIVILEGES privileges;
    DWORD lastError;

    if (!LookupPrivilegeValueW(NULL, name, &luid)) {
        snprintf(error, errorSize, "LookupPrivilegeValue for %s failed (%lu)", label, GetLastError());
        return FALSE;
    }
    memset(&privileges, 0, sizeof(privileges));
    privileges.PrivilegeCount = 1;
    privileges.Privileges[0].Luid = luid;
    privileges.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
    SetLastError(ERROR_SUCCESS);
    if (!AdjustTokenPrivileges(token, FALSE, &privileges, sizeof(privileges), NULL, NULL)) {
        snprintf(error, errorSize, "AdjustTokenPrivileges for %s failed (%lu)", label, GetLastError());
        return FALSE;
    }
    lastError = GetLastError();
    if (lastError == ERROR_NOT_ALL_ASSIGNED) {
        snprintf(error, errorSize, "%s was not granted; restart as administrator", label);
        return FALSE;
    }
    if (lastError != ERROR_SUCCESS) {
        snprintf(error, errorSize, "Enabling %s failed (%lu)", label, lastError);
        return FALSE;
    }
    return TRUE;
}

static BOOL get_memory_list(SystemMemoryListInformation *memoryList) {
    HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
    NtQuerySystemInformationFn query;
    NTSTATUS status;
    ULONG returned = 0;
    if (!ntdll) return FALSE;
    query = (NtQuerySystemInformationFn)GetProcAddress(ntdll, "NtQuerySystemInformation");
    if (!query) return FALSE;
    memset(memoryList, 0, sizeof(*memoryList));
    status = query(SYSTEM_MEMORY_LIST_INFORMATION, memoryList, sizeof(*memoryList), &returned);
    return status >= 0 && (returned == 0 || returned >= sizeof(*memoryList));
}

static BOOL get_pdh_counter_bytes(const wchar_t *path, uint64_t *bytes) {
    PDH_HQUERY query = NULL;
    PDH_HCOUNTER counter = NULL;
    PDH_FMT_COUNTERVALUE value;
    PDH_STATUS status;
    BOOL success = FALSE;
    status = PdhOpenQueryW(NULL, 0, &query);
    if (status != ERROR_SUCCESS) return FALSE;
    status = PdhAddEnglishCounterW(query, path, 0, &counter);
    if (status == ERROR_SUCCESS && PdhCollectQueryData(query) == ERROR_SUCCESS &&
        PdhGetFormattedCounterValue(counter, PDH_FMT_LARGE, NULL, &value) == ERROR_SUCCESS &&
        value.CStatus == ERROR_SUCCESS && value.largeValue >= 0) {
        *bytes = (uint64_t)value.largeValue;
        success = TRUE;
    }
    PdhCloseQuery(query);
    return success;
}

BOOL memory_optimizer_is_elevated(void) {
    HANDLE token = NULL;
    TOKEN_ELEVATION elevation;
    DWORD returned = 0;
    BOOL elevated = FALSE;
    if (OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) {
        if (GetTokenInformation(token, TokenElevation, &elevation, sizeof(elevation), &returned))
            elevated = elevation.TokenIsElevated != 0;
        CloseHandle(token);
    }
    return elevated;
}

BOOL memory_optimizer_get_stats(MemoryStats *stats) {
    MEMORYSTATUSEX memoryStatus;
    PERFORMANCE_INFORMATION performance;
    SYSTEM_INFO systemInfo;
    SystemMemoryListInformation memoryList;
    uint64_t value = 0;
    size_t index;
    if (!stats) return FALSE;
    memset(stats, 0, sizeof(*stats));
    memset(&memoryStatus, 0, sizeof(memoryStatus));
    memoryStatus.dwLength = sizeof(memoryStatus);
    if (!GlobalMemoryStatusEx(&memoryStatus)) return FALSE;
    GetSystemInfo(&systemInfo);

    stats->totalBytes = memoryStatus.ullTotalPhys;
    stats->availableBytes = memoryStatus.ullAvailPhys;
    stats->usedBytes = stats->totalBytes > stats->availableBytes
        ? stats->totalBytes - stats->availableBytes : 0;
    stats->freeBytes = stats->availableBytes;
    memset(&performance, 0, sizeof(performance));
    performance.cb = sizeof(performance);
    if (GetPerformanceInfo(&performance, sizeof(performance))) {
        stats->commitBytes = pages_to_bytes(performance.CommitTotal, performance.PageSize);
        stats->commitLimitBytes = pages_to_bytes(performance.CommitLimit, performance.PageSize);
        stats->totalBytes = pages_to_bytes(performance.PhysicalTotal, performance.PageSize);
        stats->availableBytes = pages_to_bytes(performance.PhysicalAvailable, performance.PageSize);
        stats->usedBytes = stats->totalBytes > stats->availableBytes
            ? stats->totalBytes - stats->availableBytes : 0;
        stats->freeBytes = stats->availableBytes;
    } else {
        stats->commitLimitBytes = memoryStatus.ullTotalPageFile;
        stats->commitBytes = memoryStatus.ullTotalPageFile > memoryStatus.ullAvailPageFile
            ? memoryStatus.ullTotalPageFile - memoryStatus.ullAvailPageFile : 0;
    }

    if (get_memory_list(&memoryList)) {
        stats->freeBytes = pages_to_bytes(memoryList.zeroPageCount + memoryList.freePageCount, systemInfo.dwPageSize);
        stats->modifiedBytes = pages_to_bytes(memoryList.modifiedPageCount + memoryList.modifiedNoWritePageCount, systemInfo.dwPageSize);
        for (index = 0; index < 8; ++index)
            stats->standbyBytes += pages_to_bytes(memoryList.standbyPageCount[index], systemInfo.dwPageSize);
        stats->nativeCounters = TRUE;
    } else {
        static const wchar_t *standbyCounters[] = {
            L"\\Memory\\Standby Cache Normal Priority Bytes",
            L"\\Memory\\Standby Cache Reserve Bytes",
            L"\\Memory\\Standby Cache Core Bytes"
        };
        for (index = 0; index < sizeof(standbyCounters) / sizeof(standbyCounters[0]); ++index)
            if (get_pdh_counter_bytes(standbyCounters[index], &value)) stats->standbyBytes += value;
        if (get_pdh_counter_bytes(L"\\Memory\\Modified Page List Bytes", &value))
            stats->modifiedBytes = value;
    }
    return TRUE;
}

static void add_step(MemoryCleanResult *result, const char *step, const char *status, const char *error) {
    MemoryStepResult *entry;
    if (result->stepCount >= MEMORY_MAX_STEPS) return;
    entry = &result->perStep[result->stepCount++];
    snprintf(entry->step, sizeof(entry->step), "%s", step);
    snprintf(entry->status, sizeof(entry->status), "%s", status);
    if (error) snprintf(entry->error, sizeof(entry->error), "%s", error);
}

static BOOL set_memory_list_command(ULONG command, const char *step, MemoryCleanResult *result) {
    HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
    NtSetSystemInformationFn setInformation;
    NTSTATUS status;
    printf("{\"type\":\"progress\",\"step\":\"%s\"}\n", step);
    fflush(stdout);
    if (!ntdll || !(setInformation = (NtSetSystemInformationFn)GetProcAddress(ntdll, "NtSetSystemInformation"))) {
        add_step(result, step, "failed", "NtSetSystemInformation is unavailable");
        return FALSE;
    }
    status = setInformation(SYSTEM_MEMORY_LIST_INFORMATION, &command, sizeof(command));
    if (status >= 0) {
        add_step(result, step, "success", NULL);
        return TRUE;
    }
    if (status == STATUS_PRIVILEGE_NOT_HELD)
        add_step(result, step, "failed", "STATUS_PRIVILEGE_NOT_HELD: run as administrator and verify required privileges");
    else if (status == STATUS_ACCESS_DENIED)
        add_step(result, step, "failed", "STATUS_ACCESS_DENIED: Windows denied this memory operation");
    else {
        char error[96];
        snprintf(error, sizeof(error), "NtSetSystemInformation failed (NTSTATUS 0x%08lX)", (unsigned long)status);
        add_step(result, step, "failed", error);
    }
    return FALSE;
}

static BOOL enable_required_privileges(MemoryCleanResult *result) {
    HANDLE token = NULL;
    char error[192] = "";
    BOOL success = FALSE;
    printf("{\"type\":\"progress\",\"step\":\"Enabling memory privileges...\"}\n");
    fflush(stdout);
    if (!OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &token)) {
        snprintf(error, sizeof(error), "OpenProcessToken failed (%lu)", GetLastError());
    } else if (!enable_privilege(token, SE_PROFILE_SINGLE_PROCESS_NAME, "SeProfileSingleProcessPrivilege", error, sizeof(error))) {
    } else if (!enable_privilege(token, SE_INCREASE_QUOTA_NAME, "SeIncreaseQuotaPrivilege", error, sizeof(error))) {
    } else {
        success = TRUE;
    }
    if (token) CloseHandle(token);
    if (success) add_step(result, "Enable required privileges", "success", NULL);
    else add_step(result, "Enable required privileges", "failed", error[0] ? error : "Required privileges were not granted");
    return success;
}

MemoryCleanResult memory_optimizer_clean(const MemoryCleanOptions *options) {
    MemoryCleanOptions selected = { TRUE, TRUE, TRUE, TRUE, FALSE };
    MemoryCleanResult result;
    ULONGLONG started = GetTickCount64();
    BOOL succeeded = TRUE;
    char error[192];
    memset(&result, 0, sizeof(result));
    if (!memory_optimizer_get_stats(&result.before)) {
        add_step(&result, "Read memory before optimization", "failed", "GlobalMemoryStatusEx could not read a baseline snapshot");
        result.durationMs = GetTickCount64() - started;
        return result;
    }
    if (options) selected = *options;
    if (!enable_required_privileges(&result)) succeeded = FALSE;
    if (succeeded && selected.modifiedList)
        succeeded = set_memory_list_command(MEMORY_FLUSH_MODIFIED_LIST, "Flushing modified pages...", &result);
    if (succeeded && selected.workingSets)
        succeeded = set_memory_list_command(MEMORY_EMPTY_WORKING_SETS, "Emptying working sets...", &result);
    if (succeeded && selected.standbyList) {
        ULONG command = selected.lowPriorityStandbyOnly
            ? MEMORY_PURGE_LOW_PRIORITY_STANDBY_LIST : MEMORY_PURGE_STANDBY_LIST;
        succeeded = set_memory_list_command(command,
            selected.lowPriorityStandbyOnly ? "Purging low-priority standby pages..." : "Purging standby pages...", &result);
    }
    if (succeeded && selected.fileCache) {
        printf("{\"type\":\"progress\",\"step\":\"Resetting file cache limits...\"}\n");
        fflush(stdout);
        if (SetSystemFileCacheSize((SIZE_T)-1, (SIZE_T)-1, 0))
            add_step(&result, "Reset file cache limits", "success", NULL);
        else {
            snprintf(error, sizeof(error), "SetSystemFileCacheSize failed (%lu)", GetLastError());
            add_step(&result, "Reset file cache limits", "failed", error);
            succeeded = FALSE;
        }
    }
    if (!memory_optimizer_get_stats(&result.after)) {
        add_step(&result, "Read memory after optimization", "failed", "GlobalMemoryStatusEx could not read the final snapshot");
        succeeded = FALSE;
    }
    result.freedBytes = result.after.availableBytes > result.before.availableBytes
        ? result.after.availableBytes - result.before.availableBytes : 0;
    result.durationMs = GetTickCount64() - started;
    result.success = succeeded;
    return result;
}

static void print_stats_json(const MemoryStats *stats) {
    printf("{\"totalBytes\":%llu,\"usedBytes\":%llu,\"availableBytes\":%llu,\"commitBytes\":%llu,\"commitLimitBytes\":%llu,\"standbyBytes\":%llu,\"modifiedBytes\":%llu,\"freeBytes\":%llu,\"nativeCounters\":%s}",
        (unsigned long long)stats->totalBytes, (unsigned long long)stats->usedBytes,
        (unsigned long long)stats->availableBytes, (unsigned long long)stats->commitBytes,
        (unsigned long long)stats->commitLimitBytes, (unsigned long long)stats->standbyBytes,
        (unsigned long long)stats->modifiedBytes, (unsigned long long)stats->freeBytes,
        stats->nativeCounters ? "true" : "false");
}

static void print_clean_json(const MemoryCleanResult *result) {
    size_t index;
    printf("{\"success\":%s,\"before\":", result->success ? "true" : "false");
    print_stats_json(&result->before);
    printf(",\"after\":");
    print_stats_json(&result->after);
    printf(",\"freedBytes\":%llu,\"durationMs\":%llu,\"perStep\":[",
        (unsigned long long)result->freedBytes, (unsigned long long)result->durationMs);
    for (index = 0; index < result->stepCount; ++index) {
        const MemoryStepResult *step = &result->perStep[index];
        if (index) putchar(',');
        printf("{\"step\":\"%s\",\"status\":\"%s\"", step->step, step->status);
        if (step->error[0]) printf(",\"error\":\"%s\"", step->error);
        putchar('}');
    }
    puts("]}");
}

int memory_optimizer_cli(int argc, char **argv) {
    int index;
    if (argc < 2) return -1;
    if (strcmp(argv[1], "--memory-admin") == 0) {
        puts(memory_optimizer_is_elevated() ? "true" : "false");
        return 0;
    }
    if (strcmp(argv[1], "--memory-stats") == 0) {
        MemoryStats stats;
        if (!memory_optimizer_get_stats(&stats)) return 2;
        print_stats_json(&stats);
        putchar('\n');
        return 0;
    }
    if (strcmp(argv[1], "--memory-clean") == 0) {
        MemoryCleanOptions options = { TRUE, TRUE, TRUE, TRUE, FALSE };
        MemoryCleanResult result;
        for (index = 2; index < argc; ++index) {
            if (strcmp(argv[index], "--no-working-sets") == 0) options.workingSets = FALSE;
            else if (strcmp(argv[index], "--no-modified-list") == 0) options.modifiedList = FALSE;
            else if (strcmp(argv[index], "--standby=full") == 0) options.lowPriorityStandbyOnly = FALSE;
            else if (strcmp(argv[index], "--standby=none") == 0) options.standbyList = FALSE;
            else if (strcmp(argv[index], "--file-cache") == 0) options.fileCache = TRUE;
        }
        result = memory_optimizer_clean(&options);
        print_clean_json(&result);
        return result.success ? 0 : 3;
    }
    return -1;
}

void run_memory_optimizer(void) {
    MemoryCleanOptions options = { TRUE, TRUE, TRUE, TRUE, FALSE };
    MemoryCleanResult result = memory_optimizer_clean(&options);
    printf("Memory optimization %s; %llu bytes became available.\n",
        result.success ? "completed" : "stopped with errors",
        (unsigned long long)result.freedBytes);
}