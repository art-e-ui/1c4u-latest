/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import crypto from "crypto";

function toDeterministicUuid(input: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) {
    return input.toLowerCase();
  }
  
  // Create solid deterministic UUID using SHA-256 hash of the Firebase UID
  const hash = crypto.createHash("sha256").update(input).digest();
  
  // Adjust bits to conform strictly to RFC 4122 uuid v4 format
  hash[6] = (hash[6] & 0x0f) | 0x40; // version 4
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant RFC4122
  
  const hex = hash.toString("hex");
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

async function main() {
  console.log("\n========================================================");
  console.log("    SUPABASE SQL MIGRATION GENERATOR (FIREBASE SCRYPT)");
  console.log("========================================================\n");

  const usersJsonPath = path.join(process.cwd(), "users.json");

  if (!fs.existsSync(usersJsonPath)) {
    console.warn("⚠️  Could not find 'users.json' at the root of your project workspace.");
    console.log("\nTo proceed:");
    console.log("1. Export your Firebase Auth users to 'users.json' in this folder.");
    console.log("2. Then run this script to generate a single SQL output file.");
    return;
  }

  let fileContent: any;
  try {
    fileContent = JSON.parse(fs.readFileSync(usersJsonPath, "utf8"));
  } catch (err: any) {
    console.error("❌ Error reading/parsing 'users.json':", err.message);
    return;
  }

  const firebaseUsers = Array.isArray(fileContent) ? fileContent : fileContent.users;
  if (!firebaseUsers || !Array.isArray(firebaseUsers)) {
    console.error("❌ Error: 'users.json' structure is unrecognized.");
    return;
  }

  console.log(`Found ${firebaseUsers.length} users to migrate.`);
  
  const sqlLines: string[] = [];

  // SQL standard headers
  sqlLines.push("-- ============================================================");
  sqlLines.push("-- FIREBASE AUTH SCRYPT PASSWORDS IMPORT TO SUPABASE");
  sqlLines.push("-- Copy and paste this directly into Supabase SQL Editor");
  sqlLines.push("-- ============================================================\n");
  sqlLines.push("BEGIN;");
  sqlLines.push("SET LOCAL val.bypass_rls = 'on'; -- Bypass RLS triggers if needed during transaction\n");

  let count = 0;

  for (const fUser of firebaseUsers) {
    const email = fUser.email;
    if (!email) continue;

    const firebaseUid = fUser.localId || fUser.uid;
    const uuid = toDeterministicUuid(firebaseUid);

    const displayName = (fUser.displayName || email.split("@")[0] || "Reseller").replace(/'/g, "''");
    const photoUrl = (fUser.photoUrl || "").replace(/'/g, "''");
    const phone = (fUser.phoneNumber || "").replace(/'/g, "''");
    const isConfirmed = fUser.emailVerified !== undefined ? fUser.emailVerified : true;
    const emailConfirmedAtSql = isConfirmed ? "NOW()" : "NULL";

    // Format Firebase Scrypt Hash for GoTrue
    // GoTrue expects: $scrypt$ln=14,r=8,p=1$SALT_BASE64$HASH_BASE64
    // Standard Firebase hashing has memCost/rounds/etc. N is usually 16384 (so ln=14), r=8, p=1
    const rawHash = fUser.passwordHash || "";
    const rawSalt = fUser.salt || "";

    let passwordHashSql = "NULL";
    if (rawHash && rawSalt) {
      // Clean base64 strings if containing URL-unsafe chars or padding
      const cleanSalt = rawSalt.trim();
      const cleanHash = rawHash.trim();
      
      // Construct modular crypt format for GoTrue scrypt verifier
      const mcfHash = `$scrypt$ln=14,r=8,p=1$${cleanSalt}$${cleanHash}`;
      passwordHashSql = `'${mcfHash}'`;
    }

    const createdAt = fUser.createdAt 
      ? new Date(Number(fUser.createdAt)).toISOString() 
      : new Date().toISOString();

    sqlLines.push(`-- User: ${email}`);
    
    // 1. Insert into auth.users (Supabase Auth GoTrue Table)
    sqlLines.push(`INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '${uuid}',
  'authenticated',
  'authenticated',
  '${email.replace(/'/g, "''").toLowerCase()}',
  ${passwordHashSql},
  ${emailConfirmedAtSql},
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "${displayName}", "avatar_url": "${photoUrl}"}',
  '${createdAt}',
  NOW(),
  '',
  '',
  '',
  '',
  false
) ON CONFLICT (id) DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = auth.users.raw_user_meta_data || EXCLUDED.raw_user_meta_data,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at);`);

    // 2. Insert into public.users (Application Public Schema)
    sqlLines.push(`INSERT INTO public.users (
  id,
  email,
  role,
  created_at,
  updated_at
) VALUES (
  '${uuid}',
  '${email.replace(/'/g, "''").toLowerCase()}',
  'reseller',
  '${createdAt}',
  NOW()
) ON CONFLICT (id) DO NOTHING;`);

    // 3. Insert into public.reseller_profiles (Application Reseller Schema)
    sqlLines.push(`INSERT INTO public.reseller_profiles (
  id,
  reseller_id,
  full_name,
  phone,
  verified,
  status,
  balance,
  unpicked_balance,
  created_at,
  updated_at
) VALUES (
  '${uuid}',
  '${uuid}',
  '${displayName}',
  '${phone}',
  false,
  'Approved',
  0,
  0,
  '${createdAt}',
  NOW()
) ON CONFLICT (id) DO NOTHING;\n`);

    count++;
  }

  sqlLines.push("COMMIT;");
  sqlLines.push("-- Verification Select Query");
  sqlLines.push("SELECT count(*) FROM auth.users;");

  const outputSqlPath = path.join(process.cwd(), "import_users_migration.sql");
  fs.writeFileSync(outputSqlPath, sqlLines.join("\n"));

  console.log(`\n✅ Generated SQL migration successfully!`);
  console.log(`- Imported logic for ${count} users.`);
  console.log(`- Created deterministic UUIDs from Firebase IDs successfully.`);
  console.log(`- Saved file output to: ${outputSqlPath}`);
  console.log(`\n👉 INSTRUCTIONS:`);
  console.log(`1. Upload your 'users.json' and run this script to regenerate anytime.`);
  console.log(`2. Open your Supabase Dashboard, go to Settings -> Auth -> Password Hashing.`);
  console.log(`3. Choose 'SCRYPT' and input your Signer Key, Salt Separator, Rounds, and Memory Cost.`);
  console.log(`4. Open the SQL Editor in Supabase, paste the contents of 'import_users_migration.sql', and run!`);
  console.log("========================================================\n");
}

main().catch(err => {
  console.error("FATAL: Failed to execute script:", err);
});
