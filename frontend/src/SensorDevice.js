import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function SensorDevice({ onBack }) {
  const [devices, setDevices] = useState([]);
  const [poles, setPoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    device_id: "",
    light_pole_id: "",
    type: "Ambience",
    status: "Active"
  });

  // MongoDB Metadata State
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState(null);
  const [metaFormData, setMetaFormData] = useState({
    manufacturer: "",
    modelNumber: "",
    installationDate: "",
    warrantyExpiry: "",
    serviceNotes: "",
    firmwareVersion: "1.0.0"
  });
  const [metaLoading, setMetaLoading] = useState(false);

  useEffect(() => {
    fetchDevices();
    fetchPoles();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/sensor-devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load sensor devices");
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoles = async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/light-poles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPoles(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching poles:", err);
    }
  };

  const handleOpenModal = (device = null) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        device_id: device.device_id || "",
        light_pole_id: device.light_pole_id || "",
        type: device.type || "Ambience",
        status: device.status || "Active"
      });
    } else {
      setEditingDevice(null);
      setFormData({
        device_id: "",
        light_pole_id: "",
        type: "Ambience",
        status: "Active"
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = AuthService.getToken();
      const url = editingDevice ? `${API_BASE_URL}/sensor-devices/${editingDevice.id}` : `${API_BASE_URL}/sensor-devices`;
      const method = editingDevice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Operation failed");
      }

      setShowModal(false);
      fetchDevices();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sensor unit?")) return;
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/sensor-devices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete sensor unit");
      fetchDevices();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- MONGODB MANUAL CRUD HANDLERS ---
  const handleOpenMetadata = async (device) => {
    setEditingDevice(device);
    setMetaLoading(true);
    setShowMetadataModal(true);

    // Reset form
    setMetaFormData({
      manufacturer: "",
      modelNumber: "",
      installationDate: "",
      warrantyExpiry: "",
      serviceNotes: "",
      firmwareVersion: "1.0.0",
      deploymentLocation: ""
    });

    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/device-metadata/${device.device_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentMetadata(data);
        setMetaFormData({
          manufacturer: data.manufacturer || "",
          modelNumber: data.model_number || "",
          installationDate: data.installation_date ? data.installation_date.split('T')[0] : "",
          warrantyExpiry: data.warranty_expiry ? data.warranty_expiry.split('T')[0] : "",
          serviceNotes: data.service_notes || "",
          firmwareVersion: data.firmware_version || "1.0.0",
          deploymentLocation: data.deployment_location || ""
        });
      } else {
        setCurrentMetadata(null);
      }
    } catch (err) {
      console.error("Error fetching metadata:", err);
    } finally {
      setMetaLoading(false);
    }
  };

  const handleSaveMetadata = async (e) => {
    e.preventDefault();
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/device-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceId: editingDevice.device_id,
          ...metaFormData
        })
      });

      if (!res.ok) throw new Error("Failed to save metadata to system");

      alert("✅ Metadata saved successfully!");
      setShowMetadataModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMetadata = async () => {
    if (!window.confirm("Delete this metadata from system? (MySQL record remains)")) return;
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/device-metadata/${editingDevice.device_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete metadata");

      alert("🗑️ Metadata removed from system.");
      setShowMetadataModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case 'active': return 'status-active';
      case 'offline': case 'faulty': return 'status-faulty';
      case 'maintenance': return 'status-maintenance';
      default: return 'status-unknown';
    }
  };

  return (
    <div className="module">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>🏭 Street Light Sensor Devices</h2>
          <button className="btn-primary" onClick={() => handleOpenModal()}>+ Add New Device</button>
        </div>
      </div>

      {loading ? <p>Loading sensors...</p> : error ? <p className="error">{error}</p> : (
        <>
          <div className="device-summary">
            <div className="summary-card">
              <h4>Total Devices</h4>
              <p className="summary-value">{devices.length}</p>
            </div>
            <div className="summary-card">
              <h4>Active</h4>
              <p className="summary-value">{devices.filter(d => (d.status || "").toLowerCase() === 'active').length}</p>
            </div>
            <div className="summary-card">
              <h4>Offline</h4>
              <p className="summary-value">{devices.filter(d => (d.status || "").toLowerCase() === 'offline' || (d.status || "").toLowerCase() === 'faulty').length}</p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Attached Pole</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id} className={(device.status || "").toLowerCase() === "offline" ? "offline-device" : ""}>
                    <td><strong>#{device.device_id}</strong></td>
                    <td>{device.pole_id ? `Pole #${device.pole_id}` : 'Unattached'}</td>
                    <td><span className="type-badge">{device.type || 'Standard'}</span></td>
                    <td>
                      <span className={`status-badge ${getStatusColor(device.status)}`}>
                        {device.status || 'Active'}
                      </span>
                    </td>
                    <td>{device.created_at ? new Date(device.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => handleOpenMetadata(device)} className="btn-sm btn-mongo">Manage Details</button>
                        <button onClick={() => handleOpenModal(device)} className="btn-sm btn-edit">Edit</button>
                        <button onClick={() => handleDelete(device.id)} className="btn-sm btn-danger">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MONGODB METADATA MODAL (MANUAL CRUD DEMO) */}
      {showMetadataModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="mongo-badge">Advanced Metadata</div>
            <h3>Device Extended Details <span style={{ color: '#3b82f6' }}>({editingDevice?.device_id})</span></h3>

            {metaLoading ? <p>Fetching synchronized records...</p> : (
              <form onSubmit={handleSaveMetadata}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Manufacturer</label>
                    <input
                      type="text"
                      value={metaFormData.manufacturer}
                      onChange={e => setMetaFormData({ ...metaFormData, manufacturer: e.target.value })}
                      className="form-control"
                      placeholder="e.g. Siemens"
                    />
                  </div>
                  <div className="form-group">
                    <label>Model Number</label>
                    <input
                      type="text"
                      value={metaFormData.modelNumber}
                      onChange={e => setMetaFormData({ ...metaFormData, modelNumber: e.target.value })}
                      className="form-control"
                      placeholder="e.g. SN-X100"
                    />
                  </div>
                  <div className="form-group">
                    <label>Installation Date</label>
                    <input
                      type="date"
                      value={metaFormData.installationDate}
                      onChange={e => setMetaFormData({ ...metaFormData, installationDate: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Warranty Expiry</label>
                    <input
                      type="date"
                      value={metaFormData.warrantyExpiry}
                      onChange={e => setMetaFormData({ ...metaFormData, warrantyExpiry: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Deployment Site (Detailed)</label>
                    <input
                      type="text"
                      value={metaFormData.deploymentLocation}
                      onChange={e => setMetaFormData({ ...metaFormData, deploymentLocation: e.target.value })}
                      className="form-control"
                      placeholder="e.g. Near North Gate"
                    />
                  </div>
                  <div className="form-group">
                    <label>Firmware Version</label>
                    <input
                      type="text"
                      value={metaFormData.firmwareVersion}
                      onChange={e => setMetaFormData({ ...metaFormData, firmwareVersion: e.target.value })}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Service & Calibration Notes</label>
                  <textarea
                    value={metaFormData.serviceNotes}
                    onChange={e => setMetaFormData({ ...metaFormData, serviceNotes: e.target.value })}
                    className="form-control"
                    rows="3"
                    placeholder="Enter any manual service logs or maintenance history here..."
                  ></textarea>
                </div>

                <div className="modal-actions">
                  {currentMetadata && (
                    <button type="button" onClick={handleDeleteMetadata} className="btn btn-danger" style={{ marginRight: 'auto' }}>
                      Delete Details
                    </button>
                  )}
                  <button type="button" onClick={() => setShowMetadataModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-mongo">Save Details</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingDevice ? 'Edit Sensor Device' : 'Add New Sensor Device'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Device ID / Serial</label>
                <input
                  type="text"
                  required
                  value={formData.device_id}
                  onChange={e => setFormData({ ...formData, device_id: e.target.value })}
                  className="form-control"
                  placeholder="e.g. SN-5001"
                />
              </div>
              <div className="form-group">
                <label>Attach to Pole</label>
                <select
                  required
                  value={formData.light_pole_id}
                  onChange={e => setFormData({ ...formData, light_pole_id: e.target.value })}
                  className="form-control"
                >
                  <option value="">-- Select Light Pole --</option>
                  {poles.map(p => (
                    <option key={p.id} value={p.id}>Pole #{p.pole_id} ({p.location || 'Unknown Area'})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Sensor Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="form-control"
                >
                  <option value="Ambience">Ambience (LDR)</option>
                  <option value="Motion">Motion (PIR)</option>
                  <option value="Energy">Energy Meter</option>
                  <option value="Hybrid">Hybrid Controller</option>
                </select>
              </div>
              <div className="form-group">
                <label>Operational Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="form-control"
                >
                  <option value="Active">Active</option>
                  <option value="Offline">Offline</option>
                  <option value="Faulty">Faulty</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDevice ? 'Update Device' : 'Create Device'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* Dark Professional System Theme */
        #root .module { 
          background: #0f172a !important; 
          padding: 32px !important; 
          min-height: 100vh !important;
          font-family: 'Inter', -apple-system, system-ui, sans-serif !important;
          color: #f1f5f9 !important;
        }

        #root .module-header {
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
          margin-bottom: 30px !important;
          padding-bottom: 20px !important;
          border-bottom: 1px solid #1e293b !important;
          background: transparent !important;
        }

        #root .module-header h2 {
          color: #ffffff !important;
          font-weight: 700 !important;
          margin: 0 !important;
          font-size: 1.6rem !important;
        }

        #root .back-btn { 
          background: #334155 !important; 
          color: #ffffff !important; 
          border: 1px solid #475569 !important; 
          padding: 8px 18px !important; 
          border-radius: 6px !important; 
          font-weight: 600 !important; 
          cursor: pointer !important;
          width: fit-content;
        }

        #root .btn-primary { 
          background: #2563eb !important; 
          color: #ffffff !important; 
          border: none !important; 
          padding: 10px 20px !important; 
          border-radius: 8px !important; 
          font-weight: 600 !important; 
          cursor: pointer !important;
        }

        #root .device-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 32px; }
        #root .summary-card { 
          background: #1e293b !important; 
          padding: 24px !important; 
          border-radius: 12px !important; 
          border: 1px solid #334155 !important; 
          text-align: left !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
        }
        #root .summary-card h4 { margin: 0 !important; color: #94a3b8 !important; font-size: 0.85rem !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
        #root .summary-value { margin: 10px 0 0 !important; font-size: 2.2rem !important; font-weight: 800 !important; color: #ffffff !important; }
        
        #root .table-container { 
          background: #1e293b !important; 
          border-radius: 12px !important; 
          border: 1px solid #334155 !important;
          overflow: hidden !important;
        }

        #root .data-table { width: 100% !important; border-collapse: collapse !important; color: #f1f5f9 !important; }
        #root .data-table thead tr { background: #0f172a !important; }
        #root .data-table th { 
          color: #94a3b8 !important; 
          font-weight: 600 !important; 
          text-align: left !important;
          padding: 16px 20px !important;
          font-size: 0.85rem !important;
          text-transform: uppercase !important;
          border-bottom: 1px solid #334155 !important;
        }
        #root .data-table td { padding: 18px 20px !important; border-bottom: 1px solid #334155 !important; }
        
        #root .type-badge { background: #334155 !important; color: #e2e8f0 !important; padding: 4px 12px !important; border-radius: 12px !important; font-size: 0.75rem !important; font-weight: 700 !important; border: 1px solid #475569 !important; }
        
        #root .status-badge { padding: 6px 14px !important; border-radius: 50px !important; font-size: 0.75rem !important; font-weight: 700 !important; text-transform: uppercase !important; }
        #root .status-active { background: #10b981 !important; color: white !important; }
        #root .status-faulty { background: #ef4444 !important; color: white !important; }
        #root .status-maintenance { background: #f59e0b !important; color: white !important; }

        #root .btn-sm { padding: 6px 14px !important; font-size: 0.8rem !important; font-weight: 600 !important; border-radius: 6px !important; cursor: pointer !important; }
        #root .btn-edit { background: #3b82f6 !important; color: white !important; border: none !important; }
        #root .btn-mongo { background: #10b981 !important; color: white !important; border: none !important; }
        #root .btn-danger { background: #ef4444 !important; color: white !important; border: none !important; }

        #root .mongo-badge {
          background: rgba(16, 185, 129, 0.1) !important;
          color: #10b981 !important;
          padding: 4px 10px !important;
          border-radius: 4px !important;
          font-size: 0.7rem !important;
          font-weight: 800 !important;
          width: fit-content !important;
          border: 1px solid #10b981 !important;
          margin-bottom: 10px !important;
          text-transform: uppercase !important;
        }

        #root .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8) !important; display: flex; justify-content: center; align-items: center; z-index: 1000; }
        #root .modal-content { background: #1e293b !important; padding: 32px !important; border-radius: 16px !important; width: 100%; max-width: 500px; border: 1px solid #334155 !important; color: #f1f5f9 !important; }
        #root .modal-content h3 { margin-top: 0 !important; font-size: 1.5rem !important; font-weight: 800 !important; color: #ffffff !important; margin-bottom: 24px !important; border-bottom: 1px solid #334155 !important; padding-bottom: 16px !important; }
        #root .form-group label { display: block !important; margin-bottom: 8px !important; font-weight: 700 !important; color: #94a3b8 !important; }
        #root .form-control { width: 100% !important; padding: 12px !important; background: #0f172a !important; border: 1px solid #334155 !important; border-radius: 8px !important; color: #ffffff !important; font-size: 1rem !important; }
        #root .modal-actions { display: flex !important; justify-content: flex-end !important; gap: 12px !important; margin-top: 32px !important; }
        #root .btn-secondary { background: #334155 !important; color: white !important; border: 1px solid #475569 !important; border-radius: 8px !important; padding: 10px 20px !important; font-weight: 600 !important; cursor: pointer !important; }
      `}</style>

    </div>
  );
}

export default SensorDevice;
