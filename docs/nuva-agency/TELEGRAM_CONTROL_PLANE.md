# Nüva Agency — Telegram Control Plane

Telegram is a second owner interface for Nüva Agency. The web Control Plane and Telegram share the same `agentes_historial` sessions, so a conversation can continue across both channels.

## Architecture

```
Owner web Control Plane
        │
        ├── /api/owner/agency-chat ──┐
        │                            │
Telegram Bot → Supabase Edge Function│
        │                            │
        └──────────→ agentes_historial
                         │
                         ├── persistent Agency memory
                         └── ops_agent_learning
```

The Telegram webhook is deployed independently on Supabase Edge Functions, so it does not depend on the Vercel deployment quota.

Telegram webhooks are configured with Telegram's `secret_token` header and the function additionally accepts only the configured owner chat ID. Telegram documents both the webhook secret header and HTTPS webhook requirements.

## Required secrets

### Supabase Edge Function secrets

Set these in Supabase Edge Function Secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_OWNER_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (normally already available to the project)
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional model variables:

- `GEMINI_MODEL`
- `GROQ_MODEL`
- `CLOUDFLARE_AI_MODEL`

Do not put any of these values in GitHub files or chat.

### GitHub Actions secrets

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_OWNER_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`

### GitHub Actions variable

- `TELEGRAM_WEBHOOK_URL`

Recommended value:

`https://vnzyecnbdqbfuxawzrda.supabase.co/functions/v1/nuva-telegram-agency`

## Configure the webhook

After the secrets/variable exist, run:

**Actions → Nüva Agency — Configure Telegram Webhook → Run workflow**

The workflow calls Telegram `setWebhook` and then `getWebhookInfo`.

## Telegram commands

- `/start` or `/help`
- `/agents`
- `/agent constructor`
- `/agent orchestrator`
- `/agent finance`
- `/agent sales`
- `/agent supply`
- `/agent people`
- `/agent compliance`
- `/agent growth`
- `/agent security`
- `/agent qa`
- `/agent sentinel`
- `/agent ux`
- `/agent release`
- `/status`

Any normal text is sent to the active worker.

## Automatic reports

`.github/workflows/nuva-telegram-reporter.yml` listens to important Agency/Gateway workflow completions and sends a compact report to the owner chat. It does not send secrets or workflow logs.

## Learning model

This integration uses **evidence-based operational learning**, not unverified model training:

1. Agency records incidents/findings.
2. Validated patterns become `ops_agent_learning` lessons.
3. Owner Agency chat and Telegram read recent lessons.
4. Future worker prompts can use those lessons as bounded context.
5. Verification/regression evidence can increase confidence.

A claim of actual machine-learning model training requires a dataset, training run, held-out evaluation and measured improvement. The current system deliberately does not pretend that persistent memory is model training.
