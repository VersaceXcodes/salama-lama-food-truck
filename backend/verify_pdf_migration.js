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

async function verifyMigration() {
  const client = await pool.connect();
  try {
    console.log('=== Verifying PDF Menu Migration ===\n');
    
    // Count records
    const counts = await client.query(`
      SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
      UNION ALL
      SELECT 'Menu Items', COUNT(*) FROM menu_items
      UNION ALL
      SELECT 'Customization Groups', COUNT(*) FROM customization_groups
      UNION ALL
      SELECT 'Customization Options', COUNT(*) FROM customization_options
    `);
    
    console.log('Record Counts:');
    console.table(counts.rows);
    
    // Show categories
    const categories = await client.query(`
      SELECT id, name, display_order 
      FROM categories 
      ORDER BY display_order
    `);
    
    console.log('\nCategories:');
    console.table(categories.rows);
    
    // Show builder items with proteins
    const builderItems = await client.query(`
      SELECT 
        mi.id,
        mi.name as item_name,
        mi.base_price,
        cg.name as customization_group,
        co.name as option_name,
        co.price_modifier,
        (mi.base_price + co.price_modifier) as final_price
      FROM menu_items mi
      JOIN customization_groups cg ON mi.id = cg.menu_item_id
      JOIN customization_options co ON cg.id = co.customization_group_id
      WHERE cg.name = 'Choose Protein'
      ORDER BY mi.id, co.display_order
    `);
    
    console.log('\nBuilder Items with Protein Prices:');
    console.table(builderItems.rows);
    
  } catch (error) {
    console.error('Verification error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMigration();
