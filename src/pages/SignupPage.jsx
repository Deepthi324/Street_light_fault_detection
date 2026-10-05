import React, { useState } from "react";
import { auth } from "../dataService";

const ROLES = [
  { value: "citizen", label: "Citizen" },
  { value: "maintenance", label: "Maintenance" },
  { value: "authority", label: "Authority" }
];

function SignupPage({ onSignupSuccess, onBackToLogin }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("citizen");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await auth.signup({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role
      });
      if (!res.success) throw new Error(res.message || "Signup failed");
      onSignupSuccess?.();
    } catch (err) {
      setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">
          <h1>Create account</h1>
          <p>Smart Street Light Fault Detection</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="su-fullName">Full name</label>
            <input
              id="su-fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="su-email">Email</label>
            <input
              id="su-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="su-password">Password</label>
            <input
              id="su-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="su-confirm">Confirm password</label>
            <input
              id="su-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Same as above"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="su-role">Role</label>
            <select id="su-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="auth-error" style={{ color: "#b91c1c", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing up…" : "Sign up"}
          </button>
          <p className="auth-note">
            Already have an account?{" "}
            <button type="button" className="btn-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "inherit" }} onClick={onBackToLogin}>
              Log in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default SignupPage;
