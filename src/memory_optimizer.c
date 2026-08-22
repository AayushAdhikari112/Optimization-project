#include "memory_optimizer.h"
#include "utils.h"
#include <windows.h>
#include <psapi.h>
#include <stdio.h>

void optimize_process_memory(DWORD processID) {
    // Open process with required privileges
    HANDLE hProcess = OpenProcess(PROCESS_SET_QUOTA | PROCESS_QUERY_INFORMATION, FALSE, processID);
    if (hProcess != NULL) {
        // EmptyWorkingSet removes as many pages as possible from the working set of the specified process.
        if (EmptyWorkingSet(hProcess)) {
            // Successfully emptied working set
        }
        CloseHandle(hProcess);
    }
}

void run_memory_optimizer(void) {
    printf("[*] Running Memory Optimizer...\n");
    printf("[*] Attempting to free unused RAM (Emptying Working Sets)...\n");

    DWORD aProcesses[1024], cbNeeded, cProcesses;
    unsigned int i;

    // Get the list of process identifiers.
    if (!EnumProcesses(aProcesses, sizeof(aProcesses), &cbNeeded)) {
        print_error("Failed to enumerate processes");
        return;
    }

    // Calculate how many process identifiers were returned.
    cProcesses = cbNeeded / sizeof(DWORD);

    // Try to empty working set for each process
    for (i = 0; i < cProcesses; i++) {
        if (aProcesses[i] != 0) {
            optimize_process_memory(aProcesses[i]);
        }
    }

    printf("[+] Memory Optimizer finished. Check Task Manager to see RAM usage reduction.\n");
}
