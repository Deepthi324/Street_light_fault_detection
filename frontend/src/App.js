import { useState, useEffect } from "react";
import "./municipal-theme.css";
import "./styles.css";
import "./professional-dashboard.css";

import Auth from "./Login";
import Dashboard from "./components/Dashboard";
import AuthService from './services/AuthService';

import SystemUser from "./SystemUser";
import LightPole from "./LightPole";
import SensorReading from "./SensorReading";
import PowerConsumption from "./PowerConsumption";
import MaintenanceActivity from "./MaintenanceActivity";
import MaintenanceTasks from "./MaintenanceTasks";
import MaintenanceTeam from "./MaintenanceTeam";
import NotificationLog from "./NotificationLog";
import SensorDevice from "./SensorDevice";
import Incident from "./Incident";
import CitizenComplaint from "./CitizenComplaint";
import CitizenComplaints from "./CitizenComplaints";
import Neo4jAnalytics from "./Neo4jAnalytics";
function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");

  // Check for existing session on app load
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    AuthService.clearSession();
    setUser(null);
    setCurrentPage("dashboard");
  };

  const handleNavigation = (page) => {
    setCurrentPage(page);
  };

  // Role-based access control
  const canAccessPage = (page) => {
    if (!user) return false;

    const userRole = user.role;

    // Authority can access everything
    if (userRole === 'authority') return true;

    // Maintenance can access maintenance-related pages
    if (userRole === 'maintenance') {
      const maintenancePages = [
        'dashboard', 'lights', 'devices', 'sensors', 'power', 'incidents',
        'maintenance', 'mytasks', 'teams', 'notifications'
      ];
      return maintenancePages.includes(page);
    }

    // Citizen can access citizen-specific pages only
    if (userRole === 'citizen') {
      const citizenPages = [
        'dashboard', 'complaints', 'incidents', 'notifications'
      ];
      return citizenPages.includes(page);
    }

    return false;
  };

  const renderCurrentPage = () => {
    // Check if user can access the requested page
    if (!canAccessPage(currentPage)) {
      return (
        <div className="module">
          <h2>🚫 Unauthorized Access</h2>
          <p>You don't have permission to access this page.</p>
          <button onClick={() => setCurrentPage('dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case "users":
        return <SystemUser onBack={() => handleNavigation("dashboard")} user={user} />;
      case "lights":
        return <LightPole onBack={() => handleNavigation("dashboard")} user={user} />;
      case "sensors":
        return <SensorReading onBack={() => handleNavigation("dashboard")} user={user} />;
      case "power":
        return <PowerConsumption onBack={() => handleNavigation("dashboard")} user={user} />;
      case "incidents":
        return <Incident onBack={() => handleNavigation("dashboard")} user={user} />;
      case "maintenance":
        return <MaintenanceActivity onBack={() => handleNavigation("dashboard")} user={user} />;
      case "mytasks":
        return <MaintenanceTasks onBack={() => handleNavigation("dashboard")} user={user} />;
      case "teams":
        return <MaintenanceTeam onBack={() => handleNavigation("dashboard")} user={user} />;
      case "notifications":
        return <NotificationLog onBack={() => handleNavigation("dashboard")} user={user} />;
      case "devices":
        return <SensorDevice onBack={() => handleNavigation("dashboard")} user={user} />;
      case "neo4j":
        return <Neo4jAnalytics onBack={() => handleNavigation("dashboard")} user={user} />;
      case "complaints":
        // Show complaint form for citizens, complaints management for authorities
        if (user.role === 'citizen') {
          return <CitizenComplaint onBack={() => handleNavigation("dashboard")} user={user} />;
        } else {
          return <CitizenComplaints onBack={() => handleNavigation("dashboard")} user={user} />;
        }
      default:
        return <Dashboard key={currentPage} user={user} onLogout={handleLogout} onNavigate={handleNavigation} />;
    }
  };

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="App">
      {renderCurrentPage()}
    </div>
  );
}

export default App;
