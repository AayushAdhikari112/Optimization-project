const fs = require('fs');
const path = require('path');

const uiDir = 'c:/Users/User/Desktop/opt_project/ui';
const cssDir = path.join(uiDir, 'modules', 'css');

let css = fs.readFileSync(path.join(uiDir, 'dashboard.css'), 'utf8');

const blocks = css.split(/\/\* ================================================================\r?\n/);
const files = {
    'base.css': '',
    'sidebar.css': '',
    'monitor.css': '',
    'cleanup.css': '',
    'performance.css': '',
    'diagnostics.css': '',
    'privacy-security.css': '',
    'components.css': '',
};

for (const block of blocks) {
    if (!block.trim()) continue;
    const fullBlock = '/* ================================================================\n' + block;
    const headerLine = block.split('\n')[0].trim().toLowerCase();
    
    if (headerLine.includes('scrollbar') || headerLine.includes('main content') || headerLine.includes('theme')) {
        files['base.css'] += fullBlock + '\n';
    } else if (headerLine.includes('sidebar')) {
        files['sidebar.css'] += fullBlock + '\n';
    } else if (headerLine.includes('system monitor') || headerLine.includes('process table') || headerLine.includes('memory') || headerLine.includes('thermal') || headerLine.includes('gpu monitor') || headerLine.includes('network') || headerLine.includes('big stat')) {
        files['monitor.css'] += fullBlock + '\n';
    } else if (headerLine.includes('cleaner') || headerLine.includes('duplicate') || headerLine.includes('large file')) {
        files['cleanup.css'] += fullBlock + '\n';
    } else if (headerLine.includes('startup') || headerLine.includes('services') || headerLine.includes('power') || headerLine.includes('gaming') || headerLine.includes('background apps')) {
        files['performance.css'] += fullBlock + '\n';
    } else if (headerLine.includes('diagnostics') || headerLine.includes('disk health') || headerLine.includes('integrity') || headerLine.includes('battery')) {
        files['diagnostics.css'] += fullBlock + '\n';
    } else if (headerLine.includes('privacy') || headerLine.includes('security')) {
        files['privacy-security.css'] += fullBlock + '\n';
    } else {
        files['components.css'] += fullBlock + '\n'; // Default to components (cards, panels, toggles, etc.)
    }
}

for (const [filename, content] of Object.entries(files)) {
    if (content.trim()) {
        fs.writeFileSync(path.join(cssDir, filename), content);
        console.log('Wrote ' + filename);
    }
}

// Generate the new dashboard.css that imports them all
const imports = Object.keys(files).filter(f => files[f].trim()).map(f => `@import url('modules/css/${f}');`).join('\n');
fs.writeFileSync(path.join(uiDir, 'dashboard.css'), imports);
console.log('CSS Split Complete.');
