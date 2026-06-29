// Telegram Web App integratsiyasi
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand(); // Mini Appni to'liq ekranda ochish
    tg.ready();
}

// Global API Endpoint (Baza bilan ishlaydigan backend manzilingiz)
const API_BASE_URL = "https://api.linguagowords.com"; // O'z API manzilingizga almashtiring

// DOM yuklanganda ishga tushadigan qismlar
document.addEventListener("DOMContentLoaded", () => {
    initUser();
    initNavigation();
    initAdminTrigger();
});

// 1. Foydalanuvchi ma'lumotlarini yuklash va o'rnatish
function initUser() {
    if (tg && tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        document.getElementById("user-name").textContent = `${user.first_name} ${user.last_name || ""}`;
        document.getElementById("user-id").textContent = user.id;
        document.getElementById("user-avatar").textContent = user.first_name.charAt(0).toUpperCase();
        
        // Bazadan foydalanuvchi statistikasini real-time tortish
        fetchUserStats(user.id);
    } else {
        // Mahalliy brauzerda test qilish uchun fallback static ma'lumotlar
        document.getElementById("user-name").textContent = "Muhammadrizo";
        document.getElementById("user-id").textContent = "6582564319";
        document.getElementById("user-avatar").textContent = "M";
        fetchUserStats("6582564319");
    }
}

// 2. Navigatsiya paneli logikasi (Tugmalar almashishi)
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".content-section");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            // Aktiv classlarni o'chirish
            navItems.forEach(nav => nav.classList.remove("active"));
            sections.forEach(sec => sec.classList.remove("active"));

            // Yangi bo'limni aktivlashtirish
            item.classList.add("active");
            const targetSection = item.getAttribute("data-target");
            document.getElementById(targetSection).classList.add("active");
        });
    });
}

// 3. YASHIRIN ADMIN PANEL TRIGGERI (3 marta bosganda ochilishi)
function initAdminTrigger() {
    const trigger = document.getElementById("version-trigger");
    let clickCount = 0;
    let clickTimeout;

    trigger.addEventListener("click", () => {
        clickCount++;
        
        // Har bir bosish orasidagi vaqt cheklovi (800ms)
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
            clickCount = 0;
        }, 800);

        if (clickCount === 3) {
            clickCount = 0;
            openAdminDashboard();
        }
    });
}

// Admin panelni ochish va umumiy statistikani yuklash
function openAdminDashboard() {
    // Barcha bo'limlarni yopib admin bo'limni ochish
    document.querySelectorAll(".content-section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
    
    document.getElementById("sec-admin").classList.add("active");
    
    // Global statistikani API orqali chaqirish
    fetchGlobalAdminStats();
}

// 4. BAZADAN SHAXSIY STATISTIKANI OLISH (REAL-TIME POSTGRESQL INTEGRATION VIA API)
async function fetchUserStats(userId) {
    try {
        // Backend API'ga so'rov yuborish (initData xavfsizlik filtri bilan)
        const response = await fetch(`${API_BASE_URL}/api/user-stats?user_id=${userId}`, {
            headers: {
                "Authorization": `Bearer ${tg?.initData || ""}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // UI dagi qiymatlarni bazadan kelgan ma'lumotga yangilash
            document.getElementById("stat-streak").textContent = data.streak || 0;
            document.getElementById("stat-words").textContent = data.total_words || 0;
            document.getElementById("stat-tests").textContent = data.total_tests || 0;
            document.getElementById("stat-accuracy").textContent = `${data.accuracy || 0}%`;
            document.getElementById("stat-rating").textContent = `#${data.global_rating || 0}`;
        }
    } catch (error) {
        console.error("Shaxsiy statistikani yuklashda xatolik:", error);
    }
}

// 5. BAZADAN UMUMIY ADMIN STATISTIKASINI OLISH (REAL-TIME)
async function fetchGlobalAdminStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/global-stats`, {
            headers: {
                "Authorization": `Bearer ${tg?.initData || ""}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById("adm-total-users").textContent = data.total_users.toLocaleString();
            document.getElementById("adm-total-words").textContent = data.total_words_learned.toLocaleString();
            document.getElementById("adm-today-active").textContent = data.active_today.toLocaleString();
        } else {
            // Xatolik bo'lsa yoki ruxsat berilmasa
            document.getElementById("adm-total-users").textContent = "Ruxsat yo'q";
            document.getElementById("adm-total-words").textContent = "Ruxsat yo'q";
            document.getElementById("adm-today-active").textContent = "Ruxsat yo'q";
        }
    } catch (error) {
        console.error("Admin statistikani yuklashda xatolik:", error);
        document.getElementById("adm-total-users").textContent = "Xatolik";
        document.getElementById("adm-total-words").textContent = "Xatolik";
        document.getElementById("adm-today-active").textContent = "Xatolik";
    }
}
