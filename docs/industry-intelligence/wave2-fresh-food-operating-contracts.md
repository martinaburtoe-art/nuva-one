# Wave 2 — operating contracts for differentiated retail and food businesses

**Status:** standard operating-model specification; not implementation, legal advice or certification.
**Profiles covered:** `beverage_store`, `produce_market`, `butcher_fishmonger`, `bakery_pastry`.
**Catalogue rule:** reuse the four existing IDs. No profile is promoted to certified by this document.
**Shared platform:** existing product, supplier, purchase, stock, sale, cash, customer and reporting core. Do not create vertical copies of those ledgers.

## 0. Release contract and non-negotiable guardrails

These four businesses look similar in a generic product catalogue but have materially different operational risks:

- Beverage retail needs packaging/deposit reconciliation and may involve regulated products.
- Produce retail needs variable-weight receiving/selling, grading, yield and high-frequency shrink control.
- Butcher/fishmonger operations need transformation yield, batch traceability, cold-chain evidence and recall readiness.
- Bakery/pastry operations need formula versions, production batches, yield, made-to-order commitments and shelf-life controls.

The profile may select the operating template; it must not infer a tax activity, sanitary authorization, alcohol licence, age-control policy, product safety status or permission. Regulatory evidence and business policy must be separately captured, reviewed and kept current.

**Hard stop:** do not expose live perishable stock, FEFO, traceability, production consumption, variable-weight pricing or container deposits as operational merely because the template describes them. Until the complete capability exists, label the workflow unavailable/planned and preserve the existing safe core flow.

### Shared entity and ledger rules

1. Product, supplier, purchase, sale, payment and customer records remain in the shared core.
2. Every stock change is an immutable movement with actor, timestamp, reason, source document and idempotency key.
3. Physical, sellable, reserved, quarantined/damaged, expired and in-transit quantities are separate, non-overlapping balances.
4. Purchase receipt captures supplier, supplier line, quantity, unit, cost, lot where applicable and source-document snapshot.
5. Sale captures sellable item identity, quantity, unit, price, discount, tax source, channel and payment allocation snapshot.
6. Missing cost, lot, expiry, weight, deposit or proof remains unknown; it is never defaulted to zero or silently inferred.
7. All measures include unit and precision. A quantity cannot be added to a different dimension without an explicit product-specific conversion.
8. Any offline/retry-capable mutation needs idempotency and conflict resolution before release.

---

## 1. `beverage_store` — beverage specialist and returnable packaging

### Operating boundary

**Included:** specialist beverage retail, botillería, soft-drink and bottled-water stores, and beverage distributors operating primarily from a product catalogue.

**Not automatically included:** alcohol production, wholesale credit operations, restaurant/bar table service or deposit-regulated container schemes unless explicitly configured and legally reviewed.

### Core jobs

- Receive and sell individual units, packs, trays and cases without confusing their stock equivalents.
- Reconcile returnable containers and customer/supplier deposits.
- Compare margin and velocity by package format, brand and channel.
- Manage promotions without destroying unit economics.
- Apply age/restricted-sale controls only where the operator has documented the applicable policy and legal basis.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Beverage SKU | sellable identity, brand, category, size/volume, package type, barcode, tax source | A 350 ml can and a 1.5 L bottle are distinct sellable SKUs |
| Pack definition | child SKU, parent pack, contained quantity, effective dates | Explicit positive factor per package; never assume all cases contain the same count |
| Returnable container | container type, quantity, condition, owner/custodian, movement reference | Container asset/quantity is not beverage inventory |
| Deposit rule | container type, amount, currency, payer/payee, effective dates, approval | Separate liability/receivable treatment requires finance review |
| Promotion | eligible SKUs, format, quantity threshold, dates, channel, stacking rule | No hidden negative margin; snapshot at sale |
| Restricted-product policy | scope, jurisdiction, evidence, effective dates, responsible reviewer | Profile selection does not activate legal controls or prove a licence |

### Standard workflows

