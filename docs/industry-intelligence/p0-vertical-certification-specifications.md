# P0 vertical certification specifications

**Status:** product/engineering specification; not a claim that the capabilities are implemented.
**Profiles:** `neighborhood_grocery`, `hardware_store`, `wholesale_distribution`.
**Parent contract:** `industry-template-standard.md` and `priority-sector-operating-packs.md`.
**Release rule:** a profile can be selectable before it is certified, but it must not expose unavailable workflows as working features.

This document turns the three P0 packs into testable operating contracts. It intentionally distinguishes (a) the real-world process, (b) what the current product can safely do, and (c) what must be built before certification.

## 1. Shared certification contract

Every vertical must pass all of the following before its lifecycle can move to `certified`:

1. **Identity:** stable profile ID, versioned manifest, clear examples and exclusions; never derive legal/tax activity from the profile.
2. **Workflow coverage:** happy path, cancellation, partial completion, correction, return and failure paths documented.
3. **Data integrity:** tenant ownership, unique business identifiers, immutable confirmed-document snapshots, auditable stock/cash movements and idempotent writes.
4. **Capability gate:** each workflow step maps to a capability with code/schema evidence and a lifecycle status. A requested-but-planned capability is displayed as pending, never silently activated.
5. **Permission matrix:** read/create/update/approve/void/export separated by role and sensitive domain; profile selection grants no permission.
6. **KPI contract:** formula, numerator, denominator, time window, exclusions, data coverage and freshness are explicit.
7. **Golden Business:** seeded synthetic dataset and deterministic expected outcomes for normal and exceptional cases.
8. **Operational UX:** mobile and desktop paths, empty/error/loading states, keyboard/scanner behavior and safe recovery.
9. **Migration:** import mapping, duplicate detection, reconciliation and rollback strategy; no destructive overwrite.
10. **Evidence:** automated tests, reviewer sign-off, known limitations and release note.

### Common domain invariants

- Confirmed sales, quotes, purchases and dispatch documents preserve the unit, price, tax and terms snapshot used at confirmation; later catalog edits do not rewrite history.
- Stock changes are ledger movements, not silent edits to a displayed balance. Corrections require reason, actor, timestamp and reference.
- A sale, return, stock movement, payment or dispatch retry must be idempotent for its business operation key.
- Physical stock, sellable stock, reserved stock, damaged/quarantined stock and in-transit stock are distinct concepts. Do not calculate one by adding overlapping buckets.
- Unknown values remain unknown. Missing cost is not zero; missing expiry is not “not expiring”; missing delivery proof is not delivered.
- Every KPI is scoped to a business, branch (if implemented), currency, timezone and period.
- Financial totals are calculated from persisted source records and must reconcile to the relevant document/ledger; never from UI-only estimates.

---

## 2. `neighborhood_grocery` — almacén y minimarket

### Operating boundary

**Included:** neighborhood grocery, convenience store, minimarket and small multi-category food retail primarily selling stocked goods at counter and optionally through delivery.

**Not automatically included:** supermarket chain, restaurant kitchen, wholesale distributor, butcher production room or regulated alcohol/tobacco workflows. A business may have secondary profiles, but those workflows require their own certified capabilities.

### Jobs to be done

- Open and operate a fast checkout without losing inventory or payment accuracy.
- Receive supplier goods and identify quantity/price discrepancies.
- Replenish fast-moving products and avoid avoidable stockouts.
- Identify products that are slow-moving, damaged or approaching expiry when traceability exists.
- Close cashier shifts and explain cash/payment differences.
- Understand daily sales, average ticket and category performance without fabricated metrics.

### Master data contract

| Entity | Required attributes | Validation / invariant |
|---|---|---|
| Product | tenant, name, active state, SKU or internal code, category, sale price, tax treatment source | code unique within defined tenant scope; tax treatment comes from configured tax/catalog source, not inferred from vertical |
| Barcode | product/variant reference, symbology, value | unique within tenant where applicable; ambiguous scan requires selection |
| Sellable format | product, unit, pack factor (future capability) | pack factor must be positive and product-specific; no global assumption that a “box” contains a fixed quantity |
| Supplier item | supplier, supplier code, purchase cost, validity dates | historical purchase line retains captured cost |
| Lot (future) | product, lot code, received date, expiry date, supplier | expiry must be a valid date; lot balance cannot go negative through normal issue |
| Cash shift | cashier, register, opened_at, opening amount, close status | one active shift per register unless explicit multi-session support exists |
| Waste reason | code, label, stock disposition | waste is not a sale; each adjustment creates a traceable stock movement |

