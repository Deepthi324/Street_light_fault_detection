import { useState, useEffect } from "react";
import AuthService from "./services/AuthService";

const API_BASE_URL = 'http://localhost:4003/api';

function SystemUser({ onBack }) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "citizen",
    maintenance_team_id: ""
  });

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/system-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/maintenance-teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        password: "", // Don't show password hash
        role: user.role || "citizen",
        maintenance_team_id: user.maintenance_team_id || ""
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "citizen",
        maintenance_team_id: ""
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = AuthService.getToken();
      const url = editingUser ? `${API_BASE_URL}/system-users/${editingUser.id}` : `${API_BASE_URL}/auth/signup`;
      const method = editingUser ? 'PUT' : 'POST';

      // For editing, if password is empty, don't send it
      const body = { ...formData };
      if (editingUser && !body.password) delete body.password;
      if (body.role !== 'maintenance') delete body.maintenance_team_id;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Operation failed");
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/system-users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete user");
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleBlock = async (user) => {
    const newStatus = !user.is_active;
    const action = newStatus ? "Unblock" : "Block";
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE_URL}/system-users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (!res.ok) throw new Error(`Failed to ${action} user`);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="module">
      <div className="module-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>👥 System Users Management</h2>
          <button className="btn-primary" onClick={() => handleOpenModal()}>+ Add New User</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="table-container">
        {loading ? <p>Loading users...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Team</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td><span className={`role-badge role-${user.role}`}>{user.role}</span></td>
                  <td>
                    {user.role === 'authority' ? (
                      <span className="status-badge status-authority">Authority</span>
                    ) : (
                      <span className={`status-badge ${user.is_active ? 'status-active' : 'status-blocked'}`}>
                        {user.is_active ? 'Active' : 'Blocked'}
                      </span>
                    )}
                  </td>
                  <td>{user.role === 'maintenance' ? (user.team_name || (user.maintenance_team_id ? `Team ${user.maintenance_team_id}` : 'Not Assigned')) : '-'}</td>
                  <td>
                    {user.role !== 'authority' && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => handleOpenModal(user)} className="btn-sm btn-edit">Edit</button>
                        <button
                          onClick={() => handleToggleBlock(user)}
                          className={`btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}`}
                        >
                          {user.is_active ? 'Block' : 'Unblock'}
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="btn-sm btn-danger">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Password {editingUser && '(Leave blank to keep current)'}</label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="form-control"
                >
                  <option value="citizen">Citizen</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="authority">Authority</option>
                </select>
              </div>
              {formData.role === 'maintenance' && (
                <div className="form-group">
                  <label>Assign Team</label>
                  <select
                    value={formData.maintenance_team_id}
                    onChange={e => setFormData({ ...formData, maintenance_team_id: e.target.value })}
                    className="form-control"
                  >
                    <option value="">-- No Team --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.area})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Update User' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .btn-sm { padding: 4px 8px; font-size: 11px; border: none; cursor: pointer; border-radius: 4px; color: white; display: inline-flex; align-items: center; }
        .btn-danger { background: #ef4444; }
        .btn-warning { background: #f59e0b; }
        .btn-success { background: #10b981; }
        .btn-edit { background: #6366f1; }
        .btn-primary { background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
        .btn-secondary { background: #64748b; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; }
        
        .status-badge { padding: 4px 8px; border-radius: 50px; font-size: 0.75rem; font-weight: 600; }
        .status-active { background: #dcfce7; color: #166534; }
        .status-blocked { background: #fee2e2; color: #991b1b; }
        .status-authority { background: #dbeafe; color: #1e40af; }
        
        .role-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
        .role-citizen { background: #f3f4f6; color: #374151; }
        .role-maintenance { background: #fef3c7; color: #92400e; }
        .role-authority { background: #e0e7ff; color: #4338ca; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 450px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .modal-content h3 { margin-top: 0; margin-bottom: 20px; color: #1e293b; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #475569; font-size: 0.9rem; }
        .form-control { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; }
        .form-control:focus { outline: none; border-color: #2563eb; ring: 2px solid rgba(37, 99, 235, 0.2); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
        .error-msg { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #fecaca; }
      `}</style>
    </div>
  );
}

export default SystemUser;
