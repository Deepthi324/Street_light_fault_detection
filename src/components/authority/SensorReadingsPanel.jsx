import React, { useEffect, useState } from "react";
import { fetchSensorDevices } from "../../dataService";

function SensorReadingsPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let c = false;
    setLoading(true);
    setError("");
    fetchSensorDevices()
      .then((d) => { if (!c) setList(Array.isArray(d) ? d : []); })
      .catch((e) => { if (!c) setError(e.message || "Failed to load"); })
      .finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  if (loading) return <p className="hint-text">Loading…</p>;
  if (error) return <p className="hint-text" style={{ color: "#b91c1c" }}>{error}</p>;

  return (
    <div className="table-wrapper">
      <table className="data-table data-table-sm">
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Pole ID</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id}>
              <td>{s.device_id}</td>
              <td>{s.pole_id ?? s.light_pole_id ?? "—"}</td>
              <td>{s.type ?? "—"}</td>
              <td>
                <span className={"status-pill status-" + (s.status || "").toLowerCase().replace(/\s+/g, "-")}>
                  {s.status ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <p className="hint-text">No sensor devices.</p>}
      <p className="hint-text">From sensor_devices table. Use Sensor Devices panel for CRUD.</p>
    </div>
  );
}

export default SensorReadingsPanel;
