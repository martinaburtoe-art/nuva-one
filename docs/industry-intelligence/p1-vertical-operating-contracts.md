# P1 vertical operating contracts — first expansion wave

**Status:** discovery-backed product specification; not certified and not enabled as production workflows.
**Profiles:** `apparel_footwear`, `auto_repair_parts`, `restaurant_cafe`, `professional_services`.
**Prerequisite:** each capability must pass the platform readiness gate and the P0 certification contract before the profile is called certified.

These four profiles are selected because they represent distinct operating models that cannot be safely reduced to generic inventory/sales screens: matrix inventory, service/work orders, food preparation and time/project delivery.

## 1. `apparel_footwear` — clothing, footwear and accessories

### Operating model and boundary
Sell styles with multiple sellable variants (typically size and color), through one or more channels, with seasonal assortment, exchanges and markdowns. This profile does not imply a variant-level stock engine, ecommerce synchronization, omnichannel order orchestration or automatic size equivalence.

### Master data
- Style/model: brand, collection/season, category, descriptive attributes and lifecycle.
- Variant: style reference + size + color + any additional sellable attribute; unique SKU/barcode and independent stock identity.
- Size system: named scale and brand/category-specific mapping; no universal conversion between brands.
- Channel: store, online, social/manual, wholesale; each order retains channel source.
- Return: original document, reason, inspection state, refund/exchange decision and stock disposition.

### Workflow contract
1. Create style and explicit variant matrix; only combinations actually sold become sellable SKUs.
2. Receive stock by exact variant, never by style aggregate alone.
3. Search by style plus size/color; barcode must resolve to one variant.
4. Sell through a selected channel with price and variant snapshot.
5. Exchange references original sale and records returned and replacement variants independently.
6. Returned item re-enters sellable stock only after inspection; damaged/used returns remain quarantined or written off under policy.
7. Seasonal markdown is approved, versioned and measured against prior price/cost; historical sales are unchanged.

### KPI contract
- Sell-through = units sold from a defined receipt/season cohort ÷ units received in that cohort.
- Variant availability = sellable stock by size/color; unavailable until variant stock is independently persisted.
- Markdown rate = discount amount ÷ reference price amount, with reference price and period stated.
- Return rate = returned units ÷ sold units for the same cohort/window.
- Gross margin only when COGS is complete.

### Golden fixture — “Boutique Trama”
Seed 24 styles, 5–8 variants each, 3 seasons, two channels, 3 exchanges (one cross-size, one cross-color, one damaged return), one markdown event and intentionally duplicated style descriptions.

Assertions: SKU/barcode uniqueness per variant; style totals never imply size availability; exchange preserves original sale; damaged item is not restocked; seasonal sell-through cohort is stable; no inferred brand size equivalence.

### Release blockers
Variant identity/stock, exchange and return disposition, price history, channel attribution, tenant-safe uniqueness and mobile barcode tests.

---

## 2. `auto_repair_parts` — automotive workshop and spare parts

### Operating model and boundary
Combine customer/vehicle context, diagnosis, estimate, customer authorization, labor, parts consumption and delivery. The profile does not imply mechanical diagnosis, safety certification, VIN decoding, labor-time catalog licensing, appointment capacity or a complete work-order module.

### Master data
- Customer and vehicle as separate entities; vehicle may have plate, VIN/chassis, make, model, year, engine and odometer.
- Vehicle identifiers are validated and duplicate candidates surfaced; plate/VIN must not be assumed globally unique across jurisdictions without policy.
- Service operation: description, labor unit/rate, skill/resource requirements and validity.
- Part: exact SKU, compatibility evidence source, supplier and cost.
- Work order: complaint, inspection/diagnosis, estimate lines, authorizations, assigned technician, labor events, parts, attachments and closeout.
- Warranty/rework: original work order, covered operation/part, dates, mileage and decision.

### Workflow contract
`intake → inspection → estimate → awaiting_authorization → authorized → in_progress → quality_check → ready_for_delivery → closed`; exception paths include `declined`, `on_hold`, `cancelled` and `rework`.

