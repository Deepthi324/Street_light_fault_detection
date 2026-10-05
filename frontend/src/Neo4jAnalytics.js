import React, { useState, useEffect, useCallback } from 'react';
import './neo4j-dashboard.css';

export default function Neo4jAnalytics({ onBack }) {
  const [activeTab, setActiveTab] = useState('paths');
  const [stats, setStats] = useState({ poles: 0, incidents: 0, teams: 0, edges: 0 });
  const [drillDownData, setDrillDownData] = useState([]);
  const [paths, setPaths] = useState([]);
  const [recurringFaults, setRecurringFaults] = useState([]);
  const [teamWorkloads, setTeamWorkloads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNeo4jData = useCallback(async () => {
    try {
      setLoading(true);
      
      const statsRes = await fetch('http://localhost:4003/api/neo4j/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      if (['poles', 'incidents', 'teams'].includes(activeTab)) {
        const labelMap = { poles: 'LightPole', incidents: 'Incident', teams: 'MaintenanceTeam' };
        const res = await fetch(`http://localhost:4003/api/neo4j/nodes/${labelMap[activeTab]}`);
        if (res.ok) setDrillDownData((await res.json()).nodes);
      } else if (activeTab === 'relationships') {
        const res = await fetch('http://localhost:4003/api/neo4j/relationships');
        if (res.ok) setDrillDownData((await res.json()).relationships);
      } else if (activeTab === 'paths') {
        const res = await fetch('http://localhost:4003/api/neo4j/paths');
        if (res.ok) setPaths((await res.json()).paths);
      } else if (activeTab === 'recurring') {
        const res = await fetch('http://localhost:4003/api/neo4j/recurring-faults');
        if (res.ok) setRecurringFaults((await res.json()).insights);
      } else if (activeTab === 'workloads') {
        const res = await fetch('http://localhost:4003/api/neo4j/team-workload');
        if (res.ok) setTeamWorkloads((await res.json()).workloads);
      }
    } catch (error) {
      console.error("Failed to fetch Neo4j Data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchNeo4jData();
  }, [fetchNeo4jData]);

  const forceSync = async () => {
    try {
      const res = await fetch('http://localhost:4003/api/neo4j/sync', { method: 'POST' });
      if (res.ok) {
        alert("Success: Graph synchronized with MySQL!");
        fetchNeo4jData();
      }
    } catch (err) {
      console.error("Manual sync failed", err);
    }
  };

  const renderDrillDown = () => {
    if (activeTab === 'poles') {
      return (
        <div className="neo-glass-card">
          <div className="neo-drilldown-header">
             <h3 className="neo-drilldown-title">📍 All LightPole Nodes</h3>
             <span className="neo-badge-generic">{drillDownData.length} Nodes Found</span>
          </div>
          <table className="neo-table">
            <thead>
              <tr><th>Label</th><th>ID</th><th>Location</th><th>Status</th></tr>
            </thead>
            <tbody>
              {drillDownData.map((node, i) => (
                <tr key={i}>
                  <td><span className="neo-tag tag-pole">LightPole</span></td>
                  <td className="neo-highlight-text">{node.pole_id}</td>
                  <td>{node.location}</td>
                  <td>{node.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeTab === 'incidents') {
      return (
        <div className="neo-glass-card">
          <div className="neo-drilldown-header">
             <h3 className="neo-drilldown-title">⚠️ All Incident Nodes</h3>
             <span className="neo-badge-generic">{drillDownData.length} Nodes Found</span>
          </div>
          <table className="neo-table">
            <thead>
              <tr><th>Type</th><th>Priority</th><th>Status</th></tr>
            </thead>
            <tbody>
              {drillDownData.map((node, i) => (
                <tr key={i}>
                  <td><span className="neo-tag tag-incident">{node.type}</span></td>
                  <td>{node.priority}</td>
                  <td className="neo-highlight-text">{node.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeTab === 'teams') {
      return (
        <div className="neo-glass-card">
          <div className="neo-drilldown-header">
             <h3 className="neo-drilldown-title">👷 All MaintenanceTeam Nodes</h3>
             <span className="neo-badge-generic">{drillDownData.length} Nodes Found</span>
          </div>
          <table className="neo-table">
            <thead>
              <tr><th>Team Name</th><th>Base Area</th></tr>
            </thead>
            <tbody>
              {drillDownData.map((node, i) => (
                <tr key={i}>
                  <td className="neo-highlight-text">{node.name}</td>
                  <td>{node.area}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeTab === 'relationships') {
      return (
        <div className="neo-glass-card">
          <div className="neo-drilldown-header">
             <h3 className="neo-drilldown-title">🔗 Graph Network Edges</h3>
             <span className="neo-badge-generic">{drillDownData.length} Relationships Found</span>
          </div>
          <div className="neo-path-list">
            {drillDownData.map((rel, i) => (
              <div key={i} className="neo-path-row" style={{ justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
                <span className={`neo-tag tag-${rel.from.toLowerCase().includes('pole') ? 'pole' : (rel.from.toLowerCase().includes('team') ? 'team' : 'incident')}`}>
                  {rel.fromName}
                </span>
                <span className="neo-relation-arrow">-- {rel.type} --&gt;</span>
                <span className={`neo-tag tag-${rel.to.toLowerCase().includes('pole') ? 'pole' : (rel.to.toLowerCase().includes('team') ? 'team' : 'incident')}`}>
                  {rel.toName}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="neo4j-container">
      {/* Header */}
      <div className="neo4j-header">
        <button onClick={onBack} className="neo-back-btn">← Back to Dashboard</button>
        <div className="neo-title-area">
          <h2 className="neo-main-title">🔗 Graph Insights</h2>
          <p className="neo-subtitle">Analyze relationship patterns between Poles, Incidents & Teams</p>
        </div>
        <button onClick={forceSync} className="neo-sync-btn">
          <span className="neo-icon">🔄</span> Sync MySQL → Neo4j
        </button>
      </div>

      {/* Top Stat Cards - Now interactable! */}
      <div className="neo-stat-cards">
        <div className={`neo-stat-card ${activeTab === 'poles' ? 'active-card' : ''}`} onClick={() => setActiveTab('poles')}>
          <div className="neo-stat-icon">🛤️</div>
          <div className="neo-stat-value">{stats.poles}</div>
          <div className="neo-stat-label">POLES</div>
        </div>
        <div className={`neo-stat-card ${activeTab === 'incidents' ? 'active-card' : ''}`} onClick={() => setActiveTab('incidents')}>
          <div className="neo-stat-icon">⚠️</div>
          <div className="neo-stat-value">{stats.incidents}</div>
          <div className="neo-stat-label">INCIDENTS</div>
        </div>
        <div className={`neo-stat-card ${activeTab === 'teams' ? 'active-card' : ''}`} onClick={() => setActiveTab('teams')}>
          <div className="neo-stat-icon">👥</div>
          <div className="neo-stat-value">{stats.teams}</div>
          <div className="neo-stat-label">TEAMS</div>
        </div>
        <div className={`neo-stat-card neo-stat-highlight ${activeTab === 'relationships' ? 'active-card' : ''}`} onClick={() => setActiveTab('relationships')}>
          <div className="neo-stat-icon">🔗</div>
          <div className="neo-stat-value">{stats.edges}</div>
          <div className="neo-stat-label">RELATIONSHIPS</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="neo-tabs">
        <button 
          className={`neo-tab ${activeTab === 'paths' ? 'active' : ''}`}
          onClick={() => setActiveTab('paths')}
        >
          <span className="neo-icon">🗺️</span> Full Path Trace
        </button>
        <button 
          className={`neo-tab ${activeTab === 'recurring' ? 'active' : ''}`}
          onClick={() => setActiveTab('recurring')}
        >
          <span className="neo-icon">🔄</span> Fault Analysis
        </button>
        <button 
          className={`neo-tab ${activeTab === 'workloads' ? 'active' : ''}`}
          onClick={() => setActiveTab('workloads')}
        >
          <span className="neo-icon">📊</span> Workload Cascade
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="neo-content-area">
        {loading ? (
          <div className="neo-loading">
            <div className="spinner-blue"></div>
            <p>Querying Neo4j Graph Database...</p>
          </div>
        ) : (
          <>
            {['poles', 'incidents', 'teams', 'relationships'].includes(activeTab) ? renderDrillDown() : null}

            {activeTab === 'paths' && (
              <div className="neo-paths-view">
                <div className="neo-query-preview">
                  Cypher: <code>MATCH p=(t:MaintenanceTeam)-[:ASSIGNED_TO]-&gt;(i:Incident)-[:OCCURRED_ON]-&gt;(pl:LightPole) RETURN p</code>
                </div>
                
                {paths.length > 0 ? (
                  <div className="neo-path-list">
                    {paths.map((p, idx) => (
                      <div key={idx} className="neo-path-row">
                        <div className="neo-node neo-node-team">
                          <div className="neo-node-title">🛠️ {p.team}</div>
                          <div className="neo-node-detail">Team</div>
                        </div>
                        <div className="neo-edge">→</div>
                        <div className={`neo-node neo-node-incident priority-${(p.priority || 'medium').toLowerCase()}`}>
                          <div className="neo-node-title">⚠️ {p.issue}</div>
                          <div className="neo-node-detail">{p.status}</div>
                        </div>
                        <div className="neo-edge">→</div>
                        <div className="neo-node neo-node-pole">
                          <div className="neo-node-title">💡 {p.pole || 'Unknown'}</div>
                          <div className="neo-node-detail">📍 {p.location}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="neo-empty-state">No full traversal paths detected in current graph logic.</div>
                )}
              </div>
            )}

            {activeTab === 'recurring' && (
              <div className="neo-glass-card">
                <div className="neo-query-preview">
                  Cypher: <code>MATCH (p:LightPole)&lt;-[:OCCURRED_ON]-(i:Incident) WITH p WHERE count(i) &gt; 1 RETURN p</code>
                </div>
                <table className="neo-table">
                  <thead>
                    <tr><th>Vulnerability Node</th><th>Physical Area</th><th>Fault Edges</th><th>Connected Issues</th></tr>
                  </thead>
                  <tbody>
                    {recurringFaults.map((f, i) => (
                      <tr key={i}>
                        <td className="neo-highlight-text">{f.poleName}</td>
                        <td>{f.location}</td>
                        <td><span className="neo-badge-red">{f.incident_count} Faults</span></td>
                        <td>{f.fault_types.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'workloads' && (
              <div className="neo-glass-card neo-grid">
                 <div className="neo-query-preview" style={{ gridColumn: '1 / -1' }}>
                  Cypher: <code>MATCH (t:MaintenanceTeam)-[:ASSIGNED_TO]-&gt;(i:Incident) RETURN t, count(i)</code>
                </div>
                {teamWorkloads.map((w, i) => (
                  <div key={i} className="neo-workload-card">
                    <div className="neo-workload-header">
                      <div className="neo-avatar">👷</div>
                      <div>
                         <div className="neo-workload-name">{w.teamName}</div>
                         <div className={`neo-workload-status ${w.tasks_assigned > 3 ? 'overloaded' : 'normal'}`}>
                           {w.tasks_assigned > 3 ? '⚠️ Overloaded' : '✅ Normal'}
                         </div>
                      </div>
                    </div>
                    <div className="neo-progress-container">
                      <div className="neo-progress-label">Graph Edges: <span>{w.tasks_assigned}</span></div>
                      <div className="neo-progress-bar">
                        <div className="neo-progress-fill" style={{ width: `${Math.min((w.tasks_assigned / 5) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="neo-small-text">Linked Locations: {w.active_areas.join(', ') || 'None'}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
