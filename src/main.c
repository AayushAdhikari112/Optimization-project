#include <stdio.h>
#include <stdlib.h>
#include "utils.h"

// TODO: Include module headers as they are implemented
#include "disk_cleaner.h"
#include "startup_manager.h"
#include "memory_optimizer.h"
#include "network_optimizer.h"
#include "cpu_optimizer.h"
#include "gpu_optimizer.h"
#include "power_optimizer.h"
#include "storage_optimizer.h"
#include "screen_optimizer.h"
#include "input_optimizer.h"
#include "safety_engine.h"


void print_menu() {
    printf("\n=== PC Optimization Tool ===\n");
    printf("1. Disk Cleaner (Clear Temp Files)\n");
    printf("2. Startup Manager (List Startup Apps)\n");
    printf("3. Memory Optimizer (Free RAM)\n");
    printf("4. Network Optimizer (Flush DNS/Reset Winsock)\n");
    printf("5. CPU Optimizer (Gaming Profile)\n");
    printf("6. GPU Optimizer (High Performance)\n");
    printf("7. Power Optimizer (High Performance)\n");
    printf("8. Storage Optimizer (SSD TRIM)\n");
    printf("9. Screen Optimizer (Refresh Rate Check)\n");
    printf("10. Input Optimizer (Gaming Mouse Fix)\n");
    printf("11. Safety Engine (Create Restore Point)\n");
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
            case 5:
                printf("[*] Running CPU Optimizer...\n");
                apply_cpu_gaming_profile();
                break;
            case 6:
                printf("[*] Running GPU Optimizer...\n");
                set_gpu_power_profile(true);
                break;
            case 7:
                printf("[*] Running Power Optimizer...\n");
                set_power_profile(PROFILE_PERFORMANCE);
                break;
            case 8:
                printf("[*] Running Storage Optimizer...\n");
                run_ssd_trim("C:");
                break;
            case 9:
                printf("[*] Running Screen Optimizer...\n");
                int hz = 0;
                if (get_current_refresh_rate(&hz)) {
                    printf("[*] Current refresh rate is %d Hz\n", hz);
                }
                break;
            case 10:
                printf("[*] Running Input Optimizer...\n");
                toggle_mouse_acceleration(false);
                break;
            case 11:
                printf("[*] Running Safety Engine...\n");
                create_restore_point("Pre-Optimization Backup");
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
