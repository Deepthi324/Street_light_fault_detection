import React, { useState } from 'react';
import AssignedIncidentsPanel from '../components/maintenance/AssignedIncidentsPanel.jsx';
import MaintenanceStatusPanel from '../components/maintenance/MaintenanceStatusPanel.jsx';

function MaintenanceDashboard({ user }) {
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  return (
    <div className="page">
      <h2 className="page-title">Maintenance Dashboard</h2>
      <p className="page-description">
        View assigned incidents and update maintenance activity statuses. This
        interface simulates how maintenance staff interact with incident and
        activity tables.
      </p>

      <div className="grid-2">
        <section className="card">
          <h3>Assigned Incidents</h3>
          <AssignedIncidentsPanel
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={setSelectedIncidentId}
          />
        </section>

        <section className="card">
          <h3>Maintenance Activity Status Updates</h3>
          <MaintenanceStatusPanel selectedIncidentId={selectedIncidentId} />
        </section>
      </div>
    </div>
  );
}

export default MaintenanceDashboard;

