import { useState, useEffect } from "react";
import "../professional-dashboard.css";

export default function Dashboard({ user, onLogout, onNavigate }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    // Authority/Maintenance stats
    totalLights: 0,
    activeLights: 0,
    faultsToday: 0,
    pendingMaintenance: 0,
    powerConsumption: "0 kWh",
    uptime: "0%",
    totalComplaints: 0,
    // Citizen-specific stats
    myComplaints: 0,
    openComplaints: 0,
    inProgressComplaints: 0,
    resolvedComplaints: 0,
    declinedComplaints: 0,
    recentComplaints: [],
    // Maintenance-specific stats
    myTeam: null,
    assignedIncidents: [],
    maintenanceActivities: [],
    myActivitiesCount: 0,
    completedTasks: 0,
    unreadNotifications: 0,
    totalSensors: 0,
    totalTeams: 0,
    totalAreas: 0,
    monthlyReport: null
  });

  const role = user.role;

  useEffect(() => {
    // Reload dashboard data when component mounts or section changes
    loadDashboardStats();
    // eslint-disable-next-line
  }, [activeSection, role]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      if (role === "citizen") {
        // Fetch citizen-specific data only
        const token = sessionStorage.getItem('auth_token');
        const headers = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const complaintsRes = await fetch("http://localhost:4003/api/complaints", { headers });
        const complaints = await complaintsRes.json();

        // Handle both array response and {data: []} response
        const complaintsList = Array.isArray(complaints) ? complaints : (complaints.data || []);

        const myTotal = complaintsList.length;

        // Group PENDING, OPEN, and IN_PROGRESS into "In Progress" for the dashboard counter
        const unresolvedCount = complaintsList.filter(c => {
          const s = (c.status || '').trim().toUpperCase();
          return s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'PENDING' || s === 'OPEN';
        }).length;

        const resolvedCount = complaintsList.filter(c => (c.status || '').trim().toUpperCase() === 'RESOLVED').length;
        const declinedCount = complaintsList.filter(c => (c.status || '').trim().toUpperCase() === 'DECLINED').length;
        const recent = complaintsList; // Show all complaints, not just 5

        // Fetch citizen notifications
        const notifRes = await fetch("http://localhost:4003/api/notification-log", { headers });
        const notifs = await notifRes.json();
        const unreadCount = Array.isArray(notifs) ? notifs.filter(n => !n.is_read).length : 0;

        setStats({
          ...stats,
          myComplaints: myTotal,
          inProgressComplaints: unresolvedCount,
          resolvedComplaints: resolvedCount,
          declinedComplaints: declinedCount,
          recentComplaints: recent,
          unreadNotifications: unreadCount
        });
      } else {
        // Fetch admin/maintenance data
        const token = sessionStorage.getItem('auth_token');
        const headers = { "Authorization": `Bearer ${token}` };

        const [lightsRes, incidentsRes, maintenanceRes, powerRes, complaintsRes, sensorRes, notifRes] =
          await Promise.all([
            fetch("http://localhost:4003/api/light-poles", { headers }),
            fetch("http://localhost:4003/api/incidents", { headers }),
            fetch("http://localhost:4003/api/maintenance-activity", { headers }),
            fetch("http://localhost:4003/api/power-consumption", { headers }),
            fetch("http://localhost:4003/api/complaints", { headers }),
            fetch("http://localhost:4003/api/sensor-devices", { headers }),
            fetch("http://localhost:4003/api/notification-log", { headers }),
          ]);

        const lights = await lightsRes.json();
        const incidents = await incidentsRes.json();
        const maintenance = await maintenanceRes.json();
        const power = await powerRes.json();
        const complaints = await complaintsRes.json();
        const sensors = await sensorRes.json();
        const notifications = await notifRes.json();

        const totalLights = lights.data?.length || lights.length || 0;
        const activeLights = (Array.isArray(lights) ? lights : (lights.data || [])).filter((l) => (l.status || '').toUpperCase() === "ACTIVE").length || 0;

        const compList = Array.isArray(complaints) ? complaints : (complaints.data || []);
        console.log("Dashboard [Authority]: Fetched complaints:", compList);
        console.log("Dashboard [Authority]: Total raw count:", compList.length);

        // const totalComplaints = compList.length; // Unused
        const activeComplaints = compList.filter(c => ['PENDING', 'OPEN', 'IN_PROGRESS'].includes((c.status || '').toUpperCase())).length;
        console.log("Dashboard [Authority]: Active count:", activeComplaints);

        const sensorList = Array.isArray(sensors) ? sensors : (sensors.data || []);
        const totalSensors = sensorList.length;

        const activeIncidentsCount = (Array.isArray(incidents) ? incidents : (incidents.data || []))
          .filter(i => (i.status || '').toLowerCase() !== 'completed' && (i.status || '').toLowerCase() !== 'resolved').length;

        setStats({
          ...stats,
          totalLights,
          activeLights,
          faultsToday: activeIncidentsCount,
          pendingMaintenance: (maintenance.data?.length || maintenance.length || 0),
          totalComplaints: activeComplaints,
          powerConsumption: power.total_consumption || power.data?.[0]?.total_consumption || power[0]?.total_consumption || "0 kWh",
          uptime: totalLights > 0 ? ((activeLights / totalLights) * 100).toFixed(1) + "%" : "0%",
          totalSensors: totalSensors,
          unreadNotifications: Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0
        });

        // Fetch Monthly System Report (Stored Procedure) for Authority
        if (role === 'authority') {
          try {
            const reportRes = await fetch("http://localhost:4003/api/incidents/monthly-report", { headers });
            if (reportRes.ok) {
              const reportData = await reportRes.json();
              setStats(prev => ({ ...prev, monthlyReport: reportData }));
            }
          } catch (reportErr) {
            console.error("Failed to fetch monthly report:", reportErr);
          }
        }

        if (role === 'maintenance') {
          // Fetch additional maintenance-specific data
          const [teamRes, activityRes] = await Promise.all([
            fetch("http://localhost:4003/api/maintenance-teams", { headers }),
            fetch("http://localhost:4003/api/maintenance-activity", { headers }),
          ]);
          const teamData = await teamRes.json();
          const activityData = await activityRes.json();
          const incidentsData = Array.isArray(incidents) ? incidents : (incidents.data || []);
          const actList = Array.isArray(activityData) ? activityData : [];

          const foundTeam = Array.isArray(teamData) ? teamData.find(t => Number(t.id) === Number(user.maintenance_team_id)) : (teamData.id === user.maintenance_team_id ? teamData : null);
          console.log("Dashboard [Maintenance]: Found Team:", foundTeam);
          console.log("Dashboard [Maintenance]: Activities:", actList.length);

          setStats(prev => ({
            ...prev,
            myTeam: foundTeam,
            assignedIncidents: incidentsData,
            maintenanceActivities: actList,
            myActivitiesCount: actList.length,
            completedTasks: actList.filter(a => (a.status || '').toLowerCase() === 'completed').length,
            pendingMaintenance: actList.filter(a => ['pending', 'scheduled', 'in progress', 'in_progress'].includes((a.status || '').toLowerCase())).length,
            totalTeams: Array.isArray(teamData) ? teamData.length : 0,
            totalAreas: [...new Set((Array.isArray(teamData) ? teamData : []).map(t => t.area))].filter(Boolean).length
          }));
        }
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComplaint = async (complaintId) => {
    if (!window.confirm("Are you sure you want to delete this complaint?")) {
      return;
    }

    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4003/api/complaints/${complaintId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("Complaint deleted successfully!");
        // Reload dashboard data
        loadDashboardStats();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete complaint");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete complaint");
    }
  };

  const menuByRole = {
    authority: [
      { id: "overview", label: "Dashboard" },
      { id: "users", label: "System Users" },
      { id: "lights", label: "Light Poles" },
      { id: 'devices', label: 'Sensor Devices' },
      { id: "sensors", label: "Sensor Readings" },
      { id: "power", label: "Power Consumption" },
      { id: "incidents", label: "Incidents" },
      { id: "maintenance", label: "Maintenance History" },
      { id: "teams", label: "Maintenance Teams" },
      { id: "complaints", label: "Citizen Complaints" },
      { id: "notifications", label: "Notifications" },
      { id: "neo4j", label: "Graph Analytics" },
    ],
    maintenance: [
      { id: "overview", label: "Dashboard" },
      { id: "incidents", label: "Assigned Incidents" },
      { id: "mytasks", label: "My Tasks" },
      { id: "maintenance", label: "History" },
    ],
    citizen: [
      { id: "overview", label: "Dashboard" },
      { id: "complaints", label: "Register Complaint" },
      { id: "incidents", label: "Nearby Incidents" },
    ],
  };

  return (
    <div className="professional-dashboard">
      {/* MODERN HEADER */}
      <header className="modern-header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">💡</div>
            <div>
              <h1 className="brand-title">Smart Street Light System</h1>
              <p className="brand-subtitle">Municipal Management Portal</p>
            </div>
          </div>
          <div className="header-actions">
            <div className="user-badge">
              <div className="user-avatar">{user.fullName?.[0]?.toUpperCase() || 'U'}</div>
              <div className="user-details">
                <span className="user-name">Logged in as: <strong>{user.fullName || 'User'}</strong></span>
                <span className="user-role">
                  {user.role === 'maintenance' && user.team_name ? `Team: ${user.team_name}` : (role.charAt(0).toUpperCase() + role.slice(1))}
                </span>
              </div>
            </div>
            <div className="notification-bell-wrapper" onClick={() => onNavigate('notifications')} style={{ position: 'relative', cursor: 'pointer', marginRight: '15px' }}>
              <span style={{ fontSize: '1.5rem' }}>🔔</span>
              {stats.unreadNotifications > 0 && (
                <span className="notification-badge" style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  border: '2px solid #0f172a'
                }}>
                  {stats.unreadNotifications}
                </span>
              )}
            </div>
            <button onClick={onLogout} className="logout-btn">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </header>

      {/* MODERN LAYOUT */}
      <div className="modern-layout">
        {/* PROFESSIONAL SIDEBAR */}
        <aside className="professional-sidebar">
          <nav className="sidebar-nav">
            {menuByRole[role].map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'nav-item-active' : ''}`}
                onClick={() =>
                  item.id === "overview"
                    ? setActiveSection("overview")
                    : onNavigate(item.id)
                }
              >
                <span className="nav-icon">{getMenuIcon(item.id)}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* PROFESSIONAL MAIN CONTENT */}
        <main className="professional-content">
          {activeSection === "overview" && (
            <div className="overview-section">
              <div className="section-header">
                <h2 className="section-title">
                  {role === "citizen" ? "My Dashboard" : "System Overview"}
                </h2>
                <p className="section-subtitle">
                  {role === "citizen"
                    ? "Track your complaints and view nearby incidents"
                    : "Real-time monitoring and analytics"}
                </p>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading dashboard data...</p>
                </div>
              ) : role === "citizen" ? (
                // CITIZEN DASHBOARD
                <>
                  <div className="professional-stats-grid">
                    <div className="professional-stat-card card-blue">
                      <div className="stat-icon">📝</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.myComplaints}</h3>
                        <p className="stat-label">My Total Complaints</p>
                      </div>
                    </div>



                    <div className="professional-stat-card card-yellow">
                      <div className="stat-icon">⏳</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.inProgressComplaints}</h3>
                        <p className="stat-label">In Progress</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-green">
                      <div className="stat-icon">✅</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.resolvedComplaints}</h3>
                        <p className="stat-label">Resolved</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-red">
                      <div className="stat-icon">❌</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.declinedComplaints}</h3>
                        <p className="stat-label">Declined</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Complaints - Moved to Top */}
                  {stats.recentComplaints.length > 0 && (
                    <div className="recent-complaints" style={{ marginTop: '0', marginBottom: '2rem' }}>
                      <h3 className="recent-title">My Recent Complaints</h3>
                      <div className="complaints-list">
                        {stats.recentComplaints.map((complaint, idx) => (
                          <div key={idx} className="complaint-item">
                            <div className="complaint-header">
                              <span className="complaint-id">#{complaint.id}</span>
                              <div className="complaint-actions">
                                <span className={`complaint-status status-${(complaint.status || 'open').toLowerCase()}`}>
                                  {complaint.status || 'OPEN'}
                                </span>
                                <button
                                  onClick={() => handleDeleteComplaint(complaint.id)}
                                  className="delete-complaint-btn"
                                  title="Delete complaint"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <div className="complaint-desc">{complaint.description || 'No description'}</div>

                            {complaint.authority_response && (
                              <div className="authority-response" style={{
                                marginTop: '10px',
                                padding: '10px',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                borderLeft: '4px solid #3b82f6',
                                fontSize: '0.85rem'
                              }}>
                                <div style={{ fontWeight: '700', marginBottom: '4px', color: '#1e293b' }}>Authority Response:</div>
                                <div style={{ color: '#334155', fontStyle: 'italic' }}>"{complaint.authority_response}"</div>
                              </div>
                            )}

                            <div className="complaint-footer">
                              <span className="complaint-date">
                                {complaint.created_at ? new Date(complaint.created_at).toLocaleDateString() : 'N/A'}
                              </span>
                              {complaint.pole_id && (
                                <span className="complaint-pole">Pole: {complaint.pole_id}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="citizen-actions">
                    <h3 className="action-title">Quick Actions</h3>
                    <div className="action-buttons">
                      <button
                        onClick={() => onNavigate('complaints')}
                        className="action-btn action-btn-primary"
                      >
                        <span className="action-icon">📝</span>
                        <div>
                          <div className="action-btn-title">Register New Complaint</div>
                          <div className="action-btn-desc">Report a street light issue</div>
                        </div>
                      </button>
                      <button
                        onClick={() => onNavigate('incidents')}
                        className="action-btn action-btn-secondary"
                      >
                        <span className="action-icon">⚠️</span>
                        <div>
                          <div className="action-btn-title">View Nearby Incidents</div>
                          <div className="action-btn-desc">Check incidents in your area</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="emergency-contact">
                    <h3 className="emergency-title">📞 Emergency Contact</h3>
                    <div className="contact-info">
                      <div className="contact-item">
                        <span className="contact-label">Municipal Helpline:</span>
                        <span className="contact-value">1800-123-4567</span>
                      </div>
                      <div className="contact-item">
                        <span className="contact-label">Emergency Services:</span>
                        <span className="contact-value">911</span>
                      </div>
                      <div className="contact-item">
                        <span className="contact-label">Email Support:</span>
                        <span className="contact-value">support@streetlight.gov</span>
                      </div>
                    </div>
                  </div>


                </>
              ) : role === 'maintenance' ? (
                // MAINTENANCE DASHBOARD
                <>
                  <div className="professional-stats-grid">
                    <div className="professional-stat-card card-blue">
                      <div className="stat-icon">🛠️</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.myTeam?.name || 'Unassigned'}</h3>
                        <p className="stat-label">{stats.myTeam ? 'My Maintenance Team' : 'Available for Assignment'}</p>
                      </div>
                    </div>
                    <div className="professional-stat-card card-purple">
                      <div className="stat-icon">🔧</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.pendingMaintenance}</h3>
                        <p className="stat-label">Active System Tasks</p>
                      </div>
                    </div>
                    <div className="professional-stat-card card-orange">
                      <div className="stat-icon">👥</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.totalTeams}</h3>
                        <p className="stat-label">Total Teams</p>
                      </div>
                    </div>
                  </div>

                  {/* Team Information - Full Width */}
                  <div style={{ marginTop: '2rem', background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>📋 Team Information</h3>
                    {stats.myTeam ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', color: '#cbd5e1' }}>
                        <div>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>Team Name</p>
                          <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>{stats.myTeam.name}</p>
                        </div>
                        <div>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>Assigned Area</p>
                          <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>{stats.myTeam.area || 'All City'}</p>
                        </div>
                        <div>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>Contact</p>
                          <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>{stats.myTeam.contact || 'N/A'}</p>
                        </div>
                        <div>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>Status</p>
                          <p><span style={{ background: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>Active</span></p>
                        </div>
                      </div>
                    ) : <p style={{ color: '#94a3b8' }}>No team assigned. Please contact your administrator.</p>}
                  </div>


                  {/* Maintenance Activity History */}
                  <div style={{ marginTop: '2rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155' }}>
                      <h3 style={{ margin: 0 }}>📜 Activity History</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#0f172a' }}>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#94a3b8' }}>ID</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#94a3b8' }}>Incident</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#94a3b8' }}>Pole</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#94a3b8' }}>Status</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#94a3b8' }}>Notes</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#94a3b8' }}>Started</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#94a3b8' }}>Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.maintenanceActivities && stats.maintenanceActivities.length > 0 ? (
                            stats.maintenanceActivities.map((act, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                                <td style={{ padding: '15px' }}>#{act.activity_id || act.id}</td>
                                <td style={{ padding: '15px' }}>
                                  <div style={{ fontWeight: '600' }}>{act.issue || act.incident_type || 'N/A'}</div>
                                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Incident #{act.incident_id}</div>
                                </td>
                                <td style={{ padding: '15px' }}>{act.pole_label || 'P-???'}</td>
                                <td style={{ padding: '15px' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '600',
                                    background: act.status === 'Completed' ? '#dcfce7' : act.status === 'Pending' ? '#fef3c7' : '#dbeafe',
                                    color: act.status === 'Completed' ? '#166534' : act.status === 'Pending' ? '#92400e' : '#1e40af'
                                  }}>{act.status}</span>
                                </td>
                                <td style={{ padding: '15px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1' }}>{act.notes || '—'}</td>
                                <td style={{ padding: '15px', color: '#94a3b8' }}>{act.started_at ? new Date(act.started_at).toLocaleDateString() : '—'}</td>
                                <td style={{ padding: '15px', color: '#94a3b8' }}>{act.completed_at ? new Date(act.completed_at).toLocaleDateString() : '—'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No maintenance activity history yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                // AUTHORITY DASHBOARD
                <>
                  <div className="professional-stats-grid">
                    <div className="professional-stat-card card-blue">
                      <div className="stat-icon">🏙️</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.totalLights}</h3>
                        <p className="stat-label">Total Light Poles</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-green">
                      <div className="stat-icon">✅</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.activeLights}</h3>
                        <p className="stat-label">Active Lights</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-orange">
                      <div className="stat-icon">⚠️</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.faultsToday}</h3>
                        <p className="stat-label">Active Incidents</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-purple">
                      <div className="stat-icon">🔧</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.pendingMaintenance}</h3>
                        <p className="stat-label">Pending Maintenance</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-yellow">
                      <div className="stat-icon">⚡</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.powerConsumption}</h3>
                        <p className="stat-label">Power Consumption</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-teal">
                      <div className="stat-icon">📡</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.totalSensors}</h3>
                        <p className="stat-label">Total Sensors</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-purple">
                      <div className="stat-icon">📝</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.totalComplaints}</h3>
                        <p className="stat-label">Pending Complaints</p>
                      </div>
                    </div>

                    <div className="professional-stat-card card-blue-dark">
                      <div className="stat-icon">📊</div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stats.uptime}</h3>
                        <p className="stat-label">System Uptime</p>
                      </div>
                    </div>
                  </div>

                  {/* STRATEGIC SYSTEM INSIGHTS (STORED PROCEDURE) */}
                  {role === 'authority' && stats.monthlyReport && (
                    <div className="strategic-insights-section">
                      <div className="insights-header">
                        <div className="insights-title-box">
                          <span className="insights-icon">📈</span>
                          <div>
                            <h3 className="insights-title">Strategic System Insights</h3>
                            <p className="insights-subtitle">Performance report for {stats.monthlyReport.report_month}</p>
                          </div>
                        </div>
                        <div className="sp-badge">STORED PROCEDURE: sp_GetMonthlySystemReport</div>
                      </div>
                      
                      <div className="insights-grid">
                        <div className="insight-item">
                          <div className="insight-label">Infrastructure</div>
                          <div className="insight-value">{stats.monthlyReport.total_infrastructure}</div>
                          <div className="insight-desc">Total managed poles</div>
                        </div>
                        <div className="insight-item">
                          <div className="insight-label">Monthly Faults</div>
                          <div className="insight-value text-red">{stats.monthlyReport.faults_this_month}</div>
                          <div className="insight-desc">Incidents logged this month</div>
                        </div>
                        <div className="insight-item">
                          <div className="insight-label">Resolved Efficiently</div>
                          <div className="insight-value text-green">{stats.monthlyReport.resolved_complaints}</div>
                          <div className="insight-desc">Closed in current cycle</div>
                        </div>
                        <div className="insight-item highlight">
                          <div className="insight-label">Energy Consumed</div>
                          <div className="insight-value text-yellow">{stats.monthlyReport.total_energy_kwh} <span className="unit">kWh</span></div>
                          <div className="insight-desc">System-wide consumption</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div >
    </div >
  );
}

// Helper function for menu icons
function getMenuIcon(id) {
  const icons = {
    overview: '📊',
    users: '👥',
    lights: '💡',
    devices: '🏭',
    sensors: '📡',
    power: '⚡',
    incidents: '⚠️',
    maintenance: '🔧',
    teams: '🛠️',
    complaints: '📝',
    notifications: '🔔',
    dashboard: '🏠',
    neo4j: '🕸️'
  };
  return icons[id] || '📌';
}
