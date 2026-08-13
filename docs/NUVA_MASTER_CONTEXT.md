# Nüva One — Master Context

**Purpose:** persistent handoff for any human or AI agent continuing Nüva One. GitHub is the technical source of truth; this document is the product/architecture context.

## 1. Product vision

Nüva One is intended to become a **Business OS for Chilean PYMEs and small businesses**, not merely another ERP or chatbot. The core promise is:

> Nüva observes the business, understands what is happening, detects risks and opportunities, recommends actions, helps execute them safely, and measures outcomes.

Core loop:

`DATA → UNDERSTAND → DETECT → PRIORITIZE → RECOMMEND → ACT → MEASURE`

The product should feel premium, simple and decision-oriented, while progressively covering operations, finance, sales, customers, inventory, automation, AI and community.

## 2. Current technical stack

- React 19
- TypeScript
- TanStack Start / Router
- Supabase / PostgreSQL / Auth / RLS
- Stripe billing
- AI SDK / Groq-backed AI infrastructure
- Capacitor / Android path
- Vite
- Vitest / ESLint / TypeScript build checks

## 3. Current product areas

The repository already contains or has foundations for:

- Dashboard / Nüva Home
- Nüva Score
- "Explícame mi negocio"
- AI chat with business context
- Sales
- Purchases
- Inventory
- Products
- Customers / CRM
- Quotes
- Expenses / financial context
- WhatsApp-related infrastructure
- Community / forum MVP
- Public business directory
- SEO / robots / dynamic sitemap
- Billing / plans / Stripe
- Multi-business / multi-tenant architecture
- Supabase RLS

Do not assume every module is production-complete merely because a route or schema exists. Verify implementation and tests before claiming completion.

## 4. Current confirmed state

The recent development sequence included:

1. Multi-tenant/RLS audit.
2. Review of SECURITY DEFINER functions.
3. `stamp_customer_last_contacted` search_path hardening.
4. Leaked Password Protection identified as a manual Supabase Dashboard task.
5. `businesses_public` production/repository drift reconciliation.
6. Dynamic `robots.txt` / `sitemap.xml` SEO foundation.
7. Forum MVP and public directory navigation.
8. Nüva Score.
9. "Explícame mi negocio".
10. Tests and production build checks.

Do not repeat these tasks blindly. Inspect the current repository before changing them.

## 5. Critical security item — P1 OPEN UNTIL PROVEN CLOSED

Both `/api/chat` and `/api/business/explain` accept an `x-business-id` header. The endpoints use service-role access for AI quota operations. The authenticated user's membership in the selected business MUST be verified before any service-role quota mutation or other privileged operation.

Required flow:

`authenticate → resolve business_id → verify business_members membership → 401/403 if invalid → only then service-role quota operation → business context → AI`

Never trust a client-supplied business ID merely because later RLS-protected reads will fail. Prevent unauthorized resource consumption first.

Required tests:

- authenticated member + own business → success
- authenticated member + another business → 403
- unauthorized request must not change the other business's AI quota
- unauthenticated → 401
- nonexistent business → safe failure
- multi-business user → each authorized business works independently

Also review the database-side AI quota RPC for defense-in-depth. Do not mark this item closed without test evidence.

## 6. Business Context Engine

The existing `business-context.server.ts` is an important foundation. It already gathers real business information such as business/plan context, cash flow, revenue, expenses, products, inventory, sales, transactions, quotes, purchases and customers.

Do not turn this into an uncontrolled giant context payload. Evolve toward a modular **Nüva Business Context Engine**:

### Financial Context
- revenue
- expenses
- net cash flow
- margin
- liquidity
- accounts receivable / collections
- accounts payable where available
- trends

### Commercial Context
- sales
- average ticket
- customers
- recurring customers
- best-selling products
- slow products
- quotes
- quote conversion
- sales trends

### Operations Context
- stock
- low stock
- stock rotation
- purchases
- suppliers where available
- immobilized inventory

The goal is to expose focused context and tools rather than sending every business record to the LLM.

## 7. Nüva Intelligence architecture

Target architecture:

`BUSINESS → CONTEXT ENGINE → SCORE / INSIGHTS / ALERTS → NÜVA AI → READ TOOLS / WRITE TOOLS`

### Planned READ tools

- `get_business_overview`
- `get_financial_summary`
- `get_sales_summary`
- `get_inventory_risks`
- `get_customer_debt`
- `get_purchase_recommendations`
- `get_quote_pipeline`
- `get_business_score`

### Planned WRITE tools

- `create_customer`
- `create_product`
- `create_expense`
- `create_sale`
- `create_quote`
- `create_purchase_order`
- `create_task`

Do NOT implement all write tools at once. First establish schemas, authorization, confirmation, transactions, audit logging and idempotency.

WRITE operations must follow:

`AI intent → schema validation → authorization → user confirmation when required → DB transaction → audit log → result`

Never allow the LLM to issue arbitrary SQL or unrestricted inserts/updates.

## 8. Nüva Score 2.0

Current score components include liquidity, margin, collections, inventory and growth. The existing implementation intentionally avoids inventing values when data is missing.

Future direction:

