const fs = require('fs');
const path = require('path');

const uiDir = 'c:/Users/User/Desktop/opt_project/ui';
const jsDir = path.join(uiDir, 'modules', 'js');

let js = fs.readFileSync(path.join(uiDir, 'dashboard.js'), 'utf8');

const blocks = js.split(/\/\/\s*───\s*/);
const files = {
    'core.js': '',
    'monitor.js': '',
    'cleanup.js': '',
    'performance.js': '',
    'diagnostics.js': '',
    'privacy-security.js': '',
};

for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.trim()) continue;
    
    // The very first block usually has no header, or is just 'IPC bridge'
    const fullBlock = i === 0 ? block : '// ─── ' + block;
    const headerLine = block.split('\n')[0].trim().toLowerCase();
    
    if (headerLine.includes('system monitor') || headerLine.includes('cpu') || headerLine.includes('ram') || headerLine.includes('gpu') || headerLine.includes('disk') || headerLine.includes('network') || headerLine.includes('thermal')) {
        files['monitor.js'] += fullBlock + '\n';
    } else if (headerLine.includes('cleanup')) {
        files['cleanup.js'] += fullBlock + '\n';
    } else if (headerLine.includes('performance') || headerLine.includes('startup') || headerLine.includes('services') || headerLine.includes('power') || headerLine.includes('gaming')) {
        files['performance.js'] += fullBlock + '\n';
    } else if (headerLine.includes('diagnostics') || headerLine.includes('battery')) {
        files['diagnostics.js'] += fullBlock + '\n';
    } else if (headerLine.includes('privacy') || headerLine.includes('security')) {
        files['privacy-security.js'] += fullBlock + '\n';
    } else {
        files['core.js'] += fullBlock + '\n'; // IPC, Theme, Nav, Utilities, boot sequence
    }
}

for (const [filename, content] of Object.entries(files)) {
    if (content.trim()) {
        fs.writeFileSync(path.join(jsDir, filename), content);
        console.log('Wrote ' + filename);
    }
}

// Update dashboard.html to load these scripts instead of dashboard.js
let html = fs.readFileSync(path.join(uiDir, 'dashboard.html'), 'utf8');
const scriptTags = Object.keys(files).filter(f => files[f].trim()).map(f => `<script src="modules/js/${f}"></script>`).join('\n    ');
html = html.replace('<script src="dashboard.js"></script>', scriptTags);
fs.writeFileSync(path.join(uiDir, 'dashboard.html'), html);

// Delete the old monolithic JS file
fs.unlinkSync(path.join(uiDir, 'dashboard.js'));

console.log('JS Split Complete.');
