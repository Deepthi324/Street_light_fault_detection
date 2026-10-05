import React, { useEffect, useState } from "react";
import {
  fetchMaintenanceActivity,
  updateMaintenanceActivity,
  fetchMaintenanceActivityHistory
} from "../../dataService";

const STATUS_OPTIONS = ["Pending", "Assigned", "In Progress", "On Site", "Repairing", "Waiting for Parts", "Completed"];

function MaintenanceStatusPanel({ selectedIncidentId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    fetchMaintenanceActivity()
      .then((d) => setActivities(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      const act = activities.find((a) => Number(a.incident_id) === Number(selectedIncidentId));
      if (act) {
        setLoadingHistory(true);
        fetchMaintenanceActivityHistory(act.id)
          .then((data) => setHistory(data || []))
          .catch((err) => console.error("Failed to load history", err))
          .finally(() => setLoadingHistory(false));
      } else {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [selectedIncidentId, activities]);

  const filtered = selectedIncidentId
    ? activities.filter((a) => Number(a.incident_id) === Number(selectedIncidentId))
    : activities;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdateError("");
    if (!selectedIncidentId) return;
    const act = filtered.find((a) => Number(a.incident_id) === Number(selectedIncidentId));
    if (!act) {
      setUpdateError("No maintenance activity found for this incident.");
      return;
    }
    setUpdating(true);
    try {
      await updateMaintenanceActivity(act.id, { status, notes: notes || undefined });
      setNotes("");
      load();
    } catch (err) {
      setUpdateError(err?.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p className="hint-text">Loading…</p>;
  if (error) return <p className="hint-text" style={{ color: "#b91c1c" }}>{error}</p>;

  return (
    <div>
      <form className="form-inline" onSubmit={handleUpdate}>
        <div className="form-group">
          <label>Selected Incident</label>
          <input
            type="text"
            readOnly
            value={selectedIncidentId ?? "None"}
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Short update…"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={!selectedIncidentId || updating}>
          {updating ? "Saving…" : "Save Update"}
        </button>
      </form>
      {updateError && <p style={{ color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{updateError}</p>}
      <div className="table-wrapper">
        <table className="data-table data-table-sm">
          <thead>
            <tr>
              <th>Activity ID</th>
              <th>Incident ID</th>
              <th>Team</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.incident_id}</td>
                <td>{a.team_name ?? a.team_id ?? "—"}</td>
                <td>{a.status ?? "—"}</td>
                <td>{(a.notes || "").slice(0, 40)}{(a.notes || "").length > 40 ? "…" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="hint-text">No activities for selected incident.</p>}
      </div>

      {selectedIncidentId && (
        <div style={{ marginTop: "2rem" }}>
          <h4>Status History</h4>
          {loadingHistory ? (
            <p className="hint-text">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="hint-text">No history available.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table data-table-sm" style={{ marginTop: "0.5rem" }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Updated By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.created_at).toLocaleString()}</td>
                      <td>{h.status}</td>
                      <td>{h.notes || "—"}</td>
                      <td>{h.updated_by_name || "System"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MaintenanceStatusPanel;
