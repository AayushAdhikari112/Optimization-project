const fs = require('fs');
const path = require('path');

const uiDir = 'c:/Users/User/Desktop/opt_project/ui';
const htmlDir = path.join(uiDir, 'modules', 'html');
const jsDir = path.join(uiDir, 'modules', 'js');

// 1. Group HTML into module files
const htmlGroups = {
    'overview': ['section-mon-overview'],
    'monitor': ['section-mon-cpu', 'section-mon-ram', 'section-mon-gpu', 'section-mon-disk', 'section-mon-network', 'section-mon-thermal'],
    'cleanup': ['section-cl-windows', 'section-cl-browser', 'section-cl-dev', 'section-cl-large', 'section-cl-dupes'],
    'performance': ['section-perf-startup', 'section-perf-services', 'section-perf-tasks', 'section-perf-bgapps', 'section-perf-power', 'section-perf-gaming'],
    'diagnostics': ['section-diag-health', 'section-diag-disk', 'section-diag-integrity', 'section-diag-net', 'section-diag-thermal', 'section-diag-battery'],
    'privacy-security': ['section-privacy', 'section-security'],
    'misc': ['section-restore', 'section-reports', 'section-settings']
};

for (const [groupName, sections] of Object.entries(htmlGroups)) {
    let combinedHtml = '';
    for (const sec of sections) {
        const p = path.join(htmlDir, sec + '.html');
        if (fs.existsSync(p)) {
            combinedHtml += fs.readFileSync(p, 'utf8') + '\n';
            fs.unlinkSync(p); // delete the individual file
        }
    }
    fs.writeFileSync(path.join(htmlDir, groupName + '.html'), combinedHtml);
}

// 2. Update the stitcher in dashboard.html
let dashboardHtml = fs.readFileSync(path.join(uiDir, 'dashboard.html'), 'utf8');
const newSections = Object.keys(htmlGroups);
dashboardHtml = dashboardHtml.replace(/const sections = \[.*?\];/, `const sections = ${JSON.stringify(newSections)};`);
fs.writeFileSync(path.join(uiDir, 'dashboard.html'), dashboardHtml);

// 3. Fix the ReferenceError in core.js by delaying sectionLoaders initialization
let coreJs = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');

// Replace the constant declaration with a getter function
const loadersReplacement = `
let sectionLoaders = null;
function getSectionLoaders() {
    if (sectionLoaders) return sectionLoaders;
    sectionLoaders = {
        'mon-overview':  loadMonitorOverview,
        'mon-cpu':       loadCpuSection,
        'mon-ram':       () => {},
        'mon-gpu':       loadGpuMonitor,
        'mon-disk':      loadDiskIO,
        'mon-network':   loadNetworkMonitor,
        'mon-thermal':   loadThermal,
        'cl-windows':    loadWindowsCleanup,
        'cl-browser':    loadBrowserCache,
        'cl-dev':        loadDevCache,
        'cl-large':      loadLargeFiles,
        'cl-dupes':      loadDupeFinder,
        'perf-startup':  loadStartupApps,
        'perf-services': loadServices,
        'perf-tasks':    loadScheduledTasks,
        'perf-bgapps':   loadBackgroundApps,
        'perf-power':    loadPowerPlans,
        'perf-gaming':   loadGamingMode,
        'diag-health':   loadHealthAnalysis,
        'diag-disk':     loadDiskHealth,
        'diag-integrity':() => {},
        'diag-net':      () => {},
        'diag-thermal':  loadThermalDiag,
        'diag-battery':  loadBattery,
        privacy:         loadPrivacy,
        security:        loadSecurity,
        restore:         loadRestoreCenter,
        reports:         () => {},
    };
    return sectionLoaders;
}
`;
coreJs = coreJs.replace(/const sectionLoaders = {[\s\S]*?reports:\s*\(\) => {},\n}/, loadersReplacement.trim());

// Update navigateTo to use getSectionLoaders()
coreJs = coreJs.replace(/sectionLoaders\[sectionId\]/g, 'getSectionLoaders()[sectionId]');

fs.writeFileSync(path.join(jsDir, 'core.js'), coreJs);
console.log('Fix applied successfully.');
