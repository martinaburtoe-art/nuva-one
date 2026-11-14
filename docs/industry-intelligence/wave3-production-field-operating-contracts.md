# Wave 3 — production, field operations and project-based businesses

**Status:** operating-model specification only; not implementation, legal advice or certification.
**Profiles covered:** `manufacturing_workshop`, `agriculture_agroinputs`, `transport_logistics`, `construction_contractor`, `equipment_rental`.
**Catalogue rule:** reuse the five stable IDs already present in the 23-profile catalogue. No new vertical ID, enum value or parallel catalogue is introduced.
**Shared platform:** reuse shared customers, suppliers, products, purchasing, stock movements, sales, payments, documents, users, audit and reporting. Vertical workflows orchestrate these shared records; they do not create shadow ledgers.

## 0. Operating contract and hard boundaries

These profiles share resources and costs but have different units of work:

- Manufacturing converts inputs into controlled outputs through work orders and versioned bills of material.
- Agriculture manages production by field/plot and crop cycle, while agro-input retail is a product-sales operation. They are distinct subtypes under the existing profile ID, not one blended workflow.
- Transport/logistics fulfills shipments through trips, capacity, vehicles, drivers, events and proof of delivery.
- Construction controls projects, estimates, work progress, commitments, changes and cost-to-complete.
- Equipment rental manages an asset's availability and custody across reservation, dispatch, use, return, inspection and maintenance.

**Template selection is not a permission grant, tax classification, licence, safety certification or proof that a workflow is implemented.** Keep separate: operational profile, subtype, tax/SII giro, legal evidence, configuration, capability readiness, plan entitlement, user permission and rollout state.

### Shared invariants

1. A business may have one primary profile and explicitly configured secondary profiles. Do not infer secondary operations from a product name or customer description.
2. Every operational event references tenant, actor, timestamp, source document, correlation/idempotency key and an immutable event identity.
3. Quantities carry unit, precision and conversion provenance. Conversions are explicit and effective-dated; no generic assumption that a pallet, box, hectare, hour or trip has a universal factor.
4. Planned, reserved, committed, in-progress, completed, quarantined and cancelled quantities are distinct states. Do not present a forecast as a confirmed balance.
5. Costs retain their source and allocation method. Missing cost is unknown, not zero. Estimated, committed, accrued and actual costs must not be mixed.
6. Corrections are compensating, attributable events; historical source documents and closed periods are not silently overwritten.
7. Mutating workflows need idempotency, concurrency control, retry semantics and an auditable failure path before release.
8. Tenant isolation and least-privilege access apply to every project, field, asset, shipment, document, cost and person record.
9. Mobile/offline capture must identify pending, synced, conflicted and rejected events. A locally captured event is not a posted transaction until server confirmation.
10. KPIs must disclose formula, time window, denominator, freshness, coverage and whether inputs are actual or estimated.

---

## 1. `manufacturing_workshop` — discrete and batch manufacturing

### Operating boundary

**Included:** small/medium manufacturers and workshops that transform purchased or stocked materials into finished or semi-finished goods, including make-to-order and make-to-stock operations.

**Not automatically included:** process manufacturing with regulated formulations, pharmaceutical/medical device production, hazardous-material control, advanced MES/SCADA, machine telemetry, engineering PLM or statutory quality certification.

### Core jobs

- Maintain versioned product structures and routings.
- Plan demand and release feasible work orders.
- Reserve and issue materials without overselling shared stock.
- Record actual consumption, output, scrap, rework and work time.
- Trace finished lots back to input lots when traceability is required and implemented.
- Compare standard/estimated cost with actual cost and explain variance.
- Prevent partial or failed work orders from creating phantom sellable inventory.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Manufactured SKU | identity, revision, unit, make/buy policy, status | Product identity is not its bill of material |
| BOM version | component SKU, quantity, unit, scrap allowance, effective dates, approver | Immutable version snapshot on released order |
| Routing version | operation sequence, work centre, expected duration, skill/equipment requirement | A routing is not proof of machine scheduling |
| Work centre | capacity calendar, location, constraints, maintenance status | Capacity is indicative until reservations are atomic |
| Work order | SKU/revision, BOM/routing version, planned quantity, due date, source demand | Explicit make-to-order or make-to-stock origin |
| Material issue | work order, component, lot if applicable, actual quantity, operator, timestamp | Cannot consume quarantined or unavailable stock |
| Output report | good output, scrap, rework, by-product, unit, operator, evidence | Output must reconcile to actual inputs under defined tolerance |
| Quality check | characteristic, method, result, tolerance source, reviewer, disposition | Do not claim regulated quality certification from a checklist |

