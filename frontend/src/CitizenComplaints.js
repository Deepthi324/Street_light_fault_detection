import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

function CitizenComplaints({ onBack, user }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState("all");

  // Assign Team state
  const [teams, setTeams] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningComplaint, setAssigningComplaint] = useState(null);
  const [assignForm, setAssignForm] = useState({ team_id: "", notes: "" });
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchComplaints();
    loadTeams();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const response = await fetch("http://localhost:4003/api/complaints", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch complaints");
      }

      const data = await response.json();
      console.log("CitizenComplaints [Authority]: Fetched data:", data);

      const list = Array.isArray(data) ? data : (data.data || []);
      console.log("CitizenComplaints [Authority]: Processed list:", list);

      setComplaints(list);
      setError("");
    } catch (err) {
      console.error("Error fetching complaints:", err);
      setError(err.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch("http://localhost:4003/api/maintenance-teams", {
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

  const handleAssignClick = (complaint) => {
    loadTeams(); // Ensure teams are loaded when modal is opened
    setAssigningComplaint(complaint);
    setAssignForm({ team_id: "", notes: complaint.description || "" });
    setShowAssignModal(true);
  };

  const submitAssignmentFromComplaint = async (e) => {
    e.preventDefault();
    setAssigning(true);
    try {
      const token = AuthService.getToken();

      // 1. Create an Incident from the complaint
      const incidentRes = await fetch("http://localhost:4003/api/incidents", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          light_pole_id: assigningComplaint.pole_id,
          reported_by: assigningComplaint.citizen_name || 'Citizen',
          type: assigningComplaint.description || 'Citizen Complaint',
          priority: 'High',
          status: 'In Progress'
        })
      });

      if (!incidentRes.ok) throw new Error("Failed to create incident from complaint");
      const incidentData = await incidentRes.json();

      // 2. Create Maintenance Activity linked to that incident
      const activityRes = await fetch("http://localhost:4003/api/maintenance-activity", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          incident_id: incidentData.id,
          team_id: Number(assignForm.team_id),
          status: 'Pending',
          notes: assignForm.notes
        })
      });

      if (!activityRes.ok) throw new Error("Failed to assign team");

      // 3. Update incident team_id so it shows as assigned
      await fetch(`http://localhost:4003/api/incidents/${incidentData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ team_id: Number(assignForm.team_id) })
      });

      // 4. Update complaint status to IN_PROGRESS
      await fetch(`http://localhost:4003/api/complaints/${assigningComplaint.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'IN_PROGRESS', authority_response: `Team assigned. Incident #${incidentData.id} created.` })
      });

      alert("Team assigned successfully! Incident created from complaint.");
      setShowAssignModal(false);
      setAssigningComplaint(null);
      fetchComplaints();
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (complaintId) => {
    if (!newStatus) {
      alert("Please select a status");
      return;
    }

    setUpdating(true);
    try {
      const token = AuthService.getToken();
      const response = await fetch(`http://localhost:4003/api/complaints/${complaintId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          authority_response: responseText,
        }),
      });

      if (response.ok) {
        alert("Complaint updated successfully!");
        setSelectedComplaint(null);
        setResponseText("");
        setNewStatus("");
        fetchComplaints(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.message || "Failed to update complaint");
      }
    } catch (err) {
      console.error("Error updating complaint:", err);
      alert("Failed to update complaint");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusLower = (status || "").trim().toLowerCase();
    switch (statusLower) {
      case "pending":
        return "status-badge status-pending";
      case "open":
        return "status-badge status-open-badge";
      case "in_progress":
        return "status-badge status-in-progress";
      case "resolved":
        return "status-badge status-completed";
      case "declined":
        return "status-badge status-faulty";
      default:
        return "status-badge";
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (filter === "all") return true;
    return (c.status || "OPEN").toLowerCase() === filter.toLowerCase();
  });

  if (loading) {
    return (
      <div className="module">
        <div className="module-header">
          <h2>📋 Citizen Complaints Management</h2>
        </div>
        <div className="loading-message">Loading complaints...</div>
      </div>
    );
  }

  return (
    <div className="module">
      <div className="module-header">
        <h2>📋 Citizen Complaints Management</h2>
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
          <button onClick={fetchComplaints} className="btn btn-sm">
            Retry
          </button>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="filter-buttons" style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All ({complaints.length})
        </button>
        <button className={`filter-btn ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>
          Pending ({complaints.filter((c) => (c.status || "PENDING").trim().toUpperCase() === "PENDING").length})
        </button>
        <button className={`filter-btn ${filter === "open" ? "active" : ""}`} onClick={() => setFilter("open")}>
          Open ({complaints.filter((c) => (c.status || "").trim().toUpperCase() === "OPEN").length})
        </button>
        <button className={`filter-btn ${filter === "in_progress" ? "active" : ""}`} onClick={() => setFilter("in_progress")}>
          In Progress ({complaints.filter((c) => {
            const s = (c.status || "").trim().toUpperCase();
            return s === "IN_PROGRESS" || s === "IN PROGRESS";
          }).length})
        </button>
        <button className={`filter-btn ${filter === "resolved" ? "active" : ""}`} onClick={() => setFilter("resolved")}>
          Resolved ({complaints.filter((c) => (c.status || "").trim().toUpperCase() === "RESOLVED").length})
        </button>
      </div>

      <div className="module-content">
        {filteredComplaints.length === 0 ? (
          <div className="empty-state">
            <p>No complaints found</p>
          </div>
        ) : (
          <div className="complaints-grid">
            {filteredComplaints.map((complaint) => (
              <div key={complaint.id} className="complaint-card">
                <div className="complaint-card-header">
                  <div>
                    <strong>Complaint #{complaint.id}</strong>
                    <span className={getStatusBadgeClass(complaint.status)} style={{ marginLeft: "10px" }}>
                      {complaint.status || "OPEN"}
                    </span>
                  </div>
                  <small>{new Date(complaint.created_at).toLocaleDateString()}</small>
                </div>

                <div className="complaint-card-body">
                  <p><strong>Citizen:</strong> {complaint.citizen_name || "N/A"}</p>
                  <p><strong>Contact:</strong> {complaint.contact || "N/A"}</p>
                  <p><strong>Pole ID:</strong> {complaint.pole_id || "N/A"}</p>
                  <p><strong>Description:</strong> {complaint.description || "N/A"}</p>

                  {complaint.authority_response && (
                    <div className="authority-response">
                      <p><strong>Authority Response:</strong></p>
                      <p>{complaint.authority_response}</p>
                      <small>Responded: {new Date(complaint.response_time).toLocaleDateString()}</small>
                    </div>
                  )}
                </div>

                <div className="complaint-card-actions">
                  {selectedComplaint?.id === complaint.id ? (
                    <div className="update-form">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="form-control"
                        style={{ marginBottom: "10px" }}
                      >
                        <option value="">Select Status</option>
                        <option value="PENDING">Pending (New)</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="DECLINED">Declined</option>
                      </select>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Enter response message (optional)..."
                        className="form-control"
                        rows="3"
                        style={{ marginBottom: "10px" }}
                      />
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleUpdateStatus(complaint.id)}
                          className="btn btn-primary"
                          disabled={updating}
                        >
                          {updating ? "Updating..." : "Update"}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedComplaint(null);
                            setResponseText("");
                            setNewStatus("");
                          }}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setNewStatus(complaint.status);
                          setResponseText(complaint.authority_response || "");
                        }}
                        className="btn btn-primary"
                      >
                        Respond
                      </button>
                      {(complaint.status || '').toUpperCase() !== 'RESOLVED' && (
                        <button
                          onClick={() => handleAssignClick(complaint)}
                          className="btn btn-primary"
                          style={{ background: '#10b981' }}
                        >
                          Assign Team
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assign Team Modal */}
        {showAssignModal && assigningComplaint && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', color: 'white', width: '440px' }}>
              <h3 style={{ marginBottom: '8px' }}>Assign Maintenance Team</h3>
              <p style={{ color: '#94a3b8', marginBottom: '10px', fontSize: '0.8rem' }}>DEBUG: {teams.length} teams loaded</p>
              <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '0.9rem' }}>Complaint #{assigningComplaint.id}: {assigningComplaint.description?.slice(0, 60)}...</p>
              <form onSubmit={submitAssignmentFromComplaint}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#cbd5e1' }}>Select Team</label>
                  <select required value={assignForm.team_id} onChange={e => setAssignForm({ ...assignForm, team_id: e.target.value })}
                    style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }}>
                    <option value="">-- Select Team --</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.area})</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#cbd5e1' }}>Notes</label>
                  <textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })}
                    rows="3" style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" onClick={() => { setShowAssignModal(false); setAssigningComplaint(null); }} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={assigning}>{assigning ? 'Assigning...' : 'Assign & Create Incident'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="stats-summary" style={{ marginTop: "30px" }}>
          <div className="stat-card">
            <div className="stat-value">{complaints.length}</div>
            <div className="stat-label">Total Complaints</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {complaints.filter((c) => (c.status || "PENDING").trim().toUpperCase() === "PENDING").length}
            </div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {complaints.filter((c) => (c.status || "").trim().toUpperCase() === "OPEN").length}
            </div>
            <div className="stat-label">Open</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {complaints.filter((c) => {
                const s = (c.status || "").trim().toUpperCase();
                return s === "IN_PROGRESS" || s === "IN PROGRESS";
              }).length}
            </div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {complaints.filter((c) => (c.status || "").trim().toUpperCase() === "RESOLVED").length}
            </div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
      </div>


      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;
        }
        .modal-content {
          background: #1e293b; padding: 20px; border-radius: 8px; width: 400px;
          border: 1px solid #334155; color: white;
        }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; color: #94a3b8; }
        .form-control {
          width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #334155;
          background: #0f172a; color: white;
        }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

        /* FIXING VISIBILITY */
        .complaints-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .complaint-card {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          padding: 20px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          display: flex;
          flex-direction: column;
          color: #1e293b !important;
        }
        .complaint-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #f1f5f9 !important;
          padding-bottom: 12px !important;
          margin-bottom: 15px !important;
        }
        .complaint-card-header strong {
          color: #1e293b !important;
          font-size: 1.1rem !important;
        }
        .complaint-card-header small {
          color: #64748b !important;
        }
        .complaint-card-body p {
          margin: 8px 0 !important;
          color: #334155 !important;
          font-size: 0.95rem !important;
          line-height: 1.5 !important;
        }
        .complaint-card-body strong {
          color: #1e293b !important;
          font-weight: 600 !important;
        }
        .authority-response {
          margin-top: 15px !important;
          padding: 12px !important;
          background: #f8fafc !important;
          border-radius: 8px !important;
          border-left: 4px solid #3b82f6 !important;
        }
        .authority-response p {
          margin: 4px 0 !important;
        }
        .complaint-card-actions {
          margin-top: auto !important;
          padding-top: 15px !important;
          border-top: 1px solid #f1f5f9 !important;
        }
        .filter-btn {
          padding: 8px 16px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          color: #475569 !important;
          cursor: pointer !important;
          font-weight: 500 !important;
          transition: all 0.2s !important;
        }
        .filter-btn:hover {
          background: #f1f5f9 !important;
          border-color: #94a3b8 !important;
        }
        .filter-btn.active {
          background: #3b82f6 !important;
          color: #ffffff !important;
          border-color: #3b82f6 !important;
        }
        .status-badge {
          display: inline-block !important;
          padding: 4px 10px !important;
          border-radius: 50px !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
        }
        .status-pending { background: #fee2e2 !important; color: #991b1b !important; }
        .status-open-badge { background: #fef3c7 !important; color: #92400e !important; }
        .status-in-progress { background: #dbeafe !important; color: #1e40af !important; }
        .status-completed { background: #dcfce7 !important; color: #166534 !important; }
        .status-faulty { background: #f1f5f9 !important; color: #475569 !important; }
      `}</style>
    </div>
  );
}

export default CitizenComplaints;
