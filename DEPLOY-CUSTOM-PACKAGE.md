# Custom package price and period editing ? deployed 17 September 2026

Deployment completed at 16:21:58 WIB to https://sixstarsacademy.com, VPS 203.194.115.231, application /var/www/app.

## Features

- Admin/head coach renewal offers Anak Baru, Anak Lama, and Custom.
- A student's latest custom price appears in subsequent staff and parent renewals, including when the preceding payment fails.
- Changing custom terms creates a new package record; old invoices retain their original package terms.
- Data Anak details expose Edit Periode Paket for start/end date corrections without creating a payment or resetting session usage.
- Backend validates dates/prices and head coach branch access.

## Production data protection

- Backups: /var/backups/sixstars/custom-period-20260917.
- Source, environment and upload archive: app-before.tar.gz; archive contents verified.
- Database dumps: database-before.dump and database-final.dump; pg_restore --list validation passed.
- Original frontend build retained at next-build; original changed source retained in source-before.
- No migrations, seed, database reset, import or restore were executed.
- All 25 database table fingerprints, including all stored columns, were identical immediately before promotion and after application restart. Counts included 68 students, 78 users, 215 payments, 322 attendances, and 75 staff attendances.
- Existing uploads and environment files passed SHA-256 comparisons.
- Ten reviewed feature files were promoted; unrelated production files were preserved.
- Deployment script has application rollback on failure and never restores the database.

Database-before SHA-256: fd5a041c54cd7addfcc72312656a5b3c91562280a96e8b6d4b33d2931626e4d2.
Database-final SHA-256: fa4ed0bb9e4c80fbadf0bb64044f00274656c7f752456d0ef87b2ce8a53c9bdd.
Application archive SHA-256: 920f72c04865baa4b448b51d0f671f5449d15069b38ac22dd8ee6f846df82bdc.

## Verification

- Local and staged VPS Next.js production builds passed.
- Backend integration suite passed, including persistence of failed-payment custom prices, date validation, role/branch access, and preservation of sessions/payment counts during period corrections.
- Production API smoke passed for admin, head coach and parent custom package reads and rejection of invalid/unauthorized period changes. No valid production period edit or renewal payment was submitted.
- HTTPS /, /login, /admin/data-anak, /head-coach/data-anak, and /api/health returned HTTP 200.
- Existing PM2 services ssb-backend and ssb-frontend are running the deployed release.

Local operational artifacts are in backup/: release manifest/archive, deployment script, smoke script, and database dumps. No SSH password was saved in these scripts.
