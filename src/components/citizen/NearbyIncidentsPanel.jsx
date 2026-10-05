import React, { useEffect, useState } from "react";
import { fetchIncidents } from "../../dataService";

function NearbyIncidentsPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchIncidents()
      .then((data) => { if (!cancelled) setList(Array.isArray(data) ? data : []); })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load incidents"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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
            <tr key={i.id}>
              <td>{i.id}</td>
              <td>{i.pole_id || i.light_pole_id || "—"}</td>
              <td>{i.location || "—"}</td>
              <td>
                <span className={`status-pill status-${(i.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                  {i.status || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <p className="hint-text">No nearby incidents.</p>}
    </div>
  );
}

export default NearbyIncidentsPanel;
