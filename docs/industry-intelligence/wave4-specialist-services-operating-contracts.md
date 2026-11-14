# Wave 4 — specialist retail, appointments, hospitality and service operations

**Status:** operating-model specification only; not implementation, legal advice or certification.
**Profiles covered:** `books_stationery_electronics`, `beauty_wellness`, `veterinary_pet`, `lodging_tourism`, `education_fitness`, `field_technical_service`, `general_business`.
**Catalogue rule:** reuse the seven existing profile IDs. Together with the earlier waves and P0 profiles, this completes operating-model coverage of the existing 23-profile catalogue; it does not mean all 23 are implemented or certified.
**Shared platform:** use common customers/parties, products, suppliers, sales, purchasing, payments, stock movements, documents, calendar, staff identities, audit and reporting. Domain-specific records are bounded extensions, not duplicate customer, inventory, payment or accounting ledgers.

## 0. Shared rules for appointment, booking and service businesses

The profiles in this wave have three distinct transactional patterns:

- **Retail with regulated/high-value goods:** books, stationery and electronics.
- **Appointment, care, stay or membership capacity:** beauty/wellness, veterinary/pet, lodging/tourism and education/fitness.
- **Field service and customer-site execution:** technical service.

Do not collapse all of these into a generic booking table. A room reservation consumes a room-night inventory; an appointment consumes a provider/resource interval; a class booking consumes a seat; a veterinary visit may require a clinician, room and patient record; a field-service job consumes technician time, travel capacity and possibly parts.

### Cross-profile invariants

1. Keep customer/guest/patient/student/animal/asset roles explicit. Do not overload one generic `customer` record with clinical, educational or identity data.
2. Capture only necessary personal data, with purpose, consent/legal basis where applicable, retention and least-privilege access.
3. A quote, inquiry, waitlist entry or tentative hold is not a confirmed booking.
4. Availability must be concurrency-safe before confirmation. If atomic holds are unavailable, show indicative availability only.
5. Appointment, stay, class, job and sale have different cancellation, rescheduling, no-show, refund and credit semantics.
6. A service performed is not necessarily paid; a payment received is not necessarily revenue recognized; an invoice is not proof of service completion.
7. Product returns, warranties and service rework must link to the original sale/service and use controlled dispositions.
8. Staff credentials, licences, insurance, professional qualifications and regulatory compliance must be evidenced independently; a profile cannot assert them.
9. Offline capture remains pending until server confirmation. Duplicate retries cannot double-book, double-charge or duplicate service completion.
10. Every KPI states its denominator, time window, source, coverage and whether it is actual, forecast or estimated.

---

## 1. `books_stationery_electronics` — books, stationery and consumer electronics retail

### Operating boundary

**Included:** bookstores, stationery shops, school/office supplies and consumer electronics retail.

**Not automatically included:** telecom carrier activation, repair workshop, device financing, refurbished-device certification, extended-warranty underwriting or digital content licensing.

### Core jobs

- Manage catalogue variants, editions, formats, compatibility and bundles.
- Replenish by supplier, season, school calendar and demand.
- Track serialized/high-value devices separately from ordinary unit stock.
- Link returns and warranty claims to the original sale and serial number.
- Manage preorders, backorders, reservations and supplier lead times.
- Understand sell-through, stock ageing, margin and obsolescence.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Retail SKU | product identity, brand/publisher, category, tax source, unit | Edition, format, language and device model may be distinct SKUs |
| Variant/compatibility | model, capacity, colour, region, compatible accessories | Compatibility must come from a reviewed source |
| Edition metadata | ISBN/edition/format/publisher where applicable | Preserve identifiers exactly; do not invent ISBN |
| Serialised unit | SKU, serial/IMEI where lawful and necessary, receipt, status | Restrict access; never expose full identifier unnecessarily |
| Bundle | parent offer, component SKUs, quantities, effective dates | Bundle stock must reconcile to component stock |
| Preorder/backorder | customer, SKU, quantity, promised window, supplier evidence | Promise only when supply/lead time is supported |
| Warranty claim | original sale, serial, fault, evidence, vendor/manufacturer route, disposition | Store warranty terms source and applicable version |
| Return | original sale line, reason, condition, disposition, approver | Restock, quarantine, repair or supplier return are distinct |

