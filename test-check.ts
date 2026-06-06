import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data } = await supabaseAdmin.from("users").select("*").eq("email", "arkarnaung009@gmail.com").maybeSingle();
  console.log("Raw row:", data);
}
run();
