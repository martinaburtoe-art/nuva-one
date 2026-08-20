# Nüva One — PYME Moat Chile

## Product thesis
Nüva One should not compete with Odoo by copying its application count. Odoo already combines CRM, e-commerce, accounting, inventory, POS and projects, and its Chile localization covers SII-connected electronic invoicing, F29 proposal, accounting reports, delivery guides and factoring. The strategic moat for Nüva is decision intelligence: turn business data and Chilean compliance into prioritized, explainable actions.

## Competitive positioning

- Odoo: breadth and extensibility.
- Chilean ERP/accounting incumbents: local compliance, accounting, payroll and operational depth.
- POS/inventory specialists: fast transaction and stock workflows.
- Nüva: a Chile-first Business Operating System that unifies operations, compliance, prediction and execution.

## North-star workflow
`data -> detection -> explanation -> recommendation -> preparation -> explicit confirmation -> execution -> audit trail -> re-analysis`

No financial, tax, payroll or irreversible operation should execute solely because an AI model recommended it.

## Priority product moat

### S — launch-critical
1. Chile DTE Engine: invoice, boleta, credit/debit notes, delivery guide, folios, XML, signature, SII response states, retry/idempotency, audit trail.
2. RCV/F29 control center: reconcile internal sales/purchases against available tax records, expose discrepancies and prepare a review workflow.
3. Finance Core: accounting engine, chart of accounts, VAT, receivables/payables, P&L, balance sheet, cash flow.
4. Nüva CFO: explain financial position and propose next actions using business data.
5. Inventory 3.0: barcode/SKU lifecycle, cycle counts, stock adjustments, reorder prediction, purchase suggestions and margin-aware replenishment.
6. Compliance Radar: versioned Chilean obligations, effective dates, evidence and responsible user.

### A — competitive expansion
7. Procurement intelligence and supplier scorecards.
8. CRM health, churn and upsell signals.
9. POS + e-commerce omnichannel stock.
10. Payroll/attendance compliance engine.
11. Privacy Center and AI data boundary.
12. Bank/payment reconciliation.
13. Document vault and evidence packs for accountants/auditors.

### B — differentiation
14. What-if simulator for pricing, purchases, hiring and cash decisions.
15. Scenario-based 13-week cash forecast.
16. Benchmarking by industry with privacy-preserving aggregates.
17. AI-generated action plans and campaign execution.
18. Accountant collaboration portal.

## Chile compliance guardrails

- SII market-system certification must be treated as a launch gate for certified DTE operation.
- DTEs are first-class fiscal objects, not PDFs.
- Boletas, invoices, credit/debit notes and delivery guides require lifecycle state, folio, XML, validation and auditability.
- The product must prepare for the 1 December 2026 effective date of Law 21.719 on personal data protection.
- Workforce rules must be date-versioned for the 42-hour stage and the 40-hour stage of Law 21.561.

## Security baseline

- Tenant isolation and RLS.
- Least privilege and explicit membership checks.
- MFA support for privileged roles.
- Immutable audit events for critical operations.
- Idempotency keys for DTE and payment-related commands.
- Secret/certificate rotation and expiry monitoring.
- Export/delete/access workflows for personal data.
- AI prompts must be bounded by tenant and authorization context.

## Definition of done for every module

1. Functional happy path.
2. Empty state.
3. Loading state.
4. Error/retry state.
5. Mobile UX.
6. Authorization/RLS review.
7. Audit trail for consequential actions.
8. Unit/integration tests.
9. Typecheck/lint/build.
10. Production deployment verification.
11. Documentation and user-facing explanation.

## Strategic rule
Do not optimize for maximum number of screens. Optimize for minimum number of decisions the owner must figure out alone.
