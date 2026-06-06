const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const email = 'arkarnaung009@gmail.com'; // This is the user's email!
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    email_confirm: true,
    user_metadata: { role: 'admin' },
    app_metadata: { role: 'admin' }
  });
  
  if (error) {
    console.error("Auth Admin Error:", error);
  }
}
test();
