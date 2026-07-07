document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('citySelect');
    const fetchBtn = document.getElementById('fetchBtn');
    const weatherDisplay = document.getElementById('weatherDisplay');
    const weatherContent = document.getElementById('weatherContent');
    const loader = document.getElementById('loader');
    const errorDisplay = document.getElementById('errorDisplay');

    const tempValue = document.getElementById('tempValue');
    const feelsLikeValue = document.getElementById('feelsLikeValue');
    const conditionValue = document.getElementById('conditionValue');
    const humidityValue = document.getElementById('humidityValue');
    const windSpeedValue = document.getElementById('windSpeedValue');

    citySelect.addEventListener('change', () => {
        if (citySelect.value) {
            fetchBtn.disabled = false;
        } else {
            fetchBtn.disabled = true;
        }
    });

    fetchBtn.addEventListener('click', async () => {
        const city = citySelect.value;
        if (!city) return;

        weatherDisplay.style.display = 'block';
        weatherContent.style.display = 'none';
        errorDisplay.style.display = 'none';
        loader.style.display = 'block';
        const historyDisplay = document.getElementById('historyDisplay');
        if (historyDisplay) historyDisplay.style.display = 'none';

        try {
            const response = await fetch(`/api/weather/${city}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при получении данных');
            }
            const fact = data.fact;

            // Render data
            tempValue.textContent = `${fact.temp} °C`;
            feelsLikeValue.textContent = `${fact.feels_like} °C`;
            conditionValue.textContent = fact.condition;
            humidityValue.textContent = `${fact.humidity} %`;
            windSpeedValue.textContent = `${fact.wind_speed} м/с`;

            loader.style.display = 'none';
            weatherContent.style.display = 'block';

            // Render history
            const historyContent = document.getElementById('historyContent');
            if (data.history && data.history.length > 0) {
                historyContent.innerHTML = '';
                data.history.forEach(record => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${record.id}</td>
                        <td>${record.city}</td>
                        <td>${record.temp} °C</td>
                        <td>${new Date(record.created_at).toLocaleString()}</td>
                    `;
                    historyContent.appendChild(tr);
                });
                historyDisplay.style.display = 'block';
            } else {
                historyDisplay.style.display = 'none';
            }

        } catch (error) {
            console.error('Fetch error:', error);
            loader.style.display = 'none';
            errorDisplay.textContent = error.message;
            errorDisplay.style.display = 'block';
        }
    });
});
