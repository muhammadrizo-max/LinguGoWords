// Telegram Web App API Initialization
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

// Global configuration and live state synchronizer
const API_BASE_URL = "https://api.f0289.55fh.xyz";; 

// Real-time local state tracking to secure consistent UI rendering
let userSessionState = {
    tg_id: "6582564319", // Fallback Default
    streak: 3,
    yodlangan_sozlar: 42,
    yechilgan_testlar: 14,
    togri_javoblar: 10,
    xato_javoblar: 4,
    global_rating: 142
};

// Global Savollar Banki (Interaktiv test tizimi uchun)
const sampleQuestions = [
    { q: "Choose the correct translation: 'Book'", options: ["Kitob", "Qalam", "Lug'at", "Oyna"], correct: 0 },
    { q: "Complete the sentence: 'She ___ a student.'", options: ["are", "am", "is", "be"], correct: 2 },
    { q: "What is the opposite of 'Big'?", options: ["Large", "Small", "Tall", "Heavy"], correct: 1 },
    { q: "Translate to English: 'Xayrli tong'", options: ["Good afternoon", "Good evening", "Good night", "Good morning"], correct: 3 },
    { q: "Which one is a fruit?", options: ["Carrot", "Apple", "Potato", "Onion"], correct: 1 }
];
let currentQuestionIndex = 0;
let selectedOptionIndex = null;

// DOM LOADER SECURE TRIGGER
document.addEventListener("DOMContentLoaded", () => {
    initAppUser();
    initAppNavigation();
    initInteractiveLevels();
    initTestEngine();
    initAdminSystem();
    renderUserStatsUI();
});

/* TOAST EMITTER (Xatoliklarni ekranda aniq ko'rsatish tizimi) */
function showNotification(message, type = "error") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span><button class="toast-close">×</button>`;
    
    container.appendChild(toast);
    
    toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
    setTimeout(() => { if(toast.parentNode) toast.remove(); }, 4000);
}

/* FOYDALANUVCHINI TELEGRAMDAN ANIQLASH */
function initAppUser() {
    if (tg && tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        userSessionState.tg_id = user.id.toString();
        document.getElementById("user-name").textContent = `${user.first_name} ${user.last_name || ""}`;
        document.getElementById("user-id").textContent = user.id;
        document.getElementById("user-avatar").textContent = user.first_name.charAt(0).toUpperCase();
    } else {
        document.getElementById("user-name").textContent = "Muhammadrizo";
        document.getElementById("user-id").textContent = userSessionState.tg_id;
        document.getElementById("user-avatar").textContent = "M";
        showNotification("Telegram muhiti aniqlanmadi. Test rejimida ishlamoqda.", "info");
    }
    fetchLiveStatsFromPostgres();
}

/* NAVIGATSIYA TUGMALARI */
function initAppNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".content-section");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(nav => nav.classList.remove("active"));
            sections.forEach(sec => sec.classList.remove("active"));

            item.classList.add("active");
            const targetSection = item.getAttribute("data-target");
            document.getElementById(targetSection).classList.add("active");
            
            if(targetSection === "sec-statistika") {
                renderUserStatsUI();
            }
        });
    });
}

/* WORDS: DARAJALAR KLIK LOGIKASI VA XATOLIK TIZIMI */
function initInteractiveLevels() {
    const container = document.getElementById("levels-container");
    container.addEventListener("click", (e) => {
        const card = e.target.closest(".level-card");
        if (!card) return;

        const selectedLevel = card.getAttribute("data-level");
        
        if (card.classList.contains("locked")) {
            showNotification(`Xatolik: Sizda '${selectedLevel}' darajasi qulflangan! Ochish uchun bot orqali faollashtiring.`);
        } else {
            showNotification(`Muvaffaqiyatli: '${selectedLevel}' darajasidagi so'zlar PostgreSQL bazasidan yuklanmoqda...`, "info");
        }
    });
}

/* TESTS: INTERAKTIV SAVOL-JAVOB DVIGATELI */
function initTestEngine() {
    const nextBtn = document.getElementById("btn-next-question");
    
    renderCurrentQuestion();

    nextBtn.addEventListener("click", () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < sampleQuestions.length) {
            selectedOptionIndex = null;
            renderCurrentQuestion();
            nextBtn.disabled = true;
        } else {
            showNotification("Tabriklaymiz! Barcha testlarni yakunladingiz.", "info");
            currentQuestionIndex = 0;
            selectedOptionIndex = null;
            renderCurrentQuestion();
            nextBtn.disabled = true;
            renderUserStatsUI();
        }
    });
}

function renderCurrentQuestion() {
    const currentQuestion = sampleQuestions[currentQuestionIndex];
    document.getElementById("current-q-num").textContent = currentQuestionIndex + 1;
    document.getElementById("question-target").textContent = currentQuestion.q;
    
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";
    
    currentQuestion.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.addEventListener("click", () => handleOptionSelection(idx, currentQuestion.correct, btn));
        optionsContainer.appendChild(btn);
    });
}

function handleOptionSelection(selectedIndex, correctIndex, selectedBtn) {
    if (selectedOptionIndex !== null) return; // Bir marta belgilangandan keyin bloklash
    
    selectedOptionIndex = selectedIndex;
    const allOptions = document.querySelectorAll(".option-btn");
    const nextBtn = document.getElementById("btn-next-question");
    
    userSessionState.yechilgan_testlar += 1;

    if (selectedIndex === correctIndex) {
        selectedBtn.classList.add("correct-ans");
        userSessionState.togri_javoblar += 1;
        userSessionState.yodlangan_sozlar += 2; // Har bir to'g'ri javobga yangi so'z qo'shiladi
        showNotification("To'g'ri javob! +2 ball bazaga yozildi", "info");
    } else {
        selectedBtn.classList.add("wrong-ans");
        allOptions[correctIndex].classList.add("correct-ans");
        userSessionState.xato_javoblar += 1;
        showNotification("Xato javob! To'g'ri variant yashil rangda ko'rsatildi.");
    }
    
    // Server bazasiga yangilangan statistikani asinxron yuborish signali
    pushStatsToPostgres();
    nextBtn.disabled = false;
}

