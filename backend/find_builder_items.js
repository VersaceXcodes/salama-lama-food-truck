import { Pool } from 'pg';
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

async function findBuilderItems() {
  const client = await pool.connect();
  try {
    // Search for items by name
    const items = await client.query(`
      SELECT item_id, name, category_id, price, is_active
      FROM menu_items
      WHERE name IN ('Grilled Sub', 'Saj Wrap', 'Loaded Fries', 'Rice Bowl')
      ORDER BY name
    `);
    
    console.log('PDF Builder Items (by name):');
    console.table(items.rows);
    
    if (items.rows.length > 0) {
      const catId = items.rows[0].category_id;
      const cat = await client.query(`
        SELECT category_id, name
        FROM categories
        WHERE category_id = $1
      `, [catId]);
      
      console.log('\nTheir category:');
      console.table(cat.rows);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

findBuilderItems();
