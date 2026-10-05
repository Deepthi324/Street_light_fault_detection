import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function NotificationLog({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/notification-log`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/notification-log/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      fetchNotifications(); // Refresh
    } catch (err) {
      alert(err.message);
    }
  };

  const getTypeColor = (type) => {
    switch ((type || "").toLowerCase()) {
      case 'critical': case 'error': return 'type-critical';
      case 'warning': return 'type-warning';
      case 'success': return 'type-success';
      case 'info': return 'type-info';
      default: return 'type-info';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="module">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back to Dashboard</button>
        <h2>🔔 Notification Log</h2>
      </div>

      {loading ? <p>Loading notifications...</p> : error ? <p className="error">{error}</p> : (
        <>
          <div className="notification-summary">
            <div className="summary-card">
              <h4>Total</h4>
              <p className="summary-value">{notifications.length}</p>
            </div>
            <div className="summary-card">
              <h4>Unread</h4>
              <p className="summary-value unread-count">{unreadCount}</p>
            </div>
            <div className="summary-card">
              <h4>Critical</h4>
              <p className="summary-value critical-count">{notifications.filter(n => (n.type || "").toLowerCase() === "critical").length}</p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map(notification => (
                  <tr
                    key={notification.id}
                    className={!notification.is_read ? "unread-notification" : ""}
                  >
                    <td>#{notification.id}</td>
                    <td>
                      <span className={`type-badge ${getTypeColor(notification.type)}`}>
                        {notification.type || 'Info'}
                      </span>
                    </td>
                    <td className="message-cell">{notification.message}</td>
                    <td>
                      <span className={`priority-badge ${getPriorityColor(notification.priority)}`}>
                        {notification.priority || 'Medium'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${!notification.is_read ? "status-faulty" : "status-active"}`}>
                        {notification.is_read ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td>{new Date(notification.created_at).toLocaleString()}</td>
                    <td>
                      {!notification.is_read && (
                        <button
                          className="mark-read-btn"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark Read
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        /* Dark Professional System Theme - Matching management suite */
        #root .module { 
          background: #0f172a !important; 
          padding: 32px !important; 
          min-height: 100vh !important;
          font-family: 'Inter', -apple-system, system-ui, sans-serif !important;
          color: #f1f5f9 !important;
        }

        #root .module-header {
          display: flex !important;
          align-items: center !important;
          gap: 20px !important;
          margin-bottom: 30px !important;
          padding-bottom: 20px !important;
          border-bottom: 1px solid #1e293b !important;
          background: transparent !important;
        }

        #root .module-header h2 {
          color: #ffffff !important;
          font-weight: 700 !important;
          margin: 0 !important;
          font-size: 1.6rem !important;
        }

        #root .back-btn { 
          background: #2563eb !important; 
          color: #ffffff !important; 
          border: none !important; 
          padding: 8px 18px !important; 
          border-radius: 6px !important; 
          font-weight: 600 !important; 
          cursor: pointer !important;
          transition: background 0.2s !important;
        }
        #root .back-btn:hover { background: #1d4ed8 !important; }

        #root .notification-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 32px; }
        #root .summary-card { 
          background: #1e293b !important; 
          padding: 24px !important; 
          border-radius: 12px !important; 
          border: 1px solid #334155 !important; 
          text-align: left !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
        }
        #root .summary-card h4 { margin: 0 !important; color: #94a3b8 !important; font-size: 0.85rem !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
        #root .summary-value { margin: 10px 0 0 !important; font-size: 2.22rem !important; font-weight: 800 !important; color: #ffffff !important; }
        #root .unread-count { color: #3b82f6 !important; }
        #root .critical-count { color: #ef4444 !important; }

        #root .table-container { 
          background: #1e293b !important; 
          border-radius: 12px !important; 
          border: 1px solid #334155 !important;
          overflow: hidden !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
        }
        
        #root .data-table { 
          width: 100% !important; 
          border-collapse: collapse !important; 
          background: #1e293b !important;
          color: #f1f5f9 !important;
        }
        
        #root .data-table thead tr { background: #0f172a !important; }
        #root .data-table th { 
          color: #94a3b8 !important; 
          font-weight: 600 !important; 
          text-align: left !important;
          padding: 16px 20px !important;
          font-size: 0.85rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-bottom: 1px solid #334155 !important;
        }

        #root .data-table tbody tr { transition: background 0.2s !important; }
        #root .data-table tbody tr.unread-notification { 
          background-color: rgba(59, 130, 246, 0.08) !important; 
          border-left: 4px solid #3b82f6 !important;
        }
        #root .data-table tbody tr td { 
          background: transparent !important;
          color: #f1f5f9 !important;
          padding: 18px 20px !important;
          border-bottom: 1px solid #334155 !important;
          font-size: 0.95rem !important;
        }
        
        #root .message-cell { color: #cbd5e1 !important; font-weight: 500 !important; }
        #root .unread-notification .message-cell { color: #ffffff !important; font-weight: 600 !important; }

        #root .type-badge, #root .priority-badge, #root .status-badge { 
          padding: 6px 14px !important; 
          border-radius: 50px !important; 
          font-size: 0.7rem !important; 
          font-weight: 700 !important; 
          text-transform: uppercase !important;
          color: #ffffff !important;
        }

        #root .type-critical { background: #ef4444 !important; }
        #root .type-warning { background: #f59e0b !important; }
        #root .type-success { background: #10b981 !important; }
        #root .type-info { background: #3b82f6 !important; }

        #root .priority-high { color: #f87171 !important; border: 1px solid #ef4444 !important; background: transparent !important; }
        #root .priority-medium { color: #fbbf24 !important; border: 1px solid #f59e0b !important; background: transparent !important; }
        #root .priority-low { color: #60a5fa !important; border: 1px solid #3b82f6 !important; background: transparent !important; }

        #root .status-active { background: #10b981 !important; }
        #root .status-faulty { background: #ef4444 !important; }

        #root .mark-read-btn { 
          background: #334155 !important; 
          color: #ffffff !important; 
          border: 1px solid #475569 !important; 
          padding: 6px 12px !important; 
          border-radius: 6px !important; 
          cursor: pointer !important; 
          font-size: 0.8rem !important;
          font-weight: 600 !important;
          transition: all 0.2s !important;
        }
        #root .mark-read-btn:hover { background: #475569 !important; border-color: #64748b !important; }

        #root .error { background: #fef2f2 !important; color: #dc2626 !important; padding: 16px !important; border-radius: 8px !important; text-align: center !important; margin: 20px 0 !important; }
      `}</style>
    </div>
  );
}

export default NotificationLog;
