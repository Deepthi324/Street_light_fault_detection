const db = require('../db');
const { driver } = require('../neo4jDb');

/**
 * Synchronizes MySQL data to Neo4j.
 * This is an idempotent function using Cypher MERGE commands.
 */
async function syncAllToNeo4j() {
  console.log('--- 🔄 TRIGGERING DYNAMIC NEO4J SYNC ---');
  const session = driver.session();
  
  try {
    // 1. Fetch current totals from MySQL
    const [poles] = await db.query('SELECT * FROM light_pole');
    const [incidents] = await db.query('SELECT * FROM incident');
    const [teams] = await db.query('SELECT * FROM maintenance_team');
    
    // Start Transaction
    const tx = session.beginTransaction();

    try {
      // Sync Teams
      for (const team of teams) {
        await tx.run(
          `MERGE (t:MaintenanceTeam {id: $id})
           SET t.name = $name, t.area = $area`,
          { id: parseInt(team.id), name: team.name, area: team.area || 'Unknown' }
        );
      }
      
      // Sync Poles
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

      // Sync Incidents and Relationships
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
      console.log('✅ Neo4j Dynamic Sync Complete.');
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('❌ Neo4j Sync Error:', err);
  } finally {
    await session.close();
  }
}

module.exports = { syncAllToNeo4j };
