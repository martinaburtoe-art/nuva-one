# 23-profile specialization map and certification backlog

**Status:** product research and engineering backlog; not an implementation or certification claim.  
**Catalogue authority:** `src/lib/industry-profiles.ts` on the sector branch.  
**Current catalogue:** 23 stable profile IDs. This document does not add, rename or delete IDs.

## Purpose

Turn the existing catalogue into a controlled portfolio of standard operating templates. Each profile must have a distinct operating boundary, standard workflow, master-data contract, role model, KPI definitions, exception paths and certification suite. Profiles may reuse shared capabilities; they must not become independent applications.

## Release and evidence rules

1. Profile identity, operational configuration, tax/SII activity, permissions, subscription and capability readiness are separate concerns.
2. A profile can be classified before it is certified. Its UI may only expose verified capabilities.
3. A profile's capability list is a target requirement map, not proof of availability.
4. Unknown answers remain unknown. Do not infer tax treatment, legal permits, conversion factors, expiry dates, compatibility or credit approval.
5. All tenant data and identifiers remain tenant-scoped. Confirmed commercial documents preserve snapshots; stock and cash changes are auditable ledger events.
6. A vertical certification requires happy path, cancellation, partial completion, correction, returns, retries, permission denial, tenant isolation and recovery tests.
7. New profile IDs require evidence that the operating model is materially different, a migration/alias plan and explicit review. Do not fork the catalogue casually.

## Portfolio map

| Existing profile ID | Standard operating archetype | Distinctive operational model | Priority / current design state | Certification blockers |
|---|---|---|---|---|
| `hardware_store` | Technical retail / materials | Specification-heavy SKUs, dimensions, quotes, supplier units, dispatch and contractor pricing | P0; detailed contract in PR #338 | Product variants, dimension-safe conversions, customer price rules, reservations and multi-warehouse |
| `neighborhood_grocery` | Fast-turn convenience retail | Rapid checkout, frequent replenishment, mixed formats, perishable controls and shift close | P0; detailed contract in PR #338 | Pack factors, lot/expiry/FEFO, waste ledger, replenishment and branch support |
| `wholesale_distribution` | B2B wholesale fulfilment | Customer terms, order capture, price lists, credit, picking, partial delivery and proof of delivery | P0; detailed contract in PR #338 | Price-list versioning, credit/AR, allocation, warehouse picking, delivery evidence and cost-to-serve |
| `beverage_store` | Beverage specialist retail | Returnable containers, packs/cases, age-restricted product controls where applicable, deposits and high-volume promotions | P2; catalogue profile only | Returnable-container ledger, product-specific packaging conversion, regulated-product controls and deposit reconciliation |
| `produce_market` | Fresh produce retail | Variable weight, grade/calibre, daily price changes, shrink, yield and freshness | P2; catalogue profile only | Fractional weighing, purchase-to-sale yield, lot/expiry traceability, waste valuation and scale/POS integration |
| `butcher_fishmonger` | Fresh protein counter | Catch/animal lot traceability, cuts, yield, variable weight, cold-chain events and recall | P2; catalogue profile only | Lot traceability, transformation/yield, fractional units, cold-chain evidence, recall and sanitary controls |
| `apparel_footwear` | Variant-led fashion retail | Model/colour/size matrix, seasonal collections, size curve, markdowns and exchanges | P1; contract in PR #338 | Variant-level SKU and stock, exchange/return disposition, season/collection reporting and channel sync |
| `books_stationery_electronics` | Specialist catalog retail (currently combined) | ISBN/edition and school supplies differ from model/serial/warranty electronics | P1; initial contract in PR #338; subtype review required | Confirm whether one template with explicit subtypes is viable; serial/IMEI and warranty lifecycle; ISBN/catalog import |
| `restaurant_cafe` | Food service / prepared-to-order | Menu, modifiers, service channels, preparation stages, recipes and shift reconciliation | P1; contract in PR #338 | Recipe/BOM, ingredient consumption, kitchen tickets, channel/tender reconciliation, food-safety traceability |
| `bakery_pastry` | Batch food production + retail | Formula, batch yield, production schedule, made-to-order items, shelf life and waste | P2; catalogue profile only | Recipe versioning, production orders, batch genealogy, yield/scrap and expiry |
| `manufacturing_workshop` | Make-to-stock / make-to-order production | BOM, routing, work centres, raw materials, WIP, scrap, finished goods and costing | P2; catalogue profile only | BOM/routing, production orders, WIP ledger, labor/overhead allocation and lot/serial genealogy |
| `auto_repair_parts` | Repair service + parts retail | Vehicle identity, inspection, estimate, authorization, labor, parts, work order and warranty | P1; contract in PR #338 | Vehicle registry, work-order lifecycle, authorization evidence, labor time/cost and parts reservation |
| `agriculture_agroinputs` | Seasonal agricultural operations / input retail | Farm/plot/crop/season, input lots, application records, harvest yield and seasonal costing | P2; catalogue profile only | Farm/plot model, seasonal calendar, batch traceability, application logs and yield/cost allocation |
| `transport_logistics` | Fleet and transport service | Vehicle/driver, trip, load, route, fuel, maintenance, delivery proof and cost/km | P2; catalogue profile only | Fleet registry, dispatch planning, trip events, driver/vehicle compliance records and trip costing |
| `construction_contractor` | Project/works contractor | Estimate by item, site, purchase/material issue, subcontract, progress, change order and retention | P1; existing operating pack + P1 review | Project/site cost ledger, quantities/progress, purchase commitments, labor/subcontract allocation and cashflow |
| `professional_services` | Knowledge work / client engagements | Opportunity, proposal, scope, contract, project, time, expenses, milestones and renewal | P1; contract in PR #338 | Proposal versioning, time approval, expense evidence, capacity, revenue recognition and project cost allocation |
| `beauty_wellness` | Appointment and service retail | Staff/resource calendar, service duration, room/chair, consumables, packages, commission and rebooking | P1; catalogue profile only | Appointment/resource engine, staff availability, commission settlement, client consent and service consumption |
| `veterinary_pet` | Veterinary care + pet retail | Animal/patient identity, owner, clinical encounter, treatment, medication/product inventory and reminders | P2; catalogue profile only | Patient record/access controls, clinical audit, appointment lifecycle, regulated stock and privacy review |
| `lodging_tourism` | Reservation and stay operations | Availability, rates, booking, check-in/out, room/asset housekeeping, extras and occupancy | P2; catalogue profile only | Inventory of rooms/units, availability/rate engine, booking lifecycle, deposits, cancellation and guest data controls |
| `equipment_rental` | Serialized asset rental | Asset availability, quote, reservation, contract, dispatch, return inspection, damage and maintenance | P2; catalogue profile only | Asset identity, availability calendar, reservation, rental contract, deposits, inspection and utilization |
| `education_fitness` | Membership, cohort and class service | Member/student, plan, enrollment, class schedule, attendance, capacity, renewal and arrears | P2; catalogue profile only | Membership lifecycle, class capacity, attendance, recurring billing integration and sensitive data policy |
| `field_technical_service` | Mobile field service | Service ticket, site, technician, schedule, parts/tools, visit evidence, customer acceptance and SLA | P2; catalogue profile only | Work orders, dispatch scheduling, technician mobile workflow, offline evidence, SLA and parts consumption |
| `general_business` | Explicit fallback / unclassified | Generic core workflow only until discovery establishes a stable operating archetype | General; fallback, not a certified vertical | Must not masquerade as a specialized template; record why no profile fits and collect discovery evidence |

