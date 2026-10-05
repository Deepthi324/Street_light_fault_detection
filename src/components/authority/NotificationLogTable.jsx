import React, { useEffect, useState } from "react";
import {
  fetchNotificationLog,
  createNotificationLog,
  updateNotificationLog,
  deleteNotificationLog
} from "../../dataService";

function NotificationLogTable() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: "", recipient: "", message: "", sent_at: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    fetchNotificationLog()
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ type: "", recipient: "", message: "", sent_at: "" });
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        type: form.type || undefined,
        recipient: form.recipient || undefined,
        message: form.message || undefined,
        sent_at: form.sent_at || undefined
      };
      if (editing) {
        await updateNotificationLog(editing.id, payload);
      } else {
        await createNotificationLog(payload);
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
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteNotificationLog(id);
      load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    const d = row.sent_at ? new Date(row.sent_at) : null;
    const dateStr = d ? d.toISOString().slice(0, 16) : "";
    setForm({
      type: row.type || "",
      recipient: row.recipient || "",
      message: row.message || "",
      sent_at: dateStr
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
            <label>Type</label>
            <input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Email" />
          </div>
          <div className="form-group">
            <label>Recipient</label>
            <input value={form.recipient} onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))} placeholder="email or name" />
          </div>
          <div className="form-group">
            <label>Message</label>
            <input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Message" />
          </div>
          <div className="form-group">
            <label>Sent at</label>
            <input type="datetime-local" value={form.sent_at} onChange={(e) => setForm((f) => ({ ...f, sent_at: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
        </form>
      )}
      <div className="table-wrapper">
        <table className="data-table data-table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Recipient</th>
              <th>Message</th>
              <th>Sent At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id}>
                <td>{n.id}</td>
                <td>{n.type || "—"}</td>
                <td>{n.recipient || "—"}</td>
                <td>{(n.message || "").slice(0, 60)}{(n.message || "").length > 60 ? "…" : ""}</td>
                <td>{n.sent_at != null ? new Date(n.sent_at).toLocaleString() : "—"}</td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(n)}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => del(n.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading && <p className="hint-text">No notifications.</p>}
      </div>
    </div>
  );
}

export default NotificationLogTable;
