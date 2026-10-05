const db = require('./db');

(async () => {
  try {
    // Test if the new columns exist
    console.log('=== Checking new columns in citizen_complaint table ===');
    const [columns] = await db.query('SHOW COLUMNS FROM citizen_complaint');
    const newColumns = ['authority_response', 'response_time', 'authority_id'];
    newColumns.forEach(col => {
      const exists = columns.some(c => c.Field === col);
      console.log(`${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
    });
    
    // Test if authority user exists
    console.log('\n=== Testing Authority Login ===');
    const [users] = await db.query('SELECT id, full_name, email, role FROM system_users WHERE email = ?', ['authority@test.com']);
    console.log('Authority user found:', users.length > 0);
    if (users.length > 0) {
      console.log('User details:', users[0]);
    }
    
    // Test getting complaints
    console.log('\n=== Testing Complaints Query ===');
    const [complaints] = await db.query(`
      SELECT complaint_id as id, user_id, pole_id, complaint_text as description, 
             status, complaint_time as created_at, authority_response, response_time
      FROM citizen_complaint
      ORDER BY complaint_time DESC
      LIMIT 5
    `);
    console.log('Complaints found:', complaints.length);
    if (complaints.length > 0) {
      console.log('Sample complaint:', complaints[0]);
    }
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();