const db = require('./db');

async function checkComplaints() {
  try {
    console.log('\n=== Checking All Complaints ===\n');
    
    const [complaints] = await db.query(`
      SELECT id, citizen_name, contact, status, created_at 
      FROM citizen_complaint 
      ORDER BY created_at DESC
    `);
    
    if (complaints.length === 0) {
      console.log('No complaints found in database.');
    } else {
      console.log(`Found ${complaints.length} complaint(s):\n`);
      complaints.forEach(c => {
        console.log(`ID: ${c.id}`);
        console.log(`Name: ${c.citizen_name}`);
        console.log(`Email/Contact: ${c.contact}`);
        console.log(`Status: ${c.status}`);
        console.log(`Created: ${c.created_at}`);
        console.log('---');
      });
    }
    
    console.log('\n=== Checking System Users (Citizens) ===\n');
    
    const [users] = await db.query(`
      SELECT id, full_name, email, role 
      FROM system_users 
      WHERE role = 'citizen'
    `);
    
    if (users.length === 0) {
      console.log('No citizen users found.');
    } else {
      console.log(`Found ${users.length} citizen user(s):\n`);
      users.forEach(u => {
        console.log(`ID: ${u.id}`);
        console.log(`Name: ${u.full_name}`);
        console.log(`Email: ${u.email}`);
        console.log('---');
      });
    }
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkComplaints();