### Standard workflows

**Engineering/BOM governance**
`draft → reviewed → approved → effective → superseded`.

- Any component, quantity, unit or routing change creates a new version.
- Released work orders retain the exact approved version.
- Substitute components require explicit equivalence approval, reason and cost/quality review.
- Product-specific conversions must be captured in the BOM snapshot.

**Demand and planning**
`demand → proposed_plan → material_check → capacity_check → approved_plan`.

- Separate confirmed customer demand from forecast.
- Distinguish available, reserved, on-order and quarantined components.
- If material reservation or finite-capacity planning is unavailable, label the plan as indicative and do not promise a completion date.
- Replanning must preserve the original plan and reason for change.

**Work order execution**
`draft → released → materials_issued → in_process → output_reported → quality_review → completed`, with `on_hold`, `cancelled` and `rework` exception paths.

- Release only an approved BOM/routing revision.
- Record actual material issue, not theoretical BOM consumption alone.
- Partial completion records good output and remaining WIP separately.
- Scrap and rework are separate dispositions; rework cannot silently become good output.
- Only accepted good output enters sellable inventory.
- Completion is atomic or safely resumable; retries cannot double-consume or double-receive.

**Cost close**
`open → actuals_reconciled → variance_review → closed`.

- Keep material, labor, machine/overhead and subcontracting cost components separate where captured.
- State allocation method for shared costs.
- Reopen only through a controlled adjustment with actor and reason.

### Roles

- Planner: propose schedules and work orders; cannot approve own exceptional cost or stock adjustment.
- Operator: record actual issue, time and output for assigned operations.
- Quality reviewer: accept, reject or quarantine output; cannot rewrite input evidence.
- Supervisor: release orders, approve variance/rework and close batches.
- Owner/finance: approve costing policy and review margin/variance.
- Engineering/BOM owner: approve product structure and routing revisions.

### KPIs

- **Schedule attainment:** completed orders on/before committed date / orders due in period.
- **Material yield:** good output quantity / actual material input on a compatible, declared basis.
- **Scrap rate:** approved scrap input-equivalent / actual input.
- **BOM variance:** (actual component use − expected use) / expected use, per component and unit.
- **Conversion cost per good unit:** attributable actual conversion cost / accepted good output.
- **WIP ageing:** elapsed time since last valid operation event for open WIP.
- **On-time-in-full:** orders delivered in full by commitment / orders due; requires delivery evidence.
- **Gross margin:** net sales − actual COGS under disclosed costing method; incomplete if costs are estimated or missing.

### Exceptions and Golden Business tests

- BOM changed after release; substitute component; partial issue; shortage after release; component lot quarantined; scrap; rework loop; split output; machine downtime; quality failure; partial close; duplicate completion callback; offline operator event; cancelled order with issued materials.
- **GB-MFG-01 — immutable BOM:** release order against BOM v1, approve v2, finish the original order; it must retain v1 and its original expected quantities.
- **GB-MFG-02 — partial issue and retry:** issue 40 units, retry the same event; material ledger changes once. Issue remaining 60 through a new event; no oversubscription under concurrent orders.
- **GB-MFG-03 — mass balance and scrap:** consume 100 kg, record 92 kg good output, 5 kg scrap and 3 kg approved process loss; all quantities reconcile, with compatible units.
- **GB-MFG-04 — quality hold:** rejected output remains non-sellable and cannot be allocated to a customer order until an authorized disposition.
- **GB-MFG-05 — multi-tenant isolation:** planner/operator cannot enumerate another tenant's BOM, work orders, costs or production evidence.

---

## 2. `agriculture_agroinputs` — agricultural production and agricultural-input retail

### Critical modelling decision: two explicit subtypes

The existing profile ID covers two commercially adjacent but operationally different businesses. They must not share a single workflow merely because both serve agriculture.

