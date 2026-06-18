# BugBuster Pro — Service Management Module

A mobile-friendly **static web app** for a pest-control company: customers book and track pest-control services and leave feedback; technicians file on-site service reports; coordinators/managers confirm bookings, assign technicians, manage chemical inventory, and review analytics. Built as the design + implementation deliverable for a Systems Analysis & Design course, grounded in **Kendall & Kendall, *Systems Analysis and Design*, 10th ed.**

- **No framework, no build step.** Pure HTML / CSS / vanilla JS.
- **Deploys to Vercel** zero-config.
- **State:** `localStorage` is the source of truth; a thin **Firebase Realtime Database** layer mirrors it so a customer's phone and the admin laptop stay in sync. **Works fully offline on localStorage** if Firebase isn't configured.

---

## 1. Quick start (local)

The app uses `localStorage` and module-less scripts, so serve it over HTTP (don't open via `file://`, which some browsers sandbox):

```bash
# from the project folder
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL. Demo data (services, technicians, inventory, and 3 sample bookings — one already Completed) is seeded automatically on first load.

- **Customer site:** `/` → `index.html`
- **Staff console:** `/admin/login.html` — sign in with **`admin` / `bugbuster`** (demo-grade auth, see §6).
- A seeded booking you can track right away: **`BK-2026-0001-1`** (open *Track*, paste the ID).

---

## 2. File map

```
bugbuster/
  index.html          Landing (hero, featured services, how-it-works)
  services.html       Service catalog (sort)
  book.html           Booking form (services + property + schedule + options)
  checkout.html       Confirm + simulated payment (Luhn card check)
  track.html          Live activity tracking + leave feedback
  feedback.html       All customer feedback + rating summary
  admin/
    login.html        Demo-grade staff login (sets bb_admin_auth)
    index.html        Dispatch console — auth-gated in <head>
  js/
    data.js           Seed catalog: services, options, technicians, inventory/BOM, feedback
    storage.js        Stable method surface: all state + business logic + Luhn + audit + analytics
    firebase-sync.js  RTDB cross-device sync (graceful localStorage-only fallback)
    validation.js     Input-validation engine (named K&K Ch.15 tests)
    main.js           Customer interactions
    admin.js          Dispatch console (7 views)
  css/
    style.css         Customer theme (light "field-ops")
    admin.css         Admin theme (dark "control room")
  vercel.json         Clean URLs + security headers (/admin → noindex, no-store)
  firebase-rules.json RTDB security rules
  SCOPE.md            Scope, assumptions, ERD, 3NF normalization, integrity constraints
  README.md           This file
  TESTING.md          Quality approach + test plan + cases + acceptance criteria
```

All data flows through `js/storage.js`. The UI never touches `localStorage` directly, so the backend could later be swapped (e.g. Supabase/Postgres + REST) without changing any page.

---

## 3. Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket) **or** run `vercel` from the folder with the CLI.
2. In Vercel: **New Project → Import** the repo.
3. **Framework Preset:** `Other`. **Root Directory:** `./`. **Build Command:** *(leave empty)*. **Output Directory:** *(leave empty)*.
4. Deploy. `vercel.json` applies clean URLs and security headers automatically; `/admin/*` is served `noindex, nofollow` + `no-store`.

The app is fully functional at this point on localStorage. Add Firebase (next) only if you want cross-device sync for your demo/video.

---

## 4. Firebase Realtime Database (optional — enables cross-device sync)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. **Build → Realtime Database → Create Database** (start in *test mode* for the demo).
3. **Project settings → General → Your apps → Web app** → copy the `firebaseConfig` object.
4. Paste it into `js/firebase-sync.js`, replacing the blank `FIREBASE_CONFIG` (fill at least `apiKey` and `databaseURL`).
5. **Realtime Database → Rules** → paste the contents of `firebase-rules.json` → **Publish**.
6. Redeploy. Open the customer site on a phone and the admin console on a laptop — a booking created on one appears on the other within a second (the console pill flips to **● live sync**).

> If the config stays blank, the app simply runs in localStorage-only mode — no errors.

---

## 5. Demo scenario (end-to-end — also your walkthrough-video script)

1. **Customer books** (`book.html`): add *General Pest Control*, fill details, pick a date/slot, toggle eco-friendly, **Continue → pay** with a Luhn-valid test card `4242 4242 4242 4242`. You get a booking ID like `BK-2026-00xx-c`.
2. **Customer tracks** (`track.html?id=…`): status shows **Requested**.
3. **Coordinator** (`admin/login.html` → *Bookings*): **Confirm** the booking → **Schedule**: assign a technician (try assigning two bookings to the same technician in the same slot — the second is **blocked**).
4. **Technician** (*Reports*): **Start service**, then **File report** — pick pests, confirm chemicals (pre-filled from the service BOM), area, outcome → submit. **Inventory** decrements; the booking flips to **Completed**.
5. **Customer** refreshes *Track*: full timeline + technician + service report appear; now **leave feedback** (stars + comment).
6. **Feedback page** + admin **Analytics** (bookings over time, top services, status mix, **CSV export**) reflect the new data live.

---

## 6. Security notes

- **Demo-grade auth.** `/admin` is gated by a `localStorage` flag (`bb_admin_auth`) set by `admin/login.html` (`admin`/`bugbuster`), redirect-before-render in `<head>` so protected UI never flashes. This is **not** a real identity system and is labelled as such in-app. Production: add Firebase Auth + per-role rules.
- **Headers.** `vercel.json` sets `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, a restrictive `Permissions-Policy`, and `/admin/* → X-Robots-Tag: noindex` + `Cache-Control: no-store`.
- **Input sanitization.** All user text is HTML-escaped on render (`esc()`); `validation.js` rejects malformed input before it is persisted.
- **RTDB rules.** `firebase-rules.json` whitelists writes to `bb_*` keys only. **Known prototype trade-off:** with no Firebase Auth, `store/*` is publicly readable to allow open tracking/sync; harden with Auth before any real customer data.

---

## 7. Design rationale → Kendall & Kendall

| Exam area | Delivered in | Chapter | One-line justification |
|---|---|---|---|
| **Database / ERD** | `SCOPE.md` ERD + `data.js` + `storage.js` | **Ch. 13** | 11 entities with PK/FK; every M:N (`BOOKING_SERVICE`, `SERVICE_BOM`, `REPORT_CHEMICAL`) resolved via an associative entity; normalized to 3NF (UNF→1NF→2NF→3NF shown); entity/referential/domain integrity stated. |
| **Input** | `book.html`, `checkout.html`, admin report form + `main.js`/`admin.js` | **Ch. 12 (+15)** | Forms are easy to complete, purposeful, and controlled; GUI controls (dropdowns, radio cards, date picker, numeric) minimize keying for effective/efficient data capture. |
| **Output** | `track.html` timeline, confirmation, toasts, `feedback.html`, admin dashboards | **Ch. 11** | Each output serves a purpose, fits the user, in the right quantity/place/time/method; the feedback summary avoids output bias (every review ties to a Completed service — no cherry-picking). |
| **Control mechanisms** | `validation.js` + audit ledger + `/admin` gate + headers | **Ch. 15 (+16)** | Every key field guarded by a named test (missing data, length, class/composition, range/reasonableness, invalid values, cross-reference, comparison with stored data); **Luhn check digit** on the booking ID and the simulated card; timestamped audit trail; access control. |
| **Quality management** | `TESTING.md` + this README | **Ch. 16** | TQM/Six Sigma mindset and structured walkthroughs; unit/integration/system testing with concrete cases and measurable acceptance criteria; maintenance, auditing, and documentation. |
| **Scope / architecture** | `SCOPE.md` | **Part I** | Purpose, four actors, in/out of scope, numbered assumptions, and the static + RTDB + Vercel architecture. |

---

## 8. Assumptions (full list in `SCOPE.md`)

Single region set (Yogyakarta area), IDR, four daily time slots · demo-grade auth · a booking may hold multiple services · one appointment + one technician in the common case · each completed appointment → exactly one report; ≤ one feedback per completed service · fixed status set `Requested → Confirmed → Technician Assigned → In Progress → Completed` (+ `Cancelled`) · i18n partial (bilingual service names; full toggle omitted as a scoping decision) · customer data treated as protected. Each is tagged `[ASSUMPTION]` in `SCOPE.md`.

---

## 9. Known limitations

Simulated payment (no gateway) · demo-grade auth · no route optimisation/procurement/payroll · RTDB open-read in prototype posture · single-currency/region. These are deliberate scope cuts for a course prototype, not oversights.
