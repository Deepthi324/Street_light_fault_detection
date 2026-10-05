import React from 'react';

function Header({ role, userEmail, onLogout }) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="logo-circle">SL</div>
        <div>
          <div className="app-title">
            Smart Street Light Fault Detection System
          </div>
          <div className="app-subtitle">DBMS Academic Project UI</div>
        </div>
      </div>
      <div className="app-header-right">
        {role ? (
          <>
            <div className="user-info">
              <span className="user-role">{role}</span>
              <span className="user-email">{userEmail}</span>
            </div>
            <button className="btn-ghost" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <span className="user-role">Not signed in</span>
        )}
      </div>
    </header>
  );
}

export default Header;

