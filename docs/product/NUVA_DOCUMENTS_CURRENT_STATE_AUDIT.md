# Nüva Documents — Current Source Audit

Date: 2026-11-14. Base inspected: main.

## Confirmed existing implementation

- The TanStack route tree already registers `/_authenticated/quotes` from `src/routes/_authenticated/quotes.tsx`. This is the canonical module; do not create a parallel documents app.
- The existing route uses `useBizList`, `useBizInsert`, `useBizUpdate`, `useBizDelete`, `useActiveBusiness`, `useMyRole`, `canWriteOperations` and `ModuleGuard`.
- Existing quote creation supports linked customers, catalog products, ad-hoc lines, quantity, unit price, percentage discount, validity date, terms, draft/sent save, duplicate, status changes, PDF download and conversion.
- Accepted quotes call the existing `convert_quote_to_sale` Supabase RPC. Its SQL implementation and transactional/idempotency guarantees still need review.
- `src/lib/quote-pdf.ts` dynamically loads jsPDF and renders a branded A4 quote with logo, business name/RUT, quote number/date, customer, validity, line items, subtotal, discount, fixed IVA 19%, total, notes and terms.
- `package.json` already includes `jspdf` and `inngest`; do not add duplicate dependencies.

## P0 defects / risks to resolve before calling it production-ready

1. Tax semantics conflict: default terms say “IVA incluido”, while the quote UI calculates 19% on top of subtotal and the PDF labels this as IVA (19%). Confirm the existing business price convention and tax configuration, then correct UI, persisted totals and PDF together.
2. Tax is hard-coded to 19%; exemptions, non-taxable operations and other supported treatments are not represented in the current editor.
3. The “Enviar” action currently saves status `sent`; it does not establish that an email, share link or other delivery actually occurred. Separate issue/ready-to-send from delivery evidence.
4. The status dropdown permits direct changes among all known statuses; enforce allowed transitions server-side and in the UI.
5. PDF item descriptions are truncated to 55 characters and item rows have fixed height. Long descriptions, notes and terms need wrapping and multi-page overflow tests.
6. PDF generation currently receives business name, logo URL and RUT only. Confirm which business identity/contact fields exist before extending the document header.
7. The current quote line model is `{ product_id, name, qty, price }`. Preserve compatibility until the database schema and all consumers are mapped.

## Next engineering sequence

1. Inspect migrations and SQL for `quotes`, `sales` and `convert_quote_to_sale`; verify tenant scoping, constraints, triggers, RLS and conversion idempotency.
2. Inspect `useBizList`/mutation hooks, generated Supabase types, existing tests and any public share-token pattern.
3. Fix and test tax semantics first; it affects commercial correctness.
4. Upgrade the existing quote editor with responsive preview/template controls and robust validation.
5. Improve PDF wrapping, pagination, branding and download tests.
6. Add customer approval/public links and Inngest follow-ups only after token security and event durability are designed.
7. Run full tests, typecheck, lint and build; use synthetic tenant data and a controlled release gate.

## Scope boundary

This source audit is read-only. No application code, database migration, production data or deployment was changed. The architecture PR remains a draft until source/schema review and implementation are complete.