-- Keterangan pembayaran (mis. "Cash", "Transfer Manual", "Anak Berprestasi").
-- Dipakai jalur "Tandai Lunas" manual oleh admin/head_coach dan pembuatan
-- tagihan, supaya alasan/metode pembayaran tersimpan pada transaksinya
-- sendiri (bukan hanya di jejak audit).
ALTER TABLE "payments" ADD COLUMN "note" TEXT;
