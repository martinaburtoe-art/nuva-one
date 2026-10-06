const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const chatId = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
if (!token || !chatId) {
  console.log("Telegram notifier skipped: credentials not configured.");
  process.exit(0);
}

const eventPath = process.env.GITHUB_EVENT_PATH;
let event = {};
if (eventPath) {
  try {
    event = JSON.parse(await Bun.file(eventPath).text());
  } catch {
    // GitHub runners have Node, not necessarily Bun; fallback below.
  }
}
if (!event || Object.keys(event).length === 0 && eventPath) {
  const fs = await import("node:fs/promises");
  try { event = JSON.parse(await fs.readFile(eventPath, "utf8")); } catch { event = {}; }
}

const run = event.workflow_run ?? {};
const workflow = run.name ?? process.env.GITHUB_WORKFLOW ?? "Nüva Agency";
const conclusion = run.conclusion ?? "completed";
const status = run.status ?? "unknown";
const branch = run.head_branch ?? process.env.GITHUB_REF_NAME ?? "main";
const sha = (run.head_sha ?? process.env.GITHUB_SHA ?? "").slice(0, 8);
const url = run.html_url ?? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions`;

const reason = conclusion === "success"
  ? "Ejecución completada correctamente."
  : conclusion === "failure"
    ? "La ejecución falló y requiere diagnóstico automático."
    : `Estado: ${conclusion || status}.`;

const text = [
  "Nüva Agency · actualización",
  `Workflow: ${workflow}`,
  `Resultado: ${conclusion}`,
  `Rama: ${branch}`,
  sha ? `Commit: ${sha}` : "",
  reason,
  url,
].filter(Boolean).join("\n");

const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3900), disable_web_page_preview: true }),
});
if (!response.ok) {
  console.error(`Telegram notify failed: HTTP ${response.status}`);
  process.exit(1);
}
console.log("Telegram notification sent.");
