# OptiCore — Maintenance & Software Install Module

A desktop utility module for Windows 10 (1809+) and Windows 11 built with **Electron + TypeScript** and zero heavy renderer UI frameworks. Powered by the Windows Package Manager (`winget`) with reliable progress parsing, honest status feedback, robust error mapping, and secure payload validation.

---

## Table of Contents
1. [Architecture & Security](#architecture--security)
2. [Project Structure](#project-structure)
3. [Setup & Available Scripts](#setup--available-scripts)
4. [Real Winget vs Demo Mode](#real-winget-vs-demo-mode)
5. [How to Add a Catalog Entry](#how-to-add-a-catalog-entry)
6. [How to Add a New Maintenance Tool via the Registry](#how-to-add-a-new-maintenance-tool-via-the-registry)
7. [Stubbed Features](#stubbed-features)
8. [Acceptance Criteria Verification](#acceptance-criteria-verification)

---

## Architecture & Security

- **Process Isolation**: The renderer process has `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. It never directly invokes `child_process`.
- **Preload API**: A typed IPC layer (`window.electronAPI`) bridges renderer requests to the main process via `contextBridge`.
- **ID Allowlist Enforcement**: Only package IDs present in the loaded, schema-validated catalog are permitted to reach winget. The main process actively rejects any other package identifier, preventing argument manipulation or remote payload execution.
- **Command Injection Prevention**: Commands are spawned using `child_process.spawn()` with an argument array (`['install', '--id', id, ...]`). Shell strings and `exec()` concatenation are prohibited.
- **Process Cancellation**: Cancellation issues a process-tree kill via `taskkill /F /T /PID <pid>` on Windows, terminating both the winget CLI and any child setup engines.
- **Strict Content Security Policy**: Only local bundled scripts and styles are allowed; remote script injection is blocked.
- **Sanitized Logging**: All installation events, retries, cancellations, and failures are recorded in `install-actions.log` within the user data folder with timestamps and redaction of usernames and user profile paths.

---

## Project Structure

```
ui/
├── catalog/
│   └── catalog.json                  # Curated catalog (24+ verified winget packages & bundles)
├── src/
│   ├── shared/
│   │   ├── types.ts                  # Shared data models, IPC definitions, config schema
│   │   ├── schema.ts                 # Catalog validation schema & regex check
│   │   └── global.d.ts               # window.electronAPI type augmentation
│   ├── main/
│   │   ├── index.ts                  # Electron app lifecycle & window creation
│   │   ├── ipc.ts                    # Main IPC handlers & input validation
│   │   ├── config/config.ts          # Typed config manager with disk persistence
│   │   ├── logger/logger.ts          # Local file logger (PII-sanitized)
│   │   ├── catalog/catalog-loader.ts # Catalog loader, schema validation, disk cache, allowlist
│   │   ├── elevation/elevation.ts    # Admin detection and UAC elevation helpers
│   │   ├── restore-point/restore-point.ts # Windows system restore point safe stub
│   │   ├── fallback/fallback-downloader.ts# HTTPS fallback downloader with SHA-256 verification
│   │   ├── queue/job-queue.ts        # Main process installation queue & concurrency controller
│   │   └── winget/
│   │       ├── types.ts              # IWingetService interface
│   │       ├── winget-service.ts     # Real winget executor with spawn() array & taskkill
│   │       ├── mock-winget.ts        # MockWinget for demo mode & simulation
│   │       ├── parser.ts             # ANSI & noise stripping, progress % and list parsing
│   │       └── exit-codes.ts         # Exit code & diagnostic text error mapper
│   ├── preload/
│   │   └── index.ts                  # Preload contextBridge exposure
│   └── renderer/
│       ├── index.html                # Main shell HTML layout with CSP & ARIA live region
│       ├── styles.css                # Windows 11 Fluent dark/light design system
│       ├── index.ts                  # Renderer initialization & state subscriptions
│       ├── router.ts                 # Client-side hash router with sub-route tracking
│       ├── state/app-state.ts        # Reactive state store & ARIA announcements
│       ├── components/
│       │   ├── sidebar.ts            # Primary left sidebar with dynamic job badge
│       │   ├── details-drawer.ts     # Card slide-over drawer with command transparency
│       │   ├── queue-panel.ts        # Live installation queue with stdout logs & copy details
│       │   ├── home-page.ts          # Home placeholder view
│       │   └── settings-page.ts      # Settings placeholder view
│       └── maintenance/
│           ├── registry.ts           # Modular Maintenance tool registry
│           ├── MaintenancePage.ts    # Sub-navigation tabs & active tool loader
│           ├── software/
│           │   ├── SoftwarePage.ts   # Software catalog, search, filters, preset bundles
│           │   └── components/
│           │       ├── card.ts       # App card with badges, multi-select, and state button
│           │       └── missing-winget.ts # Guidance screen for missing/outdated winget
│           ├── cleanup/CleanupPage.ts # Cleanup placeholder ("Coming soon")
│           ├── startup/StartupPage.ts # Startup apps placeholder ("Coming soon")
│           └── updates/UpdatesPage.ts # App updates placeholder ("Coming soon")
├── tests/
│   ├── parser.test.cjs               # Winget stdout parsing & progress extraction tests
│   ├── exit-codes.test.cjs           # Exit code mapping tests
│   ├── schema.test.cjs               # Schema validation tests
│   ├── allowlist.test.cjs            # Security allowlist enforcement tests
│   ├── queue.test.cjs                # Job queue order, concurrency, cancel & retry tests
│   └── router.test.cjs               # Router sub-navigation & default route tests
├── scripts/
│   └── build.mjs                     # TypeScript pre-check & esbuild bundler
└── package.json
```

---

## Setup & Available Scripts

Inside the `ui` directory:

```bash
# Install dependencies
npm install

# Build TypeScript and bundle assets to dist/
npm run build

# Run unit tests
npm test

# Launch the desktop app with real winget
npm run dev

# Launch the desktop app in Simulation / Demo Mode (MockWinget)
npm run demo
```

---

## Real Winget vs Demo Mode

### Real Winget Mode (`npm run dev`)
- Interacts directly with the Windows Package Manager (`winget.exe`).
- Detects installed applications across your machine via `winget list`.
- Executes `winget install`, `winget upgrade`, or `winget uninstall` with an argument array.

### Demo Mode (`npm run demo`)
- Activated by the `--demo` flag, setting `DEMO_MODE=1`, or setting `"demoMode": true` in `config.json`.
- Uses `MockWinget` behind the `IWingetService` interface.
- Simulates winget presence (`v1.29.380 (Mock/Demo Mode)`), pre-populates sample installed apps, and streams realistic installation progress (0% → 100%) without modifying any files or packages on your system.
- Displays a blue "Demo Mode Active" notification banner across the Software install view.

---

## How to Add a Catalog Entry

To add a new application to the catalog, open `catalog/catalog.json` and append an entry to the `"apps"` array:

```json
{
  "id": "VideoLAN.VLC",
  "name": "VLC Media Player",
  "publisher": "VideoLAN",
  "description": "Free and open-source cross-platform multimedia player that plays most codecs.",
  "category": "Media",
  "tags": ["media", "video", "audio", "player", "open-source"],
  "website": "https://www.videolan.org/vlc/",
  "icon": "data:image/svg+xml;utf8,<svg ...></svg>",
  "safety": "safe",
  "installScope": "machine",
  "fallbackDownload": {
    "url": "https://get.videolan.org/vlc/3.0.21/win64/vlc-3.0.21-win64.exe",
    "sha256": "4b6c8916d8a39b4f2cfaea5e219fb09cb46ee456b92a2a07d667e43da652a6a1",
    "silentArgs": ["/S"]
  }
}
```

### Validation Requirements:
1. `id`: Must be a valid winget package ID pattern matching `^[A-Za-z0-9_+-]+(\.[A-Za-z0-9_+-]+)+$`.
2. `category`: One of `"Browsers"`, `"Media"`, `"Utilities"`, `"Development"`, `"Gaming"`, `"Communication"`, `"Productivity"`, `"Security"`.
3. `safety`: `"safe"` or `"caution"`.
4. `installScope`: `"user"`, `"machine"`, or `"either"`.
5. `fallbackDownload` (optional): If provided, `url` must use HTTPS, `sha256` must be a 64-character hex string, and `silentArgs` must be an array of strings.

---

## How to Add a New Maintenance Tool via the Registry

Adding a new tool into the Maintenance sub-system requires only **two steps**:

### Step 1: Create the tool folder and renderer view
Create `src/renderer/maintenance/mytool/MyToolPage.ts`:
```ts
export function renderMyToolPage(container: HTMLElement): void {
  container.innerHTML = `
    <div style="padding: 24px;">
      <h2>My New Tool</h2>
      <p>Tool content goes here.</p>
    </div>
  `
}
```

### Step 2: Register it in `src/renderer/maintenance/registry.ts`
Add one entry to the `maintenanceRegistry` array:
```ts
import { renderMyToolPage } from './mytool/MyToolPage'

export const maintenanceRegistry: MaintenanceModule[] = [
  // ... existing tools ...
  {
    id: 'mytool',
    title: 'My Tool',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" ...></svg>`,
    route: '#/maintenance/mytool',
    enabled: true,
    render: renderMyToolPage,
  },
]
```
The navigation tabs, routing, active states, and lifecycle mounting are managed automatically. Placeholders can be added with `enabled: false`.

---

## Stubbed Features

As requested, all stubbed functions are clearly documented and safe by default:
1. **Windows System Restore Point** (`src/main/restore-point/restore-point.ts`):
   `createRestorePointStub(description)`: Returns `{ success: true, message: ... }` safely without requiring system privilege alteration. Can be wired to `powershell Checkpoint-Computer` by the host application.
2. **Remote Catalog Synchronization** (`src/main/catalog/catalog-loader.ts`):
   Defaults to an empty URL (`""`). When configured, securely fetches via HTTPS with a 5-second timeout, 1MB size limit, schema validation, and disk caching in `userData/cached-catalog.json`. Falls back to the bundled catalog on any network disruption.
