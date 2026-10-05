import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, FiUsers, FiZap, FiActivity, FiAlertCircle, 
  FiTool, FiMessageSquare, FiBarChart2,
  FiLogOut, FiX
} from 'react-icons/fi';

const Sidebar = ({ role, onLogout, isOpen, setIsOpen }) => {
  const location = useLocation();

  const menuItems = {
    authority: [
      { path: '/', label: 'Dashboard', icon: FiHome },
      { path: '/users', label: 'System Users', icon: FiUsers },
      { path: '/poles', label: 'Light Poles', icon: FiZap },
      { path: '/sensors', label: 'Sensor Devices', icon: FiActivity },
      { path: '/readings', label: 'Sensor Readings', icon: FiBarChart2 },
      { path: '/power', label: 'Power Consumption', icon: FiZap },
      { path: '/incidents', label: 'Incidents', icon: FiAlertCircle },
      { path: '/maintenance', label: 'Maintenance', icon: FiTool },
      { path: '/teams', label: 'Maintenance Teams', icon: FiUsers },
      { path: '/notifications', label: 'Notifications', icon: FiMessageSquare },
    ],
    maintenance: [
      { path: '/', label: 'Dashboard', icon: FiHome },
      { path: '/incidents', label: 'Incidents', icon: FiAlertCircle },
      { path: '/maintenance', label: 'Maintenance', icon: FiTool },
    ],
    citizen: [
      { path: '/', label: 'Dashboard', icon: FiHome },
      { path: '/incidents', label: 'View Incidents', icon: FiAlertCircle },
      { path: '/complaints', label: 'Submit Complaint', icon: FiMessageSquare },
    ]
  };

  const items = menuItems[role] || [];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <FiZap size={24} />
            <h2>Street Light</h2>
          </div>
          <button 
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button 
            className="sidebar-item logout-btn"
            onClick={onLogout}
          >
            <FiLogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
