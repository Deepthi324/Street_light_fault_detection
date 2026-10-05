const neo4j = require('neo4j-driver');

// Use the local connection URI and password requested
const uri = 'neo4j://127.0.0.1:7687';
const user = 'neo4j';
const password = 'neo4j@1234567890';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function connectNeo4j() {
  try {
    const serverInfo = await driver.getServerInfo();
    console.log(`✅ Neo4j Connection Established`);
    console.log(`   Connected to: ${serverInfo.address}`);
  } catch (error) {
    console.error(`❌ Neo4j Connection Failed. Did you start the instance in Desktop?`);
    console.error(error);
  }
}

// Ensure driver is cleanly shut down on exit
process.on('exit', () => {
  driver.close();
});

module.exports = {
  driver,
  connectNeo4j,
};
