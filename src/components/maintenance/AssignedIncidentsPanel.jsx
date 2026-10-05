import React, { useEffect, useState } from "react";
import { fetchIncidents } from "../../dataService";

function AssignedIncidentsPanel({ selectedIncidentId, onSelectIncident }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let c = false;
    setLoading(true);
    setError("");
    fetchIncidents()
      .then((d) => { if (!c) setList(Array.isArray(d) ? d : []); })
      .catch((e) => { if (!c) setError(e.message || "Failed to load"); })
      .finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  if (loading) return <p className="hint-text">Loading…</p>;
  if (error) return <p className="hint-text" style={{ color: "#b91c1c" }}>{error}</p>;

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Incident ID</th>
            <th>Pole ID</th>
            <th>Location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map((i) => (
            <tr
              key={i.id}
              className={i.id === selectedIncidentId ? "row-selected" : ""}
              onClick={() => onSelectIncident(i.id)}
              style={{ cursor: "pointer" }}
            >
              <td>{i.id}</td>
              <td>{i.pole_id || i.light_pole_id || "—"}</td>
              <td>{i.location || "—"}</td>
              <td>
                <span className={"status-pill status-" + (i.status || "").toLowerCase().replace(/\s+/g, "-")}>
                  {i.status || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <p className="hint-text">No assigned incidents.</p>}
    </div>
  );
}

export default AssignedIncidentsPanel;
