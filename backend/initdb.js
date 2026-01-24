import dotenv from "dotenv";
import fs from "fs";
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { require: true } 
      }
    : {
        host: PGHOST || "ep-ancient-dream-abbsot9k-pooler.eu-west-2.aws.neon.tech",
        database: PGDATABASE || "neondb",
        user: PGUSER || "neondb_owner",
        password: PGPASSWORD || "npg_jAS3aITLC5DX",
        port: Number(PGPORT),
        ssl: { require: true },
      }
);


async function initDb() {
  const client = await pool.connect();
  try {
    // Read SQL file
    const sqlContent = fs.readFileSync(`./db.sql`, "utf-8").toString();
    
    // Split into DROP, CREATE, and INSERT sections
    const dbInitCommands = sqlContent
      .split(/(?=DROP TABLE |CREATE TABLE |CREATE INDEX |INSERT INTO)/);

    // Separate DROP statements from others
    const dropCommands = [];
    const otherCommands = [];
    
    for (let cmd of dbInitCommands) {
      const trimmedCmd = cmd.trim();
      if (trimmedCmd.length === 0) continue;
      
      // Skip comments and section headers
      if (trimmedCmd.startsWith('--')) continue;
      
      if (trimmedCmd.startsWith('DROP TABLE')) {
        dropCommands.push(trimmedCmd);
      } else {
        otherCommands.push(trimmedCmd);
      }
    }

    // Execute DROP statements first (without transaction to ensure they complete)
    console.log('Dropping existing tables...');
    for (let cmd of dropCommands) {
      console.dir({ "backend:db:drop": cmd.substring(0, 50) + '...' });
      await client.query(cmd);
    }
    
    // Now execute CREATE and INSERT statements in a transaction
    await client.query('BEGIN');
    
    console.log('Creating tables and inserting data...');
    for (let cmd of otherCommands) {
      console.dir({ "backend:db:init": cmd.substring(0, 50) + '...' });
      await client.query(cmd);
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('Database initialization completed successfully');
  } catch (e) {
    // Rollback on error
    await client.query('ROLLBACK').catch(() => {});
    console.error('Database initialization failed:', e);
    throw e;
  } finally {
    // Release client back to pool
    client.release();
  }
}

// Execute initialization
initDb().catch(console.error);
