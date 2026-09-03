# Block B — Multi-tenant RLS matrix

Status: preparation only. This document is a test contract, not a PASS certificate.

## Evidence rule

A row becomes PASS only after a database-backed test runs against the current production migration set (or an explicitly identified local clone of that exact set). A policy definition in source is not sufficient evidence of runtime isolation.

## Required matrix

| Surface | SELECT | INSERT | UPDATE | DELETE | WITH CHECK | Required negative tests |
|---|---|---|---|---|---|---|
| Business core / `businesses` | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| `business_members` | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| Dashboard / `business_data` | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| CRM / customers & related records | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| Quotes / sales | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| Inventory / products & stock | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| Purchases | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| Finance / cash register | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| AI / usage & conversations | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete + non-member RPC |
| Files / assets | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant object read/write/delete |
| Forum | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| Directory | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |
| Billing / subscriptions & charges | PENDING | PENDING | PENDING | PENDING | PENDING | cross-tenant read/insert/update/delete |

## Mandatory test contract

Every tenant-bearing table must have evidence for all four DML isolation properties:

- `cross_tenant_read_denied`
- `cross_tenant_insert_denied`
- `cross_tenant_update_denied`
- `cross_tenant_delete_denied`
- `non_member_rpc_denied` for every tenant-sensitive RPC

For INSERT and UPDATE, the assertion must exercise `WITH CHECK`, not only the `USING` predicate. For DELETE, the test must prove a member of tenant A cannot remove tenant B's row. For SELECT, the test must prove tenant A cannot observe tenant B's row.

## RPC requirements

For every `SECURITY DEFINER` function:

1. Record owner and schema.
2. Verify a fixed `search_path` (prefer `pg_catalog` plus explicitly qualified application schemas).
3. Verify public execution grants are intentional.
4. Verify tenant authorization is enforced inside the trusted boundary where required.
5. Add `non_member_rpc_denied` coverage.

## Storage requirements

Storage is a separate authorization surface. The matrix must record bucket, object path tenant binding, authenticated read/write/delete behavior, signed URL TTL, and whether an object can be referenced across tenants.

## Runtime evidence still required

The repository connector cannot substitute for a live database test. Until the production/local database test executes against the exact migration state, all rows above remain PENDING. Do not convert PENDING to PASS from static source inspection alone.
