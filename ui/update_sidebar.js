const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'dashboard.html');
let html = fs.readFileSync(file, 'utf8');

const newSidebarNav = `
    <nav class="sidebar-nav" id="sidebarNav">

        <!-- 🏠 Dashboard -->
        <a class="nav-item active" data-section="dashboard" id="nav-dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
        </a>

        <!-- ⚡ Performance -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="performance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                Performance
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-performance">
                <a class="nav-sub" data-section="perf-cpu">CPU Optimization</a>
                <a class="nav-sub" data-section="perf-ram">RAM Optimization</a>
                <a class="nav-sub" data-section="perf-gpu">GPU Optimization</a>
                <a class="nav-sub" data-section="perf-power">Power Optimization</a>
                <a class="nav-sub" data-section="perf-gaming">Gaming Mode</a>
            </div>
        </div>

        <!-- 🧹 Cleanup -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="cleanup">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path></svg>
                Cleanup
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-cleanup">
                <a class="nav-sub" data-section="cl-windows">Windows Junk</a>
                <a class="nav-sub" data-section="cl-browser">Browser Cache</a>
                <a class="nav-sub" data-section="cl-app">Application Cache</a>
                <a class="nav-sub" data-section="cl-dev">Developer Cache</a>
                <a class="nav-sub" data-section="cl-large">Large Files</a>
                <a class="nav-sub" data-section="cl-dupes">Duplicate Files</a>
            </div>
        </div>

        <!-- 🚀 Startup -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="startup">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13.73 21a2 2 0 0 1-3.46 0"></path><path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M18 8a6 6 0 0 0-9.33-5"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                Startup
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-startup">
                <a class="nav-sub" data-section="su-apps">Startup Apps</a>
                <a class="nav-sub" data-section="su-tasks">Startup Tasks</a>
                <a class="nav-sub" data-section="su-impact">Startup Impact</a>
            </div>
        </div>

        <!-- 🪟 Windows Optimization -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="windows">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Windows Opt
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-windows">
                <a class="nav-sub" data-section="win-services">Services</a>
                <a class="nav-sub" data-section="win-tasks">Scheduled Tasks</a>
                <a class="nav-sub" data-section="win-bgapps">Background Apps</a>
                <a class="nav-sub" data-section="win-ui">UI Tweaks</a>
                <a class="nav-sub" data-section="win-features">Windows Features</a>
            </div>
        </div>

        <!-- 🌐 Network -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="network">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                Network
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-network">
                <a class="nav-sub" data-section="net-dns">DNS Optimizer</a>
                <a class="nav-sub" data-section="net-diag">Diagnostics</a>
                <a class="nav-sub" data-section="net-cache">DNS Cache</a>
                <a class="nav-sub" data-section="net-adapter">Adapter Settings</a>
            </div>
        </div>

        <!-- 🎮 Gaming -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="gaming">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"></path></svg>
                Gaming
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-gaming">
                <a class="nav-sub" data-section="game-profiles">Game Profiles</a>
                <a class="nav-sub" data-section="game-nvidia">NVIDIA Opt</a>
                <a class="nav-sub" data-section="game-cpu">CPU Opt</a>
                <a class="nav-sub" data-section="game-mode">Game Mode</a>
            </div>
        </div>

        <!-- 🔐 Privacy -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="privacy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Privacy
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-privacy">
                <a class="nav-sub" data-section="priv-telemetry">Telemetry</a>
                <a class="nav-sub" data-section="priv-tracking">Tracking</a>
                <a class="nav-sub" data-section="priv-browser">Browser Privacy</a>
            </div>
        </div>

        <!-- 🩺 Diagnostics -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="diagnostics">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Diagnostics
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-diagnostics">
                <a class="nav-sub" data-section="diag-health">System Health</a>
                <a class="nav-sub" data-section="diag-cpu">CPU</a>
                <a class="nav-sub" data-section="diag-gpu">GPU</a>
                <a class="nav-sub" data-section="diag-disk">Disk</a>
                <a class="nav-sub" data-section="diag-ram">RAM</a>
                <a class="nav-sub" data-section="diag-network">Network</a>
            </div>
        </div>

        <!-- 🔄 Restore Center -->
        <div class="nav-group">
            <div class="nav-group-header" data-group="restore">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 .49-4.56"></path></svg>
                Restore Center
                <span class="nav-chevron">›</span>
            </div>
            <div class="nav-group-items" id="group-restore">
                <a class="nav-sub" data-section="res-backups">Backups</a>
                <a class="nav-sub" data-section="res-history">Change History</a>
                <a class="nav-sub" data-section="res-undo">Undo</a>
            </div>
        </div>

    </nav>
`;

html = html.replace(/<nav class="sidebar-nav" id="sidebarNav">[\s\S]*?<\/nav>/, newSidebarNav.trim());
fs.writeFileSync(file, html);
console.log('Sidebar replaced');