### Workflows

**Receiving and serialized intake:** `expected → received → serial_captured → inspected → posted`. Validate serial uniqueness and SKU match; duplicate or missing serials are held for review where serial capture is required.

**Preorder:** `inquiry → quote/terms → deposit_pending → confirmed → supplier_allocated → received → customer_notified → handed_over`. Do not claim customer notification without a recorded send event. Deposits remain separate payment events.

**Sale:** `cart → availability_checked → serial_allocated → payment_pending → committed`. The serial allocation and stock decrement must commit atomically.

**Return/warranty:** `requested → eligibility_review → inspected → approved/rejected → dispositioned → closed`. A warranty claim is not automatically a refund. Keep manufacturer, retailer and statutory remedies distinct, with human review of applicable law and contract.

### KPIs

- Sell-through by SKU/edition/model.
- Stock ageing and obsolescence exposure.
- Preorder fill rate and supplier lead-time variance.
- Return rate by SKU/reason.
- Warranty resolution time and first-time resolution.
- Serialized stock accuracy: verified serialized units / units requiring serial control.
- Gross margin by category after discounts and captured costs.

### Golden Business tests

- **GB-BOOK-01:** two concurrent sales cannot allocate the same serialized device.
- **GB-BOOK-02:** preorder deposit is not posted as full sale revenue by default.
- **GB-BOOK-03:** returned opened electronics are routed to inspection/quarantine, not automatically returned to sellable stock.
- **GB-BOOK-04:** warranty case links to original receipt and serial while preventing unauthorized access to full identifiers.
- **GB-BOOK-05:** bundle sale decrements exact component quantities once, including retry and cancellation paths.

---

## 2. `beauty_wellness` — beauty, wellness and personal-care services

### Operating boundary

**Included:** salons, barbers, nail studios, spas and non-clinical wellness businesses offering appointments and services.

**Not automatically included:** medical diagnosis, invasive medical aesthetics, prescription treatments, clinical records, regulated health services or professional licence certification.

### Core jobs

- Publish services, duration, price, required resources and cancellation policy.
- Match appointment to provider, room/chair/equipment and customer preference.
- Manage recurring visits, packages, prepaid balances and memberships.
- Track service delivery, consumables and rebooking.
- Handle no-shows, late arrivals, cancellations and provider absence.
- Separate retail product sales from service execution.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Service catalogue | service ID, duration, price, tax source, resource requirements | Service label is not evidence of clinical authorization |
| Provider profile | availability, skills declared by business, status | Qualification evidence is separately reviewed |
| Resource | room/chair/equipment, capacity, setup/cleanup buffers | Cannot double-book shared resource |
| Appointment | customer, service, provider/resource, interval, status, price snapshot | Tentative hold is not confirmed |
| Package/membership | included services/credits, expiry, terms, usage rules | Balance ledger must be immutable and idempotent |
| Consumable usage | SKU, quantity/unit, appointment, actor | Do not assume service consumption from template |
| Consent/preferences | purpose, version, date, withdrawal and access scope | Collect only what is necessary; no sensitive notes in generic CRM |
| Service completion | actual start/end, provider, performed service, exception | Completion does not imply payment |

### Workflows

**Appointment:** `requested → availability_checked → hold_pending → confirmed → checked_in → in_service → completed`, with cancelled, no-show and reschedule paths. Confirmation must atomically reserve provider and required resource.

**Packages and prepaid credits:** `purchased → active → redeemed/expired/refunded`. Each redemption references one completed eligible service; duplicate callbacks cannot double-redeem.

**Service rework/complaint:** `reported → reviewed → remedy_proposed → approved → resolved`. Keep refund, complimentary revisit and correction distinct.

