# Nüva People — Master Product Specification 2026

## 1. Product decision

Nüva People becomes a strategic pillar of Nüva One, not an isolated HR add-on.

Positioning:

> Gestiona a tus personas, cumple con tus obligaciones laborales y entiende cuánto impactan en tu negocio.

The differentiator is the native connection between people, payroll, operating costs, finance and Nüva Intelligence.

## 2. Product domains

### People Core
- Employee master record
- Organizational units
- Positions and cost centres
- Employment status
- Employment history
- Manager relationships

### Employment lifecycle
- Candidate intake
- Hiring
- Onboarding
- Contract lifecycle
- Contract amendments
- Documents
- Offboarding
- Termination/finiquito workflow

### Time & attendance
- Work schedules
- Shifts
- Attendance events
- Breaks
- Overtime
- Lateness
- Absences
- Permissions
- External attendance-provider integrations

### Leave & requests
- Vacation requests
- Permission requests
- Absence records
- Approval workflows
- Balances and audit trail

### Payroll
- Payroll periods
- Remuneration components
- Taxable/non-taxable concepts
- Deductions
- Employer costs
- Net pay
- Payroll simulation
- Liquidations
- Finiquitos
- Payroll audit trail
- LRE preparation/export

The payroll engine must be versioned and parameter-driven. Legal values must never be hard-coded into UI components.

### Compliance
- LRE workflow
- Labour-document expiry
- Contract deadlines
- Working-time checks
- Ley Karin workflow and restricted case access
- Internal regulation reminders
- Inclusion-law indicators when applicable
- Compliance calendar
- Evidence and audit history

### Talent
- Recruiting
- Onboarding checklists
- Objectives
- Performance reviews
- Training
- Skills/competencies
- Feedback

### Employee portal
- Profile
- Documents
- Contracts
- Liquidations
- Vacation balances
- Requests
- Attendance
- Notifications
- Electronic signature integration

## 3. Nüva Intelligence integration

Nüva Intelligence must answer questions using authorized business data, for example:

- What is my total monthly labour cost?
- Which cost centres have the highest overtime cost?
- What would it cost to hire two employees?
- How much would a 5% salary adjustment change annual labour cost?
- Which contracts or documents require attention?
- Which pending people requests need approval?

The AI layer must not bypass RLS or infer private employee information outside the user's authorization scope.

## 4. Core business connection

People costs should flow into the financial model through explicit, auditable integrations:

Employee → payroll result → labour cost → cost centre → expense/finance → profitability → Nüva Intelligence.

Payroll must never silently create accounting/finance entries. The integration should use an explicit posting step with idempotency and an audit reference.

## 5. Chile compliance architecture

The product must support, with effective dates and versioned parameters:

- Código del Trabajo
- Libro de Remuneraciones Electrónico (LRE)
- Jornada ordinaria and overtime rules
- Vacation rules
- Termination/finiquito calculations
- Previred-related contribution data and exports/integrations where commercially and technically available
- Ley 21.643 (Ley Karin)
- Internal regulation obligations
- Disability/inclusion employment obligations where applicable
- Personal-data protection requirements, including the transition to Ley 21.719 from 1 December 2026

This document is a product architecture, not legal advice. Every legal rule exposed as a calculation must have a source, effective-from date, effective-to date where applicable, test cases and an audit-friendly parameter snapshot.

## 6. Security model

HR data is confidential by default.

Required principles:

1. Business/tenant isolation through Supabase RLS.
2. Least privilege by module and role.
3. Sensitive employee fields must not be returned to generic dashboard queries.
4. Payroll approval and closing require elevated authorization.
5. Ley Karin case data requires a dedicated restricted-access policy, not generic employee access.
6. Every payroll calculation stores a parameter snapshot and calculation version.
7. Documents use private storage buckets and signed URLs.
8. Destructive operations are audited.
9. AI requests use the authenticated user's JWT and server-side authorization; business IDs supplied by clients are not trusted as authorization.
10. Retention/deletion policies must be explicit before production launch.

## 7. Roadmap

### Phase A — Foundation
- Database model
- RLS
- Employee directory
- Organization/cost centres
- Contracts
- Documents
- Leave/requests
- Attendance event model
- Payroll period model
- Compliance model

### Phase B — Chile payroll MVP
- Parameter registry
- Payroll calculation engine
- Liquidations
- Employer cost
- Overtime integration
- Vacation treatment
- Finiquito engine
- LRE preparation/export
- Payroll approval/closing

### Phase C — Employee experience
- Employee portal
- Requests
- Document delivery
- Signature integration
- Notifications

### Phase D — Intelligence and talent
- Labour-cost analytics
- Hiring simulator
- Workforce planning
- Recruiting
- Onboarding
- Performance
- Training
- Nüva Intelligence People

### Phase E — Integrations
- Attendance providers
- Previred-compatible workflows
- DT/LRE workflows
- Accounting/finance posting
- Banking/payment partners where justified

## 8. Non-goals for the first release

Do not build a proprietary biometric clock, legal-advice engine, banking/payroll payment rail, or full enterprise HR suite before the core Chile payroll/compliance workflow is reliable.

## 9. Quality gates

Before enabling real payroll for customers:

- Unit tests for every legal calculation.
- Golden payroll fixtures with expected results.
- Effective-date regression tests.
- Property/invariant tests for totals.
- RLS cross-tenant tests.
- Role/permission tests.
- Payroll idempotency tests.
- Audit-log tests.
- LRE schema/validation tests.
- Build, typecheck, lint and browser verification.
- Independent review of legal parameters before production use.
