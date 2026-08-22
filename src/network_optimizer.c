#include "network_optimizer.h"
#include "utils.h"
#include <stdio.h>

void flush_dns(void) {
    printf("[*] Flushing DNS Cache...\n");
    // run_command uses cmd.exe /c
    if (run_command("ipconfig /flushdns > nul")) {
        printf("[+] DNS Cache flushed successfully.\n");
    } else {
        printf("[-] Failed to flush DNS cache.\n");
    }
}

void reset_winsock(void) {
    printf("[*] Resetting Winsock Catalog...\n");
    if (run_command("netsh winsock reset > nul")) {
        printf("[+] Winsock Catalog reset successfully.\n");
    } else {
        printf("[-] Failed to reset Winsock catalog (requires Administrator).\n");
    }
}

void run_network_optimizer(void) {
    printf("[*] Running Network Optimizer...\n");
    flush_dns();
    reset_winsock();
    printf("[+] Network Optimizer finished. A restart may be required for Winsock reset to take effect.\n");
}
