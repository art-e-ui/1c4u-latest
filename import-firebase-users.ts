/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

async function main() {
  console.log("\n========================================================");
  console.log("        FIREBASE AUTH USERS IMPORT TO SUPABASE");
  console.log("========================================================\n");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env variables.");
    console.log("Please check your .env configuration.\n");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const usersJsonPath = path.join(process.cwd(), "users.json");

  if (!fs.existsSync(usersJsonPath)) {
    console.warn("⚠️  Could not find 'users.json' at the root of your project workspace.");
    console.log("\nFollow these steps to proceed:");
    console.log("1. Export your Firebase Auth users into a JSON file: ");
    console.log("   Run: firebase auth:export users.json --format=json");
    console.log("2. Upload the 'users.json' file into your project folder.");
    console.log("3. Once uploaded, trigger this script again to automatically import them.");
    console.log("\nExample 'users.json' structure expected:");
    console.log(JSON.stringify({
      users: [
        {
          localId: "some-uuid-or-id",
          email: "user@example.com",
          emailVerified: true,
          displayName: "Alex Reseller",
          photoUrl: "https://example.com/avatar.png",
          createdAt: "1720000000000"
        }
      ]
    }, null, 2));
    return;
  }

  let fileContent: any;
  try {
    fileContent = JSON.parse(fs.readFileSync(usersJsonPath, "utf8"));
  } catch (err: any) {
    console.error("❌ Error reading or parsing 'users.json':", err.message);
    return;
  }

  const firebaseUsers = Array.isArray(fileContent) ? fileContent : fileContent.users;
  if (!firebaseUsers || !Array.isArray(firebaseUsers)) {
    console.error("❌ Error: 'users.json' does not contain a list of 'users' or a top-level array.");
    return;
  }

  console.log(`Found ${firebaseUsers.length} users to import from 'users.json'. Starting migration...`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const fUser of firebaseUsers) {
    const email = fUser.email;
    const uid = fUser.localId || fUser.uid;

    if (!email) {
      console.log(`- Skipping user without email address (UID: ${uid})`);
      skipCount++;
      continue;
    }

    console.log(`\nImporting user: ${email} (UID: ${uid || "generated"})...`);

    try {
      // 1. Check if user already exists in Supabase Auth by email
      const { data: searchData, error: searchError } = await supabase.auth.admin.listUsers();
      if (searchError) {
        console.error("  ❌ Failed to search existing users in Supabase Auth:", searchError.message);
        errorCount++;
        continue;
      }

      const existingUser = searchData.users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.id === uid);
      
      let finalUserId = uid;

      if (existingUser) {
        console.log(`  - User already exists in Supabase Auth (Auth ID: ${existingUser.id})`);
        finalUserId = existingUser.id;
        skipCount++;
      } else {
        // Prepare display metadata
        const displayName = fUser.displayName || "";
        const parts = displayName.split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";

        // Generate temporary password or use a pre-existing hashed one if using custom SQL (this uses dynamic temp passwords)
        const tempPassword = Math.random().toString(36).substring(2, 10) + "Aa0!";

        // 2. Create User in Supabase Auth (GoTrue schema)
        // Note: setting id explicitly is supported in Supabase Admin API and helps keep standard references!
        const createParams: any = {
          email,
          email_confirm: fUser.emailVerified !== undefined ? fUser.emailVerified : true,
          password: tempPassword,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: displayName,
            avatar_url: fUser.photoUrl || ""
          }
        };

        // If the Firebase UID is a valid UUID, we can explicitly preserve it
        // Otherwise, Supabase will auto-generate a valid UUID.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid || "");
        if (isUuid) {
          createParams.id = uid;
        }

        const { data: createdData, error: createError } = await supabase.auth.admin.createUser(createParams);

        if (createError) {
          console.error(`  ❌ Failed to create user in Auth: ${createError.message}`);
          errorCount++;
          continue;
        }

        finalUserId = createdData.user.id;
        console.log(`  - Successfully registered in Auth. UUID Assigned: ${finalUserId}`);
        successCount++;
      }

      // 3. Keep public metadata synced inside custom application tables
      // public.users Schema
      const { data: dbUserExists, error: dbUserErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", finalUserId)
        .maybeSingle();

      if (!dbUserErr && !dbUserExists) {
        console.log("  - Synchronizing user profile in 'users' table...");
        const { error: userInsertErr } = await supabase.from("users").insert({
          id: finalUserId,
          email: email,
          role: "reseller", // Default role
          created_at: fUser.createdAt ? new Date(Number(fUser.createdAt)).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (userInsertErr) {
          console.error(`    ⚠️  Could not insert standard public.users entry: ${userInsertErr.message}`);
        }
      }

      // public.reseller_profiles Schema
      const { data: rpExists, error: rpErr } = await supabase
        .from("reseller_profiles")
        .select("*")
        .eq("id", finalUserId)
        .maybeSingle();

      if (!rpErr && !rpExists) {
        console.log("  - Synchronizing profile in 'reseller_profiles' table...");
        const displayName = fUser.displayName || email.split("@")[0] || "Reseller";
        const { error: rpInsertErr } = await supabase.from("reseller_profiles").insert({
          id: finalUserId,
          reseller_id: finalUserId,
          full_name: displayName,
          phone: fUser.phoneNumber || "",
          verified: false,
          status: "Approved",
          balance: 0,
          unpicked_balance: 0,
          created_at: fUser.createdAt ? new Date(Number(fUser.createdAt)).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (rpInsertErr) {
          console.error(`    ⚠️  Could not insert reseller profile entry: ${rpInsertErr.message}`);
        }
      }

    } catch (userErr: any) {
      console.error(`  ❌ Unexpected error migrating user: ${userErr.message}`);
      errorCount++;
    }
  }

  console.log("\n========================================================");
  console.log("          MIGRATION SUMMARY");
  console.log("========================================================");
  console.log(`- Imported successfully: ${successCount} users`);
  console.log(`- Skipped/Already Existed: ${skipCount} users`);
  console.log(`- Failed: ${errorCount} users`);
  console.log("========================================================\n");
}

main().catch(err => {
  console.error("FATAL: Migrate task failed completely:", err);
});
