#include "input_optimizer.h"
#include "utils.h"
#include <stdio.h>
#include <windows.h>

bool toggle_mouse_acceleration(bool enable) {
    printf("[*] Toggling Mouse Acceleration: %s\n", enable ? "ON" : "OFF");
    int mouseParams[3];
    if (SystemParametersInfoA(SPI_GETMOUSE, 0, mouseParams, 0)) {
        mouseParams[2] = enable ? 1 : 0;
        return SystemParametersInfoA(SPI_SETMOUSE, 0, mouseParams, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE) != 0;
    }
    return false;
}

bool toggle_filter_keys(bool enable) {
    printf("[*] Toggling Filter Keys: %s\n", enable ? "ON" : "OFF");
    FILTERKEYS fk;
    ZeroMemory(&fk, sizeof(fk));
    fk.cbSize = sizeof(fk);
    if (SystemParametersInfoA(SPI_GETFILTERKEYS, sizeof(fk), &fk, 0)) {
        if (enable) {
            fk.dwFlags |= FKF_FILTERKEYSON;
        } else {
            fk.dwFlags &= ~FKF_FILTERKEYSON;
        }
        return SystemParametersInfoA(SPI_SETFILTERKEYS, sizeof(fk), &fk, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE) != 0;
    }
    return false;
}

bool toggle_sticky_keys(bool enable) {
    printf("[*] Toggling Sticky Keys: %s\n", enable ? "ON" : "OFF");
    STICKYKEYS sk;
    ZeroMemory(&sk, sizeof(sk));
    sk.cbSize = sizeof(sk);
    if (SystemParametersInfoA(SPI_GETSTICKYKEYS, sizeof(sk), &sk, 0)) {
        if (enable) {
            sk.dwFlags |= SKF_STICKYKEYSON;
        } else {
            sk.dwFlags &= ~SKF_STICKYKEYSON;
        }
        return SystemParametersInfoA(SPI_SETSTICKYKEYS, sizeof(sk), &sk, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE) != 0;
    }
    return false;
}
