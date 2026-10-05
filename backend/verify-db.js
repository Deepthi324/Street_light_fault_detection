const db = require('./db');

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database contents...');
    
    // Check if system_users table exists
    const [tables] = await db.query("SHOW TABLES LIKE 'system_users'");
    console.log('📋 System users table exists:', tables.length > 0 ? '✅ YES' : '❌ NO');
    
    if (tables.length > 0) {
      // Get all users
      const [users] = await db.query('SELECT id, full_name, email, role, created_at FROM system_users ORDER BY created_at DESC');
      console.log(`👥 Total users in database: ${users.length}`);
      
      users.forEach((user, index) => {
        console.log(`\n🔹 User ${index + 1}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.full_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Created: ${user.created_at}`);
      });
    }
    
    console.log('\n✅ Database verification complete');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  } finally {
    process.exit(0);
  }
}

verifyDatabase();