**Receiving**
`draft → counted → discrepancy_review → posted` or `cancelled`.

- Count cases and individual items only with a known pack factor.
- Record damaged/leaking units separately from sellable stock.
- Capture supplier cost and document references.
- If packaging factor is unknown, block conversion and require manual verified quantity entry.

**Sale**
`cart → price_resolved → payment_pending → committed` or `cancelled`.

- Resolve package SKU, quantity and promotion before commit.
- Decrement only the exact sellable package/child quantities according to verified conversion rules.
- Capture tender split and any deposit separately from product revenue.
- Restricted-sale checks are an independently configured control, not a sector-derived assumption.

**Returnable-container movement**
`issued → returned_pending_inspection → accepted` or `rejected/damaged`.

- Record whether container is company-owned, supplier-owned or customer-held.
- Reconcile issued, returned, damaged and outstanding quantities.
- Deposit settlement must reference the original movement or a reviewed adjustment.
- Never net container deposits into beverage sales revenue by default.

### Roles

- Cashier: sell and record eligible returns; cannot alter pack factors or deposit amounts.
- Stock operator: receive/count and report damage; cannot approve own stock adjustment.
- Supervisor: approve discrepancies, voids and deposit adjustments.
- Owner/finance: approve deposit policy, promotion rules and margin reports.
- Restricted-product policy owner: review applicable evidence and access.

### KPIs and formulas

- **Sales by format:** net sales grouped by exact package SKU and period.
- **Contribution margin by format:** net sales less captured COGS, promotion discount and attributable payment cost; mark incomplete if costs are missing.
- **Returnable balance:** opening balance + issued − accepted returns − approved write-offs.
- **Return rate:** accepted returns / issued containers for the same cohort and unit.
- **Promotion lift:** comparable-period quantity difference; do not claim causality without a controlled comparison.
- **Stock cover:** sellable on-hand / average daily sales; suppress if sales history is insufficient.

### Exceptions and acceptance tests

- Mixed pack/case counts; supplier delivers a different pack size; barcode collision; leaking product; partial return; damaged container; disputed deposit; overlapping promotion; offline duplicate sale; sale retry; void after close.
- Golden tests must prove that beverage quantity and returnable-container balance never cross-post, and that a pack conversion uses only the captured product factor.

---

## 2. `produce_market` — fruit and vegetable retail

### Operating boundary

**Included:** greengrocers, fruit shops and fresh-produce retail with daily purchasing, variable-weight sale, grading and shrink.

**Not automatically included:** agricultural production, cold-chain logistics or wholesale produce processing. Those may be secondary profiles only after their own workflows are certified.

### Core jobs

- Receive produce in supplier units and sell in a different unit only with a verified conversion/yield model.
- Track grade, calibre, origin and freshness where the business uses them.
- Price by weight with scale precision and rounding rules.
- Understand saleable yield and shrink by SKU/receipt/lot.
- Reconcile daily price changes and markdowns without rewriting historical sales.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Produce SKU | species/product, variety where relevant, sale unit, grade policy, price method | A display name is not a reliable product identity |
| Supplier lot/receipt | supplier, origin where declared, receipt date, quantity, unit, cost, lot/source reference | Do not invent origin or lot |
| Grade/calibre | controlled code, definition, effective date | Optional only when the operator actually classifies |
| Weight capture | scale/device, gross/tare/net, precision, operator, timestamp | Net weight = gross − tare; reject invalid negative/zero where not allowed |
| Yield record | input lot, output grade/quantity, by-product, waste, actor | Yield is an auditable transformation, not a manual balance override |
| Price history | SKU, unit, price, channel, effective window, approver | New price affects future sales only |

### Standard workflows

**Receiving and grading**
`expected → weighed → graded → accepted/quarantined/rejected → posted`.

- Capture source unit, measured quantity and actual cost.
- Grade lots only when grading is part of the real process.
- Any conversion from crate/sack to kg requires an explicit measured or approved factor and records uncertainty.
- Damaged/unsaleable goods are separately dispositioned.

