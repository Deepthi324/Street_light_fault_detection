import React, { useState } from "react";
import { auth, setAuth } from "../dataService";

function LoginPage({ onLogin, onGoToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await auth.login({ email: email.trim(), password });
      if (!res.success || !res.data) throw new Error(res.message || "Login failed");
      const role = (res.data.role || "").toLowerCase();
      if (!["citizen", "maintenance", "authority"].includes(role)) {
        setError("Invalid role or unauthorized access.");
        setLoading(false);
        return;
      }
      setAuth(res.token, res.data);
      onLogin(res.data);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">
          <h1>Smart Street Light Fault Detection</h1>
          <p>Sign in – role is determined by your account</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </div>
          {error && (
            <p className="auth-error" style={{ color: "#b91c1c", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="auth-note">
            No account?{" "}
            <button type="button" className="btn-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "inherit" }} onClick={onGoToSignup}>
              Sign up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
