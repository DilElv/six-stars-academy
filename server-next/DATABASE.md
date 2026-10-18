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
One row per billable event: `paymentType` is `'registration'` | `'renewal'` | `'event'` | `'cart'`. `status` is `'pending'` | `'success'` | `'failed'`.
- `transactionId`/`paymentLink`/`qrString` — filled in after `createBilling()` succeeds against Rintisan.
- `callbackPayload` — raw JSON from Rintisan's webhook, stored for audit.
- `note` — free-text payment keterangan (`"Cash"`, `"Transfer Manual"`, `"Anak Berprestasi"`, ...). Set by the admin/head_coach "Tandai Lunas" flow and by the admin edit form; shown next to the row in Keuangan > Pemasukan.
- Event payments are created directly against an **existing** `Student` (`POST /payments/event`). Registration payments are **not** created directly — see `PendingRegistration` below.
- `POST /payments/renewal` is **disabled** (returns 400): package renewal now has a single write path — the cart (see `CartItem` below). It used to mint a second Payment for a period the admin may already have billed, which is exactly how duplicate transactions arose.
- `applyPaymentSuccess()` / `applyPaymentFailed()` in `lib/paymentHelpers.js` are the only place side effects happen: renewal extends `packageEndDate` + resets the session quota; event marks `EventParticipant.paymentStatus = 'paid'`; `cart` applies each item it carries (a `package` item extends the period, a catalog `merchandise` item decrements `Product.stock`; BPJS/manual items are just recorded as paid); all send a notification.
- No manual admin "verification" step exists anymore: a parent payment becomes `success` as soon as Rintisan reports it (webhook `POST /payments/rintisan/callback` or polling `GET /payments/:id/sync`, plus the background reconciler in `lib/paymentReconcile.js`), and admin/head_coach `POST /students/:id/renew` with `mode: 'paid'` records the payment as already paid. The admin override (`PUT /payments/:id`) is now only a correction tool, and it also calls `applyPaymentSuccess`/`applyPaymentFailed` so side effects stay consistent.

### `CartItem` (`cart_items`) — Tagihan & pembayaran gabungan
The cart table is the **single "tagihan" mechanism**: an unpaid line item lives here until someone pays it, and it is never counted as income while `status: 'open'`. One row per line for a student. `type` is `'package'` | `'bpjs'` | `'merchandise'`, and `category` is the income category shown in Keuangan > Pemasukan (`'Perpanjangan Paket'` | `'BPJS'` | `'Merchandise'`). `metadata` is a per-type JSON payload (`{ packageId, packageName, custom, note }` for `package`, `{ productId, ... , note }` for merchandise, `{ note }` for BPJS). BPJS lines also carry `periodMonth`/`periodYear` as real columns (not only in `metadata`) so the monthly auto-billing job can dedupe with an indexed query.

> **Release scope:** the parent-facing Keranjang/Toko screens are hidden for now (next release); the tagihan mechanism below stays active. Parents see and pay every open line — including ones placed by admin — from the **Perpanjang Paket** screen (`GET /cart/me` + `POST /cart/checkout`), not from a shopping-cart page.
- `paymentId` is `NULL` while the item is still unpaid (`status: 'open'`); on checkout (`POST /cart/checkout`) all of a student's open items are attached to one new `Payment` (`paymentType: 'cart'`, `totalAmount` = sum of the items) and flip to `status: 'checked_out'`.
- **One transaction, many categories:** `GET /ledger/pemasukan` expands a `cart` Payment into one ledger row per `CartItem` (`category` + `amount` + `note`), so revenue still splits by category even though it was paid together in a single checkout.
- **Anti-duplication:** one student may only have one `status: 'open'` `package` item (and one open BPJS item per period). `POST /cart` rejects a second one, and `POST /cart/checkout` refuses to check out two package items — so a period can never be billed twice.
- **Admin "Buat Tagihan":** `POST /students/:id/renew` with `mode: 'invoice'` (or `POST /cart` for other types) creates an open `CartItem` and notifies the parent. No `Payment`, no income, no package extension yet — the tagihan just appears in the parent's **Perpanjang Paket** screen (and as a "Tagihan Belum Dibayar" card on the parent dashboard) as **Belum Dibayar**. Still one tagihan per period: a second `POST /cart` package line is rejected while one is open *or* while a `pending` cart payment contains a package line.
- **Admin "Tandai Lunas" (cash / transfer pribadi):** `POST /cart/mark-paid` (admin/head_coach) creates one `Payment` for the selected open items, marks it `success`, applies the effects immediately and stores the officer, time and `note` in `PaymentAuditLog`/`Payment.note` — no "Menunggu Verifikasi" queue. If the paid set contains a package item, other pending cart checkouts for that student are cancelled so the same period cannot be paid twice.
- **CRUD:** admin/head_coach can edit an open item's label/amount/keterangan (`PATCH /cart/:id`) and delete it (`DELETE /cart/:id`); parents may delete items in their own cart (including ones the admin placed for them).
- `GET /cart/outstanding` (admin/head_coach, branch-scoped) lists every unpaid tagihan for the Keuangan "Tagihan Belum Dibayar" panel. Parents can cancel a still-`pending` cart payment (`DELETE /payments/:id`), which returns its items to `status: 'open'`.

