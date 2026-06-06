import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data: users } = await supabaseAdmin.from("users").select("id, email");
  if (users) {
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const nonUUIDs = users.filter(u => !isUUID(u.id));
    console.log("NON-UUID USERS:", nonUUIDs);
    console.log("TOTAL USERS:", users.length);
  }
}
run();




