/**
 * Hardware Info Module
 * Fetches deep specs via IPC and updates the hw-* sections
 */

async function updateHardwareInfo() {
    // Check which hw- tab is active
    const activeSection = document.querySelector('.section.active');
    if (!activeSection || !activeSection.id.startsWith('section-hw-')) return;
    
    // Fallback if no IPC (running in browser)
    const isBrowser = !window.ipc;
    
    try {
        if (activeSection.id === 'section-hw-cpu') {
            const cpuData = await window.invoke('get-hw-cpu');
            if (cpuData) renderCPU(cpuData);
        } else if (activeSection.id === 'section-hw-gpu') {
            const gpuData = await window.invoke('get-hw-gpu');
            if (gpuData) renderGPU(gpuData);
        } else if (activeSection.id === 'section-hw-memory') {
            const memData = await window.invoke('get-hw-memory');
            if (memData) renderMemory(memData);
        }
        // ... (can expand to others if backend supports them)
    } catch (e) {
        console.error('Failed to update hardware info:', e);
    }
}

// Map of elements we might want to update dynamically
function setEl(sel, val) {
    const el = document.querySelector(sel);
    if (el) el.textContent = val;
}

function renderCPU(data) {
    // Only update elements if data exists, else leave the static placeholders
    if (!data) return;
    
    // Example mapping
    // setEl('#section-hw-cpu .hw-hero-name', data.manufacturer + ' ' + data.brand);
    // setEl('#section-hw-cpu .hw-stat-v:nth-child(2)', data.physicalCores);
    // ...
}

function renderGPU(data) {
    if (!data) return;
}

function renderMemory(data) {
    if (!data) return;
}

// Hook into navigation or auto-refresh
setInterval(updateHardwareInfo, 5000);

// Run once immediately when a section is shown
document.addEventListener('DOMContentLoaded', () => {
    // Setup refresh buttons
    document.querySelectorAll('.hw-refresh-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const icon = btn.querySelector('svg');
            icon.style.transform = 'rotate(180deg)';
            icon.style.transition = 'transform 0.3s';
            updateHardwareInfo().then(() => {
                setTimeout(() => icon.style.transform = 'none', 300);
            });
        });
    });
});
