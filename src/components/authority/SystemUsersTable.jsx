import React, { useEffect, useState } from "react";
import {
  fetchSystemUsers,
  createSystemUser,
  updateSystemUser,
  deleteSystemUser,
  fetchMaintenanceTeams
} from "../../dataService";

function SystemUsersTable() {
  const [list, setList] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "citizen",
    maintenance_team_id: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([fetchSystemUsers(), fetchMaintenanceTeams()])
      .then(([u, t]) => {
        setList(Array.isArray(u) ? u : []);
        setTeams(Array.isArray(t) ? t : []);
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ full_name: "", email: "", password: "", role: "citizen", maintenance_team_id: "" });
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    if (!editing && !form.password) {
      setError("Password required for new user.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        const payload = {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          role: form.role,
          maintenance_team_id: form.maintenance_team_id ? Number(form.maintenance_team_id) : null
        };
        if (form.password) payload.password = form.password;
        await updateSystemUser(editing.id, payload);
      } else {
        await createSystemUser({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          maintenance_team_id: form.maintenance_team_id ? Number(form.maintenance_team_id) : null
        });
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
    if (!window.confirm("Delete this user?")) return;
    try {
      await deleteSystemUser(id);
      load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      full_name: row.full_name || "",
      email: row.email || "",
      password: "",
      role: row.role || "citizen",
      maintenance_team_id: row.maintenance_team_id != null ? String(row.maintenance_team_id) : ""
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
            <label>Full name</label>
            <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              readOnly={!!editing}
            />
          </div>
          <div className="form-group">
            <label>Password {editing && "(leave blank to keep)"}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editing ? "••••••" : "min 6 chars"}
              required={!editing}
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="citizen">Citizen</option>
              <option value="maintenance">Maintenance</option>
              <option value="authority">Authority</option>
            </select>
          </div>
          <div className="form-group">
            <label>Team (maintenance)</label>
            <select
              value={form.maintenance_team_id}
              onChange={(e) => setForm((f) => ({ ...f, maintenance_team_id: e.target.value }))}
            >
              <option value="">—</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
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
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Team</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.team_name ?? "—"}</td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(u)}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => del(u.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading && <p className="hint-text">No users.</p>}
      </div>
    </div>
  );
}

export default SystemUsersTable;
