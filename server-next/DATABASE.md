# Database — Six Stars Academy

PostgreSQL + Prisma ORM. Schema lives at `prisma/schema.prisma`. This doc explains **what each table is for and how they connect**, plus the business logic that isn't obvious just from reading the schema — written so a new developer (or an AI assistant) can get oriented fast on a fresh machine.

## Setup on a new machine

```bash
cd server-next
npm install
# fill .env — copy from .env.example, needs at minimum:
#   DATABASE_URL, JWT_SECRET, CLOUDINARY_*, RINTISAN_* (payment gateway)
npx prisma migrate dev     # applies all migrations, generates Prisma Client
node prisma/seed.js        # optional: seeds demo data (admin user, packages, branches, schedules, CMS content)
npm run dev                # starts on PORT (default 3002)
```

`server-next/keys/` needs two PEM files for the Rintisan payment gateway (gitignored, not part of migrations):
- `rintisan_private.pem` — our own key, signs outgoing requests to Rintisan.
- `rintisan_public.pem` — Rintisan's public key, verifies incoming webhook callbacks.

## Enums vs plain strings

Only `User.role` is a real Prisma `enum` (`admin | head_coach | coach | parent`). Every other "status"-like field (`Payment.status`, `Attendance.status`, `Student.status`, `Event.status`, etc.) is a plain `String` column — validated only in application code, not by the database. The accepted values for each are listed below since Postgres won't enforce them.

---

## Core identity & org structure

### `User` (`users`)
Every login (admin, head_coach, coach, parent) is one row here. `role` decides what the frontend/backend let them do (see `middleware/auth.js` → `authorize(...role)`).
- `branchId` — which branch a coach/head_coach/admin is assigned to. **Admin-controlled only**: coaches cannot change their own branch (`PUT /auth/me` silently drops `branchId` for coach/head_coach roles; the coach/head-coach profile pages show it read-only).
- A parent's `User` row has no `branchId` — the *student's* branch is what matters for a parent.

