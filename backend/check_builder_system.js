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

async function checkBuilderSystem() {
  const client = await pool.connect();
  try {
    console.log('='.repeat(70));
    console.log('       CHECKING MENU BUILDER SYSTEM STATUS');
    console.log('='.repeat(70));
    console.log('\n');
    
    // Check if builder tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('builder_config', 'builder_steps', 'builder_step_items')
      ORDER BY table_name
    `);
    
    console.log('📋 Builder Tables:');
    console.table(tables.rows);
    
    if (tables.rows.length === 0) {
      console.log('\n❌ Builder tables DO NOT EXIST');
      console.log('   Need to run: /app/backend/migrate_menu_builder.sql\n');
      return;
    }
    
    console.log('\n✅ Builder tables exist\n');
    
    // Check builder config
    const config = await client.query('SELECT * FROM builder_config LIMIT 1');
    console.log('⚙️  Builder Config:');
    console.table(config.rows);
    
    // Check builder steps
    const steps = await client.query(`
      SELECT step_id, step_name, step_key, step_type, is_required, sort_order
      FROM builder_steps
      ORDER BY sort_order
    `);
    console.log('\n🪜 Builder Steps:');
    console.table(steps.rows);
    
    // Check step items count
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
    
    // Check our PDF menu items (Builder Items category)
    const pdfItems = await client.query(`
      SELECT 
        item_id,
        name,
        price,
        is_active
      FROM menu_items
      WHERE category_id = 'cat_builder'
      ORDER BY sort_order
    `);
    console.log('\n🍔 PDF Menu - Builder Items:');
    console.table(pdfItems.rows);
    
    // Check if Builder Items category is in builder config
    const builderCats = config.rows.length > 0 ? config.rows[0].builder_category_ids : [];
    console.log('\n🔗 Categories that trigger Menu Builder:');
    console.log(builderCats);
    
    if (!builderCats.includes('cat_builder')) {
      console.log('\n⚠️  WARNING: "cat_builder" category is NOT in builder_category_ids');
      console.log('   PDF menu items won\'t trigger the builder flow!');
    } else {
      console.log('\n✅ "cat_builder" category IS in builder_category_ids');
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkBuilderSystem();
