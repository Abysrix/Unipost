import fs from "fs";
import path from "path";

const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
envFile.split("\n").forEach(line => {
  if (line.trim() && !line.startsWith("#") && line.includes("=")) {
    const [key, ...rest] = line.split("=");
    process.env[key.trim()] = rest.join("=").trim();
  }
});

// We have to mock getCurrentUser for getBillingBundle to work
import * as authObj from "./lib/auth/getUser";
(authObj as any).getCurrentUser = async () => ({ id: "51f0c21d-43aa-4a33-8dc3-1ac8d0e14055" });

import { getBillingBundle } from "./lib/db/billing";

async function main() {
  try {
    const bundle = await getBillingBundle();
    console.log("Success!");
  } catch (err) {
    console.error("Caught error in getBillingBundle:", err);
  }
}

main();
