// useChat's onError hands us err.message, which for a failed /api/chat call
// is usually the raw response body (e.g. `{"error":"No autenticado"}`) but
// sometimes arrives prefixed (e.g. "Error: {...}"), which breaks a plain
// JSON.parse. Either way, a user should never see raw braces in a toast --
// this always resolves to a clean, human string.
export function extractChatErrorMessage(rawMessage: string | undefined): string {
  const fallback = "Error al conectar con el asistente. Intenta nuevamente.";
  if (!rawMessage) return fallback;

  const jsonLike = rawMessage.slice(rawMessage.indexOf("{"));
  try {
    const parsed = JSON.parse(jsonLike || rawMessage);
    if (parsed?.error) return parsed.error;
  } catch {
    // Not JSON (or the prefix trim didn't land on valid JSON) -- fall through.
  }

  // Never surface a raw, unparsed JSON-looking string to the user.
  return rawMessage.trim().startsWith("{") ? fallback : rawMessage;
}