### `Product` (`products`) — Katalog Merchandise
One row per merchandise item the club sells (jersey, aksesori, dll). `category` is free text with `'Jersey'` | `'Aksesori'` | `'Lainnya'` as defaults, and `imageUrl` points at the Cloudinary upload. `stock` is `NULL` for unlimited stock; otherwise it is decremented by one per unit sold (on cart payment success). `isActive` hides a product from the parent catalog without deleting it.
- `CartItem.productId` links a cart/order line back to the product it came from (`ON DELETE SET NULL`, so history survives). When a parent buys from the catalog, the line's `label`/`amount` are always taken from the product row (never from the client), and the item is rejected when it is inactive or out of stock.
- Managed by admin only (`GET /products/all`, `POST/PUT/DELETE /products`); the parent catalog reads the public `GET /products` (active products only). Deleting a product that has ever been in a cart deactivates it instead of removing the row.

### Billing BPJS otomatis
A single global BPJS premium (Pengaturan > BPJS: `bpjsEnabled`, `bpjsAmount`, `bpjsDay`, stored in the CMS `settings` blob) is billed to every student whose `status` is not `'inactive'` (i.e. `active` + `needs_renewal`). `lib/bpjsBilling.js` owns this:
- `runBpjsBilling()` adds one `CartItem` (`type: 'bpjs'`, `category: 'BPJS'`, label `BPJS <Bulan> <Tahun>`) per eligible student for the period and notifies the parent. It is idempotent — a student who already has a BPJS line for that period is skipped — so a manual admin BPJS addition and the job never double-bill the same month.
- `startBpjsBilling()` runs at startup and then hourly; it only acts on/after `bpjsDay` and only when the feature is enabled with an amount > 0. Because the insert is idempotent, a student enrolled mid-month still gets billed on the next sweep.
- Admin endpoints: `GET /settings/bpjs/status` (eligible vs. billed counts for a period) and `POST /settings/bpjs/run` (`{ month?, year?, amount?, studentIds? }`) — the latter backs Pengaturan's "Tagih Sekarang" button.

### Audit Pembayaran (`payment_audit_logs`)
`lib/paymentAudit.js` powers the admin Audit page (`GET /payments/audit`, `POST /payments/audit/:id/sync`). It does two things:
- **Anomaly detection** (`detectPaymentAnomalies`) over payments from the last N days *plus* any still-`pending` row: a `pending` older than 24 h (`stuck_pending`), a `success` with no `effectsAppliedAt` on a renewal/event/cart (`success_no_effects`), a `cart` payment whose `totalAmount` ≠ the sum of its `CartItem.amount` (`cart_total_mismatch`), a pending row with no `transactionId` (`missing_gateway_ref`), and duplicate pending rows for the same student/type/amount (`duplicate_pending`).
- **Change trail** — one `PaymentAuditLog` row per notable action: admin `edit`/`delete`, parent `cancel`, gateway `callback_paid`/`callback_failed`, background `reconcile_paid`, and manual admin `sync_paid`. Each stores `actorId`/`actorRole`, `studentId`, `amount`, a `before`/`after` snapshot (for edits) and a human-readable `note`. `paymentId` is a plain column (no FK) so the trail survives a hard-deleted payment; `actorId` is `ON DELETE SET NULL`.

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
Coach/staff self-check-in (selfie + geolocation), separate from student `Attendance`. **Verifikasi admin dihapus** — absen masuk/pulang coach & head coach langsung tersimpan dengan `verifyStatus`/`checkOutVerifyStatus = 'approved'`, jadi langsung masuk laporan (foto + timestamp) dan payroll tanpa antrean verifikasi. Migration `20261018190000_staff_attendance_auto_approve` men-*backfill* baris `'pending'` lama menjadi `'approved'` (baris `'rejected'` dibiarkan). Endpoint `PUT /staff-attendance/:id/approve|reject` dan `PUT /staff-attendance/:id/checkout/approve|reject` tetap ada sebagai jalur koreksi manual bila sebuah selfie terbukti palsu. `EventStaffAttendance` (`event_staff_attendances`, absen per event) mengikuti aturan yang sama.

