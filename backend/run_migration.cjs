const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
      }
);

async function run() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync('./migrate_contact_messages.sql', 'utf8');
    console.log('Applying contact_messages migration...');
    await client.query(sql);
    console.log('Migration applied successfully!');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'contact_messages'
      ORDER BY ordinal_position
    `);
    console.log('\nTable structure:');
    console.table(result.rows);
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