### Workflow state contracts

**Receiving**
`draft → checked → posted` or `draft/checked → cancelled`.

- Compare ordered vs received quantities and unit.
- Record short, excess, damaged and substituted items separately.
- Posting creates stock and cost movements exactly once.
- A posted receipt is corrected through a reversal/adjustment, never edited invisibly.
- Lot and expiry capture are mandatory only for product categories explicitly configured to require them, once the lot capability exists.

**Checkout**
`cart → validated → payment_pending → completed` or `cancelled`.

- Validate product active status, price, quantity, sellable availability and applicable tax/document path.
- Payment outcome is authoritative; a client timeout must not create a duplicate sale on retry.
- A completed sale produces one stock issue and one auditable payment/document relationship.
- If the payment is uncertain, show pending/reconciliation state rather than success.
- Returns reference the original sale when available; restock only after condition/disposition is approved.

**Cash shift**
`open → counting → closed`; discrepancy is recorded, not auto-corrected.

- Expected cash = opening float + cash receipts − cash refunds − cash withdrawals/deposits (according to configured movement semantics).
- Counted cash and difference are recorded independently.
- Card, transfer and other tender totals reconcile separately; they are not added to physical cash.
- Closing a shift is permission-controlled and audited.

**Waste / shrinkage**
- Record reason (expiry, damage, internal consumption, theft/suspected loss, count correction, supplier return), quantity, cost basis and disposition.
- Do not convert an unexplained inventory difference into a sale.
- Suspected theft is an operational classification, not a factual accusation.

### KPI definitions

| KPI | Formula | Guardrails |
|---|---|---|
| Net sales | valid completed sales − valid refunds/credit notes in period | exclude cancelled/voided; clarify tax-inclusive/exclusive basis |
| Average ticket | net sales / valid completed transactions | undefined when transaction count is zero |
| Units per ticket | sold units / valid transactions | only if units are comparable or explicitly normalized |
| Gross margin | net sales − cost of goods sold | unavailable if cost coverage is incomplete; disclose coverage % |
| Stockout count | active products with expected demand and zero sellable stock | do not equate absent stock record with zero without verified semantics |
| Waste rate | waste cost / chosen denominator (received cost or COGS) | name denominator and period; no denominator switching silently |
| Cash variance | counted cash − expected cash | show tender and movement breakdown |

### Alert policy

- Critical: checkout/payment state inconsistent; duplicate movement detected; cash close cannot reconcile.
- High: configured fast mover below reorder threshold; material receipt discrepancy; negative/invalid stock invariant.
- Advisory: product approaching configured expiry threshold (only with valid lot data); declining sell-through; supplier lead-time variance.
- Each alert must include source records, timestamp, confidence/coverage and a safe next action. No automatic purchase order or stock adjustment without approval.

### Permission baseline

- Cashier: checkout, own shift view, submit close count; cannot change cost, price policy, void closed sale or approve stock adjustment.
- Store manager: receive goods, review shifts, request/approve configured adjustments, manage catalogue subject to policy.
- Owner/finance: view financial reports and cost/margin; approve sensitive corrections and exports.
- Role names map to existing permission system; this table is a target contract, not a new grant.

### Golden Business fixture — “Almacén Los Robles”

Synthetic only; CLP; timezone America/Santiago.

Seed:
- 120 active products; 20 fast movers; 8 beverage multipacks; 12 chilled/perishable products.
- Two suppliers with different lead times; one purchase receipt with 2 units short and 1 damaged.
- Opening cash float CLP 80,000; cash, debit/card and bank-transfer tenders.
- One sale with mixed tenders; one cancelled cart; one refund tied to a completed sale.
- One stock count discrepancy and one expiry lot (only in the future lot-capability test fixture).