### KPIs

- Provider utilization = booked service time / available service time, excluding breaks and blocked time.
- Appointment show rate = attended appointments / confirmed appointments due.
- Rebooking rate by service/provider/cohort.
- Revenue per available provider hour.
- Package redemption and unused liability/credit balance.
- Cancellation/no-show rate by policy window.
- Service contribution margin after captured consumables and attributable costs.

### Golden Business tests

- **GB-BEAUTY-01:** two customers cannot confirm the same provider/resource interval.
- **GB-BEAUTY-02:** provider absence triggers safe reschedule workflow without silently deleting appointments.
- **GB-BEAUTY-03:** one package credit cannot be redeemed twice on concurrent completion events.
- **GB-BEAUTY-04:** a service tagged as medical/invasive remains blocked from operational claims until separate qualification and regulatory review.
- **GB-BEAUTY-05:** cancellation/refund follows captured policy version, with human exception approval.

---

## 3. `veterinary_pet` — veterinary practice and pet services/retail

### Critical modelling decision: explicit service subtypes

This profile can cover materially different operations. Configure one or more explicit subtypes:
- `veterinary_clinic`: clinical appointments and restricted patient/clinical records.
- `pet_services`: grooming, daycare, boarding or training without clinical treatment.
- `pet_retail`: pet food, accessories and supplies.

Do not blend clinical records, grooming schedules and retail POS into one permission scope. A business may enable more than one subtype, but data access remains purpose- and role-scoped.

### Operating boundary

**Included:** veterinary practices, pet grooming/daycare/boarding, pet training and pet retail.

**Not automatically included:** emergency hospital systems, diagnostic imaging/laboratory integration, controlled-drug management, pharmacy dispensing, insurance claims or statutory veterinary certification.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Animal/patient | stable patient ID, species, responsible person, minimal identifiers | Animal record is distinct from owner/customer record |
| Responsible person | contact and relationship to animal | Verify authority before disclosing records |
| Clinical appointment | reason, clinician, time, status, restricted notes | Clinical data is not visible to retail/grooming roles |
| Clinical record | author, timestamp, structured observation/plan, amendment history | No AI diagnosis or prescription without qualified clinician |
| Treatment/medication record | source, product, quantity, responsible professional, event | Controlled medicine workflows require separate legal review |
| Grooming/daycare booking | service, animal, capacity, handover and pickup contacts | No clinical notes copied into generic booking |
| Boarding stay | animal, dates, kennel/resource, feeding/instructions, handover | Availability and occupancy must be atomic |
| Pet retail SKU/lot | product, supplier, lot/expiry where relevant | Product sale is separate from patient care |
| Incident/consent | event, responsible person, reviewer, evidence, status | Restrict sensitive incident records |

### Workflows

**Clinic visit:** `requested → triaged_by_staff → booked → checked_in → clinician_review → completed → follow_up`. Triage labels are operational routing only; emergency advice and clinical decisions belong to qualified professionals.

**Clinical record:** append-only entries with author and timestamp; corrections are amendments, never silent edits. AI may summarize authorized records but cannot diagnose, prescribe or change treatment.

**Grooming/daycare:** `requested → eligibility_check → confirmed → checked_in → in_service → ready_for_pickup → handed_over`. Capture only necessary care instructions and handover evidence.

**Boarding:** `inquiry → availability_hold → confirmed → check_in → stay_active → check_out → reconciled`. Kennel/space capacity and overlapping dates are concurrency-safe.

**Pet retail:** use shared POS/inventory with product lot/expiry where supported; no clinical record is required to complete an ordinary retail sale.

### Roles

Reception, veterinarian/authorized clinician, veterinary assistant, groomer, daycare/boarding operator, retail cashier, supervisor and owner. Clinical records are restricted to authorized clinical roles; retail roles cannot browse clinical history.

### KPIs

