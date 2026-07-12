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
  const userId = "51f0c21d-43aa-4a33-8dc3-1ac8d0e14055"; // Hardcoded from previous test
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  // Impersonate user for RLS
  console.log("Setting RLS context...");
  const { error: rpcErr } = await admin.rpc("set_claim", { uid: userId }); // Supabase has no built-in set_claim, we'll do raw REST header instead

  // A better way to test RLS without a JWT is just asking Supabase to explain a query, but we can't easily.
  // Instead, let's just create a custom client that passes the Authorization header.
  // Actually, we can generate a JWT using jsonwebtoken using the JWT secret, but we don't have the JWT secret (it's internal to Supabase).

  // Let's just create an SQL function to test the policies inside the DB!
  const { data, error } = await admin.rpc("test_rls", { uid: userId });
  console.log("Finished script.");
}

main();
