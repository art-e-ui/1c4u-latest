import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const email = "arkarnaung009@gmail.com";
  console.log("Generating reset link for", email);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: email,
    options: {
      redirectTo: "http://localhost:3000/reset-password",
    }
  });
  console.log(data, error);
}
run();