- **Subtype A — `agricultural_producer`:** grows, raises or harvests agricultural output. Primary unit of work is a crop/livestock cycle scoped to a field, plot or production unit.
- **Subtype B — `agroinput_retailer`:** sells seeds, fertilizers, crop protection products, irrigation supplies, feed or equipment. Primary unit of work is a SKU, purchase, sale, inventory and customer.
- A company may explicitly enable both subtypes. Their ledgers remain connected only through documented sales, purchases and shared party/product records.
- Do not infer producer status from a customer being a farmer, nor retailer status from having agricultural products in a catalogue.

### A. Agricultural producer

#### Operating boundary

**Included:** seasonal crop production and field operations with planning, input application, monitoring, harvest and yield records.

**Not automatically included:** livestock management, veterinary records, precision-agriculture telemetry, drone imagery, irrigation automation, phytosanitary certification, export traceability or farm accounting compliance. These require separate capability and evidence reviews.

#### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Farm/production unit | tenant, location, timezone, responsible operator | Location is not legal land ownership evidence |
| Field/plot | stable ID, area, area unit, geometry optional, status | Geometry/area require provenance and measurement method |
| Crop cycle | crop/variety, plot, season, planned dates, status | One plot may have sequential or explicitly intercropped cycles |
| Crop plan | target, planting density, planned operations, assumptions | Forecast is not actual yield |
| Input product | SKU, formulation/grade as supplier-declared, purchase unit, handling metadata | Do not invent active ingredient or safety classification |
| Application event | plot/cycle, input, quantity/unit, date/time, operator, method, evidence | Application record is not proof of regulatory compliance |
| Field observation | observation type, value/unit, timestamp, author, source | Distinguish manual observation from sensor estimate |
| Harvest lot | crop cycle, plot, date, quantity/unit, grade, destination, weigh evidence | Lot identity and origin cannot be fabricated |
| Yield/cost record | output, area basis, input and service cost source | Cost per hectare requires compatible and complete inputs |

#### Standard workflows

**Season planning**
`draft → agronomy_review → approved → active → closed`.

- Capture plot, crop/variety, area and season.
- Separate target yield from measured yield.
- Keep agronomic assumptions and source/reviewer visible.
- A forecast must not create stock or a sales commitment.

**Field operations**
`planned → assigned → started → completed → reviewed`, with `skipped`, `blocked` and `cancelled`.

- Operations may include preparation, planting, irrigation, application, scouting and harvest preparation.
- Record actual date/time, operator, plot, input quantities and equipment where relevant.
- Offline entries remain pending until synchronized and reconciled.
- Input application must preserve product label/source and actual quantity; do not prescribe chemical dosage or safety instructions from generic AI output.

**Harvest and dispatch**
`expected → harvested → weighed → graded → stored/committed → dispatched`.

- Link harvest to crop cycle and plot.
- Record measured output and grade.
- Separate field loss, rejected output, retained stock and sold output.
- A dispatch guide, transport or export record must only be claimed when integrated and evidenced.

#### KPIs

- **Yield per area:** harvested accepted quantity / measured productive area, with units and season.
- **Input cost per area:** actual captured input cost / productive area.
- **Harvest loss:** recorded loss / gross harvested quantity.
- **Plan completion:** completed valid operations / operations due.
- **Gross margin per crop cycle:** net crop revenue − captured direct costs; exclude unrecorded costs and disclose exclusions.
- **Forecast error:** absolute(actual − forecast) / actual, only when actual is non-zero and comparable.

### B. Agro-input retailer

#### Operating boundary

**Included:** specialist retail/distribution of agricultural inputs and supplies.

**Not automatically included:** regulated storage, hazardous goods management, prescription/restricted product sales, pesticide application services or professional agronomic recommendations.

#### Master data and workflows

- SKU identity, supplier, declared product specification, purchase/sale unit, packaging, lot/expiry where applicable, storage instruction source and evidence owner.
- Purchase receipt and supplier lot capture; sale and customer invoice; product-specific pack conversions; stock counts; returns/quarantine; customer credit only if the finance capability exists.
- Restricted product controls must be separately configured from current official evidence and reviewed by a qualified responsible person. Profile selection never enables a regulated sale.
- Recommendations generated by AI must not prescribe dosage, mix, treatment or safety steps without a validated, scoped source and qualified human review.

### Golden Business tests

