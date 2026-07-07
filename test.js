const { app, CITIES } = require('./server.js');

async function runTests() {
    console.log('Запуск простого CI/CD конвейера тестов...\n');

    try {
        console.log('Тест 1: Проверка координат для города Москва');
        const moscow = CITIES['moscow'];

        if (!moscow) {
            throw new Error('Ключ "moscow" не найден в словаре.');
        }

        if (moscow.lat !== 55.7558 || moscow.lon !== 37.6173) {
            throw new Error(`Некорректные координаты. Получено: lat=${moscow.lat}, lon=${moscow.lon}`);
        }

        console.log('✅ Тест 1 пройден: Координаты Москвы указаны верно.\n');

        console.log('Тест 2: Проверка эндпоинта /api/weather/:city с мок-запросом через нативный fetch');

        // Сохраняем оригинальный глобальный fetch
        const originalFetch = global.fetch;
        let fetchUrl = '';
        let fetchOptions = {};

        // Mock метода fetch для проверки данных Yandex API (блок fact)
        global.fetch = async (url, options) => {
            fetchUrl = url;
            fetchOptions = options || {};

            return {
                ok: true,
                status: 200,
                json: async () => ({
                    fact: {
                        temp: 8,
                        feels_like: 2,
                        condition: 'cloudy',
                        humidity: 69,
                        wind_speed: 6.9
                    }
                })
            };
        };

        // Поднимаем локальный Express сервер из server.js на любом свободном порту
        const server = await new Promise((resolve) => {
            const s = app.listen(0, () => resolve(s));
        });
        const port = server.address().port;

        process.env.YANDEX_API_KEY = process.env.YANDEX_API_KEY || 'api-test-key';

        // Делаем запрос к локальному серверу, используем сохраненный оригинальный fetch
        const res = await originalFetch(`http://127.0.0.1:${port}/api/weather/moscow`);
        const data = await res.json();

        server.close();
        global.fetch = originalFetch;

        if (res.status !== 200) {
            throw new Error(`Ожидаем статус 200, получено: ${res.status}`);
        }

        if (!data.fact || data.fact.temp !== 8) {
            throw new Error(`Ожидался mock-ответ (temp: 8), получено: ${JSON.stringify(data.fact || data)}`);
        }

        const expectedUrl = `https://api.weather.yandex.ru/v2/forecast?lat=${moscow.lat}&lon=${moscow.lon}`;
        if (fetchUrl !== expectedUrl) {
            throw new Error(`Сервер вызвал Yandex API по неверному URL.\nОжидалось: ${expectedUrl}\nСформировано: ${fetchUrl}`);
        }

        const headers = fetchOptions.headers || {};
        if (headers['X-Yandex-Weather-Key'] !== process.env.YANDEX_API_KEY) {
            throw new Error('Сервер не передал API-ключ (X-Yandex-Weather-Key) в заголовке запроса к Яндексу.');
        }

        console.log('✅ Тест 2 пройден: Эндпоинт корректно проксирует вызов к API Яндекс-Погода через fetch.\n');

        console.log('\nTrue');
        process.exit(0);

    } catch (error) {
        console.error('❌ Тесты упали с ошибкой:', error.message);
        console.log('\nFalse');
        process.exit(1);
    }
}

runTests();
