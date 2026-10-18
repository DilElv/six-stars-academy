# Deployment 2026-10-18 — "Hapus Verifikasi Admin"

## Scope (rilis ini)

Fokus: pembayaran lunas otomatis via gateway Rintisan, tanpa langkah verifikasi
admin manual.

- Pembayaran (pendaftaran anak baru, perpanjangan paket, event, tagihan manual)
  langsung **lunas otomatis** begitu Rintisan mengonfirmasi.
- Antrean **"Menunggu Verifikasi"** dihapus dari semua alur otomatis.
- **Tagihan manual** admin/head coach → muncul di akun parent sebagai *Belum Dibayar*
  → parent membayar dari menu **Perpanjang Paket** → Lunas → paket otomatis aktif
  dan langsung masuk laporan **Keuangan**. Tagihan yang belum dibayar tidak
  dihitung sebagai pendapatan.
- **Perpanjangan mandiri** dan **pembayaran event** otomatis masuk Keuangan admin.
- **Rekonsiliasi otomatis** setiap 5 menit untuk pembayaran `pending` yang webhook-nya
  gagal masuk (`lib/paymentReconcile.js`).
- Absensi coach/head coach tanpa verifikasi (harian & event); ekspor laporan tidak
  menyertakan foto, hanya keterangan kalimat absen masuk/keluar.
- Perubahan status manual menyimpan petugas, waktu, dan keterangan (`Payment.note`
  + `payment_audit_logs`).

## Fitur yang belum dirilis (kode disertakan, UI disembunyikan)

Menu/halaman disembunyikan (kode tetap ada, tinggal diaktifkan di rilis berikutnya):

| Fitur | Titik sembunyi |
| --- | --- |
| Keranjang & checkout gabungan | nav `app/dashboard/layout.js`, `app/admin/layout.js` |
| Katalog merchandise (Toko) | idem |
| Audit pembayaran | nav `app/admin/layout.js` |
| Payroll coach | idem |
| Absensi coach | idem |
| Laporan coach | nav `app/coach/layout.js` + kartu di `app/coach/page.js` |
| Tombol Chat Admin (WA) | `SHOW_WA_ADMIN_BUTTON` di `components/DashboardShell.jsx` + `app/admin/pengaturan/page.js` |
| Billing BPJS | `SHOW_BPJS_SETTINGS` di `app/admin/pengaturan/page.js` |
| Panel "Tagihan Belum Dibayar" | dihapus dari `components/finance/PemasukanTab.jsx` |

Halaman publik `/paket` tidak lagi menulis "verifikasi admin / unggah bukti bayar";
aksi otomatis setelah pembayaran lunas.

## Langkah deploy

1. Commit `be093f5` (release utama) + `90c8ca1` (`--window-days` pada skrip rekonsiliasi)
   di branch `main`, di-push ke `origin/main`.
2. VPS `/var/www/app`: `git fetch` + `git reset --hard origin/main` + `git clean -fd`.
3. Migrasi: 7 migrasi Prisma di-`deploy` (cart_items, products, cart_item_period,
   payment_audit_logs, coach_payrolls, staff attendance auto-approve, payments.note).
4. `npm install` (server & web) → `prisma generate` → `next build` (60/60 route)
   → `pm2 restart ssb-backend ssb-frontend`.
5. Pembersihan duplikat lama: `node scripts/reconcile-renewals.mjs --window-days=3 --apply`.

## Backup

`/var/backups/sixstars/verif-20261018-2319` (symlink: `verif-latest`):

- `db-before.dump` — pg_dump database `ssb_sixstar_next`
- `app-src-before.tar.gz` — source aplikasi sebelum deploy
- `vps-local-changes.patch` — perubahan lokal VPS yang belum di-commit (stale, CRLF)
- `vps-untracked.tar.gz` — file untracked lama di VPS
- `ecosystem.config.js` — konfigurasi pm2
- `next-build.log` — log build frontend

## Rekonsiliasi duplikat perpanjangan

Skrip bawaan memakai jendela 45 hari; itu **terlalu lebar** untuk paket bulanan
(dua perpanjangan sah berjarak ~30 hari ikut dianggap dobel). Produksi dibersihkan
dengan `--window-days=3` saja:

| | Sebelum | Sesudah |
| --- | --- | --- |
| Baris renewal lunas | 187 | 154 |
| Total renewal lunas | Rp73.346.923 | Rp64.490.123 |
| Semua baris pembayaran | 366 | 333 |
| Semua pendapatan lunas | Rp146.974.923 | Rp138.118.123 |

33 baris duplikat dihapus (Rp8.856.800), semuanya pada hari yang sama / berdekatan.
Setiap penghapusan dicatat di `payment_audit_logs` (action `delete`). Tanggal paket
siswa **tidak** dimundurkan.

## Verifikasi pasca-deploy

- `/api/health` → 200; `/`, `/paket`, halaman publik lain → 200.
- Endpoint terproteksi (`/api/cart/me`, `/api/ledger/pemasukan`, `/api/payroll`) → 401.
- Tabel baru ada: `cart_items`, `products`, `payment_audit_logs`, `coach_payrolls`.
- Tidak ada galat baru di log backend.

## Catatan tindak lanjut

- Ganti (rotate) password SSH VPS setelah deploy.
- Fitur di tabel "belum dirilis" bisa diaktifkan kembali satu per satu (lihat kolom
  titik sembunyi) lalu rebuild + restart frontend.
