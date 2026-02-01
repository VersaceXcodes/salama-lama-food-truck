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
    const migrationSQL = fs.readFileSync('./migrate_pdf_menu_safe.sql', 'utf8');
    console.log('Applying PDF menu migration...');
    await client.query(migrationSQL);
    console.log('Migration applied successfully!\n');
    
    // Verify the changes
    const counts = await client.query(`
      SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
      UNION ALL
      SELECT 'Menu Items', COUNT(*) FROM menu_items
      UNION ALL
      SELECT 'Customization Groups', COUNT(*) FROM customization_groups
      UNION ALL
      SELECT 'Customization Options', COUNT(*) FROM customization_options
    `);
    
    console.log('Verification - Record Counts:');
    console.table(counts.rows);
    
    // Show sample builder items with proteins
    const builderItems = await client.query(`
      SELECT 
        mi.name as item_name,
        mi.price as base_price,
        co.name as protein,
        co.additional_price as price_modifier,
        (mi.price + co.additional_price) as final_price
      FROM menu_items mi
      JOIN customization_groups cg ON mi.item_id = cg.item_id
      JOIN customization_options co ON cg.group_id = co.group_id
      WHERE cg.name = 'Choose Protein'
      ORDER BY mi.sort_order, co.sort_order
    `);
    
    console.log('\nBuilder Items with Protein Pricing:');
    console.table(builderItems.rows);
    
  } catch (error) {
    console.error('Migration error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
