# PRD Addendum v1.2 — Post-Implementation Update
### Mutabaah Yaumiyah · SIT Matahari

| Field | Value |
|-------|-------|
| **Merujuk pada** | PRD-Mutabaah-Yaumiyah.md v1.0 (2 Agustus 2026) |
| **Versi sebelumnya** | Addendum v1.1 (2 Agustus 2026) — audit teknis & rencana |
| **Tanggal update** | 4 Agustus 2026 |
| **Status** | ✅ Semua item B1–B6 + C1–C3 telah diimplementasi |

---

## Status Implementasi

### Bug Fixes (B1–B6) — ✅ Selesai Semua

| ID | Masalah | Solusi | File Diubah |
|----|---------|--------|-------------|
| **B1** | Form tidak reset saat ganti pekan | `weekData` kini disimpan di localStorage dengan key `mutabaah_data_{year}_{week}` (bukan key flat). Draft lama otomatis dibersihkan (max 4 pekan terakhir). | `MutabaahContext.jsx` |
| **B2** | Pekan tidak auto-berganti | Ditambahkan `visibilitychange` listener + interval 60 detik yang membandingkan `weekInfo` saat ini vs yang tersimpan. Kalau beda → reset form otomatis. | `MutabaahContext.jsx` |
| **B3** | Hapus pekan tidak langsung tereflek di UI | `resetWeek()` kini juga menghapus entry dari `savedWeeks` state + localStorage. Ditambahkan modal konfirmasi custom (bukan `window.confirm`) yang menyebutkan nomor pekan & tanggal. | `MutabaahContext.jsx`, `Laporan.jsx`, `Laporan.css` |
| **B4** | Laporan menampilkan semua detail sekaligus | Kartu pekan kini default **collapsed** (hanya menampilkan nomor pekan, tanggal, % rata-rata). Klik untuk expand. Ditambahkan tombol "Muat lebih" (paginated, 8 per load). | `Laporan.jsx`, `Laporan.css` |
| **B5** | Streak naik setiap klik simpan | `updateStreak()` sekarang menerima `pekan` dan `tahun`, lalu menghitung streak berturut-turut secara backtrack dari submitted weeks yang ada di sheet. Re-edit pekan yang sama tidak menambah streak. | `Mutabaah.gs` |
| **B6** | Pembina tidak bisa lihat detail mutabaah anggota | Klik anggota → buka detail view dengan riwayat mutabaah (expandable). Backend: `getMemberMutabaah()` dengan permission check (pembina hanya bisa akses anggota di grupnya). | `AnggotaGrup.jsx`, `AnggotaGrup.css`, `Users.gs`, `Code.gs` |

### Fitur Baru (C1–C3) — ✅ Selesai Semua

| ID | Fitur | Implementasi | File Baru / Diubah |
|----|-------|-------------|-------------------|
| **C1** | **Leaderboard** | Dual-mode: streak consistency & weekly score ranking. Top rank mendapat ikon Crown/Medal. Posisi diri sendiri di-highlight. Backend: `getLeaderboard()` di `Users.gs`, route di `Code.gs`. | `Leaderboard.jsx` (baru), `Leaderboard.css` (baru), `Users.gs`, `Code.gs` |
| **C2** | **Rapor Bulanan** | Navigasi bulan, report card printable (PDF via `window.print()`). Tabel per-amalan + predikat (A–E). Week breakdown chips. Backend: `getMonthlyReport()` di `RaporBulanan.gs` + auto-generate via time trigger (`autoGenerateMonthlyReports()`). Sheet cache: `rapor_bulanan`. | `RaporBulanan.jsx` (baru), `RaporBulanan.css` (baru), `RaporBulanan.gs` (baru), `Code.gs` |
| **C3** | **Audit Trail Edit** | Keputusan user: semua tetap bisa diedit, tapi catat jejak. Kolom baru di `mutabaah_YYYY`: `edit_count`, `last_edited_at`, `first_submitted_at`. Frontend menampilkan badge "Diedit X×" di Laporan dan drill-down Pembina. | `Mutabaah.gs`, `Code.gs` (setupMutabaahSheet), `MutabaahContext.jsx`, `Laporan.jsx`, `AnggotaGrup.jsx` |

