import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function MaintenanceTeam({ onBack }) {
  const [teams, setTeams] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    area: "",
    contact: ""
  });

  useEffect(() => {
    fetchTeams();
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      console.log("[DEBUG] Fetching Performance Data...");
      const res = await fetch(`${API_BASE_URL}/maintenance-teams/performance`);
      if (res.ok) {
        const data = await res.json();
        console.log("[DEBUG] Received Performance Data:", data);
        setPerformance(Array.isArray(data) ? data : []);
      } else {
        console.error("[DEBUG] Performance Fetch Failed Status:", res.status);
      }
    } catch (err) {
      console.warn("Failed to load performance report:", err);
    }
  };

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/maintenance-teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load maintenance teams");
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (team = null) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name || "",
        area: team.area || "",
        contact: team.contact || ""
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: "",
        area: "",
        contact: ""
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = AuthService.getToken();
      const url = editingTeam ? `${API_BASE_URL}/maintenance-teams/${editingTeam.id}` : `${API_BASE_URL}/maintenance-teams`;
      const method = editingTeam ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Operation failed");
      }

      setShowModal(false);
      fetchTeams();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/maintenance-teams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete team");
      fetchTeams();
    } catch (err) {
      alert(err.message);
    }
  };

  const getAvailabilityColor = (availability) => {
    switch ((availability || "").toLowerCase()) {
      case 'available': return 'status-active';
      case 'busy': return 'status-maintenance';
      default: return 'status-active'; // Default to available
    }
  };

  return (
    <div className="module">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>👨‍🔧 Maintenance Teams</h2>
          <button className="btn-primary" onClick={() => handleOpenModal()}>+ Add New Team</button>
        </div>
      </div>

      {loading ? <p>Loading teams...</p> : error ? <p className="error">{error}</p> : (
        <>
          <div className="team-summary">
            <div className="summary-card">
              <h4>Total Teams</h4>
              <p className="summary-value">{teams.length}</p>
            </div>
            <div className="summary-card">
              <h4>Available Teams</h4>
              <p className="summary-value">{teams.filter(t => (t.status || 'Available').toLowerCase() === 'available').length}</p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Team Name</th>
                  <th>Contact Information</th>
                  <th>Assigned Area</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(team => (
                  <tr key={team.id}>
                    <td>#{team.id}</td>
                    <td><strong>{team.name}</strong></td>
                    <td>{team.contact || 'No contact info'}</td>
                    <td><span className="tag">{team.area || 'General'}</span></td>
                    <td>
                      <span className={`status-badge ${getAvailabilityColor(team.status || 'Available')}`}>
                        {team.status || 'Available'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => handleOpenModal(team)} className="btn-sm btn-edit">Edit</button>
                        <button onClick={() => handleDelete(team.id)} className="btn-sm btn-danger">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DBMS FEATURE: STORED PROCEDURE REPORT */}
          <div className="performance-analytics-container">
            <div className="analytics-header">
              <div className="analytics-title-group">
                <div className="analytics-icon-box">📊</div>
                <div>
                  <h3 className="analytics-title">Team Performance Insights</h3>
                  <p className="analytics-subtitle">Real-time stats calculated via MySQL Stored Procedures</p>
                </div>
              </div>
              <div className="dbms-badge">
                <span className="pulse-dot"></span>
                DBMS ACTIVE
              </div>
            </div>

            {performance.length === 0 ? (
              <div className="no-data-premium">
                <div className="no-data-icon">📋</div>
                <p>No performance records found in the database yet.</p>
                <span>Team statistics will appear here as maintenance tasks are completed.</span>
              </div>
            ) : (
              <div className="performance-grid">
                {performance.map((p, index) => {
                  const efficiency = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
                  const efficiencyColor = efficiency > 80 ? '#10b981' : efficiency > 50 ? '#f59e0b' : '#ef4444';
                  
                  return (
                    <div key={p.id} className="performance-card" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="card-top">
                        <div className="team-info">
                          <span className="team-id-pill">#{p.id}</span>
                          <h4 className="team-name-text">{p.name}</h4>
                        </div>
                        <div className="efficiency-gauge" style={{ borderColor: efficiencyColor }}>
                          <span className="efficiency-value" style={{ color: efficiencyColor }}>{efficiency}%</span>
                          <span className="efficiency-label">Eff.</span>
                        </div>
                      </div>

                      <div className="stats-row">
                        <div className="stat-item">
                          <span className="stat-label">Total</span>
                          <span className="stat-number">{p.total_tasks}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Done</span>
                          <span className="stat-number text-green">{p.completed_tasks}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Active</span>
                          <span className="stat-number text-orange">{p.active_tasks}</span>
                        </div>
                      </div>

                      <div className="card-footer">
                        <div className="mini-progress-track">
                          <div 
                            className="mini-progress-fill" 
                            style={{ 
                              width: `${efficiency}%`, 
                              background: efficiencyColor,
                              boxShadow: `0 0 10px ${efficiencyColor}44`
                            }}
                          ></div>
                        </div>
                        <div className="footer-meta">
                          <span>Stored Proc: sp_GetTeamPerformance</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingTeam ? 'Edit Team' : 'Add New Team'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Team Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="form-control"
                  placeholder="e.g. North Maintenance Alpha"
                />
              </div>
              <div className="form-group">
                <label>Assigned Area</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={e => setFormData({ ...formData, area: e.target.value })}
                  className="form-control"
                  placeholder="e.g. North Zone"
                />
              </div>
              <div className="form-group">
                <label>Contact Info</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  className="form-control"
                  placeholder="e.g. +1 234 567 890"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTeam ? 'Update Team' : 'Create Team'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .team-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
        .summary-card h4 { margin: 0; color: #1e293b !important; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        .summary-value { margin: 10px 0 0; font-size: 1.5rem; font-weight: 800; color: #2563eb !important; }
        
        .tag { background: #f1f5f9; color: #0f172a !important; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; border: 1px solid #cbd5e1; display: inline-block; }
        .error { color: #ef4444; text-align: center; padding: 20px; border: 1px solid #fee2e2; background: #fef2f2; border-radius: 6px; }
        
        .btn-sm { padding: 4px 10px; font-size: 11px; border: none; cursor: pointer; border-radius: 4px; color: white; display: inline-flex; align-items: center; font-weight: 500; }
        .btn-danger { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .btn-danger:hover { background: #fcdada; }
        .btn-edit { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
        .btn-edit:hover { background: #d0d7fe; }
        
        .btn-primary { background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
        .btn-secondary { background: #f1f5f9; color: #0f172a !important; border: 1px solid #cbd5e1; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 700; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: white !important; padding: 24px; border-radius: 12px; width: 100%; max-width: 450px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
        .modal-content h3 { margin-top: 0; margin-bottom: 20px; color: #0f172a !important; font-weight: 800; font-size: 1.25rem; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 700; color: #1e293b !important; font-size: 1rem; }
        .form-control { width: 100%; padding: 12px; border: 1px solid #94a3b8; border-radius: 6px; font-size: 1rem; color: #0f172a !important; background: #f8fafc !important; }
        .form-control::placeholder { color: #64748b !important; opacity: 1; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }

        .performance-analytics-container { 
          margin-top: 50px; 
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
          padding: 30px; 
          border-radius: 20px; 
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        
        .analytics-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          margin-bottom: 30px; 
        }
        
        .analytics-title-group { display: flex; gap: 15px; align-items: center; }
        .analytics-icon-box { 
          width: 50px; height: 50px; 
          background: rgba(59, 130, 246, 0.1); 
          border-radius: 12px; 
          display: flex; justify-content: center; align-items: center; 
          font-size: 24px;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .analytics-title { color: #f8fafc !important; font-size: 1.5rem; font-weight: 800; margin: 0; letter-spacing: -0.025em; }
        .analytics-subtitle { color: #94a3b8 !important; font-size: 0.9rem; margin: 4px 0 0 0; }
        
        .dbms-badge { 
          background: rgba(16, 185, 129, 0.1); 
          color: #10b981; 
          padding: 6px 12px; 
          border-radius: 20px; 
          font-size: 11px; 
          font-weight: 800; 
          border: 1px solid rgba(16, 185, 129, 0.2);
          display: flex; align-items: center; gap: 8px;
        }
        
        .pulse-dot { 
          width: 8px; height: 8px; background: #10b981; border-radius: 50%; 
          animation: pulse 2s infinite; 
        }
        
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .performance-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
          gap: 20px; 
        }
        
        .performance-card {
          background: rgba(30, 41, 59, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 20px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          animation: fadeInUp 0.5s ease-out forwards;
          opacity: 0;
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .performance-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3);
          border-color: rgba(59, 130, 246, 0.3);
        }
        
        .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .team-id-pill { background: #0f172a; color: #64748b; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
        .team-name-text { color: #f1f5f9 !important; margin: 5px 0 0 0; font-size: 1.1rem; font-weight: 700; }
        
        .efficiency-gauge {
          width: 50px; height: 50px; border: 3px solid; border-radius: 50%;
          display: flex; flex-direction: column; justify-content: center; align-items: center;
          background: rgba(0,0,0,0.2);
        }
        .efficiency-value { font-size: 12px; font-weight: 800; }
        .efficiency-label { font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
        
        .stats-row { display: flex; justify-content: space-between; margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 12px; }
        .stat-item { display: flex; flex-direction: column; align-items: center; }
        .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
        .stat-number { font-size: 1.25rem; font-weight: 800; color: #f1f5f9 !important; }
        
        .text-green { color: #10b981 !important; }
        .text-orange { color: #f59e0b !important; }
        
        .mini-progress-track { height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
        .mini-progress-fill { height: 100%; border-radius: 3px; transition: width 1s ease-out; }
        
        .footer-meta { font-size: 10px; color: #475569; text-align: right; font-family: monospace; }
        
        .no-data-premium {
          text-align: center; padding: 60px 20px; color: #94a3b8;
          border: 2px dashed rgba(255,255,255,0.05); border-radius: 20px;
        }
        .no-data-icon { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
        .no-data-premium p { font-weight: 700; color: #f1f5f9 !important; margin-bottom: 5px; }
        .no-data-premium span { font-size: 0.85rem; }
      `}</style>
    </div>
  );
}

export default MaintenanceTeam;