**Variable-weight sale**
`item_selected → weighed → price_locked → payment_pending → committed`.

- Capture measured net quantity and unit precision.
- Price snapshot = unit price × measured net quantity, subject to a disclosed rounding rule.
- A scale reading must be associated with the correct SKU and transaction.
- If scale integration is unavailable, do not claim automatic weighing; use a controlled manual-entry flow with actor and audit.

**Daily price change**
`proposed → approved → effective → expired`.

- Preserve old prices on confirmed sales.
- Require role approval for large/exceptional price changes.
- Report margin only when receipt cost and yield allocation are sufficiently complete.

**Shrink and waste**
`identified → weighed → reason_selected → approved → stock_movement_posted`.

- Reasons include spoilage, trimming, damage, quality markdown, sampling and unexplained variance.
- Distinguish waste from sale, supplier return and inventory correction.
- Do not double-count the same quantity in yield loss and stock adjustment.

### KPIs and formulas

- **Realized saleable yield:** accepted saleable output quantity / received input quantity, with compatible units.
- **Shrink rate:** approved shrink quantity / received quantity for the same lot/cohort and unit.
- **Gross margin by SKU:** net sales − allocated COGS; disclose allocation method and completeness.
- **Price realization:** actual net sale price / reference price for the same unit.
- **Stock age:** elapsed time since receipt for remaining lot balance.
- **Daily waste cost:** approved waste quantity × captured cost basis; mark unknown where lot cost is missing.

### Exceptions and acceptance tests

- Variable supplier weights; crate weight/tare dispute; scale offline; wrong SKU on scale; partial receipt; mixed grades; trimming yield; reclassification; price change mid-shift; rounding at payment; return of weighed goods; stocktake discrepancy; duplicate scale event.
- Tests must prove precision survives UI → API → database → ledger → receipt/report without integer truncation or float drift.
- A numeric field alone is not sufficient proof of fractional stock support.

---

## 3. `butcher_fishmonger` — butcher, fishmonger and fresh-protein counter

### Operating boundary

**Included:** retail counter for meat, fish, poultry and fresh-protein products with cuts, variable weight, supplier batches and waste.

**Not automatically included:** slaughterhouse, fishing vessel, industrial processing plant, clinical/food laboratory or regulated export traceability.

### Core jobs

- Trace a received lot to the saleable cuts and the customers/transactions affected by a recall.
- Record cut/yield and by-product without losing mass balance.
- Manage variable-weight counter sales.
- Track freshness, cold-chain checks and quarantine events where the business process requires them.
- Reconcile waste, trimming, returns and supplier claims.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Protein SKU | species, cut/product, sale unit, storage class, grade where used | Never collapse distinct cuts into one generic SKU |
| Supplier batch | supplier, supplier batch/lot, received date, declared origin/doc refs, quantity and cost | Preserve original supplier identifiers exactly |
| Transformation batch | input lot(s), output SKU/grade, output quantity, by-product, waste, operator, time | Full genealogy from inputs to outputs |
| Cold-chain observation | location/equipment, value/unit, timestamp, actor, instrument, exception | Software record is not proof of calibrated equipment or legal compliance |
| Quarantine/recall | reason, affected lot/output descendants, decision, approver, disposition | Block sale of affected balances until authorized release |
| Counter scale sale | SKU, net weight, unit price snapshot, scale/operator, transaction | Exact unit/precision and auditable tare |

### Standard workflows

**Receiving and inspection**
`expected → received → inspected → accepted/quarantined/rejected → posted`.

- Record supplier batch and receipt evidence.
- Separate packaging/tare from net product quantity.
- Capture inspection and cold-chain observation where defined by the operator's approved procedure.
- Quarantined goods cannot be sold or consumed in a transformation.

**Cutting/transformation**
`planned → started → weighed_outputs → reconciled → approved → posted`.

