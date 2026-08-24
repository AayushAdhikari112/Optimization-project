const fs = require('fs');
const path = require('path');

const uiDir = 'c:/Users/User/Desktop/opt_project/ui';
const htmlDir = path.join(uiDir, 'modules', 'html');

let dashboardHtml = fs.readFileSync(path.join(uiDir, 'dashboard.html'), 'utf8');

// 1. Find all sections
const sectionRegex = /<section class="section" id="([^"]+)">([\s\S]*?)<\/section>/g;
let match;
const sectionIds = [];

while ((match = sectionRegex.exec(dashboardHtml)) !== null) {
    const sectionId = match[1];
    const sectionContent = match[0];
    
    // Write to file
    fs.writeFileSync(path.join(htmlDir, sectionId + '.html'), sectionContent);
    sectionIds.push(sectionId);
    console.log('Extracted ' + sectionId);
}

// 2. Remove all sections from dashboard.html and replace with stitcher
const firstSectionIdx = dashboardHtml.indexOf('<section class="section" id="section-mon-overview">');
const lastSectionEndIdx = dashboardHtml.lastIndexOf('</section>') + 10; 

if (firstSectionIdx > -1 && lastSectionEndIdx > -1) {
    const beforeSections = dashboardHtml.substring(0, firstSectionIdx);
    const afterSections = dashboardHtml.substring(lastSectionEndIdx);
    
    const stitcherScript = `
        <div id="sections-container"></div>
        <script>
            const fs = require('fs');
            const path = require('path');
            const sections = ${JSON.stringify(sectionIds)};
            let stitchedHtml = '';
            for (const sec of sections) {
                stitchedHtml += fs.readFileSync(path.join(__dirname, 'modules', 'html', sec + '.html'), 'utf8') + '\\n';
            }
            document.getElementById('sections-container').innerHTML = stitchedHtml;
        </script>
    `;
    
    fs.writeFileSync(path.join(uiDir, 'dashboard.html'), beforeSections + stitcherScript + afterSections);
    console.log('HTML Split Complete.');
} else {
    console.error('Could not find section boundaries');
}