- Customer symptom and technician diagnosis are separate fields; AI must never promote a symptom into a confirmed diagnosis.
- Estimate separates parts, labor, external services and taxes/charges; changes after authorization require renewed approval.
- No work begins on a chargeable line until customer authorization is recorded, except an explicitly configured emergency/legal process reviewed by the business.
- Parts are consumed against the work order and exact vehicle/job; unused parts are returned with condition and quantity.
- Odometer readings are timestamped and monotonic warnings are raised, not silently corrected.
- Vehicle handover records checklist, date, recipient and unresolved observations.
- Warranty/rework links to original work and does not erase the original invoice or history.

### KPI contract
- Estimate acceptance = accepted estimates ÷ estimates sent, by count and value.
- Labor utilization = billable labor hours ÷ available technician hours; unavailable without reliable time and capacity data.
- Effective labor rate = labor revenue ÷ billable labor hours.
- Parts gross margin = parts revenue − parts COGS, with cost coverage.
- Rework rate = jobs returned for related rework ÷ closed jobs in cohort; requires reason classification.
- Cycle time = intake to handover, with pause/hold policy explicit.

### Golden fixture — “Taller Ruta 5”
Seed 12 synthetic vehicles, 30 parts, 8 work orders, 2 estimates with revised scope, 1 declined estimate, 1 customer-authorized additional job, 1 part returned unused, 1 comeback/rework case and odometer readings.

Assertions: vehicle/customer links remain tenant-scoped; unapproved work is blocked; estimate revisions preserve authorization history; part issue and return reconcile; symptoms are not diagnosed automatically; rework links to original job; margin excludes missing costs.

### Release blockers
Work-order state machine, customer authorization evidence, parts/labor costing, vehicle history, technician permissions, warranty/rework and recovery tests.

---

## 3. `restaurant_cafe` — restaurant, café and food service

### Operating model and boundary
Prepare and serve food/drinks through dine-in, takeaway and/or delivery. The profile does not imply recipe costing, ingredient stock deduction, kitchen display, table reservations, food delivery marketplace integration or sanitary compliance automation.

### Master data
- Menu item and sellable option/modifier with price/version.
- Service channel and order type (dine-in, takeaway, delivery).
- Table/seat only if table management is implemented.
- Ingredient and recipe/BOM only when recipe capability is available; allergens and dietary statements require validated source data.
- Food lot, expiry, storage and temperature records only when traceability capability and process are implemented.
- Waste reason: spoilage, preparation loss, quality rejection, staff meal, customer return or count correction.

### Workflow contract
`order_open → confirmed → preparing → ready → served/picked_up/dispatched → closed`; exception paths: `cancelled`, `refunded`, `rejected`.

- Order line captures item, modifier, quantity, price and tax snapshot.
- A menu price update does not rewrite an open/confirmed order.
- Kitchen ticket and prep status must not be represented as available unless a persisted workflow exists.
- Ingredient deduction and recipe costing remain blocked until BOM, yield, waste and unit conversion work end-to-end.
- Delivery dispatch is distinct from delivery completion.
- Allergen/dietary claims are shown only from explicitly verified item data; never inferred by AI from the menu name.
- Waste is recorded as waste, not silently converted to sales or ingredient consumption.
- Food safety logs and sanitary authorization remain the operator's legal/operational responsibility; software reminders are not certification.

### KPI contract
- Net sales and average check use completed, non-void orders and explicit refund treatment.
- Contribution margin = net sales − recipe/ingredient cost − defined variable costs; unavailable until recipe/yield/cost data is complete.
- Prep time = preparation start to ready timestamp; unavailable without reliable events.
- Waste rate = recorded waste cost ÷ explicitly named food cost denominator.
- Channel mix = completed net sales by channel.
- Table turnover requires valid seating and table lifecycle data.

