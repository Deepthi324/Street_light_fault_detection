import React, { useState, useEffect } from "react";
import { createComplaint, fetchLightPoles } from "../../dataService";

function ComplaintForm({ user, onSubmitted }) {
  const [poleId, setPoleId] = useState("");
  const [poles, setPoles] = useState([]);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const citizenEmail = user?.email || "";
  const [contact, setContact] = useState(citizenEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLightPoles()
      .then((d) => setPoles(Array.isArray(d) ? d : []))
      .catch(() => setPoles([]));
  }, []);

  useEffect(() => {
    if (citizenEmail) setContact(citizenEmail);
  }, [citizenEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const pid = poleId ? Number(poleId) : null;
    if (!pid || !description.trim() || !name.trim() || !contact.trim()) {
      setError("Name, contact, pole, and description are required.");
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await createComplaint({
        citizen_name: name,
        contact,
        description,
        light_pole_id: pid,
        pole_id: pid,
        poleId: pid
      });
      const submittedAt = new Date().toLocaleString();
      onSubmitted?.({
        poleId: pid,
        description,
        submittedAt,
        complaintId: result?.complaint_id
      });
      setPoleId("");
      setDescription("");
      setName("");
      setContact(citizenEmail);
    } catch (err) {
      setError(err?.message || "Failed to submit complaint");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="complaint-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Your Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kinnera"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="contact">Contact (Email)</label>
        <input
          id="contact"
          type="email"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="e.g. you@example.com"
          required
          readOnly={!!citizenEmail}
        />
        {citizenEmail && <p className="hint-text" style={{ marginTop: 2 }}>Uses your sign-in email so you can view status under My Complaints.</p>}
      </div>
      <div className="form-group">
        <label htmlFor="poleId">Light Pole</label>
        <select
          id="poleId"
          value={poleId}
          onChange={(e) => setPoleId(e.target.value)}
          required
        >
          <option value="">Select pole…</option>
          {poles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.pole_id || `Pole ${p.id}`} {p.location ? `– ${p.location}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue (light off, blinking, damaged pole, etc.)"
          required
        />
      </div>
      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit Complaint"}
      </button>
      {error && <p style={{ color: "#b91c1c", marginTop: 8, fontSize: "0.85rem" }}>{error}</p>}
    </form>
  );
}

export default ComplaintForm;