- Clinic: appointment lead time, no-show rate, follow-up completion and clinical record completeness (not clinical quality certification).
- Grooming: utilization, rebooking and handover punctuality.
- Boarding: occupancy, turnover time, incident rate and pickup punctuality.
- Retail: sell-through, stock cover and gross margin.
- Cross-subtype: customer retention only where identity linkage is lawful and purpose-compatible.

### Golden Business tests

- **GB-VET-01:** retail cashier cannot access clinical notes or medication history.
- **GB-VET-02:** animal record and responsible person relationship is explicit; unauthorized person cannot retrieve clinical records.
- **GB-VET-03:** AI summary cannot mutate clinical source or create a diagnosis/prescription.
- **GB-VET-04:** two concurrent boarding bookings cannot exceed capacity for the same dates.
- **GB-VET-05:** clinical correction appends an amendment with author/time; original entry remains auditable.
- **GB-VET-06:** pet retail sale does not create a clinical visit or treatment record.

---

## 4. `lodging_tourism` — lodging, tours and visitor experiences

### Operating boundary

**Included:** small lodging, hostels, cabins, hotels, tour operators and bookable visitor experiences.

**Not automatically included:** global distribution system/channel-manager integration, airline ticketing, dynamic revenue management, identity verification service, travel insurance underwriting or regulated passenger transport.

### Core jobs

- Manage room/unit/seat inventory across dates.
- Quote and confirm reservations with policy and payment status.
- Handle check-in/out, guest requests, housekeeping and maintenance blocks.
- Manage tour departures, guide capacity and weather/operational exceptions.
- Reconcile channel commissions, taxes, deposits and refunds.
- Prevent overbooking across direct and connected channels.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Accommodation unit | unit type, occupancy, amenities, status, location | Occupancy capacity is explicit and versioned |
| Experience/departure | product, date/time, capacity, guide/resource, meeting point | Tour seat is not room-night inventory |
| Rate plan | dates, unit, occupancy, inclusions, cancellation terms, taxes source | Rate snapshot retained at booking |
| Reservation | guest, dates, unit/experience, channel, price, status | Hold expiry and confirmation are explicit |
| Guest profile | minimal contact and preference data | Avoid storing identity documents unless necessary and lawful |
| Payment/deposit | amount, currency, due/refund rules, provider event | Payment status distinct from booking status |
| Housekeeping task | unit, task, due time, assigned staff, result | Room not ready until verified task completion |
| Maintenance block | unit/resource, interval, reason, approver | Block removes inventory atomically |
| Channel allocation | channel, allotment, sync state, external ID | No availability claim if sync is stale/failed |

### Workflows

**Reservation:** `inquiry → availability_hold → quoted → payment/guarantee_pending → confirmed → checked_in → checked_out → closed`. Cancellation, no-show, relocation and refund are explicit states.

**Inventory allocation:** confirm booking only after atomic room-night/seat allocation. External channel updates need idempotent callbacks, reconciliation and stale-sync warnings. If no channel manager exists, do not claim unified availability.

**Housekeeping:** `dirty → assigned → cleaning → inspection → ready`; maintenance block supersedes sellable availability.

**Tour/experience:** `departure_open → capacity_reserved → confirmed → checked_in → completed/cancelled`. Weather or safety cancellation follows documented policy and refund/rebooking path.

### KPIs

- Occupancy = sold room-nights / available sellable room-nights.
- ADR = accommodation revenue / sold room-nights.
- RevPAR = accommodation revenue / available sellable room-nights.
- Cancellation/no-show rate by booking channel and rate plan.
- Channel commission as share of channel revenue.
- Housekeeping turnaround and room-ready-at-check-in rate.
- Tour load factor = confirmed attendees / departure capacity.
- Guest issue resolution time.

### Golden Business tests