### Golden fixture — “Alma Café”
Seed 25 menu items, 5 modifiers, dine-in/takeaway/delivery orders, one cancelled item, one refund, one allergy query with unknown ingredient data, one late delivery and one waste event. Ingredient recipe data is a separate future-capability fixture.

Assertions: confirmed price snapshot persists; unknown allergen information is surfaced as unknown; no ingredient stock is deducted without a verified recipe; cancelled/refunded orders reconcile; delivery is not marked complete at dispatch; waste is separate from sales.

### Release blockers
Order lifecycle, modifiers, refund/cancellation, channel attribution, food-data governance, recipe/yield/unit model, permissions and Chile sanitary-process review.

---

## 4. `professional_services` — professional services and agencies

### Operating model and boundary
Sell expertise and deliver work through proposals, scopes, milestones, time, expenses, deliverables and recurring service agreements. This profile does not imply legal practice management, regulated professional certification, payroll, project accounting or time billing unless those modules are independently verified.

### Master data
- Client organization and contacts; role and consent where communications are stored.
- Service catalog with scope, pricing basis (fixed, hourly, retainer or milestone) and effective dates.
- Proposal with deliverables, exclusions, assumptions, timeline, fee, tax/document snapshot and acceptance.
- Engagement/project with owner, team, milestones, dependencies and status.
- Time entry with actor, date, duration, activity, billable flag and approval.
- Expense with source, category, amount, evidence and reimbursable status.
- Deliverable and approval record with version, owner and acceptance evidence.

### Workflow contract
`lead → discovery → proposal_draft → proposal_sent → accepted/rejected/expired → active_engagement → delivery → client_review → closed`.

- Accepted scope is versioned; scope changes require a change request and customer acceptance where commercially required.
- Time and expenses are attributed to the engagement and approved before billing.
- A project budget is not a financial ledger; actual margin requires complete labor cost, expense and revenue allocation.
- Milestone completion requires evidence/acceptance, not merely a status toggle.
- Client files and communications are access-controlled by engagement and role.
- Recurring retainers require period, included scope, rollover policy and renewal/cancellation terms.

### KPI contract
- Proposal win rate = accepted proposals ÷ proposals decided in cohort.
- Effective hourly rate = recognized service revenue ÷ approved billable hours.
- Utilization = approved billable hours ÷ available capacity, only with reliable capacity and time data.
- Project gross margin = recognized revenue − allocated labor cost − direct expenses; allocation rules and completeness visible.
- On-time milestone rate = milestones completed by committed date ÷ milestones due.
- Scope variance = approved change value or hours ÷ original scope value or hours.

### Golden fixture — “Estudio Norte”
Seed 10 clients, 15 proposals (accepted/rejected/expired/draft), 4 active engagements, milestone plans, approved/unapproved time entries, expenses with missing receipts, one scope change and one retainer renewal.

Assertions: proposal acceptance freezes scope and fee; unapproved time is excluded from billable reports; expenses without evidence are flagged; scope change retains original baseline; project margin is withheld when labor cost allocation is incomplete; client users cannot access other clients' files.

### Release blockers
Proposal/engagement model, scope versioning, time approval, expense evidence, client access control, project cost allocation and export permissions.

---

## 5. Cross-wave sequencing

| Shared foundation | Enables | Must not be faked by |
|---|---|---|
| Variant-level product identity | apparel size/color, parts catalog | descriptive text or style-level stock |
| Unit conversion and costing | food recipes, bulk parts, material use | unit labels or unvalidated ratios |
| Workflow/state engine and approvals | workshop jobs, service projects, restaurant orders | generic status dropdowns |
| Event/audit and evidence storage | authorization, delivery, returns, client acceptance | free-text notes alone |
| Cost allocation | margin by job, menu item, project | revenue-only estimates |
| Consent and access policy | client portal, customer communication | CRM history alone |

**Decision:** implement shared domain primitives once, then certify vertical flows on top. Do not create four isolated mini-apps or expose a configuration toggle that implies the underlying workflow exists.
