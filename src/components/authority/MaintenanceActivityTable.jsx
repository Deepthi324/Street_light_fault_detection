import React, { useEffect, useState } from "react";
import {
  fetchMaintenanceActivity,
  createMaintenanceActivity,
  updateMaintenanceActivity,
  deleteMaintenanceActivity,
  fetchIncidents,
  fetchMaintenanceTeams
} from "../../dataService";

function MaintenanceActivityTable() {
  const [list, setList] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ incident_id: "", team_id: "", status: "Pending", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([fetchMaintenanceActivity(), fetchIncidents(), fetchMaintenanceTeams()])
      .then(([a, inc, t]) => {
        setList(Array.isArray(a) ? a : []);
        setIncidents(Array.isArray(inc) ? inc : []);
        setTeams(Array.isArray(t) ? t : []);
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ incident_id: "", team_id: "", status: "Pending", notes: "" });
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.incident_id) return;
    setSubmitting(true);
    try {
      const payload = {
        incident_id: Number(form.incident_id),
        team_id: form.team_id ? Number(form.team_id) : null,
        status: form.status || "Pending",
        notes: form.notes || undefined
      };
      if (editing) await updateMaintenanceActivity(editing.id, payload);
      else await createMaintenanceActivity(payload);
      resetForm();
      load();
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const unassign = async (id) => {
    if (!window.confirm("Remove this assignment?")) return;
    try {
      await deleteMaintenanceActivity(id);
      load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      incident_id: String(row.incident_id || ""),
      team_id: row.team_id != null ? String(row.team_id) : "",
      status: row.status || "Pending",
      notes: row.notes || ""
    });
    setShowForm(true);
  };

  if (loading) return <p className="hint-text">Loading…</p>;

  return (
    <div>
      {error && <p className="hint-text" style={{ color: "#b91c1c", marginBottom: "0.5rem" }}>{error}</p>}
      <div className="action-btns" style={{ marginBottom: "0.75rem" }}>
        <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "Assign"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={save} className="form-inline" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <label>Incident</label>
            <select value={form.incident_id} onChange={(e) => setForm((f) => ({ ...f, incident_id: e.target.value }))} required>
              <option value="">Select…</option>
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>#{i.id} {i.pole_id}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Team</label>
            <select value={form.team_id} onChange={(e) => setForm((f) => ({ ...f, team_id: e.target.value }))}>
              <option value="">—</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
        </form>
      )}
      <div className="table-wrapper">
        <table className="data-table data-table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Incident</th>
              <th>Team</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.incident_id}</td>
                <td>{a.team_name ?? a.team_id ?? "—"}</td>
                <td>{a.status ?? "—"}</td>
                <td>{(a.notes || "").slice(0, 30)}{(a.notes || "").length > 30 ? "…" : ""}</td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(a)}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => unassign(a.id)}>Unassign</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading && <p className="hint-text">No maintenance activity.</p>}
      </div>
    </div>
  );
}

export default MaintenanceActivityTable;
