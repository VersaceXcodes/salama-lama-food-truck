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

async function investigateCategories() {
  const client = await pool.connect();
  try {
    // Get all categories
    const cats = await client.query(`
      SELECT category_id, name, sort_order 
      FROM categories 
      WHERE category_id IN ('cat_004', 'cat_003', 'cat_builder')
      ORDER BY sort_order
    `);
    
    console.log('Categories in question:');
    console.table(cats.rows);
    
    // Get items in these categories
    const items = await client.query(`
      SELECT category_id, name, price, is_active
      FROM menu_items
      WHERE category_id IN ('cat_004', 'cat_003', 'cat_builder')
      ORDER BY category_id, sort_order
      LIMIT 10
    `);
    
    console.log('\nSample items in these categories:');
    console.table(items.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

investigateCategories();
