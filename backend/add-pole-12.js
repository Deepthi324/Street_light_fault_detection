const db = require('./db');

async function addPole() {
  try {
    await db.query(
      'INSERT INTO light_pole (pole_id, location, latitude, longitude, status) VALUES (?, ?, ?, ?, ?)',
      [12, 'Near Vampire House', 40.715, -73.928, 'Active']
    );
    console.log('✅ Successfully added Pole ID 12: Near Vampire House');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('⚠️  Pole 12 already exists!');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

addPole();
