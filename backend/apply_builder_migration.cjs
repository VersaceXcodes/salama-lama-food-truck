const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT) || 5432,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'migrate_menu_builder.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying menu builder migration...');
    await client.query(sql);
    console.log('Migration applied successfully!');
    
    // Verify
    const result = await client.query(`
      SELECT 'Builder Config' as table_name, COUNT(*) as row_count FROM builder_config
      UNION ALL
      SELECT 'Builder Steps', COUNT(*) FROM builder_steps
      UNION ALL
      SELECT 'Builder Step Items', COUNT(*) FROM builder_step_items
    `);
    console.log('Verification:');
    console.table(result.rows);
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
