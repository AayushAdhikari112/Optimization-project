const fs = require('fs');
const file = 'c:/Users/User/Desktop/opt_project/ui/modules/js/core.js';
let js = fs.readFileSync(file, 'utf8');

// Insert an alert to show if IPC is loaded
js = js.replace(/let ipc = null\r?\ntry {[\s\S]*?} catch {[\s\S]*?}/, 

let ipc = null;
try {
    ipc = require('electron').ipcRenderer;
    // alert('IPC LOADED: ' + !!ipc);
} catch (e) {
    alert('ELECTRON REQUIRE FAILED: ' + e.message);
}
);

// Also add a global error alert just in case
js = window.addEventListener('error', e => alert('Global err: ' + e.message));\n + js;

fs.writeFileSync(file, js);
