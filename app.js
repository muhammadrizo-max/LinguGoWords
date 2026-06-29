// 1. Log holatini yuklash va o'zgartirish funksiyasi
async function toggleLogVisibility(isChecked) {
    try {
        const response = await fetch('https://api.f0289.55fh.xyz/api/logs/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: isChecked })
        });
        const result = await response.json();
        console.log("Log ko'rinishi o'zgardi:", result.is_visible);
        loadLiveLogs(); // Status o'zgarganda loglarni qayta yuklash
    } catch (error) {
        console.error("Log statusini o'zgartirishda xato:", error);
    }
}

// 2. Real vaqtda loglarni yuklab ekranga chiqarish funksiyasi
async function loadLiveLogs() {
    const logContainer = document.getElementById('live-log-container');
    if (!logContainer) return;

    try {
        const response = await fetch('https://api.f0289.55fh.xyz/api/logs/stream');
        const result = await response.json();

        if (result.status === "hidden") {
            logContainer.innerHTML = `<div class="text-gray-500 p-4 text-center">${result.message}</div>`;
            return;
        }

        // Jonli loglarni HTML formatda chiqarish
        logContainer.innerHTML = result.data.map(log => `
            <div class="log-item p-2 border-b border-gray-800 font-mono text-xs flex justify-between">
                <span class="text-green-400">[${new Date(log.created_at).toLocaleTimeString()}]</span>
                <span class="text-blue-300">ID: ${log.user_id}</span>
                <span class="text-gray-200 flex-1 ml-2">${log.action}</span>
                <span class="px-1 rounded ${log.status === 'ERROR' ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-300'}">${log.status}</span>
            </div>
        `).join('');

    } catch (error) {
        logContainer.innerHTML = `<div class="text-red-500 p-4">Loglarni yuklab bo'lmadi.</div>`;
    }
}

// Har 3 soniyada loglarni avtomat yangilab turish (Real-time effekt)
setInterval(loadLiveLogs, 3000);