- Consume exact input-lot quantity.
- Record saleable cuts, by-products and waste in compatible mass units.
- Enforce mass balance within an approved tolerance; deviations require reason and supervisor approval.
- Output batches inherit source genealogy and retain transformation timestamp/operator.
- Never create yield from an arbitrary percentage default.

**Counter sale**
`selected → weighed → lot_allocated → price_locked → committed`.

- Allocate from an eligible saleable lot using a declared picking policy (e.g., FIFO/FEFO only when expiry data and engine are reliable).
- Capture measured net weight, price and lot allocation.
- Receipt/transaction must retain traceability reference.

**Recall and quarantine**
`reported → scope_identified → blocked → investigated → released/withdrawn/disposed`.

- Traverse input lot to transformation batches and sale transactions.
- Preserve who initiated, approved and executed each action.
- Do not claim customer notification unless a supported notification event was sent and recorded.

### KPIs and formulas

- **Cut yield:** saleable output weight / consumed input weight.
- **Waste ratio:** approved waste weight / consumed input weight.
- **Gross margin by cut:** net sales − allocated input cost, using a documented yield allocation method.
- **Traceability coverage:** saleable quantity with complete source genealogy / total saleable quantity.
- **Quarantine exposure:** quantity and cost currently blocked by lot/reason.
- **Cold-chain exception rate:** observations outside operator-configured limits / valid observations; the limit source and calibration status must be shown.

### Exceptions and acceptance tests

- Supplier lot absent; mixed lots; wrong tare; scale drift; partial transformation; mass-balance variance; rework; quarantine after partial sale; recall across multiple transformations; customer return; cold-chain excursion; duplicate posting.
- Golden tests must trace a sample input lot through two transformation batches to multiple sales, then quarantine the remaining stock and identify affected transactions without exposing another tenant's records.

---

## 4. `bakery_pastry` — bakery, pastry and made-to-order production

### Operating boundary

**Included:** bakery/pastry production by formula or batch, counter sales and custom orders.

**Not automatically included:** industrial manufacturing, restaurant table service or wholesale distribution unless those operations have a secondary template and separately certified workflows.

### Core jobs

- Maintain controlled formula versions and ingredient substitutions.
- Plan batches from forecast and confirmed orders.
- Record actual ingredient consumption, output, rework and waste.
- Calculate cost per batch and per saleable unit using actual input cost.
- Manage custom orders, deposits, deadlines, pickup and changes.
- Track shelf-life and batch identity when the business has that process and supporting capability.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Finished SKU | recipe reference, sale unit, pack/portion, channel, price | SKU is not the formula itself |
| Ingredient | purchase unit, stock unit, supplier, cost basis, allergen declarations where supplied | Do not infer allergen absence from missing data |
| Formula version | ingredients, quantities, units, yield target, method/version, effective dates, approver | Confirmed batch references immutable version |
| Production batch | formula version, planned/actual inputs, outputs, operator, timestamps, waste/rework | Batch must reconcile actual consumption and output |
| Made-to-order ticket | customer, items/specification, quantity, due time, pickup/delivery, status, deposit/payment | Changes create revisions; never overwrite accepted scope silently |
| Shelf-life policy | product/batch class, effective period, evidence owner | Only enable if validated by the business and applicable requirements |

### Standard workflows

**Formula governance**
`draft → reviewed → approved → effective → superseded`.

- Changes create a new version; historical batches keep the original version.
- Ingredient substitution requires explicit equivalence approval and records the substituted item/quantity.
- Units must be dimension-compatible and conversions product/formula-specific.

**Production planning**
`forecast/order → planned_batch → materials_checked → released`.

- Separate forecast demand from confirmed customer commitments.
- Material availability must be based on actual sellable ingredient balances, not a UI estimate.
- If reservation is unsupported, label availability as indicative and do not promise it.

**Batch execution**
`released → in_process → actuals_recorded → yield_reconciled → quality_release → posted` or `cancelled`.

- Consume actual ingredient quantities and capture output quantity, scrap, rework and operator.
- Calculate actual yield and cost; variance from formula target requires reason.
- Only released finished output enters sellable inventory.
- Lot genealogy and expiry remain unavailable until their full capabilities pass certification.

