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
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// Simulate getBillingBundle for hardcoded user id
const userId = "51f0c21d-43aa-4a33-8dc3-1ac8d0e14055";

async function main() {
  console.log("Testing getOrCreateSubscription...");
  const { data: sub, error: err1 } = await admin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  if (err1) console.error("Error in subscriptions:", err1);
  else console.log("Sub:", !!sub);

  console.log("Testing getCreditBalance...");
  const { error: err2 } = await admin.from("ai_credit_history").select("amount");
  if (err2) console.error("Error in ai_credit_history:", err2);

  console.log("Testing refreshUsageMetrics...");
  const period = new Date().toISOString().slice(0, 10);
  const { error: err3 } = await admin
    .from("usage_metrics")
    .upsert(
      { user_id: userId, period, ai_credits_used: 0, scheduled_posts_count: 0, connected_accounts_count: 0, storage_bytes_used: 0 },
      { onConflict: "user_id,period" }
    )
    .select("id")
    .single();
  if (err3) console.error("Error in usage_metrics upsert:", err3);
  else console.log("Usage metrics upsert succeeded.");

  console.log("Testing listPayments...");
  const { error: err4 } = await admin.from("payments").select("*").limit(1);
  if (err4) console.error("Error in payments:", err4);

  console.log("Testing listInvoices...");
  const { error: err5 } = await admin.from("invoices").select("*").limit(1);
  if (err5) console.error("Error in invoices:", err5);

  console.log("Testing listBillingEvents...");
  const { error: err6 } = await admin.from("billing_events").select("*").limit(1);
  if (err6) console.error("Error in billing_events:", err6);

  console.log("Testing spend_credits rpc...");
  const { data: rpcData, error: err7 } = await admin.rpc("spend_credits", { p_user_id: userId, p_amount: 1, p_reason: "test" });
  if (err7) console.error("Error in spend_credits:", err7);
  else console.log("spend_credits returned:", rpcData);
}

main();
