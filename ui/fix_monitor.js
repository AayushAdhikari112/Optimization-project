const fs = require('fs');
const file = 'c:/Users/User/Desktop/opt_project/ui/modules/html/monitor.html';
let html = fs.readFileSync(file, 'utf8');

const fixHtml = `
<section class="section" id="section-mon-cpu">
        <div class="section-hero"><div class="section-hero-icon" ><svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"></path></svg></div><div><h2>CPU Monitor</h2><p>Per-process CPU usage, load analysis and spike detection.</p></div></div>
        <div class="big-stat-row">
            <div class="big-stat-card"><div class="bsc-label">Total CPU Load</div><div class="bsc-val" id="cpu-big-val">--</div></div>
            <div class="big-stat-card"><div class="bsc-label">Frequency</div><div class="bsc-val" id="cpu-freq-val">--</div></div>
            <div class="big-stat-card"><div class="bsc-label">Processes</div><div class="bsc-val" id="cpu-proc-val">--</div></div>
            <div class="big-stat-card"><div class="bsc-label">Status</div><div class="bsc-val" id="cpu-status-val">--</div></div>
        </div>
        <div class="panel"><div class="panel-header"><h3>Top CPU Consumers</h3><span class="panel-sub">Sorted by CPU usage</span></div>
            <div class="proc-table-wrap"><table class="proc-table"><thead><tr><th>Process</th><th>PID</th><th>CPU %</th><th>RAM (GB)</th></tr></thead><tbody id="cpuProcBody"></tbody></table></div>
        </div>

        <div class="panel" style="margin-top:20px;">
            <div class="panel-header">
                <h3>CPU PERFORMANCE MODE</h3>
                <span class="panel-sub">Advanced processor state and core management</span>
            </div>
            <div class="nv-settings-grid">
                <div class="nv-setting">
                    <div class="nv-setting-info">
                        <div class="nv-setting-name">Core Parking</div>
                        <div class="nv-setting-desc">Unpark all processor cores for maximum availability</div>
                    </div>
                    <label class="toggle-switch"><input type="checkbox" id="tgl-cpu-core"><span class="toggle-slider"></span></label>
                </div>
                <div class="nv-setting">
                    <div class="nv-setting-info">
                        <div class="nv-setting-name">Processor State</div>
                        <div class="nv-setting-desc">Force minimum processor state to 100%</div>
                    </div>
                    <label class="toggle-switch"><input type="checkbox" id="tgl-cpu-state"><span class="toggle-slider"></span></label>
                </div>
                <div class="nv-setting">
                    <div class="nv-setting-info">
                        <div class="nv-setting-name">Foreground Priority</div>
                        <div class="nv-setting-desc">Allocate maximum CPU quanta to active applications</div>
                    </div>
                    <label class="toggle-switch"><input type="checkbox" id="tgl-cpu-prio"><span class="toggle-slider"></span></label>
                </div>
                <div class="nv-setting">
                    <div class="nv-setting-info">
                        <div class="nv-setting-name">System Cooling Policy</div>
                        <div class="nv-setting-desc">Set to Active (Prioritize fan speed over throttling)</div>
                    </div>
                    <label class="toggle-switch"><input type="checkbox" id="tgl-cpu-cool"><span class="toggle-slider"></span></label>
                </div>
                <div class="nv-setting">
                    <div class="nv-setting-info">
                        <div class="nv-setting-name">C-States (Idle)</div>
                        <div class="nv-setting-desc">Disable deep sleep C-States to reduce wake latency</div>
                    </div>
                    <label class="toggle-switch"><input type="checkbox" id="tgl-cpu-cstate"><span class="toggle-slider"></span></label>
                </div>
            </div>
        </div>
    </section>
<section class="section" id="section-mon-ram">
        <div class="section-hero"><div class="section-hero-icon" ><svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"></path></svg></div><div><h2>RAM Analysis</h2><p>Memory pressure, commit, standby, pagefile activity, and top consumers.</p></div></div>
        <div class="mem-layout">
            <div class="mem-gauge-panel">
`;

html = html.replace(/<section class="section" id="section-mon-cpu">[\s\S]*?<div class="mem-gauge-wrap">/, fixHtml.trim() + '\n                <div class="mem-gauge-wrap">');

fs.writeFileSync(file, html);
console.log('Fixed monitor.html');