**Made-to-order**
`inquiry → quoted → accepted → deposit_pending/confirmed → in_production → ready → handed_over` with `cancelled/refunded` exception paths.

- Accepted ticket preserves scope, quantity, price, due time and customization.
- Deposit/payment is a separate financial event; it is not revenue recognition by default.
- Customer change after acceptance creates a versioned amendment and may affect price/due date.
- Handover requires proof appropriate to the channel.

### KPIs and formulas

- **Actual batch yield:** saleable output / actual input basis, with compatible units.
- **Batch cost:** actual ingredient cost + directly attributable labor/overhead where supported.
- **Unit cost:** batch cost / saleable output quantity.
- **Yield variance:** (actual yield − target yield) / target yield.
- **Waste cost:** approved waste quantity × applicable cost basis.
- **On-time order rate:** orders handed over by promised time / orders due in period.
- **Order conversion:** accepted custom orders / valid quotes in the same cohort.
- **Contribution by product:** net sales − actual batch COGS − attributable channel/payment costs, with coverage disclosed.

### Exceptions and acceptance tests

- Formula revision after production; ingredient substitution; unavailable ingredient; unit conversion mismatch; partial batch; yield shortfall; failed quality check; rework; waste; order change; missed pickup; cancellation after deposit; batch recall; duplicate production posting.
- Tests must prove confirmed batches remain linked to their exact formula version and actual consumption cannot be posted twice.

---

## 5. Cross-vertical capability dependencies and honest readiness

| Capability | Beverage | Produce | Butcher/fish | Bakery | Required shared implementation before activation |
|---|---|---|---|---|---|
| Product-specific unit conversion | High | Critical | Critical | Critical | Dimension-aware factor per product/pack/formula; precision and immutable snapshots |
| Fractional quantity | Medium | Critical | Critical | Critical | Decimal-safe POS, API, DB, ledger, reports and receipt |
| Lot genealogy | Medium | Critical | Critical | High | Supplier lot → transformation/output → sale/return/recall graph |
| Expiry/FEFO | Medium | High | Critical | High | Validated expiry, eligible balance allocation, block/override and audit |
| Weighing integration | Low/medium | Critical | Critical | Medium | Device adapter, SKU binding, tare, precision, offline and duplicate-event handling |
| Recipes/BOM | Low | Medium | Critical | Critical | Versioned formula, actual consumption, yield, scrap, costing and rollback |
| Production orders | Low | Medium | Critical | Critical | Material reservation, issue, output, rework, scrap and close |
| Returnable containers/deposits | Critical | Low | Low | Low | Separate container ledger and reviewed financial treatment |
| Returns/warranty | Medium | Medium | High | Medium | Original sale/lot link, disposition and financial/stock reversal |

**Current readiness remains governed by the existing readiness registry.** This specification does not promote any capability. If the code currently marks a capability planned, it stays planned until source, schema, tests, permissions and end-to-end evidence are reviewed.

## 6. Golden Business scenarios to add when test harness is ready

Use synthetic records only. Each scenario should run against isolated tenant fixtures and deterministic clock/currency configuration.

### GB-BEV-01 — case to single-unit sale
- Receive 10 cases with explicit 12-unit factor.
- Sell 3 individual units and 1 case.
- Expected: 105 units remain (8 full cases + 9 units), purchase cost preserved and no fractional drift. The canonical balance is 105 units; any case-equivalent display must show 8 cases + 9 units, not round to 9 cases.
- Negative: factor missing or changed after sale; commit must block or use captured factor, never silently reinterpret.

### GB-BEV-02 — returnable deposit reconciliation
- Issue 20 containers, accept 14 good returns, reject 2 damaged returns.
- Expected outstanding = 4; damaged = 2; deposit settlement references original issues.
- Negative: duplicate return request cannot settle twice.