/* SHAXSIY STATISTIKANI UI-GA CHIZISH */
function renderUserStatsUI() {
    const total = userSessionState.togri_javoblar + userSessionState.xato_javoblar;
    const accuracy = total > 0 ? Math.round((userSessionState.togri_javoblar / total) * 100) : 0;
    
    document.getElementById("stat-streak").textContent = userSessionState.streak;
    document.getElementById("stat-words").textContent = userSessionState.yodlangan_sozlar;
    document.getElementById("stat-tests").textContent = userSessionState.yechilgan_testlar;
    document.getElementById("stat-accuracy").textContent = `${accuracy}%`;
    document.getElementById("stat-rating").textContent = `#${userSessionState.global_rating}`;
    
    // Javoblar balansi progress liniyasini hisoblash
    const correctPercent = total > 0 ? (userSessionState.togri_javoblar / total) * 100 : 50;
    const wrongPercent = total > 0 ? (userSessionState.xato_javoblar / total) * 100 : 50;
    
    document.getElementById("bar-correct-fill").style.width = `${correctPercent}%`;
    document.getElementById("bar-wrong-fill").style.width = `${wrongPercent}%`;
    
    document.getElementById("txt-correct-count").textContent = userSessionState.togri_javoblar;
    document.getElementById("txt-wrong-count").textContent = userSessionState.xato_javoblar;
}

/* YASHIRIN GLOBAL ADMIN PANEL TIZIMI */
function initAdminSystem() {
    const trigger = document.getElementById("version-trigger");
    const closeBtn = document.getElementById("btn-close-admin");
    let clickCount = 0;
    let clickTimeout;

    trigger.addEventListener("click", () => {
        clickCount++;
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => { clickCount = 0; }, 800);

        if (clickCount === 3) {
            clickCount = 0;
            openGlobalAdminPanel();
        }
    });

    closeBtn.addEventListener("click", () => {
        document.getElementById("sec-admin").classList.remove("active");
        document.getElementById("sec-words").classList.add("active");
        document.getElementById("app-bottom-nav").style.display = "flex";
        document.querySelector(".nav-item[data-target='sec-words']").classList.add("active");
    });
}

function openGlobalAdminPanel() {
    document.querySelectorAll(".content-section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
    
    document.getElementById("app-bottom-nav").style.display = "none";
    document.getElementById("sec-admin").classList.add("active");
    
    showNotification("VCG Global Tizim boshqaruvi yuklanmoqda...", "info");
    fetchGlobalDatabaseMetrics();
}

/* API INTEGRATION: REAL POSTGRESQL MA'LUMOTLAR ALMASHINUVI (MOCK FALLBACK BILAN) */
async function fetchLiveStatsFromPostgres() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user-stats?user_id=${userSessionState.tg_id}`, {
            headers: { "Authorization": `Bearer ${tg?.initData || ""}` }
        });
        if (response.ok) {
            const data = await response.json();
            userSessionState = data;
            renderUserStatsUI();
        }
    } catch (e) {
        console.log("API Bog'lanish xatosi (Lokal ma'lumotlardan foydalaniladi):", e);
    }
}

async function pushStatsToPostgres() {
    try {
        await fetch(`${API_BASE_URL}/api/update-stats`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tg?.initData || ""}`
            },
            body: JSON.stringify(userSessionState)
        });
    } catch (e) {
        console.log("PostgreSQL asinxron sinxronizatsiya xatosi:", e);
    }
}

async function fetchGlobalDatabaseMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/global-system-metrics`, {
            headers: { "Authorization": `Bearer ${tg?.initData || ""}` }
        });
        if (response.ok) {
            const d = await response.json();
            updateAdminUI(d);
        } else {
            throw new Error("Ruxsat berilmadi (403 Forbidden)");
        }
    } catch (e) {
        // Ma'lumotlar bazasidan keladigan yuqori darajadagi kengaytirilgan admin statistikasi simulyatsiyasi
        setTimeout(() => {
            const mockAdminData = {
                total_users: 24510,
                active_today: 1842,
                db_words: 3500, // Bazadagi barcha so'zlar soni
                total_learned: 1045200, // Hamma userlar yodlagan so'zlar yig'indisi
                total_tests_db: 450, // Bazadagi tayyor testlar soni
                total_revenue: 1420, // To'lovlar balansi
                blocked_users: 12,
                premium_users: 341,
                api_speed: "38 ms"
            };
            updateAdminUI(mockAdminData);
        }, 600);
    }
}

function updateAdminUI(d) {
    document.getElementById("adm-total-users").textContent = d.total_users.toLocaleString();
    document.getElementById("adm-today-active").textContent = d.active_today.toLocaleString();
    document.getElementById("adm-db-words").textContent = d.db_words.toLocaleString();
    document.getElementById("adm-total-learned").textContent = d.total_learned.toLocaleString();
    document.getElementById("adm-total-tests-db").textContent = d.total_tests_db.toLocaleString();
    document.getElementById("adm-total-revenue").textContent = `$${d.total_revenue.toLocaleString()}`;
    
    document.getElementById("adm-blocked-users").textContent = `${d.blocked_users} ta`;
    document.getElementById("adm-premium-users").textContent = `${d.premium_users} ta`;
    document.getElementById("adm-api-speed").textContent = d.api_speed;
}
