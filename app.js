// Global o'zgaruvchilar va Telegram foydalanuvchi ma'lumotlari
let tg_user_id = "6582564319"; // Default test ID
try {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        if (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            tg_user_id = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
        }
    }
} catch (e) {
    console.log("Telegram WebApp yuklanishida xatolik:", e);
}

// Sahifa yuklanganda ishlidigan asosiy zanjir
document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners(); // Tugmalarga quloq solish mexanizmi srazu ishga tushadi
    fetchLiveStatsFromPostgres();
    setInterval(loadLiveLogs, 3000); // Har 3 soniyada loglar yangilanadi
});

// Tugmalarga klik hodisasini ulash (Xavfsiz va kafolatlangan uslub)
function setupEventListeners() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'IELTS'];
    levels.forEach(level => {
        const btn = document.getElementById(`btn-${level.toLowerCase()}`);
        if (btn) {
            btn.onclick = function(e) {
                e.preventDefault();
                selectLevel(level);
            };
        }
    });
}

function selectLevel(level) {
    alert(`Siz tanlagan daraja: ${level}`);
    console.log(`Daraja tanlandi: ${level}`);
    // Daraja almashtirish mantiqini shu yerga yozishingiz mumkin
}

// Xavfsiz Yuklanish ekrani funksiyalari
function hideLoadingScreen() {
    const loader = document.getElementById('loading-screen') || document.querySelector('.loading');
    if (loader) {
        loader.style.display = 'none';
    }
    // Agar foydalanuvchi nomi "Yuklanmoqda..." bo'lib qolgan bo'lsa, uni to'g'rilash
    const nameLabel = document.getElementById('user-name');
    if (nameLabel && nameLabel.innerText === "Yuklanmoqda...") {
        nameLabel.innerText = "Foydalanuvchi";
    }
}

// API orqali ma'lumotlarni xavfsiz yuklash
async function fetchLiveStatsFromPostgres() {
    try {
        const response = await fetch(`https://api.f0289.55fh.xyz/api/user-stats?user_id=${tg_user_id}`);
        if (!response.ok) throw new Error("Server xato javob qaytardi");
        
        const result = await response.json();
        
        if (result && result.status === "success" && result.data) {
            const userData = result.data;
            
            // DOM elementlarini tekshirib qiymat berish (Xatoni butunlay oldini oladi)
            if (document.getElementById('user-name')) {
                document.getElementById('user-name').innerText = userData.first_name || "Foydalanuvchi";
            }
            if (document.getElementById('user-id-label')) {
                document.getElementById('user-id-label').innerText = `ID: ${userData.telegram_id || tg_user_id}`;
            }
            
            // Kelgan darajaga qarab qolgan qulflarni ochish mumkin
            console.log("Foydalanuvchi ma'lumotlari muvaffaqiyatli yuklandi.");
        }
    } catch (error) {
        console.error("API xatosi yuz berdi, lokal rejim ishlatiladi:", error);
    } finally {
        // Nima bo'lishidan qat'iy nazar YUKLANISH oynasi yopiladi va tugmalar ochiladi!
        hideLoadingScreen(); 
    }
}

// --- JONLI LOG TIZIMI FUNKSIYALARI ---

async function toggleLogVisibility(isChecked) {
    try {
        await fetch('https://api.f0289.55fh.xyz/api/logs/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: isChecked })
        });
        loadLiveLogs();
    } catch (error) {
        console.error("Log statusini o'zgartirib bo'lmadi:", error);
    }
}

async function loadLiveLogs() {
    const logContainer = document.getElementById('live-log-container');
    if (!logContainer) return;

    try {
        const response = await fetch('https://api.f0289.55fh.xyz/api/logs/stream');
        const result = await response.json();

        if (result.status === "hidden") {
            logContainer.innerHTML = `<div style="color: #6b7280; padding: 10px; text-align: center;">Jonli loglar o'chirilgan (OFF)</div>`;
            return;
        }

        logContainer.innerHTML = result.data.map(log => `
            <div style="font-family: monospace; font-size: 11px; padding: 4px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between;">
                <span style="color: #4ade80;">[${new Date(log.created_at).toLocaleTimeString()}]</span>
                <span style="color: #93c5fd; margin-left: 5px;">ID: ${log.user_id}</span>
                <span style="color: #e5e7eb; flex: 1; margin-left: 10px;">${log.action}</span>
                <span style="color: ${log.status === 'ERROR' ? '#f87171' : '#9ca3af'}; font-weight: bold;">${log.status}</span>
            </div>
        `).join('');
    } catch (error) {
        logContainer.innerHTML = `<div style="color: #ef4444; padding: 5px;">Log oqimida xato...</div>`;
    }
}
