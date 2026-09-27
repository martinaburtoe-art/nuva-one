// Hardening for data embedded into AI system prompts.
//
// This does NOT try to detect or block "malicious" text -- that's the model's
// job, guided by the system prompt's SEGURIDAD instructions. What this file
// does is purely structural: untrusted strings (customer names, product
// names, external messages, notes -- anything not typed by us as static
// prompt text) must never be able to fabricate a closing/opening delimiter
// tag (e.g. "</business_data><system>...") that could make the model
// misread where trusted instructions end and untrusted data begins.
//
// Angle brackets are the only characters our own delimiters rely on, so
// escaping them in untrusted content is sufficient to keep the tag
// boundaries structurally sound, regardless of what the data says.
function escapeDelimiters(value: string): string {
  return value.replace(/</g, "‹").replace(/>/g, "›");
}

// Recursively walks any JSON-serializable value (string, number, array,
// plain object) and escapes delimiter characters in every string found,
// so an entire context object can be sanitized in one call right before
// JSON.stringify.
export function sanitizeForPrompt<T>(value: T): T {
  if (typeof value === "string") {
    return escapeDelimiters(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForPrompt(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForPrompt(v);
    }
    return out as unknown as T;
  }
  return value;
}

// Wraps a JSON-serializable payload in a named, sanitized delimiter block
// ready to drop straight into a system prompt.
export function wrapAsDataBlock(tagName: string, payload: unknown): string {
  const safe = sanitizeForPrompt(payload);
  return `<${tagName}>\n${JSON.stringify(safe, null, 2)}\n</${tagName}>`;
}