- **GB-LODGE-01:** overlapping booking requests cannot sell the same room-night twice.
- **GB-LODGE-02:** maintenance block removes room from availability before confirmation.
- **GB-LODGE-03:** external channel callback retry cannot duplicate reservation or payment.
- **GB-LODGE-04:** stale channel sync shows warning and prevents false availability guarantee.
- **GB-LODGE-05:** cancellation/refund follows the exact rate-plan snapshot accepted by guest.
- **GB-LODGE-06:** tour seats and room-nights use separate capacity ledgers.

---

## 5. `education_fitness` — education, courses, academies and fitness memberships

### Critical modelling decision: explicit program subtype

Configure one or more of:
- `education_programs`: courses, cohorts, lessons, instructors and learning progress.
- `fitness_membership`: memberships, classes, trainers, capacity and attendance.

Do not equate a course enrolment with a gym membership. They differ in term, capacity, attendance, completion and refund rules.

### Operating boundary

**Included:** private academies, training providers, studios, gyms and group fitness businesses.

**Not automatically included:** accredited education records, official qualifications, government subsidy claims, medical fitness certification, clinical health data, biometric access or payroll compliance.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Program/course | objectives, format, dates, capacity, prerequisites, price | Do not claim official accreditation without evidence |
| Cohort/session | instructor, interval, room/link, seat capacity | Capacity confirmation must be atomic |
| Learner/member | minimum contact, enrolment/membership status | Distinct role and data purpose |
| Enrolment | program/cohort, terms version, price/payment, status | Enquiry is not enrolment |
| Membership plan | duration, access scope, freeze/cancel rules, price | Entitlement is explicit, not inferred from payment alone |
| Attendance | person, session, timestamp, method, correction history | Attendance is not proof of learning outcome |
| Progress/assessment | rubric/version, assessor, result, feedback | Sensitive learner data needs restricted access |
| Trainer/instructor | declared skills, availability, evidence status | Credentials are separately verified |
| Facility/resource | room, equipment, capacity, maintenance block | Resource conflict prevents double booking |

### Workflows

**Course enrolment:** `lead → application → eligibility_review → offer → accepted → payment_pending → enrolled → completed/withdrawn`. Cohort capacity is atomically reserved; waitlist promotion is deterministic.

**Class scheduling:** `draft → published → booking_open → full/waitlist → delivered/cancelled`. Cancellation triggers member notice only if a supported message event is sent.

**Fitness membership:** `quoted → payment/mandate_pending → active → frozen/cancelled/expired`. Access entitlement is derived from confirmed contract/payment state, not from profile selection.

**Attendance and progress:** append attendance events; corrections require reason and authorized reviewer. Learning progress and physical attendance remain distinct metrics.

### KPIs

- Course fill rate, completion, withdrawal and attendance.
- Learning outcome attainment only against a versioned rubric.
- Membership active/retention/churn, freezes and overdue payments.
- Class utilization = attendance / available capacity.
- Trainer utilization and revenue per available hour.
- Waitlist conversion and time to enrolment.
- Refund/complaint rate by program and cohort.

### Golden Business tests

- **GB-EDU-01:** cohort capacity cannot be exceeded under concurrent enrolments.
- **GB-EDU-02:** waitlist promotion reserves a seat exactly once.
- **GB-FIT-01:** expired/frozen membership does not grant access; payment retry does not duplicate entitlement.
- **GB-FIT-02:** cancelled class preserves attendance history and follows notification/refund policy.
- **GB-EDU-03:** attendance correction is attributable and original event remains visible to authorized reviewers.
- **GB-EDU-04:** non-accredited program is never labelled officially accredited by AI or template defaults.

---

## 6. `field_technical_service` — field service, installation and repair at customer sites

### Operating boundary

**Included:** technical installation, maintenance, inspection, repair and service visits performed at customer sites or remote locations.

**Not automatically included:** regulated electrical/gas work certification, medical-device servicing, industrial safety certification, emergency dispatch, remote control of customer equipment or IoT monitoring unless separately integrated and authorized.

### Core jobs