### `Branch` (`branches`)
A physical academy location (e.g. "Jakarta"/JKT, "BSD"/BSD). `registrationFee` is a **per-branch override** of the default registration fee (falls back to the global `CmsContent` "settings" section's `registrationFee`, or a hardcoded `750000`, if unset — see `getRegistrationFee()` in `routes/auth.js`).

### `Field` (`fields`)
A specific pitch/court at a branch, used when logging `TrainingSession`s.

---

## Students, packages, and pricing

### `Student` (`students`)
The child/player. Belongs to a parent `User` (`userId`) and optionally a `Branch`.
- `packageId` / `packageStartDate` / `packageEndDate` — the student's currently active training package and its date window. **Access is calendar-based, not count-based**: once `packageEndDate` passes, the parent's dashboard access is restricted (see "Payment gating" below) regardless of how many sessions they actually attended.
- `totalSessions` / `sessionsUsed` — a **separate, count-based quota** layered on top of the date window (added for internal tracking / rapor reporting). `totalSessions = package.durationMonths * package.sessionsPerWeek * 4` (assumes 4 weeks/month), set on registration and reset (`sessionsUsed = 0`, `totalSessions` recalculated) on every successful package renewal. `sessionsUsed` increments by 1 whenever a **new** `Attendance` row is created for that student — regardless of status (`hadir`/`izin`/`sakit`/`alfa` all consume a session; only `alfa` doesn't get the student marked present). See `upsertAttendanceAndConsumeSession()` in `routes/attendance.js`.
- `status`: `'active'` | others used ad hoc (e.g. set to `'active'` again on renewal).

### `Package` (`packages`)
A training plan: `durationMonths` × `sessionsPerWeek` × `price`. No admin UI to create/edit these beyond price adjustments — they're seeded once (`prisma/seed.js`) as the 1/3/6-month × 1x/2x-per-week combinations.

### `BranchPackage` (`branch_packages`)
Per-branch price override for a specific `Package` (unique on `[branchId, packageId]`). If a branch has no row for a package, the registration page falls back to `Package.price`. **Note**: `Branch.registrationFee` is a *separate* field from anything in `BranchPackage` — don't confuse "registration fee per branch" (on `Branch`) with "package price per branch" (in this join table).

---

## Payments (Rintisan gateway)

The payment gateway is **Rintisan** (Indonesian aggregator: QRIS, VA Mandiri/BNI/BRI, Tokopedia/Blibli), integrated in `lib/rintisan.js` (low-level signed HTTP client) + `lib/paymentHelpers.js` (business logic). See `lib/rintisan.js` for the RSA-signature scheme (`RINTISAN_*` env vars + the two PEM keys above).

### `Payment` (`payments`)
One row per billable event: `paymentType` is `'registration'` | `'renewal'` | `'event'`. `status` is `'pending'` | `'success'` | `'failed'`.
- `transactionId`/`paymentLink`/`qrString` — filled in after `createBilling()` succeeds against Rintisan.
- `callbackPayload` — raw JSON from Rintisan's webhook, stored for audit.
- Renewal and event payments are created directly against an **existing** `Student` (`POST /payments/renewal`, `POST /payments/event`). Registration payments are **not** created directly — see `PendingRegistration` below.
- `applyPaymentSuccess()` / `applyPaymentFailed()` in `lib/paymentHelpers.js` are the only place side effects happen: renewal extends `packageEndDate` + resets the session quota; event marks `EventParticipant.paymentStatus = 'paid'`; both send a notification.
- ⚠️ **Known gap**: the admin manual override (`PUT /payments/:id`) sets `status` directly and does **not** call `applyPaymentSuccess`/`applyPaymentFailed` — so manually marking a payment "success" in the admin panel skips the renewal/event side effects. Only the real Rintisan webhook triggers those.

### `PendingRegistration` (`pending_registrations`)
**A new student's account does not exist until their first payment succeeds.** When someone fills out the public registration wizard (`POST /auth/register`), this table stores all their wizard data (name, DOB, parent info, hashed password, chosen package, computed amounts, promo code) plus the Rintisan billing link — keyed by this row's own `id` (used as Rintisan's `partner_trx_id`). No `User`/`Student`/`Payment` row exists yet.
- `status`: `'pending'` | `'success'` | `'failed'`.
- The registration wizard's result screen polls `GET /auth/pending-registration/:id` (public) every 5s to know when to show "berhasil, silakan login".
- When Rintisan's webhook (`POST /payments/rintisan/callback`) reports success for this id, `convertPendingRegistration()` in `lib/paymentHelpers.js` runs — **this is the only place a parent `User` + `Student` + `StudentCard` + the first `Payment` (status already `'success'`) get created**, inside one transaction. It also applies the promo code (increments `PromoCode.usedCount`, creates `PromoCodeUsage`) at this point, not at wizard-submission time.
- `studentId` gets backfilled once conversion succeeds (traceability only — the real relations live on `Student`/`Payment`, not here).
- If the webhook reports failure, `failPendingRegistration()` just marks `status: 'failed'` + `failReason`; nothing else is created.

### `PromoCode` / `PromoCodePackage` / `PromoCodeUsage`
Discount codes. `allPackages: true` applies to every package; otherwise restricted to the packages listed in `PromoCodePackage`. `usedCount` vs `maxUses` gates redemption. **Only incremented once payment actually succeeds** (registration: at `convertPendingRegistration` time; other flows: wherever the promo is validated at payment time — check the specific route before assuming it's reserved earlier).

---

## Payment gating (dashboard access)

`GET /auth/me` computes an `access: 'full' | 'payment-only'` field for `role: 'parent'` users only:
- `'payment-only'` if the parent's (oldest) student has any `Payment` with `status: 'pending'`, OR `student.packageEndDate` has passed.
- Enforced in the frontend by `web-next/components/DashboardShell.jsx` — redirects to `/dashboard/pembayaran` on every route change while `access === 'payment-only'`.
- ⚠️ **Not enforced at the API level** — a payment-only parent's browser is redirected client-side, but direct API calls to attendance/reports/events/etc. endpoints are not blocked server-side. This is a known gap, not (yet) closed.
- Since new registrations don't get a `User` until payment succeeds, `payment-only` in practice now mainly matters for **renewal** (an existing paid parent whose package has expired).

---

## Attendance & rapor (report cards)

### `Attendance` (`attendances`)
One row per student per calendar day (`@@unique([studentId, date])`) — upserted, not appended. `status` is a free-text string: `'hadir'` | `'izin'` | `'sakit'` | `'alfa'`. `method`: `'manual'` (coach bulk-marks a day) or `'qr_scan'` (coach scans the student's `StudentCard` QR at check-in). Every new (not edited) row for a student increments `Student.sessionsUsed` — see the `Student` section above.

### `Assessment` (`assessments`)
Head coach's monthly skill scoring for a student (`@@unique([studentId, month, year])`). Four categories — Teknik, Taktik (Attacking + Defending), Fisik, Mental — each an `Int?` 0–10 per sub-skill plus a computed `*Avg Float?`, and an `overallAvg`. Field names/groupings are mirrored in `lib/assessmentFields.js` (`ASSESSMENT_CATEGORIES`) which both the scoring UI and the PDF generator read from — add a new skill field in **both** places if you ever extend this.

### `Report` (`reports`)
One row per student per month (`@@unique` is implicit via `findFirst` lookups by `studentId+month+year`, not a DB constraint). `pdfUrl` points at the generated PDF (served from `server-next/uploads/rapor/`, filename `{student.studentId}-{year}-{month}.pdf`). Generated by `POST /reports/generate` (head_coach/admin only) via `lib/generateReportPdf.js`, which renders: header + logo, student profile + photo, **attendance summary for that month** (hadir/izin/sakit/alfa/total, queried fresh from `Attendance` at generation time — not stored on `Report` itself), the four assessment tables, and the OVR summary box.

---

## Events

### `Event` (`events`) / `EventParticipant` (`event_participants`)
A one-off event (tournament, friendly match, etc.) created by a head_coach/admin, with a `fee` (Int, `@default(0)`). Students are added as `EventParticipant`s (`status`: `'recommended'` etc., `paymentStatus`: `'unpaid'`/`'paid'`).
- Event payments (`POST /payments/event`) always derive `Payment.amount`/`totalAmount` from `event.fee` server-side — the client never supplies (and the backend never trusts) a client-sent amount for event fees. This is intentionally locked down.

---

## Scheduling

### `Schedule` (`schedules`)
Age-group-based recurring training schedule (day/time/location/coach/branch), managed by admin (`web-next/app/admin/jadwal`). Requires `authenticate` to read — **not public**.

### `TrainingSession` (`training_sessions`)
A coach's log of what was actually covered in a session (topic/objective/equipment), not the schedule itself.

### `StaffAttendance` (`staff_attendances`)
Coach/staff self-check-in (selfie + geolocation), separate from student `Attendance`. Needs `verifyStatus` approval (`'pending'` → `'approved'`/`'rejected'`) by an admin.

---

## CMS content (admin-editable marketing content)

### `CmsContent` (`cms_contents`)
Generic "one JSON blob per `section` string" table — no FK to anything, `content: Json?` shape is whatever that section's admin editor + frontend consumer agree on. Read via `GET /cms/public` (all sections) or `GET /cms/public/:section` (one), written via `PUT /cms/:section` (admin-only). All admin editors for list-shaped sections reuse `web-next/components/cms/ListSectionEditor.jsx`.

Known sections in use:
| section | shape | consumed by |
|---|---|---|
| `settings` | `{ registrationFee, ssbName, ssbAddress, ssbPhone, ssbEmail, ... }` | registration fee fallback, rapor header |
| `quickStats` | list | landing page stats |
| `programs` | list of `{ title, desc }` | `/program` |
| `schedulePreview` | list of `{ branch (free text), ageGroup, day, time, location, mapsUrl }` | `/jadwal` (marketing page — **not** linked to real `Branch`/`Schedule` records) |
| `gallery` | list | `/galeri` |
| `sponsors` | list of strings | `/sponsor` |
| `benefits` | list of strings | registration wizard step 3 ("Manfaat yang Kamu Dapatkan") |
| `packageInfo` | list of `{ durationMonths, description }` | registration wizard step 3 (per-duration blurb) |
| `registrationSchedule` | list of `{ branchCode, day, time, location }` | registration wizard step 3 ("Jadwal Latihan di Cabang Ini"), **does** use real `Branch.code` |

Note `schedulePreview` (marketing `/jadwal` page) and `registrationSchedule` (registration wizard) are two separate sections with different shapes — don't conflate them.

### `StudentCard` (`student_cards`)
One per student, holds the `qrCode` used for attendance check-in scans and `cardNumber` (mirrors `Student.studentId`).

### `PasswordReset` (`password_resets`)
Token-based password reset flow, `status: 'pending'` → consumed.

### `Notification` (`notifications`)
In-app notifications per `User`, `link` points at the relevant frontend page, `read: Boolean`.

---

## Quick reference: who creates a `Payment` row and when

| Flow | Route | Creates Payment? | Notes |
|---|---|---|---|
| New registration | `POST /auth/register` | No — creates `PendingRegistration` | `Payment` only created (status `'success'`) inside `convertPendingRegistration()` after webhook confirms |
| Package renewal | `POST /payments/renewal` | Yes, `status: 'pending'` | Existing `Student` required |
| Event fee | `POST /payments/event` | Yes, `status: 'pending'` | `amount` always = `Event.fee`, never client-supplied |
| Admin manual override | `PUT /payments/:id` | No (updates existing) | Does **not** trigger renewal/event side effects — see gap noted above |
| Rintisan webhook | `POST /payments/rintisan/callback` | Depends | Looks up `partner_trx_id` in `Payment` first, then `PendingRegistration` if not found |
