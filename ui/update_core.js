const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'modules/js/core.js');
let js = fs.readFileSync(file, 'utf8');

const newGetSectionLoaders = `
let sectionLoaders = null;
function getSectionLoaders() {
    if (sectionLoaders) return sectionLoaders;
    sectionLoaders = {
        'dashboard':     (typeof loadMonitorOverview !== 'undefined' ? loadMonitorOverview : () => {}),
        'perf-cpu':      (typeof loadCpuSection !== 'undefined' ? loadCpuSection : () => {}),
        'perf-ram':      () => {},
        'perf-gpu':      (typeof loadGpuMonitor !== 'undefined' ? loadGpuMonitor : () => {}),
        'perf-power':    (typeof loadPowerPlans !== 'undefined' ? loadPowerPlans : () => {}),
        'perf-gaming':   (typeof loadGamingMode !== 'undefined' ? loadGamingMode : () => {}),
        
        'cl-windows':    (typeof loadWindowsCleanup !== 'undefined' ? loadWindowsCleanup : () => {}),
        'cl-browser':    (typeof loadBrowserCache !== 'undefined' ? loadBrowserCache : () => {}),
        'cl-app':        () => {},
        'cl-dev':        (typeof loadDevCache !== 'undefined' ? loadDevCache : () => {}),
        'cl-large':      (typeof loadLargeFiles !== 'undefined' ? loadLargeFiles : () => {}),
        'cl-dupes':      (typeof loadDupeFinder !== 'undefined' ? loadDupeFinder : () => {}),
        
        'su-apps':       (typeof loadStartupApps !== 'undefined' ? loadStartupApps : () => {}),
        'su-tasks':      () => {},
        'su-impact':     () => {},
        
        'win-services':  (typeof loadServices !== 'undefined' ? loadServices : () => {}),
        'win-tasks':     (typeof loadScheduledTasks !== 'undefined' ? loadScheduledTasks : () => {}),
        'win-bgapps':    (typeof loadBackgroundApps !== 'undefined' ? loadBackgroundApps : () => {}),
        'win-ui':        () => {},
        'win-features':  () => {},
        
        'net-dns':       () => {},
        'net-diag':      () => {},
        'net-cache':     () => {},
        'net-adapter':   () => {},
        
        'game-profiles': () => {},
        'game-nvidia':   () => {},
        'game-cpu':      () => {},
        'game-mode':     () => {},
        
        'priv-telemetry':(typeof loadPrivacy !== 'undefined' ? loadPrivacy : () => {}),
        'priv-tracking': () => {},
        'priv-browser':  () => {},
        
        'diag-health':   (typeof loadHealthAnalysis !== 'undefined' ? loadHealthAnalysis : () => {}),
        'diag-cpu':      () => {},
        'diag-gpu':      () => {},
        'diag-disk':     (typeof loadDiskHealth !== 'undefined' ? loadDiskHealth : () => {}),
        'diag-ram':      () => {},
        'diag-network':  () => {},
        
        'res-backups':   (typeof loadRestoreCenter !== 'undefined' ? loadRestoreCenter : () => {}),
        'res-history':   () => {},
        'res-undo':      () => {},
    };
    return sectionLoaders;
}
`;

js = js.replace(/let sectionLoaders = null;[\s\S]*?return sectionLoaders;\n}/, newGetSectionLoaders.trim());
fs.writeFileSync(file, js);
console.log('core.js replaced');
