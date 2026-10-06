import { providerStatus, generate } from "./nuva-ai-gateway.mjs";

const status = providerStatus();
console.log("Nüva AI Gateway provider matrix:");
for (const item of status) {
  console.log(`- ${item.provider}: ${item.configured ? "configured" : "waiting for API"} (${item.model})`);
}

if (process.env.NUVA_GATEWAY_LIVE_TEST === "true") {
  const configured = status.filter((item) => item.configured);
  if (!configured.length) {
    throw new Error("Gateway live test requires at least one configured provider");
  }

  for (const item of configured) {
    const result = await generate("Return exactly: NÜVA_GATEWAY_OK", {
      providers: [item.provider],
      timeoutMs: 30000,
    });
    if (!result.content.includes("NÜVA_GATEWAY_OK")) {
      throw new Error(`Live test failed for ${item.provider}`);
    }
    console.log(`Provider live test passed: ${result.provider}/${result.model}`);
  }

  if (configured.length >= 2) {
    const forcedProvider = configured[0].provider;
    const fallback = await generate("Return exactly: NÜVA_GATEWAY_OK", {
      providers: configured.map((item) => item.provider),
      forceFailureProvider: forcedProvider,
      timeoutMs: 30000,
    });
    if (fallback.provider === forcedProvider || !fallback.content.includes("NÜVA_GATEWAY_OK")) {
      throw new Error("Gateway forced-fallback test did not route to a different healthy provider");
    }
    console.log(`Forced fallback passed: ${forcedProvider} -> ${fallback.provider}`);
  }
} else {
  console.log("Live provider test disabled; no external API call was made.");
}
