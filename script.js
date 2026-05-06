let currentUnit = 'celsius';
let currentWeatherData = null;
let currentForecastType = 'hourly';

const weatherIcons = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '❄️', 73: '❄️', 75: '❄️', 77: '🌨️', 80: '🌦️', 81: '🌦️',
    82: '🌦️', 85: '🌨️', 86: '🌨️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
};

const weatherDescriptions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
    96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
};

function convertTemp(temp, unit) {
    if (unit === 'fahrenheit') {
        return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
}

function getUnitSymbol() {
    return currentUnit === 'fahrenheit' ? '°F' : '°C';
}

async function fetchWeather(cityName, lat = null, lon = null) {
    try {
        showLoading(true);
        hideMessages();

        let latitude, longitude, name, country;

        if (lat && lon) {
            latitude = lat;
            longitude = lon;
            name = cityName || 'Current Location';
            country = '';
        } else {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=3&language=en&format=json`;
            const geoResponse = await fetch(geoUrl);
            if (!geoResponse.ok) throw new Error('Unable to connect to location service. Please try again.');

            const geoData = await geoResponse.json();
            if (!geoData.results || geoData.results.length === 0) throw new Error(`City "${cityName}" not found.`);

            ({ latitude, longitude, name, country } = geoData.results[0]);
            showSuccess(`Found: ${name}${country ? ', ' + country : ''}`);
        }

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,precipitation_probability,weathercode,surface_pressure,visibility,uv_index,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto&forecast_days=7`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error('Unable to fetch weather data. Please try again.');

        const weatherData = await weatherResponse.json();
        if (!weatherData.current_weather) throw new Error('Invalid weather data received.');

        currentWeatherData = { ...weatherData, location: { name, country, latitude, longitude } };

        displayCurrentWeather();
        displayForecast();
    } catch (error) {
        console.error('Weather fetch error:', error);
        showError(error.message || 'Failed to load weather data. Please try again.');
    } finally {
        showLoading(false);
    }
}

function displayCurrentWeather() {
    if (!currentWeatherData) return;

    const current = currentWeatherData.current_weather;
    const hourly = currentWeatherData.hourly;
    const daily = currentWeatherData.daily;
    const location = currentWeatherData.location;

    const now = new Date();
    let currentIndex = 0;

    if (hourly?.time) {
        currentIndex = hourly.time.findIndex(time => {
            const timeDate = new Date(time);
            return timeDate.getDate() === now.getDate() &&
                   Math.abs(timeDate.getHours() - now.getHours()) <= 1;
        });
        if (currentIndex === -1) currentIndex = 0;
    }

    document.getElementById('cityName').textContent = `📍 ${location.name}${location.country ? ', ' + location.country : ''}`;
    document.getElementById('weatherIcon').textContent = weatherIcons[current.weathercode] || '☀️';
    document.getElementById('mainTemp').textContent = `${convertTemp(current.temperature, currentUnit)}${getUnitSymbol()}`;
    document.getElementById('weatherDesc').textContent = weatherDescriptions[current.weathercode] || 'Clear';

    const feelsLike = hourly?.apparent_temperature?.[currentIndex] ?? current.temperature;
    document.getElementById('feelsLike').textContent = `${convertTemp(feelsLike, currentUnit)}${getUnitSymbol()}`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.windspeed)} km/h`;

    document.getElementById('humidity').textContent = hourly?.relativehumidity_2m?.[currentIndex] ? `${hourly.relativehumidity_2m[currentIndex]}%` : 'N/A';
    document.getElementById('visibility').textContent = hourly?.visibility?.[currentIndex] ? `${(hourly.visibility[currentIndex] / 1000).toFixed(1)} km` : 'N/A';
    document.getElementById('pressure').textContent = hourly?.surface_pressure?.[currentIndex] ? `${Math.round(hourly.surface_pressure[currentIndex])} hPa` : 'N/A';
    document.getElementById('uvIndex').textContent = hourly?.uv_index?.[currentIndex] !== undefined ? getUVIndexText(hourly.uv_index[currentIndex]) : 'N/A';

    if (daily?.sunrise?.[0] && daily?.sunset?.[0]) {
        const sunrise = new Date(daily.sunrise[0]);
        const sunset = new Date(daily.sunset[0]);
        document.getElementById('sunrise').textContent = sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('sunset').textContent = sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        document.getElementById('sunrise').textContent = 'N/A';
        document.getElementById('sunset').textContent = 'N/A';
    }

    document.getElementById('weatherSection').classList.remove('hidden');
}

function getUVIndexText(uv) {
    const uvRound = Math.round(uv * 10) / 10;
    if (uv <= 2) return `${uvRound} (Low)`;
    if (uv <= 5) return `${uvRound} (Moderate)`;
    if (uv <= 7) return `${uvRound} (High)`;
    if (uv <= 10) return `${uvRound} (Very High)`;
    return `${uvRound} (Extreme)`;
}

function displayForecast() {
    if (!currentWeatherData) return;

    const grid = document.getElementById('forecastGrid');
    grid.innerHTML = '';

    if (currentForecastType === 'hourly') {
        const hourly = currentWeatherData.hourly;
        if (!hourly?.time) return;

        const hoursToShow = Math.min(24, hourly.time.length);
        for (let i = 0; i < hoursToShow; i++) {
            const time = new Date(hourly.time[i]);
            const item = document.createElement('div');
            item.className = 'forecast-item';

            const temp = hourly.temperature_2m?.[i] ?? 0;
            const weatherCode = hourly.weathercode?.[i] ?? 0;
            const precipProb = hourly.precipitation_probability?.[i] ?? 0;

            item.innerHTML = `
                <div class="forecast-time">${time.getHours()}:00</div>
                <div class="forecast-icon">${weatherIcons[weatherCode] || '☀️'}</div>
                <div class="forecast-temp">${convertTemp(temp, currentUnit)}${getUnitSymbol()}</div>
                <div class="forecast-desc">${Math.round(precipProb)}% rain</div>
            `;
            grid.appendChild(item);
        }
    } else {
        const daily = currentWeatherData.daily;
        if (!daily?.time) return;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const daysToShow = Math.min(7, daily.time.length);

        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(daily.time[i]);
            const dayName = i === 0 ? 'Today' : days[date.getDay()];
            const item = document.createElement('div');
            item.className = 'forecast-item';

            const maxTemp = daily.temperature_2m_max?.[i] ?? 0;
            const minTemp = daily.temperature_2m_min?.[i] ?? 0;
            const weatherCode = daily.weathercode?.[i] ?? 0;
            const precipitation = daily.precipitation_sum?.[i] ?? 0;

            item.innerHTML = `
                <div class="forecast-time">${dayName}</div>
                <div class="forecast-icon">${weatherIcons[weatherCode] || '☀️'}</div>
                <div class="forecast-temp">${convertTemp(maxTemp, currentUnit)}°/${convertTemp(minTemp, currentUnit)}°</div>
                <div class="forecast-desc">${precipitation.toFixed(1)}mm</div>
            `;
            grid.appendChild(item);
        }
    }

    document.getElementById('forecastSection').classList.remove('hidden');
}

function searchCity(city) {
    document.getElementById('cityInput').value = city;
    fetchWeather(city);
}

function getCurrentLocation() {
    if ("geolocation" in navigator) {
        showSuccess('Getting your location...');
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetchWeather('Current Location', lat, lon);
            },
            error => {
                let message = 'Unable to get your location. ';
                if (error.code === error.PERMISSION_DENIED) {
                    message += 'Please allow location access or search manually.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    message += 'Location information unavailable.';
                } else {
                    message += 'Request timed out.';
                }
                showError(message);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    } else {
        showError('Geolocation is not supported by your browser.');
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = `❌ ${message}`;
    errorEl.classList.remove('hidden');
    document.getElementById('weatherSection').classList.add('hidden');
    document.getElementById('forecastSection').classList.add('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = `✅ ${message}`;
    successEl.classList.remove('hidden');
    setTimeout(() => successEl.classList.add('hidden'), 3000);
}

function hideMessages() {
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
}

function showLoading(show) {
    const loadingSection = document.getElementById('loadingSection');
    const searchButton = document.getElementById('searchButton');
    const locationButton = document.getElementById('locationButton');

    if (show) {
        loadingSection.classList.remove('hidden');
        searchButton.disabled = true;
        locationButton.disabled = true;
        searchButton.textContent = '⏳ Loading...';
    } else {
        loadingSection.classList.add('hidden');
        searchButton.disabled = false;
        locationButton.disabled = false;
        searchButton.textContent = '🔍 Search';
    }
}

// Event listeners
document.getElementById('searchButton').addEventListener('click', () => {
    const city = document.getElementById('cityInput').value.trim();
    if (city) fetchWeather(city);
    else showError('Please enter a city name');
});

document.getElementById('locationButton').addEventListener('click', getCurrentLocation);

document.getElementById('cityInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = e.target.value.trim();
        if (city) fetchWeather(city);
        else showError('Please enter a city name');
    }
});

// Unit toggle
document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentUnit = btn.dataset.unit;
        if (currentWeatherData) {
            displayCurrentWeather();
            displayForecast();
        }
    });
});

// Forecast tabs
document.querySelectorAll('.forecast-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.forecast-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentForecastType = tab.dataset.type;
        if (currentWeatherData) displayForecast();
    });
});

// Auto-refresh every 10 minutes
setInterval(() => {
    if (currentWeatherData?.location) {
        const location = currentWeatherData.location;
        fetchWeather(location.name, location.latitude, location.longitude);
    }
}, 10 * 60 * 1000);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'l': e.preventDefault(); getCurrentLocation(); break;
            case 'f': e.preventDefault(); document.getElementById('cityInput').focus(); break;
        }
    }
});

// Online/offline detection
window.addEventListener('online', () => {
    showSuccess('Back online! Refreshing weather data...');
    if (currentWeatherData?.location) {
        const location = currentWeatherData.location;
        fetchWeather(location.name, location.latitude, location.longitude);
    }
});

window.addEventListener('offline', () => {
    showError('You are offline. Weather data may be outdated.');
});

// Load default weather
window.addEventListener('load', () => {
    fetchWeather('Delhi');
});
