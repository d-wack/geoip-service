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
  const [progress, setProgress] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleSingleLookup = async () => {
    if (!ipInput) return;
    setLoading(true);
    setError(null);
    setProgress('Looking up IP...');
    try {
      const response = await axios.get(`/api/lookup/${ipInput}`);
      setLocations([response.data]);
      setProgress('');
    } catch (err) {
      const errorMsg = err.response
        ? `Server Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`
        : `Network/Client Error: ${err.message}`;
      setError(errorMsg);
      setProgress('');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkLookup = async () => {
    if (!bulkInput) return;
    setLoading(true);
    setError(null);
    setShowBulkModal(false);
    try {
      // Split by newlines or commas and clean up
      const ips = bulkInput.split(/[\n,]+/).map(ip => ip.trim()).filter(ip => ip);

      if (ips.length > 100) {
        setError(`Too many IPs. Maximum 100 allowed. You entered ${ips.length}.`);
        setLoading(false);
        return;
      }

      setProgress(`Processing ${ips.length} IPs...`);
      const response = await axios.post('/api/lookup/bulk', { ips });
      // Filter out failed lookups (where data is null or missing ll)
      const validLocations = response.data.filter(item => item.ll);
      setLocations(validLocations);
      setProgress('');
    } catch (err) {
      const errorMsg = err.response
        ? `Server Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`
        : `Network/Client Error: ${err.message}`;
      setError(errorMsg);
      setProgress('');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress('Uploading and processing CSV...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/lookup/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const validLocations = response.data.filter(item => item.ll);
      setLocations(validLocations);
      setProgress('');
    } catch (err) {
      const errorMsg = err.response
        ? `Server Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`
        : `Network/Client Error: ${err.message}`;
      setError(errorMsg);
      setProgress('');
      console.error(err);
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleExportCSV = () => {
    if (locations.length === 0) {
      setError('No data to export');
      return;
    }

    const csvLines = ['IP,City,Country,Region,Latitude,Longitude,Timezone'];
    locations.forEach(loc => {
      csvLines.push(
        `${loc.ip},${loc.city || ''},${loc.country || ''},${loc.region || ''},${loc.ll[0]},${loc.ll[1]},${loc.timezone || ''}`
      );
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geoip-results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setIpInput('');
    setBulkInput('');
    setLocations([]);
    setError(null);
    setProgress('');
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
          <button onClick={() => setShowBulkModal(true)} disabled={loading}>
            Bulk Lookup
          </button>
        </div>

        <div className="control-group">
          <h2>CSV Upload</h2>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="file-input"
          />
        </div>

        {progress && <div className="progress">{progress}</div>}
        {error && <div className="error">{error}</div>}

        <button onClick={handleClear} className="clear-btn">
          Clear All
        </button>

        {locations.length > 0 && (
          <button onClick={handleExportCSV} className="export-btn">
            Export CSV ({locations.length})
          </button>
        )}
      </div>

      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Bulk IP Lookup</h2>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="Enter IPs (one per line or comma separated, max 100)"
              rows="15"
              className="bulk-textarea"
            />
            <div className="modal-actions">
              <button onClick={handleBulkLookup} disabled={loading}>
                Process IPs
              </button>
              <button onClick={() => setShowBulkModal(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="map-container">
        <MapComponent locations={locations} />
      </div>
    </div>
  );
}

export default App;
