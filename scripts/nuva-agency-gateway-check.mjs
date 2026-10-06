import { providerStatus, generate } from "./nuva-ai-gateway.mjs";

const status = providerStatus();
console.log("Nüva AI Gateway provider matrix:");
for (const item of status) {
  console.log(`- ${item.provider}: ${item.configured ? "configured" : "waiting for API"} (${item.model})`);
}

if (process.env.NUVA_GATEWAY_LIVE_TEST === "true") {
  const result = await generate("Return exactly: NÜVA_GATEWAY_OK");
  if (!result.content.includes("NÜVA_GATEWAY_OK")) {
    throw new Error("Gateway live test returned an unexpected response");
  }
  console.log(`Live test passed through ${result.provider}/${result.model}`);
} else {
  console.log("Live provider test disabled; no external API call was made.");
}