- **GB-AGR-01 — producer vs retailer separation:** onboarding with subtype A does not activate POS retail/regulated product controls; subtype B does not create field or crop-cycle records.
- **GB-AGR-02 — plot yield:** 12.5 hectares with 37,500 kg accepted harvest yields 3,000 kg/ha; unit conversion and area provenance are preserved.
- **GB-AGR-03 — harvest reconciliation:** 10,000 kg harvested = 9,200 kg accepted + 500 kg rejected + 300 kg documented field loss; no double count.
- **GB-AGR-04 — offline application:** duplicate field-operation sync cannot double-post 80 L of input; conflicting plot/cycle is held for review.
- **GB-AGR-05 — retailer lot hold:** quarantined lot cannot be sold; customer return links to original sale and lot when captured.

---

## 3. `transport_logistics` — transport, distribution and delivery operations

### Operating boundary

**Included:** businesses that plan and execute pickup, line-haul, delivery, freight or distribution services.

**Not automatically included:** full TMS optimization, live GPS tracking, carrier marketplace, customs brokerage, dangerous-goods compliance, tachograph/fleet telematics or automated route optimization unless independently integrated and certified.

### Core jobs

- Accept shipment demand and validate service requirements.
- Consolidate consignments into trips with capacity and time constraints.
- Assign vehicles, drivers and carriers with valid operational evidence.
- Track custody and status from pickup to delivery/exception.
- Capture proof of delivery and customer-reported discrepancy.
- Understand trip cost, utilization, on-time performance and failed-delivery causes.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Shipment | origin/destination, customer, goods, quantity/unit, service window, references | Address validation and geocoding must be explicit |
| Consignment | shipment lines, handling units, dimensions/weight where measured | Package count is not weight/capacity |
| Vehicle | identity, type, capacity/unit, status, evidence expiry | Do not infer legal roadworthiness or insurance |
| Driver/operator | identity, assignment, required evidence status | Sensitive personnel data needs restricted access |
| Trip | vehicle, driver, ordered stops, planned window, capacity allocation | A route plan is not proof of GPS tracking |
| Stop event | arrival/departure, event source, actor/device, exception | Mobile clock and GPS may be inaccurate; retain source |
| Proof of delivery | recipient, timestamp, signature/photo/reference, consent/policy | Capture only necessary personal data and retention policy |
| Trip expense | fuel/toll/parking/other, amount/currency, source document | Estimated fuel is not an actual expense |
| Delivery exception | code, narrative, evidence, customer contact attempt, next action | Do not claim notification unless sent and logged |

### Standard workflows

**Order acceptance**
`requested → validated → quoted → accepted → planned`.

- Validate origin/destination, quantity, service window and declared handling requirements.
- Capacity and price quotes are indicative unless backed by current verified data and an approved tariff.
- Distinguish own fleet, subcontracted carrier and customer pickup.

**Trip planning and assignment**
`draft → capacity_checked → assigned → released`.

- Validate compatible capacity units (weight, volume, pallets, stops).
- Prevent vehicle/driver double assignment for overlapping periods where scheduling is implemented.
- If no route engine exists, allow manual stop ordering and label route/time estimates as operator-provided.
- Do not infer driver credentials, vehicle permits or insurance from profile.

**Execution**
`released → loading → departed → at_stop → delivered/partial/failed → closed`.

- Record custody transfer and actual quantities loaded/unloaded.
- Proof of delivery links to shipment and stop.
- Partial delivery creates a balance and follow-up, not a false full-delivery status.
- Failed delivery requires reason, evidence and disposition.

**Settlement**
`pending_documents → expenses_reconciled → customer_charge_review → closed`.

- Compare quoted, committed and actual trip costs.
- Separate carrier payable, customer receivable, fuel/toll and pass-through charges.
- Reconcile subcontractor documents and adjustments with approval.

### Roles

Dispatcher, driver/operator, warehouse/loading operator, carrier coordinator, customer-service agent, finance reviewer and owner. A driver may record a delivery event but cannot alter tariff, erase a failed delivery or approve their own expense exception.

### KPIs

