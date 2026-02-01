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

async function syncPdfWithBuilder() {
  const client = await pool.connect();
  try {
    const migrationSQL = fs.readFileSync('./sync_pdf_with_builder.sql', 'utf8');
    console.log('Syncing PDF Menu Items with Menu Builder...\n');
    await client.query(migrationSQL);
    console.log('✅ Sync completed successfully!\n');
    
    // Verify the changes
    const config = await client.query('SELECT * FROM builder_config');
    console.log('📋 Updated Builder Config:');
    console.table(config.rows);
    
    const steps = await client.query(`
      SELECT step_id, step_name, step_key, step_type, is_required, sort_order
      FROM builder_steps
      ORDER BY sort_order
    `);
    console.log('\n🪜 New Builder Steps:');
    console.table(steps.rows);
    
    const stepItemCounts = await client.query(`
      SELECT 
        bs.step_name,
        COUNT(bsi.step_item_id) as item_count,
        SUM(CASE WHEN bsi.is_active THEN 1 ELSE 0 END) as active_items
      FROM builder_steps bs
      LEFT JOIN builder_step_items bsi ON bs.step_id = bsi.step_id
      GROUP BY bs.step_id, bs.step_name, bs.sort_order
      ORDER BY bs.sort_order
    `);
    console.log('\n📦 Step Items Count:');
    console.table(stepItemCounts.rows);
    
    // Show sample items in each step
    const baseItems = await client.query(`
      SELECT mi.name, mi.price
      FROM builder_step_items bsi
      JOIN menu_items mi ON bsi.item_id = mi.item_id
      WHERE bsi.step_id = 'step_pdf_base'
      ORDER BY bsi.sort_order
    `);
    console.log('\n🍔 Base Items (Step 1):');
    console.table(baseItems.rows);
    
    const proteinItems = await client.query(`
      SELECT mi.name, bsi.override_price as price
      FROM builder_step_items bsi
      JOIN menu_items mi ON bsi.item_id = mi.item_id
      WHERE bsi.step_id = 'step_pdf_protein'
      ORDER BY bsi.sort_order
    `);
    console.log('\n🍗 Protein Options (Step 2):');
    console.table(proteinItems.rows);
    
    console.log('\n✨ PDF Menu Items are now synchronized with Menu Builder!');
    console.log('   When users click on Builder Items, they\'ll see the step-by-step builder flow.\n');
    
  } catch (error) {
    console.error('Sync error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncPdfWithBuilder();
