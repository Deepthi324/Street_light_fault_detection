import React, { useEffect, useState } from "react";
import {
  fetchLightPoles,
  createLightPole,
  updateLightPole,
  deleteLightPole
} from "../../dataService";

function LightPolesTable() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ pole_id: "", location: "", latitude: "", longitude: "", status: "Active" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    fetchLightPoles()
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ pole_id: "", location: "", latitude: "", longitude: "", status: "Active" });
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        pole_id: form.pole_id.trim(),
        location: form.location.trim() || undefined,
        latitude: form.latitude === "" ? undefined : Number(form.latitude),
        longitude: form.longitude === "" ? undefined : Number(form.longitude),
        status: form.status || "Active"
      };
      if (editing) {
        await updateLightPole(editing.id, payload);
      } else {
        await createLightPole(payload);
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
    if (!window.confirm("Delete this light pole?")) return;
    try {
      await deleteLightPole(id);
      load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      pole_id: row.pole_id || "",
      location: row.location || "",
      latitude: row.latitude ?? "",
      longitude: row.longitude ?? "",
      status: row.status || "Active"
    });
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
            <label>Pole ID</label>
            <input
              value={form.pole_id}
              onChange={(e) => setForm((f) => ({ ...f, pole_id: e.target.value }))}
              placeholder="P-001"
              required
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Main St"
            />
          </div>
          <div className="form-group">
            <label>Lat</label>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              placeholder="17.45"
            />
          </div>
          <div className="form-group">
            <label>Lon</label>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              placeholder="78.38"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Active">Active</option>
              <option value="Fault Reported">Fault Reported</option>
              <option value="Under Maintenance">Under Maintenance</option>
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
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.pole_id}</td>
                <td>{p.location || "—"}</td>
                <td>{p.latitude != null ? p.latitude : "—"}</td>
                <td>{p.longitude != null ? p.longitude : "—"}</td>
                <td>
                  <span className={"status-pill status-" + (p.status || "").toLowerCase().replace(/\s+/g, "-")}>
                    {p.status || "—"}
                  </span>
                </td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(p)}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => del(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading && <p className="hint-text">No light poles.</p>}
      </div>
    </div>
  );
}

export default LightPolesTable;
