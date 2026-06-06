import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function run() {
  const { data: profiles, error } = await supabase.from('reseller_profiles').select('id, reseller_id, bank_info');
  if (error) {
    console.error("Error:", error);
    return;
  }
  for (const p of profiles) {
    console.log(`ID: ${p.id}, reseller_id: ${p.reseller_id}`);
    console.log("bank_info:", JSON.stringify(p.bank_info, null, 2));
    console.log("---------------------------------------");
  }
}

run().catch(console.error);