- Convert a request into a triaged service case and work order.
- Match technician skills, geography, time window, tools and parts.
- Plan travel and appointment windows.
- Capture diagnosis provided by qualified technician, work performed, parts consumed and customer acceptance.
- Manage quote/change approval, warranty and return visit.
- Reconcile actual labor, travel, parts and subcontractor costs.

### Master data

| Record | Minimum contract | Guardrail |
|---|---|---|
| Service case | customer/site, asset, issue, priority, source, status | Priority is operational routing, not emergency response guarantee |
| Customer asset | model/serial, location, owner, service history | Verify ownership/authorization before access |
| Work order | scope, skill requirement, time window, parts/tools, assigned technician | Request is not confirmed appointment |
| Technician profile | availability, declared skills, evidence status | Credential validation is separate |
| Service territory | coverage rule, travel estimate source, effective dates | No route/travel claim without source |
| Parts reservation | SKU, quantity/unit, work order, location | Reservation requires actual concurrency-safe hold |
| Field event | arrived, started, paused, completed, departed, source/time/location | Location capture is optional, purpose-limited and consent/policy-governed |
| Work report | findings, work performed, parts, labor, photos, customer acceptance | Technician notes are not independent regulatory certification |
| Warranty/return visit | original sale/service, eligibility, approval, schedule | Warranty entitlement comes from source terms and review |

### Workflows

**Intake and triage:** `received → classified → evidence_requested → quoted/approved → work_order_created`. Do not provide safety-critical troubleshooting instructions from unverified AI output.

**Scheduling/dispatch:** `unassigned → proposed → assigned → confirmed → en_route → on_site`. Skill, interval and parts checks are explicit. If no route engine exists, travel time remains operator estimate.

**Execution:** `started → diagnosis_recorded → approval_required/approved → work_performed → tested → customer_acceptance → completed`. Additional work outside approved scope requires a versioned change request.

**Closeout:** post parts and labor once, capture service report, warranty status and follow-up. Customer signature is captured only through an actual supported mechanism and with clear meaning.

### KPIs

- First-time fix rate = jobs completed without repeat visit / completed jobs.
- Mean time to respond and mean time to repair, with clock start/stop definitions.
- On-time arrival within confirmed window.
- Technician utilization = productive service time / available time.
- Parts fill rate and return-visit rate.
- Actual cost per work order and contribution margin.
- Warranty rework share and unresolved case ageing.

### Golden Business tests

- **GB-FIELD-01:** one technician cannot be assigned to overlapping confirmed jobs.
- **GB-FIELD-02:** missing part reservation shows risk and cannot be presented as guaranteed availability.
- **GB-FIELD-03:** work outside approved scope requires change approval before billable completion.
- **GB-FIELD-04:** duplicate offline completion cannot double-consume parts or double-bill labor.
- **GB-FIELD-05:** customer-site location and photos are accessible only for the work order's authorized purpose.
- **GB-FIELD-06:** credential-required job is blocked if the relevant evidence is expired/unverified.

---

## 7. `general_business` — controlled fallback for businesses without a certified vertical

### Purpose

This profile is a safe fallback, not a "universal ERP" that silently enables every feature. It supports the shared core for businesses whose operating pattern is not yet represented by a sufficiently specific, reviewed template.

### Included

- Common parties/customers/suppliers, products/services, quotes, sales, purchases, expenses and reports to the extent each shared capability is already available.
- Explicitly configured business name, currency, timezone, units, sales channels and basic operational preferences.
- Optional secondary profile only after the operator explicitly declares the additional activity and its workflow is separately configured.

### Not included by default

- Lot/expiry, fractional inventory, manufacturing, project costing, clinical records, bookings, payroll, route optimization, regulated goods, advanced finance or tax filing.
- Any feature marked planned/unavailable in the existing capability registry.
- Any inference of legal activity, SII giro, licence, professional qualification, employee status or permission.

### Configuration contract