## Important taxonomy decisions

### 1. Preserve stable IDs; investigate subtypes before splitting

`books_stationery_electronics` is the clearest possible taxonomy collision. Books/stationery and electronics share catalog retail but differ materially in serial/IMEI, warranty, ISBN, editions, supplier catalogues and returns. Do not rename or split it in place. Run discovery against real businesses first. If the distinction is material, introduce new IDs with explicit legacy aliases, migration rules, analytics continuity and backward compatibility.

`beverage_store` includes botillerías and non-alcohol beverage shops. Keep one stable ID for now, but require an explicit regulated-product sub-profile/configuration before any alcohol-specific workflow. Never infer licence, age-check policy or legal permission from the profile.

`manufacturing_workshop` and `auto_repair_parts` must remain distinct: the first transforms raw materials into products; the second repairs customer-owned assets and consumes parts/labor against a work order.

`restaurant_cafe` and `bakery_pastry` must remain distinct: food service is order/channel/preparation-led; bakery is batch/formula/yield-led, even when it also sells at counter.

`construction_contractor` and `hardware_store` must remain distinct: one manages projects/sites and commitments; the other sells technical materials and may quote by job without becoming a construction ERP.

### 2. Secondary profiles are composition, not module multiplication

A minimarket with a small bakery can have `neighborhood_grocery` as primary and `bakery_pastry` as secondary. A hardware store that delivers materials remains `hardware_store` with delivery channel/context, not automatically a transport company. Secondary profiles contribute relevant context but do not create duplicate inventory, customers, sales, cash or accounting ledgers.

### 3. Separate vertical workflow from regulated/legal obligations

Regulatory controls are explicit policy and evidence layers. A sector selection never establishes an SII giro, municipal permit, sanitary authorization, professional licence, labor classification, alcohol permission, clinical consent or consumer-policy compliance. These require independent source-of-truth records and owner review.

## Certification waves

### Wave 0 — P0 (currently under specification in PR #338)

