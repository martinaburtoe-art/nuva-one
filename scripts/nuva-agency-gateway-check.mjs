import { providerStatus, generate } from "./nuva-ai-gateway.mjs";

const status = providerStatus();
console.log("Nüva AI Gateway provider matrix:");
for (const item of status) {
  console.log(`- ${item.provider}: ${item.configured ? "configured" : "waiting for API"} (${item.model})`);
}

export async function certifyRequiredProviders() {
  const required = ["gemini", "groq"];
  const certified = [];
  for (const provider of required) {
    const result = await generate("Return exactly: NÜVA_GATEWAY_OK", { providers: [provider] });
    if (result.provider !== provider || result.content.trim() !== "NÜVA_GATEWAY_OK") {
      throw new Error(`${provider}_live_certification_failed`);
    }
    certified.push({ provider, model: result.model });
    console.log(`Live provider passed: ${provider}/${result.model}`);
  }
  return certified;
}

if (process.env.NUVA_GATEWAY_LIVE_TEST === "true") {
  await certifyRequiredProviders();
  console.log("Required live providers certified: Gemini + Groq.");
} else {
  console.log("Live provider test disabled; no external API call was made.");
}
