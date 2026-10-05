import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function Incident({ user, onBack }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // Assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [teams, setTeams] = useState([]);
  const [assignForm, setAssignForm] = useState({ team_id: "", notes: "" });

  useEffect(() => {
    loadIncidents();
    if (user.role === 'authority') {
      loadTeams();
    }
  }, [user.role]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      // Depending on backend, might be under 'data' property
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        // Handle if data is array or wrapped in { data: [...] }
        setIncidents(Array.isArray(data) ? data : (data.data || []));
      } else {
        setError(data.message || "Failed to load incidents");
      }
    } catch (err) {
      setError("Network error loading incidents");
      console.error("Error loading incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/maintenance-teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load teams", e);
    }
  };

  const handleAssignClick = (incident) => {
    setSelectedIncident(incident);
    setAssignForm({ team_id: incident.team_id || "", notes: "" });
    setShowAssignModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete incident #${id}? This cannot be undone.`)) return;
    try {
      const token = AuthService.getToken();
      await fetch(`${API_BASE_URL}/incidents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      loadIncidents();
    } catch (err) {
      alert("Failed to delete incident");
    }
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    try {
      const token = AuthService.getToken();

      // Calling the NEW stored procedure endpoint for a single atomic transaction
      const response = await fetch(`${API_BASE_URL}/incidents/${selectedIncident.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          team_id: Number(assignForm.team_id),
          notes: assignForm.notes
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to assign team via DBMS Stored Procedure");
      }

      alert("Team assigned successfully via DBMS Stored Procedure! 🚀");
      setShowAssignModal(false);
      loadIncidents();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (filter === "all") return true;
    if (filter === "resolved") return (incident.status || "").toLowerCase() === "resolved";
    if (filter === "open") return (incident.status || "").toLowerCase() !== "resolved";
    return (incident.status || "").toLowerCase() === filter.toLowerCase();
  });

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case 'open': return 'status-faulty';
      case 'in progress': return 'status-maintenance';
      case 'resolved': return 'status-active';
      default: return 'status-unknown';
    }
  };

  const getPriorityColor = (priority) => {
    switch ((priority || "").toLowerCase()) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  return (
    <div className="module">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h2>⚠️ Assigned Incident Logs {user.role === 'maintenance' ? '(All Teams)' : ''}</h2>
      </div>

      {loading ? (
        <div className="loading">Loading incidents...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : user.role === 'citizen' ? (
        // CITIZEN VIEW (Read Only)
        <>
          <div className="citizen-incident-filters">
            <button className={`citizen-filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
            <button className={`citizen-filter-btn ${filter === "resolved" ? "active" : ""}`} onClick={() => setFilter("resolved")}>Resolved</button>
            <button className={`citizen-filter-btn ${filter === "open" ? "active" : ""}`} onClick={() => setFilter("open")}>Pending</button>
          </div>
          <div className="citizen-incidents-grid">
            {filteredIncidents.length === 0 ? <p className="no-data">No incidents found.</p> : (
              filteredIncidents.map(incident => (
                <div key={incident.id} className="citizen-incident-card" style={{ background: '#ffffff', color: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <div className="incident-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span className="incident-location" style={{ fontWeight: '700', color: '#1e293b' }}>📍 {incident.location || `Pole ${incident.light_pole_id}`}</span>
                    <span className={`incident-status-badge ${getStatusColor(incident.status)}`} style={{ padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '800', color: 'white', textTransform: 'uppercase' }}>{incident.status}</span>
                  </div>
                  <div className="incident-card-body">
                    <p style={{ margin: '8px 0', color: '#334155', fontSize: '1.1rem', fontWeight: '600' }}>{incident.type || incident.issue || "No description provided"}</p>
                    <small style={{ color: '#64748b', fontWeight: '500' }}>Reported: {
                      (incident.created_at || incident.reported_at || incident.reportedTime)
                        ? new Date(incident.created_at || incident.reported_at || incident.reportedTime).toLocaleDateString()
                        : "Recently"
                    }</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        // AUTHORITY/MAINTENANCE VIEW
        <>
          <div className="incident-controls">
            {/* Filters */}
            <div className="filter-buttons">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
              <button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Open</button>
              <button className={filter === "in progress" ? "active" : ""} onClick={() => setFilter("in progress")}>In Progress</button>
              <button className={filter === "resolved" ? "active" : ""} onClick={() => setFilter("resolved")}>Resolved</button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pole ID</th>
                  <th>Issue/Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported</th>
                  <th>Assignment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map(incident => (
                  <tr key={incident.id}>
                    <td>#{incident.id}</td>
                    <td>{incident.pole_label || incident.light_pole_id}</td>
                    <td>{incident.type || incident.issue}</td>
                    <td><span className={`priority-badge ${getPriorityColor(incident.priority)}`}>{incident.priority}</span></td>
                    <td><span className={`status-badge ${getStatusColor(incident.status)}`}>{incident.status}</span></td>
                    <td>{new Date(incident.created_at || incident.reported_at || incident.reportedTime || Date.now()).toLocaleDateString()}</td>
                    <td>
                      {incident.team_name || (incident.team_id ? `Team ${incident.team_id}` : 'Unassigned')}
                      {user.role === 'maintenance' && Number(incident.team_id) === Number(user.maintenance_team_id) && (
                        <span className="my-team-badge" style={{
                          marginLeft: '8px',
                          background: '#2563eb',
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: 'white',
                          fontWeight: 'bold',
                          verticalAlign: 'middle'
                        }}>MY TEAM</span>
                      )}
                    </td>
                    <td>
                      {user.role === 'authority' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleAssignClick(incident)} className="btn-sm btn-primary"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#2563eb', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
                            Change Team
                          </button>
                          <button onClick={() => handleDelete(incident.id)} className="btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#ef4444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
                            Delete
                          </button>
                        </div>
                      )}
                      {user.role === 'maintenance' && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>History Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Assignment Modal */}
          {showAssignModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Change Maintenance Team</h3>
                <p>Incident #{selectedIncident?.id}: {selectedIncident?.type || selectedIncident?.issue}</p>
                <form onSubmit={submitAssignment}>
                  <div className="form-group">
                    <label>Select Team</label>
                    <select required value={assignForm.team_id} onChange={e => setAssignForm({ ...assignForm, team_id: e.target.value })}>
                      <option value="">-- Select Team --</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.area})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} />
                  </div>
                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">Assign</button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </>
      )}
      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999; }
        .modal-content { background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #475569; color: white; width: 400px;}
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; color: #cbd5e1; }
        .form-group select, .form-group textarea { width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 4px;}
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;}

        /* CITIZEN VIEW VISIBILITY FIXES */
        .citizen-incidents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .citizen-incident-card {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          padding: 20px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          display: flex;
          flex-direction: column;
          color: #1e293b !important;
        }
        .incident-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding-bottom: 8px !important;
        }
        .incident-location {
          font-weight: 700 !important;
          color: #1e293b !important;
        }
        .citizen-incident-card .incident-card-body p {
          margin: 8px 0 !important;
          color: #334155 !important;
          font-size: 1.1rem !important;
          font-weight: 600 !important;
        }
        .citizen-incident-card .incident-card-body small {
          color: #64748b !important;
          font-weight: 500 !important;
        }
        .incident-status-badge {
          padding: 4px 12px !important;
          border-radius: 50px !important;
          font-size: 0.8rem !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          color: white !important;
        }
        .citizen-filter-btn {
          padding: 8px 24px !important;
          border-radius: 10px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          color: #475569 !important;
          cursor: pointer !important;
          font-weight: 600 !important;
          margin-right: 12px !important;
          transition: all 0.2s ease;
        }
        .citizen-filter-btn.active {
          background: #4f46e5 !important;
          color: #ffffff !important;
          border-color: #4f46e5 !important;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3) !important;
        }
        .status-faulty { background: #ef4444 !important; }
        .status-maintenance { background: #f59e0b !important; }
        .status-active { background: #10b981 !important; }
        .status-unknown { background: #94a3b8 !important; }
      `}</style>
    </div>
  );
}

export default Incident;
