# Nüva One — Readiness Register

> Operational register for product, security, data, AI, finance, legal, commercial and funding readiness.

## Evidence rule

A capability is not considered production-ready merely because UI or code exists. A gate requires implementation, automated tests where applicable, deployment evidence and a documented verification path.

External evidence that cannot be produced from the repository is explicitly marked `EXTERNAL EVIDENCE REQUIRED`.

## Current technical gates

| Area | Current status | Evidence / blocker |
|---|---|---|
| Build | In verification | GitHub Actions CI |
| Unit tests | In verification | GitHub Actions CI |
| Database tests | In verification | Supabase local stack + pgTAP |
| Dependency audit | Passing at last run | `npm audit --audit-level=high` returned 0 vulnerabilities |
| Tenant isolation | Hardened | Membership checks + RLS/security tests |
| AI provenance | Implemented | Context evidence metadata |
| AI data minimization | Implemented | Reduced personal-data context |
| Nüva Intelligence | Implemented/hardening | Evidence-backed signals and confidence |
| Billing | Implemented/hardening | Must verify provider credentials/webhooks in deployment |
| Mobile UX | Requires device verification | `EXTERNAL EVIDENCE REQUIRED` for physical-device acceptance |
| Privacy/legal | Partial | Legal review and final company/operator details required |
| Accounting/tributary | Partial | Professional/accountant validation required before compliance claims |
| Market validation | Not yet evidenced | Real interviews/pilots required |
| Traction | Not evidenced | Never infer from registrations or demo usage |
| Funding | Evidence register exists | Eligibility depends on current bases and applicant status |

## Definition of 100%

100% means:

1. implemented;
2. tested;
3. security reviewed;
4. documented;
5. deployed;
6. verified in the target environment;
7. no known blocker remains that can be resolved from available technical evidence.

## Non-fabrication policy

Never represent forecasts as revenue, registrations as customers, demos as validation, interest as willingness to pay, or planned pilots as completed pilots.
