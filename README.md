# OptiCore

## RAM Memory Optimization

The RAM Analysis screen polls Windows memory counters only while that screen is visible. The native service uses `GlobalMemoryStatusEx` and `GetPerformanceInfo` for physical and commit totals, and queries `SystemMemoryListInformation` for free, modified, and standby page counts. If that query is unavailable, it falls back to Windows Performance Data Helper memory counters.

Memory cleaning requires an elevated process. The default action enables and verifies the required token privileges, flushes the modified page list, empties system working sets, then purges only low-priority standby pages. Aggressive mode is opt-in; it purges the full standby list and calls `SetSystemFileCacheSize` to reset cache limits. This may cause brief slowdowns while applications reload data. Windows may deny individual operations; each result is reported and later operations stop after the first hard failure. Working-set trimming can cause apps to reload memory pages. No processes are terminated.

The native CLI is built by the root Makefile and packaged as an Electron extra resource. Build the C target before packaging the Windows app. The RAM screen includes an optional, off-by-default auto-clean control; when enabled, it triggers only after available memory stays below the selected threshold for 30 seconds, with a five-minute cooldown. Clean attempts are recorded in the app's user-data `memory-optimization.log`.

Run the helper tests from `ui` with `npm test`.