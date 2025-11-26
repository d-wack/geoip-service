import React, { useState } from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent';
import './App.css';

function App() {
  const [ipInput, setIpInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSingleLookup = async () => {
    if (!ipInput) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/lookup/${ipInput}`);
      setLocations([response.data]);
    } catch (err) {
      const errorMsg = err.response
        ? `Server Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`
        : `Network/Client Error: ${err.message}`;
      setError(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkLookup = async () => {
    if (!bulkInput) return;
    setLoading(true);
    setError(null);
    try {
      // Split by newlines or commas and clean up
      const ips = bulkInput.split(/[\n,]+/).map(ip => ip.trim()).filter(ip => ip);
      const response = await axios.post('/api/lookup/bulk', { ips });
      // Filter out failed lookups (where data is null or missing ll)
      const validLocations = response.data.filter(item => item.ll);
      setLocations(validLocations);
    } catch (err) {
      const errorMsg = err.response
        ? `Server Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`
        : `Network/Client Error: ${err.message}`;
      setError(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h1>GeoIP Service</h1>

        <div className="control-group">
          <h2>Single Lookup</h2>
          <input
            type="text"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="Enter IP address"
            onKeyPress={(e) => e.key === 'Enter' && handleSingleLookup()}
          />
          <button onClick={handleSingleLookup} disabled={loading}>
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </div>

        <div className="control-group">
          <h2>Bulk Lookup</h2>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Enter IPs (one per line)"
          />
          <button onClick={handleBulkLookup} disabled={loading}>
            {loading ? 'Processing...' : 'Bulk Lookup'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
      </div>

      <div className="map-container">
        <MapComponent locations={locations} />
      </div>
    </div>
  );
}

export default App;