- **On-time delivery:** delivered within promised window / deliveries due.
- **OTIF:** deliveries complete and on time / deliveries due.
- **First-attempt success:** delivered first attempt / attempted deliveries.
- **Vehicle utilization:** used capacity / declared available capacity, separately by weight/volume/pallets.
- **Cost per delivered unit:** actual trip cost / delivered quantity, with compatible unit.
- **Cost per stop:** actual trip cost / completed stops.
- **Empty distance ratio:** verified empty distance / total verified distance; unavailable without reliable distance capture.
- **Claims/damage rate:** validated claims / delivered consignments.

### Golden Business tests

- **GB-LOG-01 — capacity mismatch:** 8 pallets cannot be compared with a 4,000 kg limit unless actual weight is available; reject invalid unit arithmetic.
- **GB-LOG-02 — double assignment:** concurrent dispatchers cannot assign the same vehicle/driver to overlapping trips.
- **GB-LOG-03 — partial POD:** 8 of 10 units delivered leaves 2 outstanding and a documented exception.
- **GB-LOG-04 — duplicate delivery event:** retry cannot duplicate customer delivery, stock movement or revenue recognition.
- **GB-LOG-05 — privacy boundary:** proof-of-delivery media is visible only to authorized tenant roles and retained under explicit policy.
- **GB-LOG-06 — actual vs estimated cost:** dashboard must not present planned fuel estimate as actual trip cost.

---

## 4. `construction_contractor` — contractors and project-based construction

### Operating boundary

**Included:** contractors and construction service firms managing estimates, projects/sites, materials, subcontractors, progress and project costs.

**Not automatically included:** engineering design approval, statutory site safety certification, building permits, payroll/legal labour compliance, public procurement certification or automated measurement certification.

### Core jobs

- Convert an estimate into a controlled baseline and project budget.
- Break scope into work packages, milestones and measurable quantities.
- Plan procurement and material deliveries to a site.
- Track subcontractor commitments, change orders and progress.
- Compare actual/committed cost with budget and estimate cost-to-complete.
- Maintain site evidence, approvals and handover records.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Project | client, site, contract reference, dates, owner, status | Project record is not a permit |
| Work breakdown item | code, scope, unit, baseline quantity, rate, dependencies | BOQ units must be explicit and comparable |
| Estimate version | quantities, rates, assumptions, exclusions, validity, approver | Accepted baseline is immutable |
| Budget/cost code | cost category, budget, currency, period | Budget, commitment and actual are separate |
| Site | address, access constraints, timezone, responsible operator | Site data does not prove ownership or authorization |
| Purchase commitment | supplier, scope, amount, dates, project/cost code | A quote is not a committed purchase |
| Subcontract | party, scope, milestones, retention/terms if applicable | Legal terms require reviewed source and human approval |
| Progress measurement | work item, measured quantity, evidence, reviewer, period | Measurement is not a statutory progress certificate |
| Change order | requested scope, cost/time impact, reason, approvals | No baseline change before authorized approval |
| Site diary | weather/source, crew note, incidents, work completed, attachments | Do not claim official safety record without validation |

### Standard workflows

**Estimate to baseline**
`draft → reviewed → quoted → accepted → baseline_locked`.

- Store inclusions, exclusions, assumptions, quantities, rates and validity.
- Customer acceptance snapshots the baseline.
- Any scope or price change requires a versioned change order.

**Project execution**
`mobilization → active → on_hold/completed`.

- Work packages move through planned, ready, in-progress, measured, reviewed and accepted.
- Material receipt at site is a location-specific stock movement with source document.
- Site transfer is not consumption; consumption is a separate event linked to work package.
- Commitments are not actual expense until evidenced and posted.

**Progress and payment**
`measured → evidence_attached → reviewed → approved_for_billing`.

- Capture period, measured quantities, reviewer and evidence.
- Retention, advance, deductions and tax treatment require explicit contract/finance configuration.
- A progress claim is not an invoice or proof of payment.

**Change control**
`requested → impact_assessed → client_review → approved/rejected → baseline_revised`.

- Quantify cost and schedule impact before approval.
- Preserve original and revised baselines.
- Emergency work may be recorded but must remain unapproved until the contractually valid review occurs.

**Closeout**
`work_complete → punch_list → documents_reconciled → client_handover → closed`.

- Track defects, outstanding items, warranties and handover evidence.
- Closed project cost cannot be silently rewritten.

### Roles

