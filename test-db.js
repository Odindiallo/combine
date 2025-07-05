const database = require('./db/database');

async function testDatabase() {
  try {
    await database.connect();
    
    console.log('Testing database tables...\n');
    
    // Test achievements table
    console.log('1. Checking achievements table:');
    const achievements = await database.query('SELECT COUNT(*) as count FROM achievements');
    console.log(`   Achievements count: ${achievements[0].count}`);
    
    if (achievements[0].count === 0) {
      console.log('   ❌ No achievements found - need to initialize');
    } else {
      console.log('   ✅ Achievements table populated');
    }
    
    // Test users table
    console.log('\n2. Checking users table:');
    const users = await database.query('SELECT COUNT(*) as count FROM users');
    console.log(`   Users count: ${users[0].count}`);
    
    // Test skills table
    console.log('\n3. Checking skills table:');
    const skills = await database.query('SELECT COUNT(*) as count FROM skills');
    console.log(`   Skills count: ${skills[0].count}`);
    
    // Test a sample achievements query
    console.log('\n4. Testing achievements query:');
    const testQuery = await database.query(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.icon_url as icon,
        a.points,
        a.created_at,
        CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END as earned,
        ua.unlocked_at as earned_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 5
    `, [1]);
    
    console.log(`   Query returned ${testQuery.length} results`);
    if (testQuery.length > 0) {
      console.log('   ✅ Achievements query working');
    } else {
      console.log('   ❌ Achievements query returned no results');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();