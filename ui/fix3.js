const fs = require('fs');
const file = 'c:/Users/User/Desktop/opt_project/ui/dashboard.html';
let html = fs.readFileSync(file, 'utf8');

// 1. Add toggles to the NVIDIA grid inside section-mon-gpu
const gridReplacement = 
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">Power Management</span><span class="nv-set-val">Prefer Maximum Performance</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">Preferred GPU</span><span class="nv-set-val">High-performance NVIDIA processor</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">Texture Filtering</span><span class="nv-set-val">High Performance</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">FXAA / MFAA</span><span class="nv-set-val">Off</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">Vertical Sync</span><span class="nv-set-val">Off / App Controlled</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">Triple Buffering</span><span class="nv-set-val">Off</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">Low Latency Mode</span><span class="nv-set-val">On</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">Threaded Optimization</span><span class="nv-set-val">Auto</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">Shader Cache</span><span class="nv-set-val">Enabled</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                    <div class="nv-set-item"><div style="display:flex; flex-direction:column"><span class="nv-set-label">CUDA GPUs</span><span class="nv-set-val">All</span></div> <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
                </div>
;
// Replace only the first instance (which is in section-mon-gpu)
html = html.replace(/<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">[\s\S]*?CUDA GPUs[\s\S]*?<\/div>/, gridReplacement.trim());

// 2. Remove the duplicate section-gpu-monitor block completely
html = html.replace(/<section class="section" id="section-gpu-monitor">[\s\S]*?<\/section>/, '');

fs.writeFileSync(file, html);
console.log('HTML fixed');