### `CoachPayroll` (`coach_payrolls`) — Payroll Coach
Slip honor bulanan per coach (`@@unique([coachId, month, year])`). `User.dailyRate` (honor harian, rupiah) × `daysPresent` (jumlah **hari** dengan absen masuk `verifyStatus = 'approved'` pada bulan itu — check-in ke dua cabang di hari yang sama tetap 1 hari) + `bonus` − `deduction`, diklem di ≥ 0 menjadi `total`. `dailyRate` disalin saat generated supaya slip lama tidak ikut berubah bila tarif diubah kemudian. `status` = `draft` | `paid`; slip yang sudah `paid` tidak ditimpa oleh generate ulang. Logika ada di `lib/payroll.js`, endpoint admin-only di `routes/payroll.js` (`GET/POST /payroll`, `POST /payroll/generate`, `PUT /payroll/:id`, `POST /payroll/:id/pay`, `DELETE /payroll/:id`). Rekap kehadiran yang sama juga disajikan menu Absensi Coach lewat `GET /staff-attendance/recap?month&year[&branchId]` (admin & head coach, head coach dibatasi cabangnya) — satu grup per coach berisi `stats` + `records` harian (jam masuk/pulang, cabang, foto, lokasi).

---

## CMS content (admin-editable marketing content)

### `CmsContent` (`cms_contents`)
Generic "one JSON blob per `section` string" table — no FK to anything, `content: Json?` shape is whatever that section's admin editor + frontend consumer agree on. Read via `GET /cms/public` (all sections) or `GET /cms/public/:section` (one), written via `PUT /cms/:section` (admin-only). All admin editors for list-shaped sections reuse `web-next/components/cms/ListSectionEditor.jsx`.

Known sections in use:
| section | shape | consumed by |
|---|---|---|
| `settings` | `{ registrationFee, ssbName, ssbAddress, ssbPhone, ssbEmail, bpjsEnabled, bpjsAmount, bpjsDay, waAdminNumber, ... }` | registration fee fallback, rapor header, BPJS billing, tombol "Chat Admin" di dashboard |
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
| Admin "Buat Tagihan" (perpanjangan) | `POST /students/:id/renew` with `mode: 'invoice'` | **No** | Creates an open `CartItem` + notifies the parent; income only after checkout |
| Admin "Tandai Lunas" (cash/transfer) | `POST /students/:id/renew` with `mode: 'paid'`, or `POST /cart/mark-paid` | Yes, `status: 'success'` | Applies effects immediately, stores officer/time/`note`; cancels competing open/pending package items |
| Package renewal (parent) | `POST /cart/checkout` | Yes, `paymentType: 'cart'`, `status: 'pending'` | `POST /payments/renewal` is disabled (400) — the cart is the only renewal path |
| Event fee | `POST /payments/event` | Yes, `status: 'pending'` | `amount` always = `Event.fee`, never client-supplied |
| Admin manual override | `PUT /payments/:id` | No (updates existing) | Correction tool; calls `applyPaymentSuccess`/`applyPaymentFailed`, so it **does** apply renewal/event/cart side effects; accepts `note` |
| Cart checkout | `POST /cart/checkout` | Yes, `paymentType: 'cart'`, `status: 'pending'` | One Payment for all of the student's open `CartItem`s |
| Rintisan webhook | `POST /payments/rintisan/callback` | Depends | Looks up `partner_trx_id` in `Payment` first, then `PendingRegistration` if not found |

Unpaid rows (any `CartItem` with `status: 'open'`, and any `Payment` with `status: 'pending'`) are **never** counted in Keuangan > Pemasukan — `GET /ledger/pemasukan` only reads `status: 'success'`. Failed/cancelled/abandoned transactions therefore cannot activate a package or inflate income.
