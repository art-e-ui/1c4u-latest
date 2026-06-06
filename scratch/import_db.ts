import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Usage check
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("❌ Usage: npx ts-node scratch/import_db.ts <target_supabase_url> <target_service_role_key>");
  process.exit(1);
}

const targetUrl = args[0];
const targetServiceKey = args[1];

const targetSupabase = createClient(targetUrl, targetServiceKey);

// Dependency-sorted table list to avoid foreign key violations
const SORTED_TABLES = [
  "users",
  "reseller_profiles",
  "retail_shops",
  "categories",
  "products",
  "reseller_product_selection",
  "orders",
  "deposit_requests",
  "withdrawal_requests",
  "support_sessions",
  "support_messages",
  "reseller_chat_sessions",
  "reseller_chat_messages",
  "reseller_customer_chat_sessions",
  "reseller_customer_chat_messages",
  "ach_customers",
  "ach_financials",
  "sla_admins",
  "sla_staff",
  "system_settings",
  "virtual_customer_profiles",
  "virtual_profiles",
  "seasonal_themes"
];

async function run() {
  const backupFilePath = path.join(process.cwd(), 'backup_data.json');
  if (!fs.existsSync(backupFilePath)) {
    console.error(`❌ Backup file not found at ${backupFilePath}. Run the export script first!`);
    process.exit(1);
  }

  console.log("=== STARTING IMPORT ===");
  console.log(`Target URL: ${targetUrl}`);
  console.log(`Reading backup file from: ${backupFilePath}`);

  const backup = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

  // 1. Import Auth Users
  const authUsers = backup.auth_users || [];
  console.log(`\nImporting ${authUsers.length} Auth users...`);
  let authSuccessCount = 0;
  for (const user of authUsers) {
    try {
      const { error: rpcError } = await targetSupabase.rpc('import_auth_user', {
        p_id: user.id,
        p_email: user.email,
        p_encrypted_password: user.encrypted_password,
        p_raw_app_meta_data: user.raw_app_meta_data,
        p_raw_user_meta_data: user.raw_user_meta_data,
        p_role: user.role || 'authenticated',
        p_created_at: user.created_at
      });

      if (rpcError) {
        console.error(`  ❌ Failed to import auth user ${user.email}:`, rpcError.message);
      } else {
        console.log(`  ✅ Imported auth user: ${user.email}`);
        authSuccessCount++;
      }
    } catch (err: any) {
      console.error(`  ❌ Exception importing auth user ${user.email}:`, err.message);
    }
  }
  console.log(`Auth Import complete. Success rate: ${authSuccessCount}/${authUsers.length}`);

  // 2. Import Database Tables in dependency order
  console.log(`\nImporting database tables...`);
  for (const table of SORTED_TABLES) {
    const records = backup.tables[table] || [];
    if (records.length === 0) {
      console.log(`- Table '${table}' has 0 records in backup. Skipping.`);
      continue;
    }

    console.log(`\nImporting ${records.length} records into '${table}'...`);
    let tableSuccessCount = 0;
    
    // Process in batches of 100 to avoid request size limits
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      try {
        const { error: insertError } = await targetSupabase
          .from(table)
          .upsert(batch);

        if (insertError) {
          console.error(`  ❌ Failed to upsert batch for table '${table}':`, insertError.message);
          // Try inserting one by one in case of a single bad row
          for (const row of batch) {
            const { error: singleError } = await targetSupabase.from(table).upsert(row);
            if (singleError) {
              console.error(`    ❌ Individual insert failed:`, singleError.message, JSON.stringify(row));
            } else {
              tableSuccessCount++;
            }
          }
        } else {
          tableSuccessCount += batch.length;
          console.log(`  ✅ Upserted batch [${i + 1} - ${Math.min(i + batchSize, records.length)}]`);
        }
      } catch (err: any) {
        console.error(`  ❌ Exception upserting batch for table '${table}':`, err.message);
      }
    }
    console.log(`Table '${table}' complete. Success rate: ${tableSuccessCount}/${records.length}`);
  }

  console.log(`\n======================================`);
  console.log(`🎉 Database migration complete!`);
  console.log(`Successfully migrated user auth records and database tables.`);
  console.log(`======================================`);
}

run().catch(console.error);
