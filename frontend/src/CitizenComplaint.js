import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

function CitizenComplaint({ setIncidents, onBack, user }) {
  const [formData, setFormData] = useState({
    pole_id: "",
    complaint_type: "Bulb Failure",
    description: "",
    citizen_name: user?.fullName || "",
    citizen_email: user?.email || "",
    citizen_phone: "",
    location_description: "",
    urgency: "Medium"
  });

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        citizen_name: user.fullName || prev.citizen_name,
        citizen_email: user.email || prev.citizen_email
      }));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState({});

  const complaintTypes = [
    "Bulb Failure",
    "Flickering Light",
    "Light Always On",
    "Light Never On",
    "Damaged Pole",
    "Wiring Issue",
    "Sensor Problem",
    "Other"
  ];

  const urgencyLevels = ["Low", "Medium", "High", "Critical"];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.pole_id.trim()) {
      newErrors.pole_id = "Pole ID is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!formData.citizen_name.trim()) {
      newErrors.citizen_name = "Name is required";
    }

    if (!formData.citizen_email.trim()) {
      newErrors.citizen_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.citizen_email)) {
      newErrors.citizen_email = "Please enter a valid email";
    }

    if (!formData.citizen_phone.trim()) {
      newErrors.citizen_phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.citizen_phone.replace(/\D/g, ''))) {
      newErrors.citizen_phone = "Please enter a valid 10-digit phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const token = AuthService.getToken();
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // CRITICAL: Use the logged-in user's email to ensure complaints can be retrieved
      const complaintData = {
        citizen_name: formData.citizen_name,
        contact: user?.email || formData.citizen_email, // Use JWT email
        phone: formData.citizen_phone,
        description: formData.description,
        pole_id: formData.pole_id,
        complaint_type: formData.complaint_type,
        location_description: formData.location_description,
        urgency: formData.urgency
      };

      console.log("Submitting complaint with email:", complaintData.contact);

      const response = await fetch("http://localhost:4003/api/complaints", {
        method: "POST",
        headers,
        body: JSON.stringify(complaintData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 5000);
        setFormData({
          pole_id: "",
          complaint_type: "Bulb Failure",
          description: "",
          citizen_name: "",
          citizen_email: "",
          citizen_phone: "",
          location_description: "",
          urgency: "Medium"
        });
      } else {
        const errorMsg = data.message || "Unknown error";
        console.error("Failed to submit complaint:", errorMsg);
        alert(`Failed to submit complaint: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error submitting complaint:", error);
      const errorMessage = error.message || "Network error. Please check if you're logged in and try again.";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  if (showConfirmation) {
    return (
      <div className="module">
        <div className="module-header">
          <h2>📝 Register Complaint</h2>
          <button onClick={onBack} className="btn btn-secondary">← Back to Dashboard</button>
        </div>
        <div className="confirmation-message">
          <div className="confirmation-icon">✅</div>
          <h3>Complaint Submitted Successfully!</h3>
          <p>Your complaint has been registered and will be processed shortly.</p>
          <p><strong>Reference ID:</strong> #{Date.now()}</p>
          <p>We will notify you once the issue is resolved.</p>
          <button onClick={onBack} className="btn btn-primary" style={{ marginTop: "20px" }}>Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="module">
      <div className="module-header">
        <h2>📝 Register Complaint</h2>
        <button onClick={onBack} className="btn btn-secondary">← Back to Dashboard</button>
      </div>
      <p style={{ padding: "10px", marginBottom: "20px", color: "#666" }}>Report street light issues in your area. We'll address them promptly.</p>

      <form className="complaint-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="pole_id">Pole ID *</label>
            <input
              type="text"
              id="pole_id"
              name="pole_id"
              value={formData.pole_id}
              onChange={handleChange}
              className={`form-control ${errors.pole_id ? 'error' : ''}`}
              placeholder="e.g., 102"
              disabled={isSubmitting}
            />
            {errors.pole_id && <div className="error-message">{errors.pole_id}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="complaint_type">Issue Type *</label>
            <select
              id="complaint_type"
              name="complaint_type"
              value={formData.complaint_type}
              onChange={handleChange}
              className="form-control"
              disabled={isSubmitting}
            >
              {complaintTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={`form-control ${errors.description ? 'error' : ''}`}
            placeholder="Please describe the issue in detail..."
            rows="4"
            disabled={isSubmitting}
          />
          {errors.description && <div className="error-message">{errors.description}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="location_description">Location Details</label>
          <input
            type="text"
            id="location_description"
            name="location_description"
            value={formData.location_description}
            onChange={handleChange}
            className="form-control"
            placeholder="e.g., Near the bus stop, opposite the pharmacy"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="urgency">Urgency Level</label>
            <select
              id="urgency"
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="form-control"
              disabled={isSubmitting}
            >
              {urgencyLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h4>Your Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="citizen_name">Full Name *</label>
              <input
                type="text"
                id="citizen_name"
                name="citizen_name"
                value={formData.citizen_name}
                onChange={handleChange}
                className={`form-control ${errors.citizen_name ? 'error' : ''}`}
                placeholder="John Doe"
                disabled={isSubmitting}
              />
              {errors.citizen_name && <div className="error-message">{errors.citizen_name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="citizen_email">Email Address * (from your account)</label>
              <input
                type="email"
                id="citizen_email"
                name="citizen_email"
                value={formData.citizen_email}
                onChange={handleChange}
                className={`form-control ${errors.citizen_email ? 'error' : ''}`}
                placeholder="john@example.com"
              />
              {errors.citizen_email && <div className="error-message">{errors.citizen_email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="citizen_phone">Phone Number *</label>
              <input
                type="tel"
                id="citizen_phone"
                name="citizen_phone"
                value={formData.citizen_phone}
                onChange={handleChange}
                className={`form-control ${errors.citizen_phone ? 'error' : ''}`}
                placeholder="(555) 123-4567"
                disabled={isSubmitting}
              />
              {errors.citizen_phone && <div className="error-message">{errors.citizen_phone}</div>}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Complaint"}
        </button>
      </form>
    </div>
  );
}

export default CitizenComplaint;
