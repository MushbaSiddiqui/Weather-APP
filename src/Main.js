import React, { useState, useEffect } from 'react';
import './Main.css';
import { FaSearch, FaTint, FaWind, FaThermometerHalf } from 'react-icons/fa';

const API_KEY = process.env.REACT_APP_API_KEY;
const BASE_URL = process.env.REACT_APP_API_URL || 'https://api.openweathermap.org/data/2.5';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0';

const WEATHER_BACKGROUNDS = {
  Clear: require('../src/assets/videos/clear.mp4'),
  Rain: require('../src/assets/videos/default.mp4'),
  Clouds: require('../src/assets/videos/cloudy.mp4'),
  Snow: require('../src/assets/videos/default.mp4'),
  Thunderstorm: require('../src/assets/videos/default.mp4'),
  wind: require('../src/assets/videos/default.mp4'),
  Fog: require('../src/assets/videos/foggy.mp4'),
  Mist: require('../src/assets/videos/foggy.mp4'),
};

// Weather icons mapping
const WEATHER_ICONS = {
  Clear: require('../src/assets/clearSky.png'),
  Rain: require('../src/assets/rain.gif'),
  Cloud: require('../src/assets/cloud.gif'),
  Clouds: require('../src/assets/Scatterclouds.png'),
  Snow: require('../src/assets/snow.gif'),
  Thunderstorm: require('../src/assets/thunder.png'),
  Drizzle: require('../src/assets/rain.gif'),
  Sunny: require('../src/assets/sun.gif'),
  Fog: require('../src/assets/fog.gif'),
  Smoke: require('../src/assets/haze.png'),
  Haze: require('../src/assets/haze.png'),
  Wind: require('../src/assets/rain.gif'),
};

const COUNTRY_CODES = { US: 'USA', GB: 'UK', IN: 'India' }; // Add more as needed

const Main = () => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const updateBackgroundVideo = (weatherMain) => {
    const video = document.getElementById('weather-video');
    const videoSrc = WEATHER_BACKGROUNDS[weatherMain] || WEATHER_BACKGROUNDS.Clear;
    video.src = videoSrc;
  };

  const fetchWeatherData = async (lat, lon, locationInfo = null) => {
    try {
      const [weatherResponse, forecastResponse] = await Promise.all([
        fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
        fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
      ]);

      const weatherData = await weatherResponse.json();
      const forecastData = await forecastResponse.json();

      if (weatherData.cod !== 200 || forecastData.cod !== '200') {
        throw new Error(weatherData.message || forecastData.message);
      }

      if (locationInfo) {
        weatherData.name = `${locationInfo.name}${locationInfo.state ? `, ${locationInfo.state}` : ''} ${COUNTRY_CODES[locationInfo.country] || locationInfo.country}`;
      }

      setCurrentWeather(weatherData);
      setForecast(processForecastData(forecastData));
      updateBackgroundVideo(weatherData.weather[0].main);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const processForecastData = (data) => {
    const dailyData = {};
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = item;
      }
    });
    const forecastDays = Object.values(dailyData);
    while (forecastDays.length < 7) {
      const lastDay = { ...forecastDays[forecastDays.length - 1] };
      lastDay.dt += 86400;
      forecastDays.push(lastDay);
    }
    return forecastDays.slice(1, 7);
  };

  const fetchWeatherByLocation = async (position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      const reverseGeoResponse = await fetch(
        `${GEO_API_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
      );
      
      if (!reverseGeoResponse.ok) {
        throw new Error('Failed to fetch location details');
      }

      const locationData = await reverseGeoResponse.json();
      if (locationData.length > 0) {
        await fetchWeatherData(lat, lon, locationData[0]);
      } else {
        await fetchWeatherData(lat, lon);
      }
    } catch (err) {
      setError('Error fetching location details');
      setLoading(false);
    }
  };

  const fetchWeatherByCity = async () => {
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      const geoResponse = await fetch(
        `${GEO_API_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
      );
      
      if (!geoResponse.ok) {
        throw new Error('Failed to fetch location data');
      }
      
      const geoData = await geoResponse.json();

      if (!geoData.length) {
        throw new Error('City not found');
      }

      const mostRelevantLocation = geoData.find(location => 
        location.name.toLowerCase() === query.toLowerCase()
      ) || geoData[0];

      const { lat, lon, country, state } = mostRelevantLocation;
      await fetchWeatherData(lat, lon, mostRelevantLocation);
      setQuery('');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        fetchWeatherByLocation,
        (error) => {
          setError('Unable to fetch location. Please search for a city.');
          setLoading(false);
        },
        { timeout: 10000 }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
    }
  }, []);

  const formatDate = (dt) => {
    return new Date(dt * 1000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWeatherIcon = (weatherMain) => {
    return WEATHER_ICONS[weatherMain] || WEATHER_ICONS.Clear;
  };

  return (
    <div className="main">
      <h1 className="main-title">Weather Forecast</h1>
      <div className="container">
        <div className="weather-app">
          <form onSubmit={(e) => { e.preventDefault(); fetchWeatherByCity(); }} className="search-bar">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city"
              className="search-input"
              aria-label="Search city"
            />
            <button type="submit" className="search-button" aria-label="Search">
              <FaSearch />
            </button>
          </form>

          {loading && <div className="loading">Loading data...</div>}
          {error && <div className="error-message">{error}</div>}
          
          {currentWeather && (
            <div className="weather-info">
              <div className="date-info">
                <h2 className="day-name">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </h2>
                <p className="current-date">
                  {new Date().toLocaleDateString('en-US', { 
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>

              <div className="weather-details">
                <div className="weather-main">
                  <div className="temp-city">
                    <h3 className="temperature">{Math.round(currentWeather.main.temp)}°C</h3>
                    <div className="city-name">{currentWeather.name.toUpperCase()}</div>
                    <div className="feels-like">
                     feels like  {Math.round(currentWeather.main.feels_like)}°C
                    </div>
                  </div>
                  <div className="weather-status">
                    <img
                      src={getWeatherIcon(currentWeather.weather[0].main)}
                      alt={currentWeather.weather[0].description}
                      className="weather-icon"
                    />
                    <div className="weather-description">
                      {currentWeather.weather[0].description}
                    </div>
                  </div>
                </div>

                <div className="parameter-details">
                  <div className="parameter">
                    <FaTint className="icon" />
                    <div className="parameter-info">
                      <p>Humidity</p>
                      <p className="value">{currentWeather.main.humidity}%</p>
                    </div>
                  </div>
                  <div className="parameter">
                    <FaWind className="icon" />
                    <div className="parameter-info">
                      <p>Wind Speed</p>
                      <p className="value">{currentWeather.wind.speed} m/s</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {forecast && (
          <div className="forecast-section">
            <div className="forecast-container">
              {forecast.map((day, index) => (
                <div key={index} className="forecast-day">
                  <p className="forecast-date">{formatDate(day.dt)}</p>
                  <img
                    src={getWeatherIcon(day.weather[0].main)}
                    alt={day.weather[0].description}
                    className="forecast-icon"
                  />
                  <p className="forecast-temp">
                    {Math.round(day.main.temp)}°C
                  </p>
                  <p className="forecast-desc">
                    {day.weather[0].description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Main;