Expected assertions:
1. Barcode resolves to exactly one intended product; unknown barcode does not create a product silently.
2. Receipt posts accepted quantities once; short/damaged quantities do not enter sellable stock.
3. Sale retry with same idempotency key creates one sale, one stock issue and one payment association.
4. Cancelled cart changes neither sales nor stock.
5. Refund references original transaction and follows approved disposition before restock.
6. Cash expected amount excludes card/transfer tender; cash difference is explicit.
7. Average ticket and net sales match fixture calculations; margin is withheld if cost coverage is deliberately incomplete.
8. Expiry alerts do not appear for products without valid lot/expiry records.
9. Every adjustment is traceable to actor, reason and source document.

---

## 3. `hardware_store` — ferretería, barraca y materiales

### Operating boundary

**Included:** retail/trade sale of hardware, building materials, tools, electrical, plumbing, timber and related stocked goods.

**Not automatically included:** engineering design, structural certification, contractor project accounting, cutting-machine control or technical substitution approval.

### Jobs to be done

- Find the exact product specification among visually similar items.
- Quote a bill of materials or customer/contractor request with valid price and availability.
- Buy and receive goods in supplier units while selling in the configured commercial unit.
- Track special orders, customer commitments and deliveries without double-counting stock.
- Know which products/families contribute margin and which quotations convert.

### Master data contract

| Entity | Required attributes | Validation / invariant |
|---|---|---|
| Product family | tenant, label, family code | family groups similar products; it is not an SKU |
| Product/variant | SKU, family, material, dimensions/attributes, brand/model where applicable | attribute schema is family-specific; two materially different specs cannot share one sellable identity |
| Unit definition | unit code, dimension (count/length/area/volume/mass) | dimensional compatibility required for physical conversion |
| Product conversion (future) | product, from-unit, to-unit, exact factor, effective date, author | factor > 0; no global “box/roll/bar” conversion |
| Supplier item | supplier SKU, product mapping, purchase unit, cost and validity | mapping ambiguity requires human resolution |
| Quote line | product/spec snapshot, quantity, unit, price, discount, tax snapshot | confirmed quote retains immutable terms |
| Job/site reference | customer, work/site label, delivery address | site is operational metadata, not proof of project profitability |

### Attribute profiles

- Fasteners: diameter, length, thread, material, head/drive type, finish.
- PVC/plumbing: diameter, pressure/class, material, length, connection type.
- Cable: conductor, cross-section, insulation, voltage rating, color, roll length.
- Timber/boards: species/material, thickness, width, length, grade/moisture when provided.
- Paint: brand/line, finish, color code, container volume.
- Tools: manufacturer, model, voltage/platform, included accessories, serial tracking only when capability exists.

Do not infer compatibility from similar names or dimensions. A substitution requires a business-approved mapping or authoritative manufacturer data.

### Workflow state contracts

**Quote**
`draft → priced → approved → sent → accepted/rejected/expired`.

- Quote captures customer, item specification, unit, quantity, discount authority, validity, tax/document assumptions and delivery terms.
- Repricing after expiry or catalogue change creates a new revision; accepted quote snapshot remains unchanged.
- Margin warning appears only when current cost is known and sufficiently fresh.
- A quote does not reserve stock unless a tested reservation capability exists.

**Purchase and receiving**
- Purchase line stores supplier unit and conversion snapshot if supported.
- Receiving verifies product identity and actual quantity before posting.
- A supplier invoice discrepancy is not silently absorbed into product cost.
- Cost changes are effective-dated; historical COGS remains reproducible.

**Dispatch**
`ready → picking → checked → dispatched → delivered/partial/failed` only where corresponding capabilities exist.
- Each line records ordered, prepared and delivered quantities distinctly.
- Shipment creation does not prove delivery; proof-of-delivery is a separate evidence event.
- Partial delivery leaves an explicit remaining quantity and owner.

**Cutting / preparation**
- Treat as a future work step, not a generic dispatch action.
- Requires input stock, cut plan, measured output, scrap/waste and operator evidence.
- Never decrement stock based solely on a free-text note.

### KPI definitions