- Required: legal/business identity data from verified onboarding flow; operating timezone and currency; chosen primary profile.
- Optional: declared sales channels, locations, products/services and user roles, subject to existing validation.
- Unknown remains unknown; no default to "compliant", "active", "enabled" or zero.
- Configuration only stores preferences; it does not grant access, create legal status, enable integrations or mutate production ledgers.
- When a business outgrows the fallback, onboarding may recommend a more specific template with a transparent impact preview. It must not migrate data or change permissions without explicit approval and a tested migration plan.

### KPIs

Only common-core KPIs with complete source coverage may be shown. Suppress vertical KPIs that lack required source data. Label incomplete margin, stock cover, cashflow or productivity as incomplete rather than inventing estimates.

### Golden Business tests

- **GB-GEN-01:** fallback profile does not expose planned capability controls as operational.
- **GB-GEN-02:** unknown tax activity stays unknown; no SII giro is inferred.
- **GB-GEN-03:** switching to a specialist profile creates a preview and requires approval; it does not mutate historical records.
- **GB-GEN-04:** user cannot grant themselves owner/admin permissions through profile selection.
- **GB-GEN-05:** dashboard hides or labels KPIs when source coverage is incomplete.

---

## 8. Cross-profile capability dependencies and architecture candidates

| Capability | Books/electronics | Beauty | Vet/pet | Lodging/tourism | Education/fitness | Field service | General |
|---|---|---|---|---|---|---|---|
| Atomic interval/resource booking | Medium | Critical | Critical | Critical | Critical | Critical | Not by default |
| Typed capacity ledger | Medium | High | High | Critical | Critical | High | Not by default |
| Restricted data scopes | High | Medium | Critical | High | High | High | Critical baseline |
| Serialized item identity | Critical | Medium | Medium | Low | Low | High | Optional |
| Contract/policy snapshots | High | High | Critical | Critical | Critical | High | Core |
| Append-only service events | High | High | Critical | High | High | Critical | Core |
| Offline capture/retry | Medium | Medium | Medium | Medium | Medium | Critical | Core baseline |
| Notification event/outbox | High | Critical | High | Critical | Critical | Critical | Shared |
| Entitlement/credit ledger | Medium | Critical | Medium | High | Critical | Medium | Optional |
| Evidence and consent registry | High | Critical | Critical | Critical | Critical | Critical | Core baseline |

### Architecture candidates (not claims of existing implementation)

1. **Typed resource scheduling:** resource type, capacity unit, interval, buffer, hold expiry, conflict policy, timezone and atomic confirmation. Room-night, provider interval, class seat and technician assignment must retain different semantics.
2. **Versioned commercial terms:** quote, rate plan, cancellation policy, warranty, membership and contract snapshots with effective dates and acceptance evidence.
3. **Restricted domain records:** clinical, learner, identity, location and incident data require explicit scopes and access tests, not just UI hiding.
4. **Append-only operational events:** appointment, check-in, attendance, service, handover, warranty, refund and delivery events carry actor, timestamp, source and idempotency.
5. **Notification outbox:** only claim SMS/email/push/WhatsApp notification after provider acceptance and persisted delivery status; retry is idempotent.
6. **Entitlement/credit ledger:** prepaid packages, memberships, deposits and class credits require their own immutable balance semantics and financial reconciliation.
7. **Evidence registry:** purpose, scope, source, owner, review status, retention and provenance; do not use generic file upload as proof of legal compliance.
8. **Privacy and retention policy:** minimize collection, purpose-bound access, access audit, export/deletion workflow and retention schedule. The implementation must be reviewed against Chile's applicable data protection law and effective dates.

Before proposing tables/RPCs, map these candidates to the existing Nüva One schema and services. Avoid shadow customer, payment, calendar, inventory or accounting ledgers.

---

## 9. Chile-specific regulatory and evidence boundaries

This is an engineering evidence checklist, not legal advice. Applicability depends on actual service, facility, products, customer type, contract, personal data and current regulation.

