import React, { useState, useEffect } from "react";
import { getToken, getStoredUser, clearAuth } from "./dataService";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import AuthorityDashboard from "./pages/AuthorityDashboard.jsx";
import MaintenanceDashboard from "./pages/MaintenanceDashboard.jsx";
import CitizenDashboard from "./pages/CitizenDashboard.jsx";
import Header from "./components/layout/Header.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const token = getToken();
    const u = getStoredUser();
    if (token && u && u.role) setUser(u);
    const on401 = () => setUser(null);
    window.addEventListener("auth:401", on401);
    return () => window.removeEventListener("auth:401", on401);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
  };

  const handleSignupSuccess = () => {
    setShowSignup(false);
  };

  let content;
  if (!user) {
    if (showSignup) {
      content = (
        <SignupPage
          onSignupSuccess={handleSignupSuccess}
          onBackToLogin={() => setShowSignup(false)}
        />
      );
    } else {
      content = <LoginPage onLogin={handleLogin} onGoToSignup={() => setShowSignup(true)} />;
    }
  } else {
    const role = (user.role || "").toLowerCase();
    if (role === "authority") content = <AuthorityDashboard user={user} />;
    else if (role === "maintenance") content = <MaintenanceDashboard user={user} />;
    else if (role === "citizen") content = <CitizenDashboard user={user} />;
    else content = (
      <div className="page">
        <div className="card">
          <h2 className="page-title">Access not allowed</h2>
          <p className="page-description">Your account role is not authorized for this system. Please contact support or sign in with a different account.</p>
          <button type="button" className="btn-primary" onClick={handleLogout}>Sign out</button>
        </div>
      </div>
    );
  }

  const roleLabel = { citizen: "Citizen", maintenance: "Maintenance Staff", authority: "Authority" }[user?.role?.toLowerCase()] || user?.role || "";
  const displayRole = user ? roleLabel : null;
  const displayEmail = user?.email || "";

  return (
    <div className="app-shell">
      <Header role={displayRole} userEmail={displayEmail} onLogout={handleLogout} />
      <main className="app-main">{content}</main>
    </div>
  );
}

export default App;
