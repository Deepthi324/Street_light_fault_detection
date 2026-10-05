const express = require('express');
const router = express.Router();
const { driver } = require('../neo4jDb');
const { syncAllToNeo4j } = require('../utils/neo4jSync');

// POST /api/neo4j/sync
router.post('/sync', async (req, res) => {
    try {
        await syncAllToNeo4j();
        res.json({ success: true, message: "Manually triggered graph synchronization successful." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/neo4j/stats
router.get('/stats', async (req, res) => {
    let session = driver.session({ database: 'neo4j' });
    try {
        const result = await session.run(
            `MATCH (p:LightPole) WITH count(p) AS poles
             MATCH (i:Incident) WITH poles, count(i) AS incidents
             MATCH (t:MaintenanceTeam) WITH poles, incidents, count(t) AS teams
             MATCH ()-[r]->() RETURN poles, incidents, teams, count(r) AS edges`
        );
        const record = result.records[0];
        res.json({
            success: true,
            stats: {
                poles: record?.get('poles').toNumber() || 0,
                incidents: record?.get('incidents').toNumber() || 0,
                teams: record?.get('teams').toNumber() || 0,
                edges: record?.get('edges').toNumber() || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await session.close();
    }
});

// GET /api/neo4j/paths
router.get('/paths', async (req, res) => {
    let session = driver.session({ database: 'neo4j' });
    try {
        const result = await session.run(
            `MATCH p=(t:MaintenanceTeam)-[:ASSIGNED_TO]->(i:Incident)-[:OCCURRED_ON]->(pl:LightPole)
             RETURN t.name AS team, i.type AS issue, i.status AS status, i.priority AS priority, pl.pole_id AS pole, pl.location AS location`
        );
        const paths = result.records.map(record => ({
            team: record.get('team'),
            issue: record.get('issue'),
            status: record.get('status'),
            priority: record.get('priority'),
            pole: record.get('pole'),
            location: record.get('location')
        }));
        res.json({ success: true, paths });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await session.close();
    }
});

// GET /api/neo4j/recurring-faults
// Returns LightPoles that have more than 1 assigned/historical incident.
router.get('/recurring-faults', async (req, res) => {
    let session = driver.session({ database: 'neo4j' });
    try {
        const result = await session.run(
            `MATCH (p:LightPole)<-[:OCCURRED_ON]-(i:Incident)
             WITH p, count(i) AS incident_count, collect(i.type) AS fault_types
             WHERE incident_count > 1
             RETURN p.id AS poleId, p.pole_id AS poleName, p.location AS location, incident_count, fault_types
             ORDER BY incident_count DESC`
        );
        
        const insights = result.records.map(record => ({
            poleId: record.get('poleId'),
            poleName: record.get('poleName'),
            location: record.get('location'),
            incident_count: record.get('incident_count').toNumber(),
            fault_types: record.get('fault_types')
        }));
        
        res.json({ success: true, insights });
    } catch (err) {
        console.error('Neo4j Analytics Error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await session.close();
    }
});

// GET /api/neo4j/team-workload
// Analyzes maintenance team cascade graph.
router.get('/team-workload', async (req, res) => {
    let session = driver.session({ database: 'neo4j' });
    try {
        const result = await session.run(
            `MATCH (t:MaintenanceTeam)-[:ASSIGNED_TO]->(i:Incident)-[:OCCURRED_ON]->(p:LightPole)
             RETURN t.name AS teamName, count(i) AS tasks_assigned, collect(p.location) AS active_areas
             ORDER BY tasks_assigned DESC`
        );
        
        const workloads = result.records.map(record => ({
            teamName: record.get('teamName'),
            tasks_assigned: record.get('tasks_assigned').toNumber(),
            active_areas: [...new Set(record.get('active_areas'))] // Unique locations
        }));
        
        res.json({ success: true, workloads });
    } catch (err) {
        console.error('Neo4j Analytics Error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await session.close();
    }
});

// GET /api/neo4j/nodes/:label
// Generic fetcher for exploring graph nodes
router.get('/nodes/:label', async (req, res) => {
    let session = driver.session({ database: 'neo4j' });
    try {
        const { label } = req.params;
        const result = await session.run(
            `MATCH (n:${label}) RETURN n`
        );
        const nodes = result.records.map(r => r.get('n').properties);
        res.json({ success: true, nodes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await session.close();
    }
});

// GET /api/neo4j/relationships
// Returns all edges with their connected node labels
router.get('/relationships', async (req, res) => {
    let session = driver.session({ database: 'neo4j' });
    try {
        const result = await session.run(
            `MATCH (n)-[r]->(m) 
             RETURN labels(n)[0] AS startLabel, 
                    type(r) AS type, 
                    labels(m)[0] AS endLabel, 
                    n.pole_id AS startName,
                    n.name AS startTeamName,
                    m.pole_id AS endName,
                    m.type AS endType`
        );
        const relationships = result.records.map(record => ({
            from: record.get('startLabel'),
            fromName: record.get('startName') || record.get('startTeamName') || "Node",
            type: record.get('type'),
            to: record.get('endLabel'),
            toName: record.get('endName') || record.get('endType') || "Node"
        }));
        res.json({ success: true, relationships });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await session.close();
    }
});

module.exports = router;
