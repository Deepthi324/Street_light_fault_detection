import React, { useEffect, useState } from "react";
import {
    fetchComplaints,
    updateComplaintStatus,
    fetchMaintenanceTeams,
    createIncident,
    createMaintenanceActivity
} from "../../dataService";

function ComplaintsTable() {
    const [list, setList] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState(null);
    const [responseForm, setResponseForm] = useState({
        status: "",
        authority_response: ""
    });

    // Assignment Modal State
    const [assigningComplaint, setAssigningComplaint] = useState(null);
    const [assignForm, setAssignForm] = useState({
        team_id: "",
        notes: ""
    });

    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        setError("");
        Promise.all([fetchComplaints(), fetchMaintenanceTeams()])
            .then(([compData, teamData]) => {
                setList(Array.isArray(compData) ? compData : []);
                setTeams(Array.isArray(teamData) ? teamData : []);
            })
            .catch((e) => setError(e.message || "Failed to load complaints"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const openReview = (item) => {
        setSelected(item);
        setResponseForm({
            status: item.status || "OPEN",
            authority_response: item.authority_response || ""
        });
    };

    const closeReview = () => {
        setSelected(null);
        setResponseForm({ status: "", authority_response: "" });
    };

    const openAssign = (complaint) => {
        setAssigningComplaint(complaint);
        setAssignForm({ team_id: "", notes: "" });
    };

    const closeAssign = () => {
        setAssigningComplaint(null);
    };

    const submitResponse = async (e) => {
        e.preventDefault();
        if (!selected) return;
        setSubmitting(true);
        try {
            await updateComplaintStatus(selected.id, responseForm);
            load();
            closeReview();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!assigningComplaint || !assignForm.team_id) return;
        setSubmitting(true);
        try {
            // 1. Create Incident
            const incident = await createIncident({
                light_pole_id: assigningComplaint.light_pole_id,
                reported_by: assigningComplaint.citizen_name || "Citizen",
                type: "Citizen Complaint",
                priority: "Medium",
                status: "Open"
            });

            // 2. Create Maintenance Activity
            await createMaintenanceActivity({
                incident_id: incident.id,
                team_id: Number(assignForm.team_id),
                status: "Pending",
                notes: assignForm.notes || `Linked to Complaint #${assigningComplaint.id}`
            });

            // 3. Update Complaint Status
            await updateComplaintStatus(assigningComplaint.id, {
                status: "IN_PROGRESS",
                authority_response: "Maintenance team assigned. Tracking via Incident #" + incident.id
            });

            alert("Maintenance team assigned successfully!");
            closeAssign();
            load();
        } catch (err) {
            alert("Assignment failed: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p className="hint-text">Loading complaints...</p>;

    return (
        <div>
            {error && <p className="error-text">{error}</p>}

            {/* Review Modal */}
            {selected && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Review Complaint #{selected.id}</h3>
                        <p><strong>Citizen:</strong> {selected.citizen_name} ({selected.contact})</p>
                        <p><strong>Pole:</strong> {selected.pole_number ? `Pole ${selected.pole_number}` : (selected.light_pole_id ? `Pole ID: ${selected.light_pole_id}` : "N/A")}</p>
                        <p><strong>Description:</strong> {selected.description}</p>

                        <form onSubmit={submitResponse} style={{ marginTop: "1rem" }}>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={responseForm.status}
                                    onChange={e => setResponseForm({ ...responseForm, status: e.target.value })}
                                >
                                    <option value="OPEN">OPEN</option>
                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="RESOLVED">RESOLVED</option>
                                    <option value="DECLINED">DECLINED</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Response</label>
                                <textarea
                                    rows="3"
                                    value={responseForm.authority_response}
                                    onChange={e => setResponseForm({ ...responseForm, authority_response: e.target.value })}
                                    placeholder="Write a response..."
                                ></textarea>
                            </div>
                            <div className="action-btns">
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? "Saving..." : "Update Status"}
                                </button>
                                <button type="button" className="btn-ghost" onClick={closeReview}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {assigningComplaint && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Assign Maintenance for Complaint #{assigningComplaint.id}</h3>
                        <p><strong>Pole:</strong> {assigningComplaint.pole_number || assigningComplaint.light_pole_id || "N/A"}</p>
                        <form onSubmit={handleAssign}>
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
                                <label>Instructions (Notes)</label>
                                <textarea
                                    value={assignForm.notes}
                                    onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })}
                                    placeholder="Add notes for the team..."
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

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Citizen</th>
                            <th>Pole</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((c) => (
                            <tr key={c.id}>
                                <td>{c.id}</td>
                                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                                <td>
                                    {c.citizen_name}<br />
                                    <small>{c.contact}</small>
                                </td>
                                <td>{c.pole_number || c.light_pole_id || "—"}</td>
                                <td>{c.description}</td>
                                <td>
                                    <span className={`status-pill status-${c.status.toLowerCase().replace("_", "-")}`}>
                                        {c.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn-small" onClick={() => openReview(c)}>Review</button>
                                        {c.status === "OPEN" && (
                                            <button className="btn-small" onClick={() => openAssign(c)}>Assign</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {list.length === 0 && <p className="hint-text">No complaints found.</p>}
            </div>
        </div>
    );
}

export default ComplaintsTable;