| KPI | Formula | Guardrails |
|---|---|---|
| Quote conversion | accepted quotes / eligible quotes | report by count and amount; exclude drafts/expired according to declared cohort |
| Quote gross margin | quoted net revenue − estimated COGS | label estimated; show cost coverage and timestamp |
| Actual gross margin | realized net sales − realized COGS | only when cost allocation is complete |
| Family rotation | COGS or units sold / average inventory over period | specify value vs unit basis |
| Stock accuracy | matching counted units / counted units | count scope and timestamp required |
| Delivery completion | delivered quantity / committed quantity | distinguish full vs partial orders |
| Dead stock | verified stock with no movement during defined window | value only if cost coverage exists |

### Permission baseline

- Sales: create quotes, use approved prices/discount bands, cannot edit cost.
- Counter supervisor: approve discounts within delegated threshold and resolve SKU ambiguity.
- Purchasing: manage supplier mappings and receive orders; cannot erase posted receipts.
- Warehouse: pick/check/dispatch only assigned orders; cannot edit commercial prices.
- Owner/finance: view cost/margin and approve exceptional write-offs/exports.

### Golden Business fixture — “Ferretería El Martillo”

Synthetic only; CLP; timezone America/Santiago.

Seed:
- 300 products across 8 families; 35 intentionally similar SKUs with different dimensions.
- PVC pipes, cable rolls, fasteners, timber, paint and tools.
- Three suppliers with different purchase units; only a subset has explicit product-specific conversion factors.
- 15 quotes: 5 accepted, 4 rejected, 3 expired, 3 drafts; one quote has a price revision.
- Two dispatches: one complete, one partial; one item damaged before dispatch.
- One count adjustment with documented reason.

Expected assertions:
1. Search and barcode disambiguate by critical attributes (e.g., diameter/length/pressure).
2. No conversion is performed where product-specific factor is absent.
3. A confirmed quote preserves original price, discount, unit and product specification after catalogue edits.
4. Quote conversion KPI excludes drafts and uses a declared cohort.
5. Dispatch distinguishes picked, dispatched and delivered quantities; partial delivery retains balance.
6. Margin is not shown as confirmed when cost is missing or stale beyond policy.
7. Technical substitutes are not suggested as compatible without approved evidence.
8. Stock corrections produce ledger entries with actor, reason and reference.

---

## 4. `wholesale_distribution` — distribuidora y mayorista

### Operating boundary

**Included:** B2B businesses selling repeat or bulk orders to business customers, with customer-specific commercial conditions and fulfilment.

**Not automatically included:** route optimization, transport fleet telematics, factoring, automated credit underwriting, EDI or warehouse automation.

### Jobs to be done

- Capture customer orders with negotiated terms.
- Apply a valid price list and discount policy without retroactively changing confirmed orders.
- Check availability and credit exposure before committing.
- Pick, pack and dispatch accurately.
- Handle partial fulfilment, rejection, proof of delivery and returns.
- Understand service level, customer profitability and receivables only where source data supports it.

### Master data contract

| Entity | Required attributes | Validation / invariant |
|---|---|---|
| Business customer | legal/business identity, billing data, contacts, delivery addresses | tenant-scoped; tax identity is not inferred |
| Commercial agreement | customer, price-list version, discount authority, validity | immutable version on confirmed order |
| Order | customer, requested date, delivery address, lines, terms snapshot | duplicate submissions idempotent |
| Allocation/reservation (future) | order line, quantity, location, expiry/hold policy | cannot exceed sellable available stock |
| Picking task (future) | order, location, picker, quantities, scan checks | picked quantity cannot exceed authorized order balance |
| Shipment | order, carrier, package/line quantities, dispatch event | shipment and delivery are different states |
| Proof of delivery (future) | recipient, timestamp, signature/photo/reference | evidence retained with access control |
| Receivable (future) | document, due date, amount, payment allocations | balance = charge − allocated payments/credits |

### Workflow state contracts

**Order**
`received → validated → confirmed → fulfilment_pending → partially_fulfilled/fulfilled → closed`; terminal alternatives: `rejected/cancelled`.

- Validate customer status, price version, minimum order, stock policy and credit status if those capabilities exist.
- Confirmed order freezes price, discount, unit and delivery terms.
- If credit or stock data is unavailable, do not imply approval; mark the check as unavailable and require the configured manual process.
- Cancellation after fulfilment begins requires controlled reversal/exception handling.

