// ===== Clock =====
function updateClock() {
    const now = new Date();
    const el = document.getElementById('currentTime');
    if (el) el.textContent =
        now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
        + '  ·  ' + now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
updateClock();
setInterval(updateClock, 1000);

// ===== Sidebar Navigation =====
const sectionTitles = {
    dashboard: 'System Overview',
    disk:      'Disk Cleaner',
    memory:    'Memory Optimizer',
    network:   'Network Optimizer',
    startup:   'Startup Manager',
    video:     'Video Control Settings',
    settings:  'Settings',
};

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const target = this.dataset.section;
        if (!target) return;

        // Update active nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');

        // Switch section
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById('section-' + target);
        if (sec) { sec.classList.add('active'); sec.classList.add('fade-in'); }

        // Update page title
        document.getElementById('pageTitle').textContent = sectionTitles[target] || target;
    });
});

// ===== Live Stats (Dashboard) =====
const liveStats = {
    cpu:  { val: 34, elV: 'cpu-val',  elB: 'cpu-bar',  suffix: '%' },
    ram:  { val: 61, elV: 'ram-val',  elB: 'ram-bar',  suffix: '%' },
    disk: { val: 74, elV: 'disk-val', elB: 'disk-bar', suffix: '%' },
    temp: { val: 52, elV: 'temp-val', elB: 'temp-bar', suffix: '°C' },
};

function renderStats() {
    Object.values(liveStats).forEach(s => {
        const ve = document.getElementById(s.elV);
        const be = document.getElementById(s.elB);
        if (ve) ve.textContent = s.val + s.suffix;
        if (be) be.style.width = s.val + '%';
    });
}

function fluctuate() {
    liveStats.cpu.val  = clamp(liveStats.cpu.val  + rand(8),  10, 95);
    liveStats.ram.val  = clamp(liveStats.ram.val  + rand(4),  30, 92);
    liveStats.temp.val = clamp(liveStats.temp.val + rand(3),  38, 85);
    renderStats();

    // Sync RAM gauge
    updateRamGauge(liveStats.ram.val);
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v | 0)); }
function rand(r) { return (Math.random() * r * 2 - r); }

setTimeout(renderStats, 300);
setInterval(fluctuate, 3000);

