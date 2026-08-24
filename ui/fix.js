const fs = require('fs');
const file = 'c:/Users/User/Desktop/opt_project/ui/dashboard.html';
let html = fs.readFileSync(file, 'utf8');

// 1. Extract the new gpu-monitor section content
const newSectionRegex = /<section class="section" id="section-gpu-monitor">([\s\S]*?)<\/section>/;
const match = html.match(newSectionRegex);
if (!match) { console.error('new section not found'); process.exit(1); }
const newContent = match[1];

// 2. Replace the old mon-gpu section content with the new content
const oldSectionRegex = /<section class="section" id="section-mon-gpu">[\s\S]*?<\/section>/;
html = html.replace(oldSectionRegex, '<section class="section" id="section-mon-gpu">' + newContent + '</section>');

// 3. Remove the new gpu-monitor section completely
html = html.replace(/<!-- ============================================================\s*GPU MONITOR — Dedicated Full Section\s*============================================================ -->\s*<section class="section" id="section-gpu-monitor">[\s\S]*?<\/section>\s*/, '');

// 4. Remove the duplicate sidebar link
html = html.replace(/\s*<!-- GPU Monitor -->\s*<a class="nav-item" data-section="gpu-monitor" id="nav-gpu-monitor">\s*<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"><\/rect><line x1="8" y1="21" x2="16" y2="21"><\/line><line x1="12" y1="17" x2="12" y2="21"><\/line><\/svg>\s*<span>GPU Monitor<\/span>\s*<\/a>/, '');

fs.writeFileSync(file, html);
console.log('HTML fixed');
