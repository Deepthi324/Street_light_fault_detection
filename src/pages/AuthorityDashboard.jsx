import React from 'react';
import SystemUsersTable from '../components/authority/SystemUsersTable.jsx';
import LightPolesTable from '../components/authority/LightPolesTable.jsx';
import SensorReadingsPanel from '../components/authority/SensorReadingsPanel.jsx';
import PowerConsumptionPanel from '../components/authority/PowerConsumptionPanel.jsx';
import IncidentsTable from '../components/authority/IncidentsTable.jsx';
import MaintenanceActivityTable from '../components/authority/MaintenanceActivityTable.jsx';
import SensorDevicesTable from '../components/authority/SensorDevicesTable.jsx';
import MaintenanceTeamsTable from '../components/authority/MaintenanceTeamsTable.jsx';
import NotificationLogTable from '../components/authority/NotificationLogTable.jsx';
import ComplaintsTable from '../components/authority/ComplaintsTable.jsx';

function AuthorityDashboard({ user }) {
  return (
    <div className="page">
      <h2 className="page-title">Authority Dashboard</h2>
      <p className="page-description">
        Overview of system entities and operational data. All modules below
        correspond to database tables in the Smart Street Light system.
      </p>

      <div className="grid-2">
        <section className="card">
          <h3>System Users</h3>
          <SystemUsersTable />
        </section>

        <section className="card">
          <h3>Complaints</h3>
          <ComplaintsTable />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Light Poles</h3>
          <LightPolesTable />
        </section>

        <section className="card">
          <h3>Incidents</h3>
          <IncidentsTable />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Sensor Readings (Live-style)</h3>
          <SensorReadingsPanel />
        </section>

        <section className="card">
          <h3>Power Consumption</h3>
          <PowerConsumptionPanel />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Maintenance Activity</h3>
          <MaintenanceActivityTable />
        </section>

        <section className="card">
          <h3>Maintenance Teams</h3>
          <MaintenanceTeamsTable />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Sensor Devices</h3>
          <SensorDevicesTable />
        </section>

        <section className="card">
          <h3>Notification Log</h3>
          <NotificationLogTable />
        </section>
      </div>
    </div>
  );
}

export default AuthorityDashboard;

