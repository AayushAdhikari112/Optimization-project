#include <stdio.h>
#include <stdlib.h>
#include "utils.h"

// TODO: Include module headers as they are implemented
#include "disk_cleaner.h"
#include "startup_manager.h"
#include "memory_optimizer.h"
#include "network_optimizer.h"

void print_menu() {
    printf("\n=== PC Optimization Tool ===\n");
    printf("1. Disk Cleaner (Clear Temp Files)\n");
    printf("2. Startup Manager (List Startup Apps)\n");
    printf("3. Memory Optimizer (Free RAM)\n");
    printf("4. Network Optimizer (Flush DNS/Reset Winsock)\n");
    printf("0. Exit\n");
    printf("============================\n");
    printf("Select an option: ");
}

int main() {
    if (!is_run_as_admin()) {
        printf("\n[!] WARNING: You are not running as Administrator.\n");
        printf("Some optimizations (Network reset, Startup management) may fail.\n\n");
    }

    int choice = -1;
    while (1) {
        print_menu();
        if (scanf("%d", &choice) != 1) {
            // Clear input buffer on invalid input
            while (getchar() != '\n');
            printf("Invalid input. Please enter a number.\n");
            continue;
        }

        switch (choice) {
            case 1:
                printf("[*] Running Disk Cleaner...\n");
                run_disk_cleaner();
                break;
            case 2:
                printf("[*] Running Startup Manager...\n");
                run_startup_manager();
                break;
            case 3:
                printf("[*] Running Memory Optimizer...\n");
                run_memory_optimizer();
                break;
            case 4:
                printf("[*] Running Network Optimizer...\n");
                run_network_optimizer();
                break;
            case 0:
                printf("Exiting...\n");
                return 0;
            default:
                printf("Invalid choice. Try again.\n");
        }
    }

    return 0;
}
