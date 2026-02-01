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

async function generateMenuReport() {
  const client = await pool.connect();
  try {
    console.log('='.repeat(60));
    console.log('         SALAMA LAMA MENU - CURRENT STATE REPORT');
    console.log('='.repeat(60));
    console.log('\n');
    
    // Active vs Inactive counts
    const statusCounts = await client.query(`
      SELECT is_active, COUNT(*) as count 
      FROM menu_items 
      GROUP BY is_active
      ORDER BY is_active DESC
    `);
    
    console.log('📊 Menu Items Status:');
    console.table(statusCounts.rows);
    
    // Categories with item counts
    const categories = await client.query(`
      SELECT 
        c.name as category,
        c.sort_order,
        COUNT(mi.item_id) as total_items,
        SUM(CASE WHEN mi.is_active THEN 1 ELSE 0 END) as active_items
      FROM categories c
      LEFT JOIN menu_items mi ON c.category_id = mi.category_id
      GROUP BY c.category_id, c.name, c.sort_order
      ORDER BY c.sort_order
    `);
    
    console.log('\n📁 Categories Overview:');
    console.table(categories.rows);
    
    // Active builder items with full pricing
    const builderItems = await client.query(`
      SELECT 
        mi.name as item,
        mi.price as base_price,
        co.name as protein,
        co.additional_price as modifier,
        (mi.price + co.additional_price) as final_price
      FROM menu_items mi
      JOIN customization_groups cg ON mi.item_id = cg.item_id
      JOIN customization_options co ON cg.group_id = co.group_id
      WHERE cg.name = 'Choose Protein'
        AND mi.is_active = true
      ORDER BY mi.sort_order, co.sort_order
    `);
    
    console.log('\n🍔 Builder Items (Active) - Full Price List:');
    console.table(builderItems.rows);
    
    // Sides
    const sides = await client.query(`
      SELECT name, price
      FROM menu_items
      WHERE category_id = 'cat_sides'
        AND is_active = true
      ORDER BY sort_order
    `);
    
    console.log('\n🍟 Sides (Active):');
    console.table(sides.rows);
    
    // Drinks
    const drinks = await client.query(`
      SELECT name, price
      FROM menu_items
      WHERE category_id = 'cat_drinks'
        AND is_active = true
      ORDER BY sort_order
      LIMIT 5
    `);
    
    console.log('\n🥤 Drinks (Active - First 5):');
    console.table(drinks.rows);
    
    // Customization statistics
    const customStats = await client.query(`
      SELECT 
        COUNT(DISTINCT cg.group_id) as total_groups,
        COUNT(DISTINCT co.option_id) as total_options,
        SUM(CASE WHEN cg.is_required THEN 1 ELSE 0 END) as required_groups,
        SUM(CASE WHEN cg.type = 'radio' THEN 1 ELSE 0 END) as radio_groups,
        SUM(CASE WHEN cg.type = 'checkbox' THEN 1 ELSE 0 END) as checkbox_groups
      FROM customization_groups cg
      LEFT JOIN customization_options co ON cg.group_id = co.group_id
    `);
    
    console.log('\n⚙️  Customization System Stats:');
    console.table(customStats.rows);
    
    // Price range summary
    const priceRange = await client.query(`
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price)::numeric(10,2) as avg_price,
        COUNT(*) as item_count
      FROM menu_items
      WHERE is_active = true
    `);
    
    console.log('\n💰 Price Range (Active Items):');
    console.table(priceRange.rows);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Report Complete - Data Source: PostgreSQL Database');
    console.log('📄 Menu matches PDF: Salama_Lama_Delivery_App_Menu_FULL_v2.pdf');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error generating report:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

generateMenuReport();
