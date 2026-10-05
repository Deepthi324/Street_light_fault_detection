import { useState, useEffect, useCallback } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function MaintenanceTasks({ onBack, user }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingActivity, setEditingActivity] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: "", notes: "" });

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/maintenance-activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      // Filter for active/pending tasks assigned to this user's team
      const filtered = (Array.isArray(data) ? data : []).filter(a =>
        Number(a.team_id) === Number(user.maintenance_team_id) &&
        (a.status || "").toLowerCase() !== 'completed'
      );
      setActivities(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.maintenance_team_id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = AuthService.getToken();
      const activityId = editingActivity.activity_id || editingActivity.id;
      const res = await fetch(`${API_BASE_URL}/maintenance-activity/${activityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: statusForm.status,
          notes: statusForm.notes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update status");
      }

      setEditingActivity(null);
      fetchActivities();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEdit = (activity) => {
    setEditingActivity(activity);
    setStatusForm({
      status: activity.status || "Pending",
      notes: activity.notes || ""
    });
  };

  const getStatusStyle = (status) => {
    switch ((status || "").toLowerCase()) {
      case 'completed': return { background: '#10b981', color: '#ffffff', fontWeight: '700' };
      case 'in progress': return { background: '#f59e0b', color: '#1a1a1a', fontWeight: '700' };
      case 'in_progress': return { background: '#f59e0b', color: '#1a1a1a', fontWeight: '700' };
      case 'scheduled': return { background: '#6366f1', color: '#ffffff', fontWeight: '700' };
      case 'pending': return { background: '#ef4444', color: '#ffffff', fontWeight: '700' };
      default: return { background: '#64748b', color: '#ffffff', fontWeight: '700' };
    }
  };

  const fmtDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  return (
    <div className="maintenance-container">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h2>📋 My Active Maintenance Tasks</h2>
      </div>

      {loading ? <p>Loading...</p> : error ? <div className="error-msg">{error}</div> : (
        <>


          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activity ID</th>
                  <th>Incident</th>
                  <th>Pole</th>
                  <th>Team Name</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Started</th>
                  <th>Completed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(activity => (
                  <tr key={activity.activity_id || activity.id}>
                    <td>#{activity.activity_id || activity.id}</td>
                    <td>{activity.issue || activity.incident_type || 'N/A'}</td>
                    <td>{activity.pole_label || 'P-???'}</td>
                    <td>{activity.team_name || 'Unassigned'}</td>
                    <td>
                      <span style={{
                        ...getStatusStyle(activity.status),
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        display: 'inline-block',
                        letterSpacing: '0.03em'
                      }}>
                        {activity.status || 'Pending'}
                      </span>
                    </td>
                    <td>{activity.notes || '—'}</td>
                    <td>{fmtDate(activity.start_time || activity.started_at)}</td>
                    <td>{fmtDate(activity.end_time || activity.completed_at)}</td>
                    <td>
                      {(user.role === 'maintenance' && Number(activity.team_id) === Number(user.maintenance_team_id)) ? (
                        <button onClick={() => openEdit(activity)} className="btn-sm btn-update">Update Status</button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Read Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingActivity && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Update Assignment Status</h3>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>Activity #{editingActivity.activity_id || editingActivity.id}</p>
            <form onSubmit={handleStatusUpdate}>
              <div className="form-group">
                <label>Status</label>
                <select
                  required
                  value={statusForm.status}
                  onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="form-control"
                >
                  <option value="Pending">Pending</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Work Log / Notes</label>
                <textarea
                  value={statusForm.notes}
                  onChange={e => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="Enter details about the work performed..."
                  className="form-control"
                  style={{ height: '100px', resize: 'vertical' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingActivity(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* Dark Professional System Theme - Matching Incidents Management */
        #root .maintenance-container { 
          background: #0f172a !important; 
          padding: 32px !important; 
          min-height: 100vh !important;
          font-family: 'Inter', -apple-system, system-ui, sans-serif !important;
          color: #f1f5f9 !important;
          display: block !important;
          visibility: visible !important;
        }

        #root .maintenance-container .module-header {
          display: flex !important;
          align-items: center !important;
          gap: 20px !important;
          margin-bottom: 30px !important;
          padding-bottom: 20px !important;
          border-bottom: 1px solid #1e293b !important;
          background: transparent !important;
        }

        #root .maintenance-container .module-header h2 {
          color: #ffffff !important;
          font-weight: 700 !important;
          margin: 0 !important;
          font-size: 1.6rem !important;
        }

        #root .maintenance-container .back-btn { 
          background: #2563eb !important; 
          color: #ffffff !important; 
          border: none !important; 
          padding: 8px 18px !important; 
          border-radius: 6px !important; 
          font-weight: 600 !important; 
          cursor: pointer !important;
          transition: background 0.2s !important;
        }
        #root .maintenance-container .back-btn:hover { background: #1d4ed8 !important; }
        
        #root .maintenance-container .activity-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 32px; }
        #root .maintenance-container .summary-card { 
          background: #1e293b !important; 
          padding: 24px !important; 
          border-radius: 10px !important; 
          border: 1px solid #334155 !important; 
          text-align: left !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
        }
        #root .maintenance-container .summary-card h4 { margin: 0 !important; color: #94a3b8 !important; font-size: 0.85rem !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
        #root .maintenance-container .summary-value { margin: 10px 0 0 !important; font-size: 2.2rem !important; font-weight: 800 !important; color: #ffffff !important; }

        #root .maintenance-container .table-container { 
          background: #1e293b !important; 
          border-radius: 10px !important; 
          border: 1px solid #334155 !important;
          overflow: hidden !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
          margin-top: 24px !important;
        }
        
        #root .maintenance-container .data-table { 
          width: 100% !important; 
          border-collapse: collapse !important; 
          background: #1e293b !important;
          color: #f1f5f9 !important;
        }
        
        #root .maintenance-container .data-table thead tr { background: #0f172a !important; }
        #root .maintenance-container .data-table th { 
          color: #94a3b8 !important; 
          font-weight: 600 !important; 
          text-align: left !important;
          padding: 16px 20px !important;
          font-size: 0.85rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-bottom: 1px solid #334155 !important;
        }

        /* DARK THEME VISIBILITY FOR ROWS */
        #root .maintenance-container .data-table tbody tr,
        #root .maintenance-container .data-table tbody tr td { 
          background-color: #1e293b !important; 
          background: #1e293b !important;
          color: #f1f5f9 !important;
          opacity: 1 !important;
        }
        #root .maintenance-container .data-table tbody tr:nth-child(even),
        #root .maintenance-container .data-table tbody tr:nth-child(even) td { 
          background-color: #1a2233 !important; 
          background: #1a2233 !important; 
        }
        #root .maintenance-container .data-table tbody tr:hover td { 
          background-color: #2d3748 !important; 
          background: #2d3748 !important; 
        }

        #root .maintenance-container .data-table td { 
          padding: 16px 20px !important;
          border-bottom: 1px solid #334155 !important;
          font-size: 0.95rem !important;
          font-weight: 500 !important;
        }
        
        #root .maintenance-container .activity-notes { color: #cbd5e1 !important; font-weight: 400 !important; font-size: 0.9rem !important; }
        #root .maintenance-container .data-table td:first-child { color: #60a5fa !important; font-weight: 700 !important; }
        
        #root .maintenance-container .btn-update { 
          background: #3b82f6 !important; 
          color: #ffffff !important; 
          border: none !important; 
          padding: 8px 16px !important; 
          border-radius: 6px !important; 
          cursor: pointer !important; 
          font-weight: 600 !important;
          transition: background 0.2s !important;
          font-size: 0.85rem !important;
        }
        #root .maintenance-container .btn-update:hover { background: #2563eb !important; }
        
        #root .maintenance-container .status-badge { 
          padding: 6px 14px !important; 
          border-radius: 50px !important; 
          font-size: 0.75rem !important; 
          font-weight: 700 !important; 
          display: inline-block !important; 
          text-transform: uppercase !important;
          color: #ffffff !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
        }
        #root .maintenance-container .status-active { background: #10b981 !important; } /* Vibrant Green */
        #root .maintenance-container .status-maintenance { background: #f59e0b !important; } /* Vibrant Orange */
        #root .maintenance-container .status-pending { background: #ef4444 !important; } /* Vibrant Red */
        #root .maintenance-container .status-unknown { background: #64748b !important; }

        /* Dark Modal */
        #root .maintenance-container .modal-overlay { 
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
          background: rgba(0, 0, 0, 0.8) !important; 
          backdrop-filter: blur(8px) !important;
          display: flex; justify-content: center; align-items: center; z-index: 1000; 
        }
        #root .maintenance-container .modal-content { 
          background: #1e293b !important; 
          padding: 32px !important; 
          border-radius: 12px !important; 
          width: 100%; max-width: 480px !important; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important; 
          border: 1px solid #334155 !important;
          color: #ffffff !important;
        }
        #root .maintenance-container .modal-content h3 { margin: 0 0 16px 0 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 1.5rem !important; }
        
        #root .maintenance-container .form-group label { display: block !important; margin-bottom: 8px !important; font-weight: 600 !important; color: #cbd5e1 !important; font-size: 0.9rem !important; }
        #root .maintenance-container .form-control { 
          width: 100% !important; 
          padding: 12px !important; 
          border: 1px solid #334155 !important; 
          border-radius: 8px !important; 
          font-size: 1rem !important; 
          background: #0f172a !important; 
          color: #ffffff !important; 
        }
        #root .maintenance-container .form-control:focus { border-color: #3b82f6 !important; outline: none !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important; }
        
        #root .maintenance-container .btn-primary { background: #3b82f6 !important; color: #ffffff !important; border: none !important; padding: 12px 24px !important; border-radius: 8px !important; cursor: pointer !important; font-weight: 600 !important; }
        #root .maintenance-container .btn-secondary { background: transparent !important; color: #94a3b8 !important; border: 1px solid #334155 !important; padding: 12px 24px !important; border-radius: 8px !important; cursor: pointer !important; }
        #root .maintenance-container .btn-secondary:hover { background: #334155 !important; color: #ffffff !important; }
      `}</style>
    </div>
  );
};

export default MaintenanceTasks;
