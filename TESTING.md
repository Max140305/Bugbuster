# Quality Assurance & Test Plan — BugBuster Pro
*Applies Kendall & Kendall, Systems Analysis and Design, 10th ed., Ch. 16.*

## 1. Quality approach
Quality is built in, not inspected in. The module follows a **TQM** mindset (every contributor owns the quality of their part) with a **Six Sigma**-style focus on defect prevention in the data layer — the place where bad records do the most downstream damage. The two highest-risk defect classes are (a) **invalid data entering the system** and (b) **inconsistent state across devices**; both are addressed at the source: a single validation engine and a single storage method surface.

**Ownership.** Analyst/developer owns design + program testing; a coordinator (domain user) owns acceptance testing of the booking/assignment/report flows; the manager owns sign-off against the acceptance criteria in §4.

**Structured walkthroughs.** This module would be reviewed in three walkthroughs: (1) a **data/ERD walkthrough** of `SCOPE.md` (keys, M:N resolution, 3NF, integrity); (2) an **input/control walkthrough** of `validation.js` against the field list (one named test per field) and the Luhn check digit; (3) an **output walkthrough** of the tracking timeline, dashboards, and the feedback summary for output bias. Reviewers are a peer developer, the coordinator (domain expert), and the manager.

## 2. Testing process
- **Program / unit testing with test data.** Each `storage.js` method is exercised with valid, boundary, and invalid **test data** (e.g. area size `0`, `-5`, `1`, `100000`; phone with letters; a tampered booking ID). Validation rules are unit-checked one field at a time.
- **Link / integration testing.** Flows that cross modules: booking (input) → storage → tracking (output); assignment → appointment → report → inventory; customer write → RTDB → admin re-render.
- **Full-system testing.** The end-to-end demo scenario in `README.md §5`, run on two devices with Firebase enabled, plus the localStorage-only fallback path.
- **Automated smoke test.** A Node harness loads `data.js` + `storage.js` + `validation.js` and asserts **29 checks** across seed, Luhn, validation, booking lifecycle, double-booking, inventory decrement, feedback rules, audit, and foreign-key integrity. All pass. (Re-run logic: see the cases below — these mirror the harness.)

## 3. Test cases (critical functions)

| # | Function (K&K area) | Steps | Expected result |
|---|---|---|---|
| **T1** | Create booking — valid (Input, Ch.12/15) | Book *General Pest Control*, valid name/email/phone, area `90`, future date, pay with `4242 4242 4242 4242` | Booking created with a `BK-2026-####-c` ID; status **Requested**; appears in admin *Bookings*. |
| **T2** | Validation rejects bad input (Control, Ch.15) | On `book.html` submit with: empty name, `nope` email, `abc` phone, area `-5`, past date, no service | Submit blocked; each field shows a specific inline error; nothing persisted. |
| **T3** | Check digit (Control, Ch.15) | On *Track*, enter `BK-2026-0001-0` (wrong last digit), then the correct `BK-2026-0001-1` | First is rejected by the Luhn check before any lookup; second resolves and renders the timeline. |
| **T4** | Assign technician without clash (back office) | Confirm two bookings on the **same date + same time slot**; assign both to the **same technician** | First assignment succeeds (status → *Technician Assigned*, appointment created); second is **blocked** with a "already booked" message. |
| **T5** | File report → inventory decrement (Input + integrity) | Start service on an assigned booking; file a report with BOM-suggested chemicals (e.g. Fipronil 2.0 L) | Report saved; matching inventory item decremented by exactly the quantity used; booking → **Completed**; a second report on the same appointment is blocked. |
| **T6** | Feedback rules + cross-device sync (Output) | Submit feedback on the Completed booking; submit again; submit on a non-Completed booking. Then, with Firebase on, create a booking on device A | Feedback accepted once (1–5 stars); duplicate blocked; non-Completed blocked. Device A's booking appears on device B and on `feedback.html`/admin **Analytics** without reload. |

## 4. Acceptance criteria (measurable)
- Validation **rejects 100%** of malformed bookings tested (T2 set); no malformed record is ever persisted.
- Every Completed appointment maps to **exactly one** service report (T5); duplicates rejected.
- **No orphaned foreign keys:** every appointment references an existing booking; every report references an existing appointment (asserted by the smoke test).
- A technician is **never double-booked** for the same date + slot (T4).
- At least **one check-digit** field (booking ID, and the simulated card) validates correctly (T3).
- With Firebase configured, state **converges across devices** within ~1 s; with it blank, the app runs without error on localStorage.
- `/admin` is unreachable without the auth flag and is served `noindex` + `no-store`.

## 5. Maintenance, auditing & documentation
- **Auditing.** Every create/confirm/cancel/assign/report/inventory/feedback action writes a timestamped entry to the **audit ledger** (`bb_ledger`, surfaced in the dashboard activity feed) recording actor, entity, and detail.
- **Maintenance.** Because all logic sits behind the `storage.js` method surface, corrective/adaptive/perfective changes are localized; the UI is insulated from backend changes. Service catalog, technicians, inventory, and BOM are data-driven in `data.js`.
- **Documentation (procedure manual / FOLKLORE).** `README.md` is the procedure manual (run, deploy, Firebase setup, demo script); `SCOPE.md` documents the data model and assumptions; inline header comments in each JS file capture the **folklore** (e.g. the RTDB array-coercion fix, the Luhn scheme, the demo-grade-auth caveat) so the next maintainer inherits the reasoning, not just the code.
