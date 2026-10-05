import React, { useEffect, useState } from "react";
import {
  fetchIncidents,
  createIncident,
  updateIncident,
  deleteIncident,
  fetchLightPoles,
  fetchMaintenanceTeams, // Need this
  createMaintenanceActivity // Need this
} from "../../dataService";

function IncidentsTable() {
  const [list, setList] = useState([]);
  const [poles, setPoles] = useState([]);
  const [teams, setTeams] = useState([]); // Store teams
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Assignment Modal State
  const [assigningIncident, setAssigningIncident] = useState(null);
  const [assignForm, setAssignForm] = useState({
    team_id: "",
    notes: ""
  });

  const [form, setForm] = useState({
    light_pole_id: "",
    reported_by: "",
    type: "",
    priority: "Medium",
    status: "Open"
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([fetchIncidents(), fetchLightPoles(), fetchMaintenanceTeams()])
      .then(([inc, pl, t]) => {
        setList(Array.isArray(inc) ? inc : []);
        setPoles(Array.isArray(pl) ? pl : []);
        setTeams(Array.isArray(t) ? t : []);
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ light_pole_id: "", reported_by: "", type: "", priority: "Medium", status: "Open" });
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.light_pole_id) return;
    setSubmitting(true);
    try {
      const payload = {
        light_pole_id: Number(form.light_pole_id),
        reported_by: form.reported_by || undefined,
        type: form.type || undefined,
        priority: form.priority || "Medium",
        status: form.status || "Open"
      };
      if (editing) {
        await updateIncident(editing.id, payload);
      } else {
        await createIncident(payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this incident?")) return;
    try {
      await deleteIncident(id);
      load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      light_pole_id: String(row.light_pole_id || ""),
      reported_by: row.reported_by || "",
      type: row.type || "",
      priority: row.priority || "Medium",
      status: row.status || "Open"
    });
    setShowForm(true);
  };

  const openAssign = (incident) => {
    setAssigningIncident(incident);
    setAssignForm({ team_id: "", notes: "" });
  };

  const closeAssign = () => {
    setAssigningIncident(null);
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.team_id) return;
    setSubmitting(true);
    try {
      await createMaintenanceActivity({
        incident_id: assigningIncident.id,
        team_id: Number(assignForm.team_id),
        status: "Pending",
        notes: assignForm.notes
      });
      // Optionally update incident status to "In Progress"
      await updateIncident(assigningIncident.id, { status: "In Progress" });

      alert("Team assigned successfully!");
      closeAssign();
      load();
    } catch (err) {
      alert("Failed to assign team: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="hint-text">Loading…</p>;

  return (
    <div>
      {error && <p className="hint-text" style={{ color: "#b91c1c", marginBottom: "0.5rem" }}>{error}</p>}

      {/* Assignment Modal */}
      {assigningIncident && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Assign Team to Incident #{assigningIncident.id}</h3>
            <form onSubmit={submitAssignment}>
              <div className="form-group">
                <label>Select Team</label>
                <select
                  value={assignForm.team_id}
                  onChange={e => setAssignForm({ ...assignForm, team_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Team --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.area})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={assignForm.notes}
                  onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="Instructions for the team..."
                ></textarea>
              </div>
              <div className="action-btns">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Assigning..." : "Assign Team"}
                </button>
                <button type="button" className="btn-ghost" onClick={closeAssign}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="action-btns" style={{ marginBottom: "0.75rem" }}>
        <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "Add Incident"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={save} className="form-inline" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <label>Light Pole</label>
            <select
              value={form.light_pole_id}
              onChange={(e) => setForm((f) => ({ ...f, light_pole_id: e.target.value }))}
              required
            >
              <option value="">Select…</option>
              {poles.map((p) => (
                <option key={p.id} value={p.id}>{p.pole_id} {p.location ? `– ${p.location}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Reported by</label>
            <input
              value={form.reported_by}
              onChange={(e) => setForm((f) => ({ ...f, reported_by: e.target.value }))}
              placeholder="email or sensor"
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <input
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              placeholder="Light Off"
            />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
        </form>
      )}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Pole ID</th>
              <th>Location</th>
              <th>Reported by</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.pole_id || i.light_pole_id}</td>
                <td>{i.location || "—"}</td>
                <td>{i.reported_by || "—"}</td>
                <td>{i.type || "—"}</td>
                <td>{i.priority || "—"}</td>
                <td>
                  <span className={"status-pill status-" + (i.status || "").toLowerCase().replace(/\s+/g, "-")}>
                    {i.status || "—"}
                  </span>
                </td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(i)}>Edit</button>
                    <button type="button" className="btn-small" onClick={() => openAssign(i)}>Assign Team</button>
                    <button type="button" className="btn-danger" onClick={() => del(i.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading && <p className="hint-text">No incidents.</p>}
      </div>
    </div>
  );
}

export default IncidentsTable;
