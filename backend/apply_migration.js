import { Pool } from 'pg';
import fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

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

async function applyMigration() {
  const client = await pool.connect();
  try {
    const migrationSQL = fs.readFileSync('./migrate_add_ticket_tracking.sql', 'utf8');
    console.log('Applying migration: Add ticket_number and tracking_token fields...');
    await client.query(migrationSQL);
    console.log('Migration applied successfully!');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('ticket_number', 'tracking_token')
      ORDER BY column_name
    `);
    console.log('\nVerified columns:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Migration error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('Columns already exist, migration already applied.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
