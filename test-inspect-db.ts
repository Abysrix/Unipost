import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
const env: Record<string, string> = {};
envFile.split("\n").forEach(line => {
  if (line.trim() && !line.startsWith("#") && line.includes("=")) {
    const [key, ...rest] = line.split("=");
    env[key.trim()] = rest.join("=").trim();
  }
});

const url = env["NEXT_PUBLIC_SUPABASE_URL"];
const key = env["SUPABASE_SERVICE_ROLE_KEY"];

async function main() {
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log("Inspecting database schema for private.is_admin...");
  // Let's run a query to check pg_proc details
  const { data: funcData, error: funcErr } = await admin.rpc("exec_sql", { query: `
    select 
      r.rolname as owner,
      p.prosecdef as is_security_definer,
      p.prosrc as source,
      p.proconfig as config
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    join pg_roles r on p.proowner = r.oid
    where n.nspname = 'private' and p.proname = 'is_admin';
  `});

  if (funcErr) {
    console.error("Error fetching pg_proc:", funcErr);
  } else {
    console.log("Function details:", funcData);
  }

  console.log("Inspecting policies on profiles...");
  const { data: policyData, error: policyErr } = await admin.rpc("exec_sql", { query: `
    select 
      schemaname, tablename, policyname, roles, cmd, qual, with_check
    from pg_policies
    where tablename = 'profiles';
  `});

  if (policyErr) {
    console.error("Error fetching pg_policies:", policyErr);
  } else {
    console.log("Policies details:", policyData);
  }
}

main();
