const db = require('./db');

(async () => {
  try {
    console.log('\n=== COMPLAINTS IN DATABASE ===\n');
    const [complaints] = await db.query(`
      SELECT complaint_id, user_id, pole_id, complaint_text, status, complaint_time
      FROM citizen_complaint 
      ORDER BY complaint_time DESC 
      LIMIT 10
    `);
    
    if (complaints.length === 0) {
      console.log('No complaints found.');
    } else {
      console.table(complaints);
    }
    
    console.log('\n=== CITIZEN USERS ===\n');
    const [users] = await db.query(`
      SELECT id, full_name, email, role 
      FROM system_users 
      WHERE role = 'citizen'
    `);
    
    if (users.length === 0) {
      console.log('No citizen users found.');
    } else {
      console.table(users);
    }
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
