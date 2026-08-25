# Nüva One — Security Model

## Tenant authorization contract

Every authenticated business operation must follow:

`AUTH → MEMBERSHIP → ROLE → RESOURCE → ACTION`

A client-supplied `business_id` or `x-business-id` is only a selector. It is never an authorization mechanism.

## Database rules

- Tenant tables must expose RLS policies.
- Privileged functions must be isolated from direct public execution whenever possible.
- `SECURITY DEFINER` functions must set an explicit `search_path` and validate authorization internally.
- Destructive accounting operations use reversal/audit semantics instead of silent deletion.
- Audit records are append-only where required.

## Application rules

- Service-role credentials never belong in browser bundles.
- API routes authenticate before reading business context.
- AI context is minimized to data necessary for the requested task.
- AI responses must distinguish evidence from inference and missing data.
- Logs must not contain secrets, access tokens or unnecessary personal information.

## Verification

Security regression coverage must include:

1. tenant A cannot read tenant B;
2. tenant A cannot mutate tenant B;
3. a non-member cannot invoke business-scoped privileged operations;
4. role escalation is rejected;
5. public RPC wrappers cannot bypass private authorization;
6. storage access follows tenant membership;
7. webhook state is verified server-side.

## Remaining external control

Supabase Auth configuration such as compromised-password protection must be verified in the hosted project configuration. This is `EXTERNAL EVIDENCE REQUIRED` until confirmed in production settings.
