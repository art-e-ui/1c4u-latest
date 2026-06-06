import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Catalog of tables to export
const TABLES = [
  "categories",
  "products",
  "users",
  "reseller_profiles",
  "retail_shops",
  "sla_admins",
  "sla_staff",
  "system_settings",
  "orders",
  "deposit_requests",
  "withdrawal_requests",
  "support_sessions",
  "support_messages",
  "reseller_chat_sessions",
  "reseller_chat_messages",
  "reseller_customer_chat_sessions",
  "reseller_customer_chat_messages",
  "reseller_product_selection",
  "ach_customers",
  "ach_financials",
  "virtual_customer_profiles",
  "virtual_profiles",
  "seasonal_themes"
];

async function run() {
  console.log("=== STARTING EXPORT ===");
  console.log(`Target Supabase URL: ${supabaseUrl}`);

  const backup: any = {
    exported_at: new Date().toISOString(),
    auth_users: [],
    tables: {}
  };

  // 1. Export Auth Users via RPC
  console.log("\nExporting auth users via public.get_auth_users()...");
  try {
    const { data: authUsers, error: rpcError } = await supabase.rpc('get_auth_users');
    if (rpcError) {
      console.error("❌ Failed to query auth users RPC. Make sure you have executed the SQL DDL file in Supabase first!");
      console.error("Error details:", rpcError);
      process.exit(1);
    }
    backup.auth_users = authUsers || [];
    console.log(`✅ Successfully exported ${backup.auth_users.length} auth user accounts (including password hashes).`);
  } catch (err: any) {
    console.error("❌ Exception during auth export:", err.message);
    process.exit(1);
  }

  // 2. Export Database Tables
  for (const table of TABLES) {
    console.log(`\nExporting table: ${table}...`);
    try {
      const { data: records, error: tableError } = await supabase
        .from(table)
        .select('*');
      
      if (tableError) {
        console.warn(`⚠️ Warning: Failed to export table '${table}':`, tableError.message);
        backup.tables[table] = [];
      } else {
        backup.tables[table] = records || [];
        console.log(`✅ Exported ${backup.tables[table].length} records from '${table}'.`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Warning: Exception exporting table '${table}':`, err.message);
      backup.tables[table] = [];
    }
  }

  // 3. Write backup JSON file
  const backupFilePath = path.join(process.cwd(), 'backup_data.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`\n======================================`);
  console.log(`🎉 Backup completed successfully!`);
  console.log(`Saved ${backup.auth_users.length} users and ${Object.keys(backup.tables).length} tables.`);
  console.log(`Backup file location: ${backupFilePath}`);
  console.log(`======================================`);
}

run().catch(console.error);
