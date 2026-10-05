import React, { useEffect, useState } from "react";
import {
  fetchPowerConsumption,
  createPowerConsumption,
  updatePowerConsumption,
  deletePowerConsumption,
  fetchLightPoles
} from "../../dataService";

function PowerConsumptionPanel() {
  const [list, setList] = useState([]);
  const [poles, setPoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ light_pole_id: "", record_date: "", kwh: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([fetchPowerConsumption(), fetchLightPoles()])
      .then(([d, pl]) => {
        setList(Array.isArray(d) ? d : []);
        setPoles(Array.isArray(pl) ? pl : []);
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const total = list.reduce((s, r) => s + (Number(r.kwh) || 0), 0);

  const resetForm = () => {
    setForm({ light_pole_id: "", record_date: "", kwh: "" });
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.light_pole_id || !form.record_date) return;
    setSubmitting(true);
    try {
      const payload = {
        light_pole_id: Number(form.light_pole_id),
        record_date: form.record_date,
        kwh: form.kwh === "" ? 0 : Number(form.kwh)
      };
      if (editing) {
        await updatePowerConsumption(editing.id, payload);
      } else {
        await createPowerConsumption(payload);
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
    if (!window.confirm("Delete this record?")) return;
    try {
      await deletePowerConsumption(id);
      load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      light_pole_id: String(row.light_pole_id || ""),
      record_date: row.record_date ? String(row.record_date).slice(0, 10) : "",
      kwh: row.kwh != null ? String(row.kwh) : ""
    });
    setShowForm(true);
  };

  if (loading) return <p className="hint-text">Loading…</p>;

  return (
    <div>
      <div className="power-summary" style={{ marginBottom: "0.75rem" }}>
        <span className="power-summary-value">{total.toFixed(1)} kWh</span>
        <span className="power-summary-label">total</span>
      </div>
      {error && <p className="hint-text" style={{ color: "#b91c1c", marginBottom: "0.5rem" }}>{error}</p>}
      <div className="action-btns" style={{ marginBottom: "0.75rem" }}>
        <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "Add"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={save} className="form-inline" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <label>Pole</label>
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
            <label>Date</label>
            <input
              type="date"
              value={form.record_date}
              onChange={(e) => setForm((f) => ({ ...f, record_date: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>kWh</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.kwh}
              onChange={(e) => setForm((f) => ({ ...f, kwh: e.target.value }))}
              placeholder="0"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
        </form>
      )}
      <div className="table-wrapper">
        <table className="data-table data-table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Pole ID</th>
              <th>Date</th>
              <th>kWh</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.pole_id ?? r.light_pole_id ?? "—"}</td>
                <td>{r.record_date != null ? String(r.record_date).slice(0, 10) : "—"}</td>
                <td>{r.kwh != null ? Number(r.kwh).toFixed(2) : "—"}</td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(r)}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => del(r.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading && <p className="hint-text">No records.</p>}
      </div>
    </div>
  );
}

export default PowerConsumptionPanel;