Estimator, project manager, site supervisor, warehouse/procurement, subcontractor coordinator, progress reviewer, finance and owner. Site supervisor may capture measurements but cannot approve own high-value variation or payment claim.

### KPIs

- **Budget variance:** actual + committed forecast − approved budget, by cost code.
- **Estimate at completion (EAC):** actual cost to date + forecast cost to complete; label assumptions and confidence.
- **Cost performance:** earned value / actual cost only if a valid earned-value method is configured.
- **Schedule variance:** actual milestone date − baseline milestone date.
- **Progress:** accepted measured quantity / baseline quantity for compatible scope.
- **Change-order ratio:** approved change value / original contract value.
- **Procurement coverage:** required materials with confirmed supply / materials due.
- **Defect closure time:** elapsed time from logged defect to accepted closure.

### Golden Business tests

- **GB-CON-01 — baseline immutability:** accepted estimate v1 remains unchanged after change order v2.
- **GB-CON-02 — commitment vs actual:** purchase order commitment does not appear as paid/actual expense before receipt/invoice/payment evidence.
- **GB-CON-03 — site stock:** transfer to site does not reduce project inventory until consumption is posted.
- **GB-CON-04 — progress approval:** unreviewed measurement cannot be billed as approved progress.
- **GB-CON-05 — change-order gate:** scope/cost baseline cannot change without required approval.
- **GB-CON-06 — project isolation:** subcontractor sees only assigned project scope/documents, not other projects or owner finance data.

---

## 5. `equipment_rental` — equipment and asset rental

### Operating boundary

**Included:** rental of tools, machinery, vehicles, event equipment and other reusable assets with availability, custody, condition and maintenance needs.

**Not automatically included:** regulated vehicle fleet management, heavy-equipment telematics, insurance underwriting, legally binding e-signature, automated damage adjudication or deposit escrow.

### Core jobs

- Know which asset is available, reserved, dispatched, on rent, overdue, under inspection or in maintenance.
- Quote rental by time, usage, package or negotiated term.
- Capture custody transfer and return condition.
- Track meter/hour usage and consumables where applicable.
- Bill extensions, late returns and damage only under approved contract rules.
- Plan preventive maintenance and reduce idle/unsafe assets.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Asset | stable asset ID, category, serial, location, condition, status | Asset is not a saleable stock quantity |
| Rental rate | time unit, price, minimum period, billing increment, currency, effective dates | Never assume day = 24 hours for every contract |
| Availability calendar | asset, blocked windows, maintenance, reservation state | Availability must be concurrency-safe |
| Reservation | customer, asset/category, period, quote, terms version, approval | Request is not confirmed reservation |
| Rental contract | asset(s), rate snapshot, period, meter basis, terms, signatures/evidence | Signature capability must be real and legally reviewed |
| Dispatch inspection | checklist, condition, photos, meter, accessories, actor/time | Photos are evidence, not automatic damage verdict |
| Return inspection | condition delta, meter, missing accessories, damage report, reviewer | Customer dispute and adjudication require human process |
| Meter event | meter type/value/unit, timestamp, source, actor | Reject resets/rollovers unless explicitly handled |
| Maintenance work order | asset, reason, priority, parts, labor, status, release check | Asset unavailable until authorized return-to-service |
| Deposit/charge | amount, currency, purpose, original event, settlement/refund | Separate liability/receivable treatment requires finance review |

### Standard workflows

**Reservation**
`inquiry → quote → availability_check → pending_approval → confirmed`.

- Availability check must be atomic with confirmation to prevent double booking.
- Quote snapshots rate, period, inclusions, deposit and cancellation terms.
- A reservation holds capacity only if the capability supports an atomic hold with expiry.
- If calendar locking is not implemented, display indicative availability only.

**Dispatch**
`reserved → pre_dispatch_inspection → released → on_rent`.

- Record asset ID, accessories, condition, meter, custody and handover evidence.
- Do not release an asset in maintenance, quarantine or overdue return state.
- Missing inspection evidence blocks release when required by operator policy.

**On-rent changes**
`on_rent → extension_requested → approved/rejected`; usage may be recorded through meter events.

- Extensions require availability check for the next booking.
- Rate/period changes create a versioned amendment.
- Meter readings are append-only and source-attributed.

**Return and settlement**
`return_requested → inspection → reconciliation → charges_review → closed`.

