const fs = require('fs');
const file = 'c:/Users/User/Desktop/opt_project/ui/modules/js/core.js';
let js = fs.readFileSync(file, 'utf8');

js = js.replace(/async function fetchStats\(\) \{[\s\S]*?try \{/, 
async function fetchStats() {
    try {
        require('fs').appendFileSync('c:/Users/User/Desktop/opt_project/ui/debug.log', 'fetchStats running. ipc=' + !!ipc + '\\n');
);

js = js.replace(/const data = await invoke\('get-system-stats'\)/, 
const data = await invoke('get-system-stats');
require('fs').appendFileSync('c:/Users/User/Desktop/opt_project/ui/debug.log', 'invoke returned: ' + !!data + '\\n');
);

fs.writeFileSync(file, js);
