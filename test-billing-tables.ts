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
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const tables = [
    "subscriptions",
    "ai_credit_history",
    "usage_metrics",
    "payments",
    "invoices",
    "billing_events"
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).select("id").limit(1);
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`Table ${table} is accessible.`);
    }
  }
}

main();
