import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function SensorReading({ onBack }) {
  const [readings, setReadings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isFirstLoad = true;

    const fetchLiveReadings = async () => {
      try {
        if (isFirstLoad) setLoading(true);
        const token = AuthService.getToken();
        const res = await fetch(`${API_BASE_URL}/sensor-readings/live`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReadings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to poll live readings", err);
        setError(err.message);
      } finally {
        if (isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };

    const fetchDeviceCount = async () => {
      try {
        const token = AuthService.getToken();
        const res = await fetch(`${API_BASE_URL}/sensor-devices`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDevices(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Failed to fetch devices", e);
      }
    };

    const fetchAnalytics = async () => {
      try {
        const token = AuthService.getToken();
        const res = await fetch(`${API_BASE_URL}/sensor-readings/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (e) {
        console.error("Failed to fetch MongoDB analytics", e);
      }
    };

    fetchLiveReadings();
    fetchDeviceCount();
    fetchAnalytics();
    const interval = setInterval(fetchLiveReadings, 3000);
    const analyticsInterval = setInterval(fetchAnalytics, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(analyticsInterval);
    };
  }, []);

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case 'normal': return 'status-active';
      case 'warning': return 'status-maintenance';
      case 'critical': return 'status-faulty';
      default: return 'status-unknown';
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString();
  };

  return (
    <div className="module">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back to Dashboard</button>
        <h2>📡 Live Network Streams</h2>
      </div>

      <div className="live-indicator">
        <span className="live-dot"></span>
        <span>Live Data Stream {devices.length > 0 ? `(${devices.length} devices connected)` : ''}</span>
      </div>

      {/* MONGODB AGGREGATION ANALYTICS */}
      {analytics && (
        <div className="mongo-analytics-dashboard">
          <div className="analytics-header-row">
            <div className="analytics-title-group">
              <div className="analytics-icon">📊</div>
              <div>
                <h3 className="mongo-title">Real-time Performance Analysis</h3>
                <p className="mongo-subtitle">Continuous system processing (Last 24 Hours)</p>
              </div>
            </div>
            <div className="pipeline-badge">
              <span className="pipeline-dot"></span>
              PIPELINE ACTIVE
            </div>
          </div>

          <div className="analytics-grid">
            {analytics.data.map((stat, idx) => (
              <div key={idx} className="analytics-tile">
                <div className="tile-top">
                  <span className="sensor-type-tag">{stat.type}</span>
                  <span className="reading-count">{stat.totalReadings} Samples</span>
                </div>
                <div className="tile-value-row">
                  <div className="value-item">
                    <label>Average</label>
                    <span className="main-val">{stat.average}</span>
                  </div>
                  <div className="value-item">
                    <label>Peak</label>
                    <span className="peak-val">{stat.maximum}</span>
                  </div>
                </div>
                <div className="tile-footer">
                  <div className="range-bar">
                    <div className="range-fill" style={{ width: '100%' }}></div>
                    <span className="min-val">Min: {stat.minimum}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="dbms-explanation">
            <strong>System Logic:</strong> 4-stage data processing pipeline: 
            <code>$match</code> ➔ <code>$group</code> ➔ <code>$project</code> ➔ <code>$sort</code>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? <p style={{ textAlign: 'center', padding: '40px' }}>Connecting to Live Stream...</p> : error ? <p className="error">{error}</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pole ID</th>
                <th>Sensor Type</th>
                <th>Value</th>
                <th>Measurement Unit</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Waiting for data stream...</td></tr>
              ) : readings.map(reading => (
                <tr key={reading._id} className={reading.status === "Critical" ? "critical-row" : ""}>
                  <td>#{reading.pole_id}</td>
                  <td>{reading.sensor_type}</td>
                  <td>{reading.value}</td>
                  <td>{reading.unit}</td>
                  <td>
                    <span className={`status-badge ${getStatusColor(reading.status)}`}>
                      {reading.status}
                    </span>
                  </td>
                  <td>{formatTimestamp(reading.recorded_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .error { color: #ef4444; text-align: center; padding: 20px; }
        
        .mongo-analytics-dashboard { 
          background: #1e293b; 
          border-radius: 16px; 
          padding: 24px; 
          margin-bottom: 30px; 
          border: 1px solid #334155;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        }
        
        .analytics-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .analytics-title-group { display: flex; gap: 15px; align-items: center; }
        .mongo-logo { font-size: 1.8rem; background: #064e3b; padding: 8px; border-radius: 10px; border: 1px solid #065f46; }
        .mongo-title { margin: 0; color: #f1f5f9; font-size: 1.1rem; font-weight: 800; }
        .mongo-subtitle { margin: 2px 0 0 0; color: #94a3b8; font-size: 0.8rem; }
        
        .pipeline-badge { background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; border: 1px solid rgba(59, 130, 246, 0.2); display: flex; align-items: center; gap: 6px; }
        .pipeline-dot { width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6; }
        
        .analytics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .analytics-tile { background: #0f172a; padding: 18px; border-radius: 12px; border: 1px solid #334155; transition: transform 0.2s; }
        .analytics-tile:hover { transform: translateY(-3px); border-color: #3b82f6; }
        
        .tile-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .sensor-type-tag { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #34d399; background: #064e3b; padding: 2px 8px; border-radius: 4px; }
        .reading-count { font-size: 10px; color: #475569; font-weight: 700; }
        
        .tile-value-row { display: flex; gap: 20px; margin-bottom: 15px; }
        .value-item { display: flex; flex-direction: column; }
        .value-item label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
        .main-val { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; }
        .peak-val { font-size: 1rem; font-weight: 700; color: #f59e0b; }
        
        .tile-footer { border-top: 1px solid #1e293b; padding-top: 10px; }
        .range-bar { height: 4px; background: #1e293b; border-radius: 2px; position: relative; margin-bottom: 15px; }
        .range-fill { height: 100%; background: #334155; border-radius: 2px; }
        .min-val { position: absolute; top: 8px; right: 0; font-size: 9px; color: #475569; font-weight: 700; }
        
        .dbms-explanation { font-size: 10px; color: #64748b; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px dashed #334155; }
        .dbms-explanation code { color: #3b82f6; }
      `}</style>
    </div>
  );
}

export default SensorReading;
