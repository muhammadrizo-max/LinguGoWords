const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Siz taqdim etgan PostgreSQL konfiguratsiyasi
const pool = new Pool({
    host: 'localhost', // Agar Vercel tashqaridan ulanadigan bo'lsa serveringiz IP'si qo'yiladi
    port: 5432,
    user: 'linguago_usr',
    password: 'linguago.123', // O'zingizning parolingiz
    database: 'linguago'
});

// Foydalanuvchi ma'lumotlari va statistikasini olish endpoint'i
app.get('/api/user-data', async (req, res) => {
    const { tg_id } = req.query;
    if (!tg_id) return res.status(400).json({ error: 'tg_id talab qilinadi' });

    try {
        // 1. Foydalanuvchi statistikasi va botdagi ochilgan darajalarini tekshirish
        // (Jadval nomlarini o'z bazangizga qarab moslab olasiz, bu standart sxema)
        const userRes = await pool.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
        
        if (userRes.rows.length === 0) {
            return res.json({
                new_user: true,
                allowed_levels: ['A1'], // Yangi foydalanuvchiga faqat A1 ochiq
                stats: { learned: 0, tests: 0, accuracy: 0, rank: 'N/A', streak: 0 }
            });
        }

        const user = userRes.rows[0];
        
        // Haftalik grafik uchun oxirgi 7 kunlik testlar soni
        const chartRes = await pool.query(
            "SELECT to_char(date, 'ID') as day, count(*) FROM test_history WHERE user_id = $1 group by day", 
            [user.id]
        );

        res.json({
            allowed_levels: user.allowed_levels || ['A1', 'A2'], // Masalan botda sotib olgan darajalari
            stats: {
                learned: user.learned_words_count || 0,
                tests: user.total_tests_count || 0,
                accuracy: user.accuracy_percent || 0,
                rank: user.global_rank || '#99',
                streak: user.current_streak || 0
            },
            chart: chartRes.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server xatoligi' });
    }
});

app.listen(3000, () => console.log('LinguaGo API v1.2.0 port 3000 da ishladi'));
