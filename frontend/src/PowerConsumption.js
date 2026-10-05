import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function PowerConsumption({ onBack }) {
  const [poles, setPoles] = useState([]);
  const [consumptionRecords, setConsumptionRecords] = useState([]);
  const [liveReadings, setLiveReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [totals, setTotals] = useState({
    totalDaily: 0,
    totalMonthly: 0,
    totalCost: 0,
    activePoles: 0,
    totalPoles: 0
  });

  useEffect(() => {
    loadData();

    // Live MongoDB Stream
    const fetchLivePower = async () => {
      try {
        const token = AuthService.getToken();
        const res = await fetch(`${API_BASE_URL}/power-readings/live`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLiveReadings(data);
        }
      } catch (e) {
        console.error("Live power fetch failed", e);
      }
    };

    fetchLivePower();
    const interval = setInterval(fetchLivePower, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [polesRes, consRes] = await Promise.all([
        fetch(`${API_BASE_URL}/light-poles`, { headers }),
        fetch(`${API_BASE_URL}/power-consumption`, { headers })
      ]);

      if (!polesRes.ok || !consRes.ok) throw new Error("Failed to load power data");

      const polesData = await polesRes.json();
      const consData = await consRes.json();

      let consList = [];
      if (Array.isArray(consData)) {
        consList = consData;
      } else if (consData && Array.isArray(consData.data)) {
        consList = consData.data;
      } else if (consData && Array.isArray(consData.power_consumption)) {
        consList = consData.power_consumption;
      } else {
        console.warn("Unexpected consData structure:", consData);
      }

      let polesList = [];
      if (Array.isArray(polesData)) {
        polesList = polesData;
      } else if (polesData && Array.isArray(polesData.data)) {
        polesList = polesData.data;
      }

      setPoles(polesList);
      setConsumptionRecords(consList);

      // Calculate totals
      const daily = consList.reduce((sum, r) => sum + Number(r.quantity || r.kwh || 0), 0);
      const cost = consList.reduce((sum, r) => {
        const rowKwh = Number(r.quantity || r.kwh || 0);
        const rowCost = r.cost ? Number(r.cost) : (rowKwh * 0.12);
        return sum + rowCost;
      }, 0);
      const active = polesList.filter(p => (p.status || "").toLowerCase() === 'active').length;

      setTotals({
        totalDaily: daily.toFixed(1),
        totalMonthly: (daily * 30).toFixed(1), // Estimated
        totalCost: cost.toFixed(2),
        activePoles: active,
        totalPoles: polesList.length
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case 'active': case 'working': return 'status-active';
      case 'high': return 'status-maintenance';
      case 'faulty': return 'status-faulty';
      default: return 'status-unknown';
    }
  };

  return (
    <div className="module">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back to Dashboard</button>
        <h2>⚡ Power Consumption</h2>
      </div>

      {loading ? <p>Loading data...</p> : error ? <p className="error">{error}</p> : (
        <>
          <div className="consumption-summary">
            <div className="summary-card">
              <h4>Daily Consumption</h4>
              <p className="summary-value">{totals.totalDaily} kWh</p>
            </div>
            <div className="summary-card">
              <h4>Estimated Monthly</h4>
              <p className="summary-value">{totals.totalMonthly} kWh</p>
            </div>
            <div className="summary-card">
              <h4>Total Cost</h4>
              <p className="summary-value">${totals.totalCost}</p>
            </div>
            <div className="summary-card">
              <h4>Grid Efficiency</h4>
              <p className="summary-value">{totals.totalPoles > 0 ? Math.round((totals.activePoles / totals.totalPoles) * 100) : 0}%</p>
            </div>
          </div>

          <div className="table-container">
            <div style={{ padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#94a3b8' }}>📊 Historical Data Logs</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pole ID</th>
                  <th>Area / Location</th>
                  <th>Consumption (kWh)</th>
                  <th>Cost ($)</th>
                  <th>Reading Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {consumptionRecords.map((item, idx) => {
                  const pole = poles.find(p => p.pole_id === item.pole_id || p.id === item.light_pole_id);
                  return (
                    <tr key={item.id || idx}>
                      <td>#{item.pole_id || item.light_pole_id}</td>
                      <td>{pole ? (pole.area || pole.location) : 'N/A'}</td>
                      <td>{item.quantity || item.kwh || '0'}</td>
                      <td>${item.cost || (Number(item.kwh || 0) * 0.12).toFixed(2)}</td>
                      <td>{item.record_date ? new Date(item.record_date).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(pole ? pole.status : item.status)}`}>
                          {pole ? pole.status : item.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* New Live Section */}
          <div className="table-container" style={{ marginTop: '40px' }}>
            <div style={{ padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="live-dot-mini"></span> 📡 Real-time Grid Monitoring
              </h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pole ID</th>
                  <th>Current Load</th>
                  <th>Measurement</th>
                  <th>Status</th>
                  <th>Est. Cost/Hr</th>
                  <th>Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {liveReadings.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Waiting for live power stream...</td></tr>
                ) : (
                  // Group by pole_id and show only the latest reading for each
                  Object.values(liveReadings.reduce((acc, reading) => {
                    if (!acc[reading.pole_id]) acc[reading.pole_id] = reading;
                    return acc;
                  }, {})).map(reading => (
                    <tr key={reading._id}>
                      <td><strong>#{reading.pole_id}</strong></td>
                      <td><span style={{ color: reading.status === 'Critical' ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{reading.value} Watts</span></td>
                      <td>{reading.unit}</td>
                      <td>
                        <span className={`status-badge ${reading.status === 'Critical' ? 'status-faulty' : 'status-active'}`}>
                          {reading.status}
                        </span>
                      </td>
                      <td>${(reading.value * 0.00012).toFixed(4)}</td>
                      <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{new Date(reading.recorded_at).toLocaleTimeString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        .error { color: #ef4444; text-align: center; padding: 20px; }
        .live-dot-mini {
          width: 8px;
          height: 8px;
          background-color: #ef4444;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}

export default PowerConsumption;