`Score → explanation → priority → recommendation → action → measurement`

Example:

- Overall: 67/100
- Finance: 14/20
- Growth: 16/20
- Inventory: 11/20
- Collections: 12/20
- Margin: 14/20
- Primary problem: inventory
- Evidence: capital tied up in slow-moving products
- Action: inspect immobilized inventory

Do not turn the score into a cosmetic gamification system. Every score/recommendation must be explainable from real data.

## 9. Nüva Home / Dashboard direction

The dashboard should evolve from a passive metric panel into a decision center.

Target experience:

> Buenos días. Esto es lo que está pasando en tu negocio.
>
> 🔴 Critical issue
> 🟠 Risk
> 🟢 Positive trend
> 🎯 Recommended action
>
> [Take action]

Prioritize actionable insights over adding more cards.

## 10. Business Scan — growth product

Future acquisition funnel:

`SEO / social → Business Scan → diagnosis → account creation → trial → activation → paid conversion`

Business Scan should estimate business health from user-provided business inputs without fabricating facts. The full value should be unlocked through registration where appropriate.

## 11. Intelligent import

A major activation opportunity is intelligent Excel/CSV import:

`Excel/CSV → detect structure → map fields → validate → preview → user confirmation → import → Score → first diagnosis`

Do not require users to manually enter hundreds of products or customers.

## 12. Competitive positioning

Do NOT position Nüva simply as a cheaper clone of Bsale, Defontana or Nubox. Those products already cover substantial ERP/accounting/SII/inventory/financial workflows.

Nüva's strategic differentiation should be the intelligence/action layer:

> **Nüva does not only tell you what happened. It helps you understand what is happening, what matters, what to do next, and eventually helps you do it.**

Competitive research and pricing should be kept current and evidence-based.

## 13. Product principles

1. Security before features.
2. Real data before AI claims.
3. Explainable recommendations.
4. Tenant isolation by design.
5. No fake metrics or invented urgency.
6. No arbitrary LLM database writes.
7. Confirmation for consequential actions.
8. Auditability for privileged actions.
9. Idempotency for mutations.
10. Avoid unnecessary complexity.
11. Avoid feature bloat.
12. Optimize activation and retention, not feature count.
13. Premium UX, but function over decoration.
14. Chile-first where regulatory/local workflows matter, with architecture capable of LATAM expansion.

## 14. Development rules for AI agents

Before modifying code:

- inspect the current implementation;
- identify affected files;
- understand existing auth/RLS patterns;
- check migrations and generated types;
- avoid duplicating existing helpers;
- preserve backwards compatibility unless a migration is intentional;
- write focused tests;
- run typecheck, targeted tests and build when relevant;
- report exactly what changed and what remains.

Do NOT:

- paste or request secrets in chat;
- invent environment variables or credentials;
- perform broad cosmetic refactors during security/product work;
- run massive formatting fixes unrelated to the task;
- claim production completion without verification;
- bypass RLS using service role without a documented authorization boundary;
- expose private tenant data through public views/routes;
- silently change pricing, billing or entitlement rules.

## 15. Quality gates

For meaningful code changes:

- TypeScript typecheck must pass.
- Relevant unit/integration tests must pass.
- Production build must pass when affected.
- Security-sensitive changes require explicit negative tests.
- Database changes require migration consistency.
- Do not leave repository/production schema drift.

## 16. Immediate roadmap

### P0 — Security hardening
- Close `x-business-id` authorization before AI quota mutation.
- Review AI quota RPC.
- Add negative cross-tenant tests.
- Verify Supabase leaked-password protection manually.

### P1 — Intelligence foundation
- Modular Business Context Engine.
- Nüva Intelligence contracts.
- Read tool schemas.
- Insight/alert model.
- Explainable Score 2.0.

### P1 — Activation
- Intelligent Excel/CSV import.
- Better empty-business onboarding.
- First-value experience within minutes.

### P2 — Safe actions
- Tool-calling read layer.
- First write tools with confirmation, transactions, idempotency and audit logs.

### P2 — Growth
- Business Scan.
- SEO/content engine around real SME problems.
- Referral/community loops.

### P3 — Ecosystem
- More automations/integrations.
- WhatsApp workflows.
- Advanced analytics.
- LATAM expansion readiness.

## 17. Handoff protocol

When a new AI agent starts:

1. Read this file.
2. Inspect current `main` and recent commits.
3. Inspect the files relevant to the requested task.
4. Treat code/database as the source of truth over this document when they disagree.
5. Do not assume roadmap items are implemented.
6. Continue from the first unresolved priority.
7. Report evidence, tests and commit/PR information.

## 18. Current session handoff

The current investigation identified the AI quota authorization boundary as the first unresolved P1. A GitHub issue was opened to track it.

The next agent should close that issue before implementing Nüva Intelligence write actions.

## 19. Long-term north star

Nüva should become the operating layer for a small business:

`DATA → INTELLIGENCE → DECISION → ACTION → RESULT`

The competitive moat should come from accumulated business context, explainable recommendations, local workflows, automation, trust, and measurable business outcomes — not from simply embedding a generic LLM into an ERP.