---

## Perubahan Navigasi

| Role | Menu Baru |
|------|-----------|
| Anggota | + Leaderboard (🏆), + Rapor Bulanan (📄) |
| Pembina | + Leaderboard (🏆), + Rapor Bulanan (📄) |
| Yayasan | + Leaderboard (🏆) |

---

## Skema Database — Perubahan

### Sheet `mutabaah_YYYY` — 3 kolom baru
```
..., status, edit_count, last_edited_at, first_submitted_at
```
- `edit_count` (integer): jumlah kali record diedit setelah submit pertama (0 = belum pernah diedit)
- `last_edited_at` (ISO timestamp): kapan terakhir diedit (kosong jika belum pernah)
- `first_submitted_at` (ISO timestamp): waktu submit pertama kali (tidak berubah meskipun diedit)

### Sheet `rapor_bulanan` — baru
```
rapor_id, user_id, nama, bulan, tahun, total_weeks, rata_rata,
predikat_label, predikat_level, summary_json, week_summaries_json, generated_at
```
- Di-generate otomatis via `autoGenerateMonthlyReports()` (time trigger setiap tanggal 1)
- Juga bisa di-generate on-demand via `getMonthlyReport()`

---

## Endpoint API — Baru

| Action | Method | Parameter | Fungsi |
|--------|--------|-----------|--------|
| `getMemberMutabaah` | GET | `pembinaUserId`, `memberUserId`, `tahun`, `limit`, `offset` | B6: Drill-down riwayat anggota (permission-checked) |
| `getLeaderboard` | GET | `mode` (streak/score), `tahun`?, `pekan`? | C1: Data ranking |
| `getMonthlyReport` | GET | `userId`, `bulan`, `tahun` | C2: Rapor bulanan on-demand |

---

## Predikat Rapor Bulanan

| Rata-rata | Level | Label |
|-----------|-------|-------|
| ≥ 90% | A | Istimewa |
| ≥ 80% | B+ | Sangat Baik |
| ≥ 70% | B | Baik |
| ≥ 60% | C | Cukup |
| ≥ 50% | D | Kurang |
| < 50% | E | Perlu Perbaikan |

---

## Deploy Checklist

### Backend (Google Apps Script)
1. Copy isi `Mutabaah.gs` (versi baru) ke project GAS
2. Copy isi `Users.gs` (versi baru) ke project GAS — berisi `getMemberMutabaah()` dan `getLeaderboard()`
3. Copy file baru `RaporBulanan.gs` ke project GAS
4. Copy isi `Code.gs` (versi baru) ke project GAS — berisi route baru
5. ⚠️ **Re-deploy** GAS sebagai Web App (versi baru)
6. **Opsional:** Setup time trigger untuk `autoGenerateMonthlyReports()` di setiap tanggal 1

### Frontend (Vercel)
1. `cd app && npm run build`
2. Deploy `dist/` ke Vercel (atau `git push` jika auto-deploy sudah aktif)

### Sheet Database
- Sheet `rapor_bulanan` akan dibuat otomatis saat pertama kali `autoGenerateMonthlyReports()` dijalankan
- Kolom audit (`edit_count`, `last_edited_at`, `first_submitted_at`) akan ada di sheet `mutabaah_YYYY` yang baru dibuat. Untuk sheet yang sudah ada, kolom ini akan ter-populate saat ada submit/edit baru.

---

## Item Terbuka (Belum Diimplementasi)

| Item | Status | Catatan |
|------|--------|---------|
| Admin/Yayasan dashboard enhancement | Menunggu detail spesifik dari user | User menyebut "nanggung" tapi belum ada contoh konkret |
| Arsip anggota (soft-delete) | Belum ada spesifikasi | Sheet `arsip_anggota` ada tapi belum terpakai |
| Export PDF laporan mingguan | Roadmap P2 | Beda dari Rapor Bulanan — ini export satu minggu saja |