- `neighborhood_grocery`
- `hardware_store`
- `wholesale_distribution`

Exit criteria: contracts, synthetic fixtures, capability evidence mapping, role/tenant isolation tests, and end-to-end implementation review. Do not certify from documentation alone.

### Wave 1 — P1 (design contracts exist; implementation is not certified)

- `apparel_footwear`
- `auto_repair_parts`
- `restaurant_cafe`
- `professional_services`

Exit criteria: shared primitives implemented once, vertical happy/exception paths tested, KPI evidence coverage proven, and mobile/desktop UX reviewed.

### Wave 2 — differentiated retail and production

- `beverage_store`
- `produce_market`
- `butcher_fishmonger`
- `books_stationery_electronics`
- `bakery_pastry`
- `manufacturing_workshop`

Recommended order: validate specialist retail first, then food transformation and production. Do not launch perishables until lot/expiry/recall foundations exist.

### Wave 3 — asset, project and field operations

- `construction_contractor`
- `beauty_wellness`
- `agriculture_agroinputs`
- `transport_logistics`
- `veterinary_pet`
- `lodging_tourism`
- `equipment_rental`
- `education_fitness`
- `field_technical_service`

Prioritize after customer discovery and reusable workflow foundations; this wave contains several distinct regulated or sensitive data domains.

### General fallback

- `general_business` remains a safe generic route, not a promise of industry-specific intelligence.

## Shared platform primitives to build once

| Primitive | Vertical demand | Acceptance evidence |
|---|---|---|
| Product family and typed variants | Apparel, hardware, electronics, parts | Tenant-safe unique SKU per sellable variant; barcode resolves one exact variant; variant stock and returns reconcile |
| Units, dimensions and product conversions | Grocery, produce, butcher, hardware, wholesale, manufacturing | Exact product-specific factors; dimension compatibility; immutable transaction snapshots; round-trip and fractional tests |
| Lot, expiry, genealogy and recall | Grocery, produce, butcher, food service, bakery, agroinputs | Lot balance ledger; FEFO policy; recall trace from supplier receipt to affected sale; no expiry inferred |
| Costing and allocation | All inventory/production/service verticals | Reproducible COGS and labor/direct-cost allocation; completeness and freshness reported |
| Workflow state machine and approvals | Workshop, restaurant, rental, projects, field service | Explicit transition graph; actor/role guard; idempotency; cancellation/partial/reopen semantics; audit events |
| Calendar, capacity and scheduling | Beauty, lodging, education, field service, dispatch | No double-booking; timezone correctness; capacity constraints; cancellation/no-show handling |
| Customer/asset relationships | Auto, veterinary, rental, lodging, education | Tenant isolation, consent/retention policy, audit and controlled exports |
| Mobile/offline evidence capture | Delivery, field service, receiving, counts, proof of delivery | Conflict resolution, retry idempotency, timestamp/actor evidence and safe sync |
| Commercial price and credit policy | Wholesale, hardware, B2B services | Effective-dated immutable price snapshots, discount approvals, credit balance reconciliation |
| Integration health and reconciliation | SII/DTE, payments, ecommerce, banks, POS hardware | Retry queue, idempotency, source reference, reconciliation, dead-letter visibility and operator recovery |

## Customer discovery required before final wave ordering

For each candidate vertical, capture at least:
- 3–5 real operator interviews before claiming a representative template; increase sample when the business model is heterogeneous.
- One observed or reconstructed end-to-end operating day, including exceptions.
- Actual source documents (anonymized): purchase order, receipt, sale, return, work order, quote, dispatch, close or service agreement as applicable.
- Role separation and approval thresholds.
- Current system and export/import formats.
- The three highest-cost recurring errors and their measurable impact.
- Required Chilean integrations, permits and retention duties, independently verified.

A template may advance only when interview evidence, domain model, capability implementation, deterministic tests and release controls agree.

## Next engineering actions

1. Link every P0 workflow step in PR #338 to actual routes, components, services, database tables/RPCs and tests.
2. Freeze P0 data contracts and build deterministic fixtures without using real tenant data.
3. Implement shared primitives in dependency order: product identity/variants, units/conversions, lot ledger, cost coverage, then vertical-specific workflows.
4. Add capability readiness evidence only after implementation and end-to-end tests; keep planned capabilities hidden or clearly pending.
5. Certify P0 before implementing multiple P1/P2 workflows in parallel.
6. Begin discovery for the taxonomy collision and Wave 2 candidates; do not change the catalogue until evidence supports it.

## Non-goals

- No second profile catalogue.
- No arbitrary per-customer forks.
- No duplicated modules or ledgers.
- No production migration, deployment or readiness promotion from this document.
- No assumption that every business needs every capability.
- No AI-generated legal, tax, technical compatibility or financial decisions without verified sources and human authorization.
