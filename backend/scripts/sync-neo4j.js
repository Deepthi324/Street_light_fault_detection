const db = require('../db');
const { driver } = require('../neo4jDb');

async function syncNeo4j() {
  console.log('--- 🔄 STARTING NEO4J GRAPH SYNC ---');
  let session = driver.session();
  
  try {
    // 1. Fetch Light Poles
    const [poles] = await db.query('SELECT * FROM light_pole');
    
    // 2. Fetch Incidents
    const [incidents] = await db.query('SELECT * FROM incident');
    
    // 3. Fetch Maintenance Teams
    const [teams] = await db.query('SELECT * FROM maintenance_team');
    
    console.log(`Fetched ${poles.length} poles, ${incidents.length} incidents, ${teams.length} teams from MySQL.`);

    // Start Neo4j Transaction
    const tx = session.beginTransaction();

    // Create Maintenance Teams
    for (const team of teams) {
      await tx.run(
        `MERGE (t:MaintenanceTeam {id: $id})
         SET t.name = $name, t.area = $area`,
        { id: parseInt(team.id), name: team.name, area: team.area || 'Unknown' }
      );
    }
    
    // Create Light Poles
    for (const pole of poles) {
      await tx.run(
        `MERGE (p:LightPole {id: $id})
         SET p.pole_id = $pole_id, p.location = $location, p.status = $status`,
        { 
          id: parseInt(pole.id), 
          pole_id: pole.pole_id, 
          location: pole.location || 'Unknown', 
          status: pole.status 
        }
      );
    }

    // Create Incidents and Relationships
    for (const inc of incidents) {
      await tx.run(
        `MERGE (i:Incident {id: $id})
         SET i.type = $type, i.priority = $priority, i.status = $status`,
        { 
          id: parseInt(inc.id), 
          type: inc.type || 'General Issue', 
          priority: inc.priority || 'Medium', 
          status: inc.status 
        }
      );

      // Link Incident to Pole
      if (inc.light_pole_id) {
        await tx.run(
          `MATCH (i:Incident {id: $incId})
           MATCH (p:LightPole {id: $poleId})
           MERGE (i)-[:OCCURRED_ON]->(p)`,
          { incId: parseInt(inc.id), poleId: parseInt(inc.light_pole_id) }
        );
      }

      // Link Team to Incident
      if (inc.team_id) {
        await tx.run(
          `MATCH (i:Incident {id: $incId})
           MATCH (t:MaintenanceTeam {id: $teamId})
           MERGE (t)-[:ASSIGNED_TO]->(i)`,
          { incId: parseInt(inc.id), teamId: parseInt(inc.team_id) }
        );
      }
    }

    await tx.commit();
    console.log('✅ Successfully synced MySQL constraints to Neo4j Graph.');
  } catch (err) {
    console.error('❌ Sync Failed:', err);
  } finally {
    await session.close();
    driver.close();
    process.exit(0);
  }
}

syncNeo4j();
