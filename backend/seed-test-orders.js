// Script to seed test orders in 'received' status for browser testing
import pkg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const { Pool } = pkg;
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

async function seedTestOrders() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to seed test orders in received status...');
    
    // Read the SQL file
    const sql = fs.readFileSync('./seed_received_orders.sql', 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Successfully seeded test orders!');
    
    // Verify the orders were created
    const result = await client.query(
      "SELECT order_id, order_number, status, customer_name, created_at FROM orders WHERE status = 'received' ORDER BY created_at DESC"
    );
    
    console.log(`\n📦 Found ${result.rows.length} orders in 'received' status:`);
    result.rows.forEach((order, idx) => {
      console.log(`  ${idx + 1}. ${order.order_number} - ${order.customer_name} (${order.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding test orders:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTestOrders();