**Picking and packing**
- Separate ordered, allocated, picked, packed and shipped quantities.
- Scan/verify each line against exact SKU and unit.
- Substitutions require customer authorization and a recorded replacement mapping.
- Package count and weight are evidence fields, not inferred from item count.

**Delivery**
- `dispatched` is not `delivered`.
- Partial, refused, damaged and failed delivery outcomes are first-class states.
- Proof of delivery must identify who confirmed, when, and what quantity was accepted.
- Returns reference original order/shipment and record disposition.

**Credit and collection**
- Credit limit, ageing and collection reminders are planned until verified end-to-end.
- A customer balance is not derived from sales totals alone; it requires invoices/charges, credit notes, payments and allocations.
- No AI recommendation may grant credit or initiate collection without authorized human approval.

### KPI definitions

| KPI | Formula | Guardrails |
|---|---|---|
| Fill rate | accepted quantity fulfilled / confirmed quantity requested | define substitution policy and cutoff time |
| OTIF | orders delivered complete by committed date / orders due | requires committed date and delivery evidence |
| Picking accuracy | correctly picked lines / verified lines | denominator and sampling method explicit |
| Order cycle time | confirmed_at to delivered_at | partial delivery policy must be stated |
| DSO | average trade receivables / credit sales × days in period | unavailable without complete receivable and credit-sales coverage |
| Customer gross margin | net sales − COGS − allocated direct discounts/service costs | disclose allocation method and missing-cost coverage |
| Delivery cost per order | attributable delivery cost / delivered orders | only when cost allocation is complete |

### Permission baseline

- Sales rep: create orders and quotes; see only authorized customer commercial data.
- Credit controller: review exposure and approve/hold credit where capability exists.
- Picker/warehouse: view assigned work and record quantities; no access to margin or credit limits.
- Dispatcher: assign carrier and record shipment events; cannot mark delivered without evidence.
- Finance/owner: receivables, payments, margin, write-offs and exports with approval/audit.

### Golden Business fixture — “Distribuidora Central Maule”

Synthetic only; CLP; timezone America/Santiago.

Seed:
- 45 B2B customers across retail, food service and small contractors.
- Three price-list versions; one expires mid-fixture; customer-specific negotiated discount for 5 customers.
- 80 SKUs, 10 bulk/package items, 6 products with explicit product conversion factors.
- 20 orders: 12 complete, 4 partial, 2 rejected, 1 cancelled before confirmation, 1 cancelled after picking begins.
- Two carriers; one late delivery, one refusal and one damaged package.
- Credit/receivable dataset included only as a future capability test fixture, not production-ready UI.

Expected assertions:
1. Confirmed order uses the correct price-list version and is unchanged after a new version is published.
2. Expired price list requires revalidation; it is not silently applied.
3. Order retry does not duplicate the order or downstream stock movements.
4. Picked/packed/shipped/delivered quantities reconcile independently.
5. Partial delivery leaves an open balance; refused quantity is not counted as delivered.
6. OTIF excludes orders without a committed date or delivery evidence according to declared rules.
7. DSO and customer balance remain unavailable unless charges, credits, payments and allocations are complete.
8. Warehouse roles cannot access customer margin/credit data.
9. Cancellation after picking produces an auditable exception and controlled stock release.

---

## 5. Cross-vertical release checklist

A vertical cannot be certified by documentation alone. For each profile, attach:

- [ ] Profile manifest and schema version.
- [ ] Workflow-to-capability map with exact code, route, table/RPC and test evidence.
- [ ] Role/action matrix checked against current authorization implementation.
- [ ] At least one full end-to-end Golden Business test.
- [ ] Retry/idempotency, concurrency and tenant-isolation tests.
- [ ] KPI fixtures with exact expected results and missing-data behavior.
- [ ] Accessibility and mobile interaction review.
- [ ] Import/reconciliation and rollback test.
- [ ] Regulatory/legal review for relevant business processes.
- [ ] Product, engineering, QA and security sign-off.

**Certification outcome:** `certified`, `limited`, or `blocked`, with evidence and explicit exclusions. Never use “certified” to mean “profile exists in the onboarding catalogue.”