- Capture actual return time, meter and condition.
- Late fee/damage charges are calculated only from approved contract terms and human-reviewed evidence.
- Disputed damage is held; do not auto-charge from image analysis.
- Deposit settlement references the original payment and approved deductions.

**Maintenance**
`reported → scheduled → in_maintenance → inspected → released_to_service`.

- Any safety/critical defect blocks availability until an authorized release.
- Parts consumed and maintenance cost link to the asset and work order.
- Preventive schedule uses meter/time basis with explicit unit and policy.

### Roles

Rental agent, yard/dispatch operator, return inspector, maintenance technician, supervisor, finance and owner. Dispatch operator cannot waive safety holds or approve disputed damage charges. Finance cannot alter inspection evidence.

### KPIs

- **Utilization:** billable asset time / available rentable time; exclude maintenance and define idle windows.
- **Revenue per available asset day:** recognized rental revenue / rentable asset days.
- **Reservation conversion:** confirmed reservations / valid quotes.
- **On-time return:** returns within agreed window / returns due.
- **Turnaround time:** elapsed time from return to next ready state.
- **Maintenance downtime:** unavailable maintenance hours / scheduled rentable hours.
- **Damage incidence:** reviewed damage cases / completed rentals.
- **Asset contribution:** rental revenue − direct maintenance, depreciation/allocation and attributable costs; disclose cost coverage.

### Golden Business tests

- **GB-RENT-01 — concurrent reservation:** two users request the same asset/time; exactly one confirmation succeeds.
- **GB-RENT-02 — maintenance block:** an asset under critical maintenance cannot be reserved or dispatched.
- **GB-RENT-03 — extension conflict:** extension colliding with next confirmed booking is rejected or escalated; no silent double booking.
- **GB-RENT-04 — return dispute:** inspector records damage, customer disputes; asset and charge remain in review state pending authorized disposition.
- **GB-RENT-05 — deposit idempotency:** duplicate payment/refund callback cannot double-settle deposit.
- **GB-RENT-06 — meter integrity:** decreasing meter reading is rejected or routed to explicit rollover/reset review.

---

## 6. Cross-vertical capability dependencies

| Shared capability | Manufacturing | Agriculture | Logistics | Construction | Rental |
|---|---|---|---|---|---|
| Versioned BOM/formula | Critical | Low/conditional | None | Low | None |
| Decimal-safe units/conversion | Critical | Critical | Critical | Critical | Critical |
| Lot genealogy | High | High | Medium | Medium | Low |
| Work orders | Critical | Field operations | Maintenance | Work packages | Maintenance |
| Reservation/concurrency | Material and capacity | Resource planning | Vehicle/driver | Procurement/site | Critical asset calendar |
| Scheduling/calendar | Work centres | Crop cycle | Trips/stops | Milestones | Critical asset windows |
| Mobile/offline event sync | High | Critical | Critical | Critical | High |
| Document/evidence versioning | High | Critical | Critical | Critical | Critical |
| Cost commitments vs actuals | Critical | High | Critical | Critical | High |
| Asset registry/maintenance | Work centres | Equipment | Fleet | Plant/equipment | Critical |
| Approval workflow | BOM, quality, variance | Inputs/harvest | Expenses/exceptions | Changes/progress | Damage/charges |
| Customer/vendor portal | Medium | Medium | High | High | High |

**Important:** a shared capability may be implemented once and configured by template, but its domain invariants differ. For example, a reservation of a rental asset is an exclusive time interval; a material reservation is a quantity hold; a vehicle assignment consumes capacity over a trip. Do not implement a generic `reservation` table that ignores these semantics.

### Suggested platform primitives (architecture candidates, not claims of existing implementation)

1. **Versioned operational documents:** immutable snapshots for BOMs, estimates, rate cards, contracts and accepted quotes.
2. **Resource scheduling kernel:** typed resource, interval, capacity unit, hold expiry, conflict policy and confirmation transaction.
3. **Operational event envelope:** tenant, aggregate ID, event ID, actor, source, occurred/received time, idempotency key, payload version and correlation ID.
4. **Evidence registry:** file/document reference, purpose, scope, owner, retention, consent/legal basis where applicable, review state and provenance.
5. **Cost ledger dimensions:** estimated, committed, accrued and actual; project/work order/trip/asset/crop-cycle cost codes.
6. **Offline command queue:** pending/synced/conflicted/rejected states, deterministic retry and user-visible resolution.
7. **Capability adapters:** integrations for scales, GPS, meters, sensors and signatures must expose source health, timestamp, confidence and failure state.