### GB-PRO-01 — produce receipt, yield and shrink
- Receive 100 kg from a synthetic lot, grade 92 kg saleable and record 8 kg approved waste.
- Sell 30 kg, remaining saleable = 62 kg.
- Expected mass balance: 100 = 92 + 8; no waste double count.
- Negative: attempt to sell 0.25 kg when fractional end-to-end path is not available must be blocked or handled only by a separately certified precise flow.

### GB-PRO-02 — scale retry and price snapshot
- Weigh 1.375 kg at a captured unit price; simulate duplicate scale event and price update before payment commit.
- Expected: one sale only; sale retains original price and measured quantity.
- Negative: duplicate device event cannot duplicate sale or stock decrement.

### GB-MEAT-01 — batch genealogy and recall
- Receive lot L1, transform 60 kg into 3 outputs, waste 2 kg, retain 58 kg output.
- Sell from two outputs; quarantine remaining descendant balances after recall event.
- Expected: source lot maps to every descendant output and sale reference.
- Negative: no other tenant's batches or sales are discoverable.

### GB-MEAT-02 — mass-balance exception
- Attempt to post inputs of 50 kg with outputs + waste totaling 53 kg.
- Expected: posting blocked pending supervisor review and documented variance; no negative/phantom stock.

### GB-BAK-01 — formula version immutability
- Approve formula v1, create batch B1, approve v2, then complete B1.
- Expected: B1 retains v1, actual ingredient use and output; new batches may use v2.
- Negative: editing v2 cannot mutate historical B1.

### GB-BAK-02 — custom order amendment and deposit
- Accept a custom cake order with due time and deposit; customer changes quantity/design.
- Expected: new amendment version, revised quote/approval and separate payment/refund events; no silent overwrite.
- Negative: duplicate deposit callback does not double-post.

## 7. Regulatory and operational evidence checklist for Chile

This is a product evidence checklist, not a legal interpretation. Exact obligations depend on the business activity, facility, products, municipality, transaction and current law.

- Food businesses must identify applicable sanitary authorizations and operating conditions from competent official sources before activating food-specific compliance workflows. The Reglamento Sanitario de los Alimentos (DS 977) is a key source to review for applicable establishments and activities.
- Where the business handles products subject to traceability, recalls, cold-chain or special controls, record the responsible operator's approved procedure and evidence. Nüva One must not certify compliance merely because a field is completed.
- Alcohol-specific retail must undergo separate legal/product-policy review. Do not infer authorizations, age thresholds or sale restrictions from `beverage_store`.
- Consumer-facing price, promotions, returns and warranty policies must be configured against applicable Chilean consumer law; do not hardcode one rule for every transaction or product.
- SII giro, tax treatment, DTE and guide-of-dispatch requirements remain separate from operational template selection.
- Keep source URL, retrieval date, reviewer, applicable scope and next review date in a regulatory evidence register. Revalidate before release because requirements can change.

## 8. Certification exit checklist

A profile may be labelled `designed`, `pilot` or `certified` only under a versioned lifecycle contract. For certification, require all of:

- [ ] Every workflow state maps to a real shared-core service/table/RPC or is explicitly marked unavailable.
- [ ] Decimal precision and unit conversion tested end-to-end wherever relevant.
- [ ] Tenant isolation and role/approval denial tests pass.
- [ ] Idempotency/retry tests pass for every mutating event.
- [ ] Concurrency tests cover stock, cash, lot and production balances.
- [ ] Audit trail and correction/void semantics are proven.
- [ ] KPI formulas reconcile to source documents and state coverage/freshness.
- [ ] Import, reconciliation and rollback have been rehearsed with synthetic fixtures.
- [ ] Mobile and desktop UX, offline/reconnect and device failure states are tested.
- [ ] Food/regulatory claims reviewed by a qualified human and never presented as automatic legal certification.
- [ ] Engineering, product and security reviewers sign the evidence record.

**Decision:** keep these four profiles at design/specification status. Prioritize shared decimal-safe quantities, product-specific conversion, lot genealogy and weighing integration as platform primitives. Do not implement four isolated inventory systems.