- Keep SII giro, tax treatment, DTE, invoices/receipts and consumer-facing price rules separate from operational profile selection.
- Retail warranty, withdrawal, returns and promotions require product/transaction-specific review against current Chilean consumer law. Do not hardcode one universal outcome.
- Veterinary/animal services require separate review of professional authorization, clinical records, medicine handling and applicable animal-health obligations. A template does not certify a veterinarian or facility.
- Lodging/tourism requires activity-specific review of registration/classification, consumer terms, safety, guest data and any applicable tourism/municipal obligations. Do not claim official tourism registration without evidence.
- Education/fitness must distinguish private course completion from state-recognized accreditation; health/fitness data and minors' data require additional access and retention review.
- Beauty/wellness must distinguish non-clinical services from medical/invasive treatments and block clinical claims until qualified legal/health review.
- Field technical service must separately evidence any regulated trade qualification, permit, insurance or safety procedure required for the actual job.
- Personal data processing (including patient, student, guest, employee, customer, image, signature and location data) must be purpose-limited, minimized, access-controlled and retained/deleted under reviewed policy. Record source, legal basis/consent where relevant and reviewer.
- Never present a checklist, uploaded certificate or AI-generated summary as proof that the business complies with all law.

For each regulatory assertion keep official source URL, retrieval date, version/effective date, applicable activity, reviewer, decision, evidence artifact and next review date.

---

## 10. Certification exit gates

A profile/subtype may move through `designed → pilot → certified` only under a versioned evidence record. Require:

- [ ] Existing profile ID and explicit subtype reviewed; no duplicate profile catalogue.
- [ ] Every advertised workflow maps to a real shared service/schema/RPC or is marked unavailable.
- [ ] Tenant isolation and role/permission denial tests cover clinical, learner, guest, identity, location and financial data.
- [ ] Atomic booking/resource capacity and concurrency tests pass.
- [ ] Payment, deposit, credit, refund and entitlement ledgers reconcile and are idempotent.
- [ ] Policy/contract snapshots remain immutable after acceptance.
- [ ] Decimal quantities, serialized items and unit conversions preserve precision and identity end-to-end.
- [ ] Cancellation, no-show, reschedule, waitlist, dispute, return and correction paths are tested.
- [ ] Offline/reconnect and notification retry paths cannot duplicate effects.
- [ ] Mobile/desktop UX, accessibility and device failure states are tested.
- [ ] Data minimization, retention, export, deletion and access audit are reviewed.
- [ ] Regulatory and professional claims are reviewed by qualified humans.
- [ ] Golden Business scenarios pass with isolated synthetic tenants.
- [ ] Product, engineering and security reviewers sign evidence; rollback and support runbooks are rehearsed.

## 11. Catalogue coverage after waves 1–4

| Wave / existing profile group | IDs | Count | Evidence state |
|---|---|---:|---|
| P0 archetypes | `hardware_store`, `neighborhood_grocery`, `wholesale_distribution` | 3 | P0 operating specs / certification contracts in earlier PRs |
| Wave 1 contracts | `apparel_footwear`, `auto_repair_parts`, `restaurant_cafe`, `professional_services` | 4 | P1 operating specs in earlier PRs |
| Wave 2 fresh food | `beverage_store`, `produce_market`, `butcher_fishmonger`, `bakery_pastry` | 4 | Detailed operating contracts in PR #340 |
| Wave 3 production/field | `manufacturing_workshop`, `agriculture_agroinputs`, `transport_logistics`, `construction_contractor`, `equipment_rental` | 5 | Detailed operating contracts in PR #341 |
| Wave 4 services/customer ops | `books_stationery_electronics`, `beauty_wellness`, `veterinary_pet`, `lodging_tourism`, `education_fitness`, `field_technical_service`, `general_business` | 7 | This specification |
| **Total existing catalogue** |  | **23** | **Design coverage, not implementation certification** |

**Decision:** all seven profiles in this wave remain at design/specification status. No application code, schema, migration, RLS, permissions, readiness registry, plan entitlement, production data or deployment is changed.
