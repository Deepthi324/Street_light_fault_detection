import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function LightPole({ onBack }) {
  const [poles, setPoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [poleSummary, setPoleSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [editingPole, setEditingPole] = useState(null);
  const [formData, setFormData] = useState({
    pole_id: "",
    location: "",
    latitude: "",
    longitude: "",
    status: "Active",
    installation_date: ""
  });

  // MongoDB Metadata State (CRUD)
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState(null);
  const [metaFormData, setMetaFormData] = useState({
    foundationType: "Concrete",
    poleMaterial: "Galvanized Steel",
    electricalProvider: "City Grid",
    foundationDepth: 1.5,
    structuralAuditDate: "",
    notes: ""
  });

  useEffect(() => {
    fetchPoles();
  }, []);

  const fetchPoles = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/light-poles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load light poles");
      const data = await res.json();
      setPoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoleSummary = async (poleId) => {
    try {
      setSummaryLoading(true);
      setShowSummaryModal(true);
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/light-poles/${poleId}/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load pole summary");
      const data = await res.json();
      setPoleSummary(data);
    } catch (err) {
      alert("DBMS Error: " + err.message);
      setShowSummaryModal(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleOpenModal = (pole = null) => {
    if (pole) {
      setEditingPole(pole);
      setFormData({
        pole_id: pole.pole_id || "",
        location: pole.location || "",
        latitude: pole.latitude || "",
        longitude: pole.longitude || "",
        status: pole.status || "Active",
        installation_date: pole.installation_date ? pole.installation_date.substring(0, 10) : ""
      });
    } else {
      setEditingPole(null);
      setFormData({
        pole_id: "",
        location: "",
        latitude: "",
        longitude: "",
        status: "Active"
      });
    }
    setShowModal(true);
  };

  // --- MONGODB METADATA HANDLERS ---
  const handleOpenMetadata = async (pole) => {
    setEditingPole(pole);
    setMetaLoading(true);
    setShowMetadataModal(true);
    
    // Reset form
    setMetaFormData({
      foundationType: "Concrete",
      poleMaterial: "Galvanized Steel",
      electricalProvider: "City Grid",
      foundationDepth: 1.5,
      structuralAuditDate: "",
      notes: ""
    });

    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/pole-metadata/${pole.pole_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCurrentMetadata(data);
        setMetaFormData({
          foundationType: data.foundation_type || "Concrete",
          poleMaterial: data.pole_material || "Galvanized Steel",
          electricalProvider: data.electrical_provider || "City Grid",
          foundationDepth: data.foundation_depth_m || 1.5,
          structuralAuditDate: data.structural_audit_date ? data.structural_audit_date.split('T')[0] : "",
          notes: data.extended_notes || ""
        });
      } else {
        setCurrentMetadata(null);
      }
    } catch (err) {
      console.error("Error fetching pole metadata:", err);
    } finally {
      setMetaLoading(false);
    }
  };

  const handleSaveMetadata = async (e) => {
    e.preventDefault();
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/pole-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          poleId: editingPole.pole_id,
          ...metaFormData
        })
      });

      if (!res.ok) throw new Error("Failed to save metadata to system");
      
      alert("✅ Pole Metadata saved successfully!");
      setShowMetadataModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMetadata = async () => {
    if (!window.confirm("Delete this metadata from system? (MySQL record remains)")) return;
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/pole-metadata/${editingPole.pole_id}`, {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = AuthService.getToken();
      const url = editingPole ? `${API_BASE_URL}/light-poles/${editingPole.id}` : `${API_BASE_URL}/light-poles`;
      const method = editingPole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        // Check if response is JSON before parsing
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.message || "Operation failed");
        } else {
          // Server returned HTML error page (likely 401/403/500)
          const text = await res.text();
          console.error('Server error (non-JSON):', text.substring(0, 200));
          throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }
      }

      setShowModal(false);
      fetchPoles();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this pole?")) return;
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/light-poles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete pole");
      fetchPoles();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case 'active': case 'working': return 'status-active';
      case 'faulty': return 'status-faulty';
      case 'maintenance': return 'status-maintenance';
      default: return 'status-unknown';
    }
  };

  return (
    <div className="module">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>🚦 Light Poles Management</h2>
          <button className="btn-primary" onClick={() => handleOpenModal()}>+ Add New Pole</button>
        </div>
      </div>

      <div className="table-container">
        {loading ? <p>Loading poles...</p> : error ? <p className="error-msg">{error}</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pole ID</th>
                <th>Location</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Installed</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {poles.map(pole => (
                <tr key={pole.id} className={(pole.status || "").toLowerCase() === 'faulty' ? 'critical-row' : ''}>
                  <td><strong>#{pole.pole_id}</strong></td>
                  <td>{pole.location || 'N/A'}</td>
                  <td>
                    <small style={{ color: '#64748b' }}>
                      {pole.latitude && pole.longitude ? `${pole.latitude}, ${pole.longitude}` : 'No coordinates'}
                    </small>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusColor(pole.status)}`}>
                      {pole.status || 'Active'}
                    </span>
                  </td>
                  <td>{pole.installation_date ? new Date(pole.installation_date).toLocaleDateString() : 'N/A'}</td>
                  <td>{pole.updated_at ? new Date(pole.updated_at).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleOpenMetadata(pole)} className="btn-sm btn-mongo">Manage Details</button>
                      <button onClick={() => fetchPoleSummary(pole.id)} className="btn-sm btn-audit">Audit</button>
                      <button onClick={() => handleOpenModal(pole)} className="btn-sm btn-edit">Edit</button>
                      <button onClick={() => handleDelete(pole.id)} className="btn-sm btn-danger">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MONGODB METADATA MODAL (MANUAL CRUD DEMO) */}
      {showMetadataModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="mongo-badge">Advanced Engineering Metadata</div>
            <h3>Pole Extended Details <span style={{ color: '#3b82f6' }}>({editingPole?.pole_id})</span></h3>

            {metaLoading ? <p>Fetching synchronized records...</p> : (
              <form onSubmit={handleSaveMetadata}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Foundation Type</label>
                    <input
                      type="text"
                      value={metaFormData.foundationType}
                      onChange={e => setMetaFormData({ ...metaFormData, foundationType: e.target.value })}
                      className="form-control"
                      placeholder="e.g. Concrete"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pole Material</label>
                    <input
                      type="text"
                      value={metaFormData.poleMaterial}
                      onChange={e => setMetaFormData({ ...metaFormData, poleMaterial: e.target.value })}
                      className="form-control"
                      placeholder="e.g. Steel"
                    />
                  </div>
                  <div className="form-group">
                    <label>Electrical Provider</label>
                    <input
                      type="text"
                      value={metaFormData.electricalProvider}
                      onChange={e => setMetaFormData({ ...metaFormData, electricalProvider: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Depth (meters)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={metaFormData.foundationDepth}
                      onChange={e => setMetaFormData({ ...metaFormData, foundationDepth: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Structural Audit Date</label>
                    <input
                      type="date"
                      value={metaFormData.structuralAuditDate}
                      onChange={e => setMetaFormData({ ...metaFormData, structuralAuditDate: e.target.value })}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Engineering & Structural Notes</label>
                  <textarea
                    value={metaFormData.notes}
                    onChange={e => setMetaFormData({ ...metaFormData, notes: e.target.value })}
                    className="form-control"
                    rows="4"
                    placeholder="Enter manual structural logs or soil analysis history here..."
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
            <h3>{editingPole ? 'Edit Light Pole' : 'Add New Light Pole'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Pole ID (Numeric)</label>
                <input
                  type="text"
                  required
                  value={formData.pole_id}
                  onChange={e => setFormData({ ...formData, pole_id: e.target.value })}
                  className="form-control"
                  placeholder="e.g. 101"
                />
              </div>
              <div className="form-group">
                <label>Location / Area</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="form-control"
                  placeholder="e.g. MG Road, North Junction"
                />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                    className="form-control"
                    placeholder="e.g. 12.9716"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                    className="form-control"
                    placeholder="e.g. 77.5946"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="form-control"
                >
                  <option value="Active">Active</option>
                  <option value="Faulty">Faulty</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Installation Date</label>
                <input
                  type="date"
                  value={formData.installation_date}
                  onChange={e => setFormData({ ...formData, installation_date: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingPole ? 'Update Pole' : 'Create Pole'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POLE AUDIT SUMMARY MODAL (STORED PROCEDURE) */}
      {showSummaryModal && (
        <div className="modal-overlay">
          <div className="modal-content audit-modal">
            <div className="audit-header">
              <div className="audit-title-group">
                <span className="audit-icon">🔍</span>
                <div>
                  <h3>Pole System Audit</h3>
                  <p>Comprehensive DBMS Analysis for Pole {poleSummary?.label || '...'}</p>
                </div>
              </div>
              <button 
                className="close-cross" 
                onClick={() => { setShowSummaryModal(false); setPoleSummary(null); }}
              >×</button>
            </div>

            {summaryLoading ? (
              <div className="audit-loading">
                <div className="mini-spinner"></div>
                <p>Calling sp_GetPoleSummary...</p>
              </div>
            ) : poleSummary ? (
              <div className="audit-body">
                <div className="audit-grid">
                  <div className="audit-card">
                    <span className="audit-label">Current Status</span>
                    <span className={`audit-value status-text-${(poleSummary.current_status || '').toLowerCase()}`}>
                      {poleSummary.current_status}
                    </span>
                  </div>
                  <div className="audit-card">
                    <span className="audit-label">Sensor Type</span>
                    <span className="audit-value">{poleSummary.sensor_type || 'None'}</span>
                  </div>
                  <div className="audit-card highlight-blue">
                    <span className="audit-label">Total Faults</span>
                    <span className="audit-value">{poleSummary.total_incidents}</span>
                    <span className="audit-subtext">Lifetime incidents</span>
                  </div>
                  <div className="audit-card highlight-orange">
                    <span className="audit-label">Citizen Complaints</span>
                    <span className="audit-value">{poleSummary.total_complaints}</span>
                    <span className="audit-subtext">Reported issues</span>
                  </div>
                </div>

                <div className="audit-energy-box">
                  <div className="energy-info">
                    <span className="energy-icon">⚡</span>
                    <div>
                      <span className="energy-label">Cumulative Energy Usage</span>
                      <h4 className="energy-value">{Number(poleSummary.total_kwh || 0).toFixed(2)} <small>kWh</small></h4>
                    </div>
                  </div>
                  <div className="dbms-tag">DBMS Stored Procedure Verified</div>
                </div>

                <div className="modal-actions">
                  <button 
                    onClick={() => { setShowSummaryModal(false); setPoleSummary(null); }} 
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >Close Audit</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <style>{`
        /* Dark Professional System Theme - Matching Incidents Management */
        #root .module { 
          background: #0f172a !important; 
          padding: 32px !important; 
          min-height: 100vh !important;
          font-family: 'Inter', -apple-system, system-ui, sans-serif !important;
          color: #f1f5f9 !important;
        }

        #root .module-header {
          display: flex !important;
          align-items: center !important;
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
          background: #2563eb !important; 
          color: #ffffff !important; 
          border: none !important; 
          padding: 8px 18px !important; 
          border-radius: 6px !important; 
          font-weight: 600 !important; 
          cursor: pointer !important;
        }
        #root .back-btn:hover { background: #1d4ed8 !important; }

        #root .btn-primary { 
          background: #3b82f6 !important; 
          color: #ffffff !important; 
          border: none !important; 
          padding: 10px 18px !important; 
          border-radius: 8px !important; 
          cursor: pointer !important; 
          font-weight: 600 !important; 
          font-size: 0.9rem !important;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2) !important;
        }
        #root .btn-primary:hover { background: #2563eb !important; }

        #root .table-container { 
          background: #1e293b !important; 
          border-radius: 12px !important; 
          border: 1px solid #334155 !important;
          overflow: hidden !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
          margin-top: 10px !important;
        }
        
        #root .data-table { 
          width: 100% !important; 
          border-collapse: collapse !important; 
          background: #1e293b !important;
          color: #f1f5f9 !important;
        }
        
        #root .data-table thead tr { background: #0f172a !important; }
        #root .data-table th { 
          color: #94a3b8 !important; 
          font-weight: 600 !important; 
          text-align: left !important;
          padding: 16px 20px !important;
          font-size: 0.85rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-bottom: 1px solid #334155 !important;
        }

        #root .data-table tbody tr,
        #root .data-table tbody tr td { 
          background-color: #1e293b !important; 
          background: #1e293b !important;
          color: #f1f5f9 !important;
        }
        #root .data-table tbody tr:nth-child(even),
        #root .data-table tbody tr:nth-child(even) td { 
          background-color: #1a2233 !important; 
          background: #1a2233 !important; 
        }
        #root .data-table tbody tr:hover td { 
          background-color: #2d3748 !important; 
          background: #2d3748 !important; 
        }

        #root .data-table td { 
          padding: 16px 20px !important;
          border-bottom: 1px solid #334155 !important;
          font-size: 0.95rem !important;
          font-weight: 400 !important;
        }
        
        #root .data-table td strong { color: #60a5fa !important; font-weight: 700 !important; }
        
        #root .btn-sm { padding: 6px 12px !important; font-size: 0.8rem !important; border-radius: 4px !important; font-weight: 600 !important; border: none !important; cursor: pointer !important; }
        #root .btn-edit { background: #334155 !important; color: #ffffff !important; transition: all 0.2s !important; }
        #root .btn-edit:hover { background: #475569 !important; }
        #root .btn-danger { background: #fee2e2 !important; color: #991b1b !important; }
        #root .btn-danger:hover { background: #fecaca !important; }
        
        #root .status-badge { 
          padding: 6px 14px !important; 
          border-radius: 50px !important; 
          font-size: 0.75rem !important; 
          font-weight: 700 !important; 
          display: inline-block !important; 
          text-transform: uppercase !important;
          color: #ffffff !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
        }
        #root .status-active { background: #10b981 !important; }
        #root .status-faulty { background: #ef4444 !important; }
        #root .status-maintenance { background: #f59e0b !important; }
        #root .status-unknown { background: #64748b !important; }

        #root .modal-overlay { 
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
          background: rgba(0, 0, 0, 0.8) !important; 
          backdrop-filter: blur(8px) !important;
          display: flex; justify-content: center; align-items: center; z-index: 2000; 
        }
        #root .modal-content { 
          background: #1e293b !important; 
          padding: 32px !important; 
          border-radius: 12px !important; 
          width: 100%; max-width: 480px !important; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important; 
          border: 1px solid #334155 !important;
          color: #ffffff !important;
        }
        #root .modal-content h3 { margin-top: 0 !important; margin-bottom: 24px !important; color: #ffffff !important; font-weight: 700 !important; font-size: 1.5rem !important; }
        #root .form-group { margin-bottom: 16px !important; }
        #root .form-group label { display: block !important; margin-bottom: 8px !important; font-weight: 600 !important; color: #cbd5e1 !important; font-size: 0.95rem !important; }
        #root .form-control { 
          width: 100% !important; 
          padding: 12px !important; 
          border: 1px solid #334155 !important; 
          border-radius: 8px !important; 
          font-size: 1rem !important; 
          background: #0f172a !important; 
          color: #ffffff !important; 
          box-sizing: border-box !important;
        }
        #root .form-control:focus { border-color: #3b82f6 !important; outline: none !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important; }
        #root .modal-actions { display: flex !important; justify-content: flex-end !important; gap: 12px !important; margin-top: 24px !important; }
        #root .btn-secondary { background: transparent !important; color: #94a3b8 !important; border: 1px solid #334155 !important; padding: 12px 24px !important; border-radius: 8px !important; cursor: pointer !important; font-weight: 600 !important; }
        #root .btn-secondary:hover { background: #334155 !important; color: #ffffff !important; }
        
        #root .btn-audit { background: #064e3b !important; color: #34d399 !important; border: 1px solid #065f46 !important; }
        #root .btn-audit:hover { background: #065f46 !important; }

        /* Audit Modal Specifics */
        .audit-modal { max-width: 550px !important; border-top: 4px solid #3b82f6 !important; }
        .audit-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
        .audit-title-group { display: flex; gap: 15px; align-items: center; }
        .audit-icon { font-size: 2rem; background: #0f172a; padding: 10px; border-radius: 12px; }
        .audit-modal h3 { margin: 0 !important; font-size: 1.4rem !important; }
        .audit-modal p { color: #94a3b8 !important; margin: 2px 0 0 0 !important; font-size: 0.85rem !important; }
        .close-cross { background: none; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer; line-height: 1; }
        
        .audit-loading { text-align: center; padding: 40px; color: #94a3b8; }
        .mini-spinner { width: 30px; height: 30px; border: 3px solid #334155; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 15px; }
        
        .audit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .audit-card { background: #0f172a; padding: 15px; border-radius: 10px; border: 1px solid #334155; display: flex; flex-direction: column; }
        .audit-label { font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 5px; }
        .audit-value { font-size: 1.25rem; font-weight: 800; color: #f1f5f9; }
        .audit-subtext { font-size: 0.7rem; color: #475569; margin-top: 5px; }
        
        .highlight-blue { border-left: 3px solid #3b82f6; }
        .highlight-orange { border-left: 3px solid #f59e0b; }
        
        .status-text-active { color: #10b981; }
        .status-text-faulty { color: #ef4444; }
        
        .audit-energy-box { 
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
          padding: 20px; border-radius: 12px; border: 1px solid #334155;
          margin-bottom: 25px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .energy-info { display: flex; gap: 15px; align-items: center; }
        .energy-icon { font-size: 1.5rem; }
        .energy-label { font-size: 0.8rem; color: #94a3b8; display: block; }
        .energy-value { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; margin: 0; }
        .energy-value small { font-size: 0.9rem; color: #64748b; }
        
        .dbms-tag { font-size: 9px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(59, 130, 246, 0.2); }

        /* MongoDB-specific styling for integrated feel */
        .btn-mongo { background: #064e3b !important; color: #34d399 !important; border: 1px solid #065f46 !important; font-size: 0.8rem; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; }
        .btn-mongo:hover { background: #065f46 !important; transition: background 0.2s; }
        .mongo-badge { background: #064e3b; color: #34d399; font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 15px; border: 1px solid #065f46; text-transform: uppercase; }
      `}</style>
    </div>
  );
}

export default LightPole;
