# Inventory concurrency load test — beta gate

The repository already contains `.github/workflows/staging-load-test.yml`, a manual `workflow_dispatch` laboratory that provisions an ephemeral Supabase database and exercises `apply_sale_effects()` at 25, 50 and 100 VUs.

## Human trigger

The current GitHub connector does not expose workflow dispatch. The user must run the workflow manually from **GitHub → Actions → Staging Load Test — Inventory Concurrency** on the branch containing the inventory fix.

## Evidence required

Preserve the workflow artifacts. For each of 25/50/100 VUs, inspect:

- attempted operations;
- successful commits;
- rejected insufficient-stock operations;
- final stock;
- negative-stock/oversell invariant;
- database/HTTP errors;
- latency/error statistics emitted by the harness.

Acceptance requires that successful decrements never exceed the fixture's finite stock, final stock is never negative, and the final stock delta equals the committed quantity.

A Vercel READY deployment is not concurrency evidence. Do not close the inventory P0 until the artifact has been inspected and retained.
