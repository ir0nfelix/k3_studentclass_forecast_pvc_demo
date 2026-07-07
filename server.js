require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
});

const initDB = async (retries = 5) => {
    while (retries) {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS weather_history (
                    id SERIAL PRIMARY KEY,
                    city VARCHAR(100),
                    temp VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Database initialized');
            return;
        } catch (error) {
            console.error('Error initializing database, retrying...', error.message);
            retries -= 1;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const CITIES = {
    moscow: { lat: 55.7558, lon: 37.6173 },
    spb: { lat: 59.9343, lon: 30.3351 },
    novosibirsk: { lat: 55.0084, lon: 82.9357 },
    rostov: { lat: 47.2313, lon: 39.7233 }
};

app.get('/api/weather/:city', async (req, res) => {
    try {
        const cityKey = req.params.city.toLowerCase();
        const coords = CITIES[cityKey];

        if (!coords) {
            return res.status(404).json({ error: 'City not found' });
        }

        const apiKey = process.env.YANDEX_API_KEY;
        let fact;

        if (!apiKey) {
            // Заглушка, если нет ключа
            fact = {
                temp: 20,
                feels_like: 18,
                condition: 'clear',
                humidity: 50,
                wind_speed: 3
            };
        } else {
            const url = `https://api.weather.yandex.ru/v2/forecast?lat=${coords.lat}&lon=${coords.lon}`;

            // Используем встроенный в Node.js нативный fetch
            const response = await fetch(url, {
                headers: { 'X-Yandex-Weather-Key': apiKey }
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Yandex API status: ${response.status} - ${errText}`);
            }

            const data = await response.json();

            if (!data.fact) {
                throw new Error('Unexpected API response format: missing fact');
            }
            fact = data.fact;
        }

        try {
            await pool.query('INSERT INTO weather_history (city, temp) VALUES ($1, $2)', [cityKey, fact.temp]);
        } catch (dbErr) {
            console.error('Failed to insert into weather_history:', dbErr.message);
        }

        let history = [];
        try {
            const historyResult = await pool.query('SELECT * FROM weather_history ORDER BY created_at DESC LIMIT 10');
            history = historyResult.rows;
        } catch (dbErr) {
            console.error('Failed to fetch weather_history:', dbErr.message);
        }

        // Отдаем объект fact и историю на фронтенд
        res.json({ fact, history });

    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

if (require.main === module) {
    initDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    });
}

module.exports = { app, CITIES };
