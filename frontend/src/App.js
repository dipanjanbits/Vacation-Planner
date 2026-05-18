import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import AsyncSelect from 'react-select/async';

// Use runtime config (loaded from public/config.js)
// Falls back to environment variable for development
const API_BASE = window.APP_CONFIG?.API_BASE || process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [cities, setCities] = useState([]);
  const [sourceCity, setSourceCity] = useState(null);
  const [destination, setDestination] = useState(null);
  const [numberOfDays, setNumberOfDays] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    console.log('🔌 API Base URL:', API_BASE);
    console.log('🔍 Fetching cities from:', `${API_BASE}/cities`);
    
    axios.get(`${API_BASE}/cities`)
      .then(res => {
        console.log('✅ Cities loaded:', res.data.cities.length, 'cities');
        setCities(res.data.cities.map(c => ({ value: c, label: c })));
      })
      .catch(err => {
        console.error('❌ Failed to load cities:');
        console.error('   Status:', err.response?.status);
        console.error('   Message:', err.message);
        console.error('   Full error:', err);
      });
  }, []);

  const filterCities = (inputValue) => {
    return cities.filter(c =>
      c.label.toLowerCase().startsWith(inputValue.toLowerCase())
    );
  };

  const loadOptions = (inputValue, callback) => {
    if (inputValue.length < 2) {
      callback([]);
      return;
    }
    callback(filterCities(inputValue));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceCity || !destination) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(`${API_BASE}/plan`, {
        source_city: sourceCity.value,
        destination: destination.value,
        number_of_days: numberOfDays
      });
      setResult(response.data);
      setActiveTab('overview');
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>✈️ Dream Vacation Planner</h1>
        <p>Your AI travel concierge for unforgettable adventures</p>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Source City</label>
            <AsyncSelect
              cacheOptions
              loadOptions={loadOptions}
              defaultOptions={cities.slice(0, 20)}
              onChange={setSourceCity}
              placeholder="Type to search (e.g., Mumbai, New York)..."
              isClearable
            />
          </div>
          <div className="form-group">
            <label>Destination</label>
            <AsyncSelect
              cacheOptions
              loadOptions={loadOptions}
              defaultOptions={cities.slice(0, 20)}
              onChange={setDestination}
              placeholder="Type to search (e.g., Paris, Tokyo)..."
              isClearable
            />
          </div>
          <div className="form-group">
            <label>Number of Days</label>
            <input
              type="number"
              min="1"
              max="30"
              value={numberOfDays}
              onChange={(e) => setNumberOfDays(parseInt(e.target.value) || 5)}
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading || !sourceCity || !destination}>
            {loading ? '🔄 Planning...' : '🚀 Plan My Dream Vacation'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>🌍 AI agents are planning your vacation... This may take a few minutes.</p>
        </div>
      )}

      {error && <div className="error-msg">❌ {error}</div>}

      {result && (
        <div className="results-container">
          <div className="success-banner">
            🎉 Your {result.source_city} → {result.destination} vacation plan is ready!
          </div>

          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📋 Overview</button>
            <button className={`tab-btn ${activeTab === 'weather' ? 'active' : ''}`} onClick={() => setActiveTab('weather')}>🌤️ Weather</button>
            <button className={`tab-btn ${activeTab === 'itinerary' ? 'active' : ''}`} onClick={() => setActiveTab('itinerary')}>🗓️ Itinerary</button>
            <button className={`tab-btn ${activeTab === 'hotels' ? 'active' : ''}`} onClick={() => setActiveTab('hotels')}>🏨 Hotels</button>
            <button className={`tab-btn ${activeTab === 'restaurants' ? 'active' : ''}`} onClick={() => setActiveTab('restaurants')}>🍽️ Restaurants</button>
            <button className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>🎯 Activities</button>
          </div>

          <div className="tab-content">
            {activeTab === 'overview' && result.report && (
              <div>
                <div className="markdown-content">
                  <ReactMarkdown>{result.report}</ReactMarkdown>
                </div>
                <button className="download-btn" onClick={() => downloadFile(result.report, `${result.destination}_report.md`)}>
                  💾 Download Report
                </button>
              </div>
            )}

            {activeTab === 'weather' && result.weather && (
              <div className="markdown-content">
                <ReactMarkdown>{result.weather}</ReactMarkdown>
              </div>
            )}

            {activeTab === 'itinerary' && result.itinerary && (
              <div>
                <div className="markdown-content">
                  <ReactMarkdown>{result.itinerary}</ReactMarkdown>
                </div>
                <button className="download-btn" onClick={() => downloadFile(result.itinerary, `${result.destination}_itinerary.md`)}>
                  💾 Download Itinerary
                </button>
              </div>
            )}

            {activeTab === 'hotels' && result.hotels && (
              <HotelTable content={result.hotels} destination={result.destination} />
            )}

            {activeTab === 'restaurants' && result.restaurants && (
              <RestaurantTable content={result.restaurants} destination={result.destination} />
            )}

            {activeTab === 'activities' && result.activities && (
              <div>
                <div className="markdown-content">
                  <ReactMarkdown>{result.activities}</ReactMarkdown>
                </div>
                <button className="download-btn" onClick={() => downloadFile(result.activities, `${result.destination}_activities.md`)}>
                  💾 Download Activities
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function parseMarkdownTable(content) {
  const lines = content.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 3) return null;

  const header = lines[0].split('|').filter(c => c.trim()).map(c => c.trim());
  const dataLines = lines.slice(1).filter(l => !l.match(/^\|[\s\-:|]+\|$/));
  const rows = dataLines.map(line =>
    line.split('|').filter(c => c.trim()).map(c => c.trim())
  ).filter(r => r.length === header.length);

  return { header, rows };
}

function extractNumeric(value) {
  const match = value.replace(/[^0-9.]/g, '');
  return parseFloat(match) || 0;
}

function HotelTable({ content, destination }) {
  const [sortBy, setSortBy] = useState('rating');
  const table = parseMarkdownTable(content);

  if (!table) return <div className="markdown-content"><ReactMarkdown>{content}</ReactMarkdown></div>;

  const ratingIdx = table.header.findIndex(h => h.toLowerCase().includes('google') && h.toLowerCase().includes('rating'));
  const priceIdx = table.header.findIndex(h => h.toLowerCase().includes('price'));

  let sortedRows = [...table.rows];
  if (sortBy === 'rating' && ratingIdx >= 0) {
    sortedRows.sort((a, b) => extractNumeric(b[ratingIdx]) - extractNumeric(a[ratingIdx]));
  } else if (sortBy === 'price_asc' && priceIdx >= 0) {
    sortedRows.sort((a, b) => extractNumeric(a[priceIdx]) - extractNumeric(b[priceIdx]));
  } else if (sortBy === 'price_desc' && priceIdx >= 0) {
    sortedRows.sort((a, b) => extractNumeric(b[priceIdx]) - extractNumeric(a[priceIdx]));
  }

  return (
    <div>
      <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="rating">Sort: Best Reviewed (Google Rating)</option>
        <option value="price_asc">Sort: Price Low → High</option>
        <option value="price_desc">Sort: Price High → Low</option>
      </select>
      <table>
        <thead><tr>{table.header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {sortedRows.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <button className="download-btn" onClick={() => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${destination}_hotels.md`; a.click();
      }}>💾 Download Hotels</button>
    </div>
  );
}

function RestaurantTable({ content, destination }) {
  const [sortBy, setSortBy] = useState('rating');
  const table = parseMarkdownTable(content);

  if (!table) return <div className="markdown-content"><ReactMarkdown>{content}</ReactMarkdown></div>;

  const ratingIdx = table.header.findIndex(h => h.toLowerCase().includes('google') && h.toLowerCase().includes('rating'));
  const costIdx = table.header.findIndex(h => h.toLowerCase().includes('cost'));

  let sortedRows = [...table.rows];
  if (sortBy === 'rating' && ratingIdx >= 0) {
    sortedRows.sort((a, b) => extractNumeric(b[ratingIdx]) - extractNumeric(a[ratingIdx]));
  } else if (sortBy === 'cost_asc' && costIdx >= 0) {
    sortedRows.sort((a, b) => extractNumeric(a[costIdx]) - extractNumeric(b[costIdx]));
  } else if (sortBy === 'cost_desc' && costIdx >= 0) {
    sortedRows.sort((a, b) => extractNumeric(b[costIdx]) - extractNumeric(a[costIdx]));
  }

  return (
    <div>
      <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="rating">Sort: Best Reviewed (Google Rating)</option>
        <option value="cost_asc">Sort: Cost Low → High</option>
        <option value="cost_desc">Sort: Cost High → Low</option>
      </select>
      <table>
        <thead><tr>{table.header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {sortedRows.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <button className="download-btn" onClick={() => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${destination}_restaurants.md`; a.click();
      }}>💾 Download Restaurants</button>
    </div>
  );
}

export default App;
