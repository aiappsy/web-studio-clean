// lib/ai-client.ts

import { openRouterClient } from "./openrouter";

/**
 * Unified AI request wrapper used by API routes.
 */
export async function aiRequest(messages: any[], options: any = {}) {
  try {
    return await openRouterClient.createChatCompletion(messages, options);
  } catch (err: any) {
    console.error("aiRequest error:", err);
    throw new Error(err?.message || "AI request failed");
  }
}
