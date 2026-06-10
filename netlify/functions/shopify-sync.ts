import { schedule } from "@netlify/functions";
import { performShopifySync, startServer } from "../../server";

const syncHandler = async () => {
  console.log("[SCHEDULED_TASK] Starting scheduled Shopify sync...");
  try {
    if (!performShopifySync) {
      console.log("[SCHEDULED_TASK] Initializing server endpoints...");
      await startServer();
    }
    await performShopifySync();
    console.log("[SCHEDULED_TASK] Shopify sync completed successfully.");
    return { statusCode: 200 };
  } catch (error) {
    console.error("[SCHEDULED_TASK] Shopify sync failed:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Sync failed" }) };
  }
};

export const handler = schedule("0 */12 * * *", syncHandler);