These primitives should be designed against existing Nüva One schema and services before any new table/RPC is proposed. Avoid duplicate ledgers and generic abstractions that erase domain meaning.

---

## 7. Chile-specific evidence and compliance boundaries

This is an engineering checklist, not legal advice. Obligations depend on actual activity, products, site, contracts, transport mode, workforce and current regulation.

- Keep SII giro, tax treatment, DTE, purchase/sales documents and dispatch-guide obligations separate from the operational profile. A profile never determines a tax code.
- For agriculture and agro-inputs, identify which products/activities are subject to current SAG rules, registrations, storage, labelling, application or traceability obligations. Store source, effective date, scope, reviewer and next review date. Do not generate pesticide dosage or safety directions from an unverified model response.
- For transport, determine applicable vehicle, driver, cargo, insurance, road-safety and labour requirements from current official sources. A stored expiry date is not a legal compliance certification.
- For construction, separate project evidence from permits, technical approvals, occupational health/safety records, labour obligations and statutory certifications. Do not market a checklist as regulatory compliance.
- For equipment rental, distinguish contractual inspection from statutory inspection, certification, insurance and safe-operation authorization.
- Personal and location data (including driver, customer, site and proof-of-delivery data) require purpose limitation, least privilege, retention and access logging. Avoid collecting unnecessary identity documents or location history.
- Any automated customer charge, payroll effect, regulatory filing, dispatch document or safety-critical instruction requires explicit authority, tested transaction semantics and human review appropriate to its risk.

Maintain a regulatory evidence register with official source URL, retrieval date, version/effective date, applicable activity, reviewer, decision, evidence artifact and next review date. Do not hardcode legal conclusions in a vertical template.

---

## 8. Certification exit gates

A profile/subtype can move through `designed → pilot → certified` only with versioned evidence. For certification require:

- [ ] Existing profile ID and subtype mapping reviewed; no duplicate catalogue or implicit subtype inference.
- [ ] Every advertised workflow maps to a real shared service/schema/RPC or is labelled unavailable.
- [ ] Tenant isolation and role/approval denial tests pass for every sensitive resource.
- [ ] Decimal precision, units, conversions and rounding survive UI → API → database → ledger → document/report.
- [ ] Idempotency, retry, offline/reconnect and concurrent mutation tests pass.
- [ ] State transitions, cancellation, compensation and correction paths are defined and tested.
- [ ] Estimated/committed/accrued/actual values are separated and reconcile to source documents.
- [ ] Evidence provenance, retention, export and deletion policy are reviewed.
- [ ] Mobile and desktop flows, poor connectivity, device failure and accessibility are tested.
- [ ] Golden Business scenarios pass with deterministic synthetic tenants and fixtures.
- [ ] Regulatory claims are reviewed by qualified humans and never represented as automatic certification.
- [ ] Product, engineering and security reviewers sign the evidence record.
- [ ] Rollback, import/reconciliation and support runbooks are rehearsed.

## 9. Priority decisions from this wave

1. **Do not implement five isolated vertical ERPs.** Build typed shared primitives only after mapping them to existing Nüva One services and schema.
2. **Split agriculture into two explicit subtypes** under `agriculture_agroinputs`; this avoids contaminating farm production with retail POS assumptions.
3. **Prioritize resource scheduling semantics** before claiming dispatch, finite capacity or equipment availability. Different resource types need different conflict rules.
4. **Prioritize cost provenance** across manufacturing, logistics, construction and rental. A dashboard that mixes estimates with actuals will mislead owners.
5. **Treat mobile/offline capture as a first-class requirement** for field, site, driver and yard workflows, but do not post unverified local events as confirmed transactions.
6. **Keep all five profiles at design/specification status** until source, schema, permissions, tests, integrations and end-to-end evidence prove readiness.

**Decision:** this wave expands the operating-model catalogue without changing production behaviour, readiness registry, database schema, RLS, permissions, plan entitlements or deployment state.
