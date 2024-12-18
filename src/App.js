import React from 'react';
import './App.css';
import WeatherPage from '../src/Main';

function App() {
  return (
    <div className="app-container">
      <div className="video-background">
        <video id="weather-video" autoPlay muted loop>
          <source src="" type="video/mp4" />
        </video>
      </div>
      <WeatherPage />
    </div>
  );
}

export default App;
