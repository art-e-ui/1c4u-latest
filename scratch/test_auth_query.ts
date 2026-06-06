import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function test() {
  console.log("Testing direct query of auth.users...");
  try {
    const { data, error } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, role')
      .limit(3);
    
    if (error) {
      console.error("Query error:", error);
    } else {
      console.log("Successfully retrieved auth users directly from SQL schema!");
      console.log("Sample users:", JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error("Catch error:", err.message);
  }
}

test().catch(console.error);
