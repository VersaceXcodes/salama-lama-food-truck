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

async function checkCategories() {
  const client = await pool.connect();
  try {
    const cats = await client.query(`
      SELECT category_id, name, sort_order 
      FROM categories 
      ORDER BY sort_order
    `);
    
    console.log('All categories:');
    console.table(cats.rows);
    
    const builderItems = await client.query(`
      SELECT item_id, name, category_id, price, is_active
      FROM menu_items
      WHERE item_id LIKE 'item_grilled%' OR item_id LIKE 'item_saj%' OR item_id LIKE 'item_loaded%' OR item_id LIKE 'item_rice%'
    `);
    
    console.log('\nPDF Builder Items:');
    console.table(builderItems.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCategories();
