import React, { useEffect, useState } from "react";
import {
  fetchMaintenanceTeams,
  createMaintenanceTeam,
  updateMaintenanceTeam,
  deleteMaintenanceTeam
} from "../../dataService";

function MaintenanceTeamsTable() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", area: "", contact: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    fetchMaintenanceTeams()
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", area: "", contact: "" });
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateMaintenanceTeam(editing.id, form);
      } else {
        await createMaintenanceTeam(form);
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
    if (!window.confirm("Delete this team?")) return;
    try {
      await deleteMaintenanceTeam(id);
      load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name || "", area: row.area || "", contact: row.contact || "" });
    setShowForm(true);
  };

  if (loading) return <p className="hint-text">Loading…</p>;

  return (
    <div>
      {error && <p className="hint-text" style={{ color: "#b91c1c", marginBottom: "0.5rem" }}>{error}</p>}
      <div className="action-btns" style={{ marginBottom: "0.75rem" }}>
        <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "Add"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={save} className="form-inline" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Area</label>
            <input value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Contact</label>
            <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
        </form>
      )}
      <div className="table-wrapper">
        <table className="data-table data-table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Area</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>{t.area || "—"}</td>
                <td>{t.contact || "—"}</td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(t)}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => del(t.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading && <p className="hint-text">No teams.</p>}
      </div>
    </div>
  );
}

export default MaintenanceTeamsTable;