// ===== RAM Gauge (Memory section) =====
function updateRamGauge(pct) {
    const circle = document.getElementById('ramGaugeCircle');
    const label  = document.getElementById('ram-gauge-pct');
    const used   = document.getElementById('ram-used');
    const free   = document.getElementById('ram-free');
    if (!circle) return;
    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference - (pct / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    if (label) label.textContent = pct + '%';
    if (used)  used.textContent  = ((16 * pct / 100)).toFixed(1) + ' GB';
    if (free)  free.textContent  = ((16 * (1 - pct / 100))).toFixed(1) + ' GB';
}
setTimeout(() => updateRamGauge(liveStats.ram.val), 400);

// ===== Activity Log =====
function addLog(msg, type = 'info') {
    const list = document.getElementById('activityLog');
    if (!list) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const li = document.createElement('li');
    li.className = `activity-item ${type}`;
    li.innerHTML = `<span class="activity-dot"></span><div class="activity-body"><span>${msg}</span><small>${now}</small></div>`;
    list.prepend(li);
    // Keep log to 10 items
    while (list.children.length > 10) list.removeChild(list.lastChild);
}

// ===== Generic Tool Button Action =====
function runTool(btn, label, resultPanelId, duration = 1600) {
    if (btn.classList.contains('running')) return;
    btn.classList.add('running');
    btn.textContent = 'Working...';

    setTimeout(() => {
        btn.classList.remove('running');
        btn.classList.add('done');
        btn.textContent = '✓ Done';
        addLog(label, 'success');

        const panel = document.getElementById(resultPanelId);
        if (panel) {
            panel.style.display = 'block';
            panel.querySelector('.result-body').innerHTML =
                `<div class="result-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>${label}</div>`;
        }

        setTimeout(() => {
            btn.classList.remove('done');
            btn.textContent = 'Clean Now';
        }, 4000);
    }, duration);
}

// ===== Dashboard Quick Action Buttons =====
function dashAction(btnId, msg, dur) {
    const btn = document.getElementById(btnId);
    if (!btn || btn.classList.contains('running')) return;
    btn.classList.add('running');
    setTimeout(() => {
        btn.classList.remove('running');
        btn.classList.add('done');
        addLog(msg, 'success');
        setTimeout(() => btn.classList.remove('done'), 3000);
    }, dur || 1600);
}

document.getElementById('act-disk')?.addEventListener('click',    () => dashAction('act-disk',    'Junk files cleaned — 1.2 GB freed', 1600));
document.getElementById('act-ram')?.addEventListener('click',     () => dashAction('act-ram',     'RAM freed — working sets emptied', 1400));
document.getElementById('act-dns')?.addEventListener('click',     () => dashAction('act-dns',     'DNS cache flushed successfully', 1100));
document.getElementById('act-startup')?.addEventListener('click', () => dashAction('act-startup', 'Startup apps scanned — 3 found', 2000));

// ===== Disk Tool Buttons =====
const diskActions = {
    'disk-temp':     ['Temp files cleaned — 1.2 GB freed',   'disk-result', 1800],
    'disk-recycle':  ['Recycle Bin emptied — 340 MB freed',  'disk-result', 1200],
    'disk-prefetch': ['Prefetch cache cleared — 80 MB freed','disk-result', 1000],
    'disk-logs':     ['System logs deleted — 200 MB freed',  'disk-result', 1500],
};

document.querySelectorAll('[data-action^="disk-"]').forEach(btn => {
    btn.addEventListener('click', function() {
        const key = this.dataset.action;
        if (diskActions[key]) {
            const [msg, panel, dur] = diskActions[key];
            runTool(this, msg, panel, dur);
        }
    });
});

// ===== Network Tool Buttons =====
const netActions = {
    'net-dns':     ['DNS cache flushed successfully',     'net-result', 1100],
    'net-winsock': ['Winsock catalog reset successfully', 'net-result', 1800],
    'net-ip':      ['IP released and renewed',            'net-result', 2000],
    'net-tcp':     ['TCP/IP stack reset to defaults',     'net-result', 1600],
};

document.querySelectorAll('[data-action^="net-"]').forEach(btn => {
    btn.addEventListener('click', function() {
        const key = this.dataset.action;
        if (netActions[key]) {
            const [msg, panel, dur] = netActions[key];
            runTool(this, msg, panel, dur);
        }
    });
});

// ===== Memory Optimize Button =====
document.getElementById('optimize-ram-btn')?.addEventListener('click', function() {
    if (this.classList.contains('running')) return;
    this.classList.add('running');
    this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Optimizing...`;

    setTimeout(() => {
        // Simulate RAM drop
        liveStats.ram.val = clamp(liveStats.ram.val - 18, 20, 90);
        renderStats();
        updateRamGauge(liveStats.ram.val);
        addLog('Memory optimized — ~18% RAM freed', 'success');

        this.classList.remove('running');
        this.classList.add('done');
        this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Optimization Complete!`;

        setTimeout(() => {
            this.classList.remove('done');
            this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Optimize Memory Now`;
        }, 3500);
    }, 2200);
});

// ===== Startup Toggles =====
document.querySelectorAll('.startup-item .toggle input').forEach(cb => {
    if (cb.disabled) return;
    cb.addEventListener('change', function() {
        const name = this.closest('.startup-item').querySelector('span').textContent;
        addLog(this.checked ? `${name} enabled at startup` : `${name} disabled at startup`, this.checked ? 'info' : 'warning');
    });
});

// ===== Video Control Sliders =====
const brightSlider = document.getElementById('bright-slider');
const brightVal    = document.getElementById('bright-val');
if (brightSlider) {
    brightSlider.addEventListener('input', function() {
        if (brightVal) brightVal.textContent = this.value + '%';
    });
}

const contrastSlider = document.getElementById('contrast-slider');
const contrastVal    = document.getElementById('contrast-val');
if (contrastSlider) {
    contrastSlider.addEventListener('input', function() {
        if (contrastVal) contrastVal.textContent = this.value + '%';
    });
}

// GPU mode radio — log changes
document.querySelectorAll('.gpu-radio').forEach(radio => {
    radio.addEventListener('change', function() {
        const label = this.closest('.setting-row').querySelector('span').textContent;
        addLog(`GPU mode set to: ${label}`, 'info');
    });
});
