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

async function main() {
  const url = env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    console.error("Missing credentials");
    return;
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log("Fetching subscriptions...");
  const { data, error } = await admin.from("subscriptions").select("*").limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Data:", data);
  }
}

main();
