# Keys folder

Taruh file private/public key Rintisan di sini:

- `rintisan_private.pem` — private key KITA (dibuat sendiri saat generate keypair,
  dipakai untuk sign request keluar ke Rintisan). **Jangan pernah dibagikan/commit.**
- `rintisan_public.pem` — public key milik RINTISAN (dikasih oleh tim mereka,
  dipakai untuk verifikasi signature callback masuk).

File `.pem` di folder ini otomatis di-ignore git (lihat `.gitignore`), jadi aman
ditaruh di sini untuk development. Untuk production, pertimbangkan pakai secret
manager (Railway/Render variables, dsb) dan set env `RINTISAN_PRIVATE_KEY` /
`RINTISAN_PUBLIC_KEY` (isi PEM langsung) sebagai alternatif dari `*_PATH`.
