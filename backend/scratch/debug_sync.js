const db = require('./backend/db');
const { driver } = require('./backend/neo4jDb');

async function debugSync() {
  try {
    const [rows] = await db.query('SELECT * FROM light_pole');
    console.log(`MySQL Poles Count: ${rows.length}`);
    rows.forEach(r => console.log(` - ID: ${r.id}, PoleID: ${r.pole_id}`));

    const session = driver.session({ database: 'neo4j' });
    const res = await session.run('MATCH (p:LightPole) RETURN p.id as id, p.pole_id as pole_id');
    console.log(`Neo4j LightPole Count: ${res.records.length}`);
    res.records.forEach(r => console.log(` - GraphID: ${r.get('id')}, PoleID: ${r.get('pole_id')}`));
    
    await session.close();
    await driver.close();
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

debugSync();
