// ===== Live Clock =====
function updateClock() {
    const now = new Date();
    document.getElementById('currentTime').textContent =
        now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) +
        '  ·  ' +
        now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
updateClock();
setInterval(updateClock, 1000);

// ===== Simulated System Stats =====
const stats = {
    cpu:  { val: 34, el: 'cpu-val',  bar: 'cpu-bar',  suffix: '%' },
    ram:  { val: 61, el: 'ram-val',  bar: 'ram-bar',  suffix: '%' },
    disk: { val: 74, el: 'disk-val', bar: 'disk-bar', suffix: '%' },
    temp: { val: 52, el: 'temp-val', bar: 'temp-bar', suffix: '°C' },
};

function animateStats() {
    Object.values(stats).forEach(s => {
        document.getElementById(s.el).textContent  = s.val + s.suffix;
        document.getElementById(s.bar).style.width = s.val + '%';
    });
}

// Small random fluctuation to make it feel live
function fluctuate() {
    stats.cpu.val  = Math.min(95, Math.max(10, stats.cpu.val  + (Math.random() * 8 - 4) | 0));
    stats.ram.val  = Math.min(92, Math.max(30, stats.ram.val  + (Math.random() * 4 - 2) | 0));
    stats.temp.val = Math.min(85, Math.max(38, stats.temp.val + (Math.random() * 3 - 1.5) | 0));
    animateStats();
}

setTimeout(animateStats, 300);       // initial load
setInterval(fluctuate, 3000);        // live update

// ===== Activity Log helper =====
function addLog(msg, type = 'info') {
    const list = document.getElementById('activityLog');
    const now  = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    const li   = document.createElement('li');
    li.className = `activity-item ${type}`;
    li.innerHTML = `
        <span class="activity-dot"></span>
        <div class="activity-body">
            <span>${msg}</span>
            <small>${now}</small>
        </div>`;
    li.style.animationDelay = '0s';
    list.prepend(li);
}

// ===== Quick Actions =====
function runAction(btnId, logMsg, duration = 1800) {
    const btn = document.getElementById(btnId);
    if (btn.classList.contains('running')) return;
    btn.classList.add('running');
    btn.querySelector('.action-arrow').style.opacity = '0';

    setTimeout(() => {
        btn.classList.remove('running');
        btn.classList.add('done');
        addLog(logMsg, 'success');
        setTimeout(() => btn.classList.remove('done'), 3000);
    }, duration);
}

document.getElementById('act-disk').addEventListener('click', () =>
    runAction('act-disk', 'Junk files cleaned — 1.2 GB freed'));

document.getElementById('act-ram').addEventListener('click', () =>
    runAction('act-ram', 'RAM freed — working sets emptied'));

document.getElementById('act-dns').addEventListener('click', () =>
    runAction('act-dns', 'DNS cache flushed successfully', 1200));

document.getElementById('act-startup').addEventListener('click', () =>
    runAction('act-startup', 'Startup apps scanned — 3 items found', 2000));

// ===== Run Full Scan =====
document.getElementById('runScanBtn').addEventListener('click', function() {
    if (this.classList.contains('scanning')) return;
    this.classList.add('scanning');
    this.textContent = 'Scanning...';
    addLog('Full system scan started', 'info');

    setTimeout(() => {
        this.classList.remove('scanning');
        this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Run Full Scan`;
        addLog('Full scan complete — system is healthy', 'success');
    }, 3500);
});

// ===== Sidebar nav active =====
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
    });
});
