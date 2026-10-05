import React, { useState, useEffect } from "react";
import { fetchComplaints, fetchNotificationsMe } from "../dataService";
import NearbyIncidentsPanel from "../components/citizen/NearbyIncidentsPanel.jsx";
import ComplaintForm from "../components/citizen/ComplaintForm.jsx";

function CitizenDashboard({ user }) {
  const [lastComplaint, setLastComplaint] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [complaintsError, setComplaintsError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  const loadComplaints = () => {
    setComplaintsLoading(true);
    setComplaintsError("");
    fetchComplaints()
      .then((d) => setComplaints(Array.isArray(d) ? d : []))
      .catch((e) => setComplaintsError(e.message || "Failed to load"))
      .finally(() => setComplaintsLoading(false));
  };

  const loadNotifications = () => {
    setNotifsLoading(true);
    fetchNotificationsMe()
      .then((d) => setNotifications(Array.isArray(d) ? d : []))
      .catch(() => setNotifications([]))
      .finally(() => setNotifsLoading(false));
  };

  useEffect(() => {
    loadComplaints();
    loadNotifications();
  }, []);

  const onSubmitted = (data) => {
    setLastComplaint(data);
    loadComplaints();
    loadNotifications();
  };

  return (
    <div className="page">
      <h2 className="page-title">Citizen Portal</h2>
      <p className="page-description">
        View nearby incidents, register a complaint, and check your complaint status.
      </p>

      <div className="grid-2">
        <section className="card">
          <h3>Nearby Incidents</h3>
          <NearbyIncidentsPanel />
        </section>
        <section className="card">
          <h3>Register Complaint</h3>
          <ComplaintForm user={user} onSubmitted={onSubmitted} />
          {lastComplaint && (
            <div className="alert-success">
              Complaint submitted for pole <strong>{lastComplaint.poleId}</strong>
              {lastComplaint.complaintId != null ? (
                <> (ID: <strong>{lastComplaint.complaintId}</strong>)</>
              ) : null}
              {" "}at <strong>{lastComplaint.submittedAt}</strong>.
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h3>My Complaints</h3>
        <p className="hint-text">Complaints linked to your contact email. Status updates appear in Notifications below.</p>
        {complaintsLoading && <p className="hint-text">Loading…</p>}
        {complaintsError && <p className="hint-text" style={{ color: "#b91c1c" }}>{complaintsError}</p>}
        {!complaintsLoading && !complaintsError && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pole</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.pole_id ?? c.light_pole_id ?? "—"}</td>
                    <td>{(c.description || "").slice(0, 80)}{(c.description || "").length > 80 ? "…" : ""}</td>
                    <td>
                      <span className={`status-pill status-${(c.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                        {c.status || "—"}
                      </span>
                    </td>
                    <td>{c.created_at != null ? new Date(c.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {complaints.length === 0 && <p className="hint-text">No complaints yet.</p>}
          </div>
        )}
      </section>

      <section className="card">
        <h3>Notifications</h3>
        <p className="hint-text">Updates about your complaints (e.g. status changes, resolution).</p>
        {notifsLoading && <p className="hint-text">Loading…</p>}
        {!notifsLoading && (
          <div className="table-wrapper">
            <table className="data-table data-table-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td>{n.type || "—"}</td>
                    <td>{n.message || "—"}</td>
                    <td>{n.sent_at != null ? new Date(n.sent_at).toLocaleString() : n.created_at != null ? new Date(n.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {notifications.length === 0 && <p className="hint-text">No notifications yet.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

export default CitizenDashboard;
