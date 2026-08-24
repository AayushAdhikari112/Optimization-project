const fs = require('fs');
const file = 'c:/Users/User/Desktop/opt_project/ui/dashboard.js';
let js = fs.readFileSync(file, 'utf8');

// Replace the section loader mapping
js = js.replace(/'gpu-monitor':\s*loadGpuMonitor,/, ''); // Remove the duplicate I added
js = js.replace(/'mon-gpu':\s*'System Monitor — GPU',/, 'mon-gpu': loadGpuMonitor,); // Point the existing one to the function

// Also there is a check in the polling loop
js = js.replace(/document\.getElementById\('section-gpu-monitor'\)\?\.classList\.contains\('active'\)/g, "document.getElementById('section-mon-gpu')?.classList.contains('active')");

fs.writeFileSync(file, js);
console.log('JS fixed');
