import React, { useEffect, useState } from "react";
import {
  fetchSensorDevices,
  createSensorDevice,
  updateSensorDevice,
  deleteSensorDevice,
  fetchLightPoles
} from "../../dataService";

function SensorDevicesTable() {
  const [list, setList] = useState([]);
  const [poles, setPoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ device_id: "", light_pole_id: "", type: "", status: "Active" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([fetchSensorDevices(), fetchLightPoles()])
      .then(([d, pl]) => {
        setList(Array.isArray(d) ? d : []);
        setPoles(Array.isArray(pl) ? pl : []);
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ device_id: "", light_pole_id: "", type: "", status: "Active" });
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.device_id.trim() || !form.light_pole_id) return;
    setSubmitting(true);
    try {
      const payload = {
        device_id: form.device_id.trim(),
        light_pole_id: Number(form.light_pole_id),
        type: form.type || undefined,
        status: form.status || "Active"
      };
      if (editing) {
        await updateSensorDevice(editing.id, payload);
      } else {
        await createSensorDevice(payload);
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
    if (!window.confirm("Delete this device?")) return;
    try {
      await deleteSensorDevice(id);
      load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      device_id: row.device_id || "",
      light_pole_id: String(row.light_pole_id || ""),
      type: row.type || "",
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
            <label>Device ID</label>
            <input
              value={form.device_id}
              onChange={(e) => setForm((f) => ({ ...f, device_id: e.target.value }))}
              placeholder="S-001"
              required
            />
          </div>
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
            <label>Type</label>
            <input
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              placeholder="Lux Sensor"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Active">Active</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
        </form>
      )}
      <div className="table-wrapper">
        <table className="data-table data-table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Device ID</th>
              <th>Pole ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.device_id}</td>
                <td>{s.pole_id || s.light_pole_id}</td>
                <td>{s.type || "—"}</td>
                <td>{s.status || "—"}</td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(s)}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => del(s.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading && <p className="hint-text">No sensor devices.</p>}
      </div>
    </div>
  );
}

export default SensorDevicesTable;
