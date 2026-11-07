# PRD Addendum v1.3 — Admin & UX Enhancement
### Mutabaah Yaumiyah · SIT Matahari

| Field | Value |
|-------|-------|
| **Merujuk pada** | PRD-Mutabaah-Yaumiyah.md v1.0, Addendum v1.2 |
| **Tanggal update** | 24 Oktober 2026 |
| **Status** | D1–D4, D7–D9 selesai. D5 ditunda |

---

## Fitur Baru v1.3

### D1: Konfirmasi Data Pendaftaran
**Status:** Selesai

Saat user klik "Daftar", muncul modal konfirmasi menampilkan semua data (nama, email, gender, role, jenjang, pembina). Warning bahwa jenjang/role tidak bisa diubah sendiri.

**File:** `Login.jsx`, `Login.css`

---

### D2: Verifikasi Pendaftaran (Pending Approval) + Referral Link
**Status:** Selesai (v1.3.1 fix)

**Alur Pendaftaran:**
```
Via Referral Link (?ref=grp_xxx) → langsung "aktif" (auto-accept)
Via Manual (tanpa ref)           → "pending" → menunggu persetujuan pembina
```

**Pembina mendapat:**
- Notifikasi saat ada anggota baru mendaftar ke grupnya
- UI approval di Dashboard Pembina (tombol Terima / Tolak)
- Tombol "Salin Link Undangan" untuk generate referral link

**User pending mendapat:**
- Pesan jelas: "Akun Anda menunggu persetujuan dari [nama pembina]. Silakan hubungi pembina Anda."
- Tidak bisa login sampai disetujui

**Catatan:** Pembina mendaftar langsung aktif (tidak pending).

**Backend:** `registerSelf()` (referral check), `getPendingUsers()`, `approvePendingUser()`, `rejectPendingUser()`
**Frontend:** `DashboardPembina.jsx` (approval UI + referral link), `AuthContext.jsx`, `Login.jsx`

---

### D3: Admin Edit Profil User
**Status:** Selesai

Admin edit: nama, role, jenjang, grup, status. Protected: email, password, gender.

**Backend:** `adminEditProfile()` di `Admin.gs`
**Frontend:** Modal edit di `KelolaUser.jsx`

---

### D4: In-App Notification
**Status:** Selesai

Bell icon + dropdown di header. Tipe: approval, rejection, profile_update, reminder, info.
Sheet baru: `notifications` (notif_id, user_id, type, title, message, is_read, created_at)

**Backend:** `Notifications.gs` — `createNotification()`, `getNotifications()`, `markNotificationsRead()`
**Frontend:** `NotificationBell.jsx` + `NotificationBell.css` di `Layout.jsx`

---

### D5: Profile Change Request — Ditunda (P2)
### D6: Migrasi Backend Supabase — Dikesampingkan

---

### D7: Leaderboard Kategori
**Status:** Selesai

Leaderboard dipecah jadi 3 tab kategori agar tidak tercampur:

| Tab | Isi | Ranking |
|-----|-----|---------|
| **Anggota** | Semua anggota aktif | Independen, badge jenjang (Muda/Pratama) |
| **Pembina** | Semua pembina aktif | Independen, tanpa badge jenjang |
| **Grup** | Agregat per grup halaqah | Rata-rata skor/streak anggota, badge jumlah anggota |

Masing-masing tab tetap punya toggle **Streak** dan **Skor**.

**Perubahan:**
- Pembina tidak lagi dilabeli "Pratama" di leaderboard (labelnya "Pembina")
- Group leaderboard menghitung rata-rata dari semua anggota dalam grup
- Ranking independen per kategori

**File:** `Leaderboard.jsx` (rewrite), `Leaderboard.css` (+ category tabs)

---

### D8: Perbaikan Link Undangan + Halaman Daftar Terpisah (v1.3.2)
**Status:** Selesai

Masalah: link undangan beberapa pembina (Afifah, Nurmila, Deva, Sumayah) gagal dipakai.

**Perubahan:**
- Pendaftaran pindah ke halaman sendiri: `/daftar`. Link lama `/login?pembina=..&ref=..` otomatis diarahkan ke `/daftar`.
- Link undangan sekarang berbentuk `/daftar?ref=<grup_id>`. Grup dicari lewat ID, bukan lewat pencocokan nama, jadi ejaan atau gelar pada nama pembina tidak lagi membuat link gagal.
- Endpoint baru `getInviteInfo` menampilkan nama pembina sebelum calon anggota mengisi formulir. Link yang rusak atau grupnya sudah dihapus menampilkan pesan jelas.
- Gender anggota mengikuti gender pembina (ustadzah → akhwat, ustadz → ikhwan) dan tidak bisa diubah di formulir.
- Pendaftaran lewat link langsung aktif. Pendaftaran manual (ketik nama pembina) tetap menunggu persetujuan.
- `registerSelf()` memakai `LockService` sehingga ketuk dua kali atau koneksi lambat tidak membuat akun ganda. Pendaftaran tidak di-retry otomatis dan batas waktunya 45 detik.
- Email yang sudah terdaftar dengan status pending mendapat pesan "hubungi pembina", bukan "silakan masuk".

**Backend:** `Users.gs` (`resolveInviteGroup`, `getInviteInfo`, `registerSelf`), `Code.gs` (route `getInviteInfo`)
**Frontend:** `Login.jsx` (mode `login` / `register`), `App.jsx` (route `/daftar`), `Profil.jsx` + `DashboardPembina.jsx` (format link), `api.js`

---

### D9: Rincian Jumlah Amalan (bukan hanya persen) (v1.3.2)
**Status:** Selesai

Masukan pengguna, terutama yang lebih tua: persentase saja sulit dibaca. Pembina ingin tahu berapa kali sebenarnya anggota mengerjakan tiap amalan.

**Yang tampil sekarang:**

| Halaman | Isi |
|---------|-----|
| **Riwayat** (anggota) | Tiap pekan, dari terbaru ke terlama. Kartu tertutup menampilkan ringkasan "Sholat 32/35 · Tilawah 1,25 juz". Saat dibuka: jumlah tiap amalan ("32 dari 35 kali"), tabel sholat per hari (J = berjamaah, S = sendiri), tilawah dalam juz + halaman, kehadiran UPA. Ada pilihan tahun. |
| **Anggota Grup** (pembina) | Rincian yang sama untuk tiap anggota, satu tahun penuh. Pekan terbaru langsung terbuka. |
| **Rapor Bulanan** | Kolom "Dikerjakan" berisi total sebulan ("128 dari 140 kali") dan tabel "Rincian per Pekan" berisi jumlah per amalan per pekan. |

Pekan dengan hari haid memakai target yang sudah dikurangi, dan target normalnya tetap ditampilkan.

**Bug ikut diperbaiki:** halaman Riwayat membaca kolom persen yang salah dari server (`persen_sholat`, `persen_jamaah`, …) sehingga sebagian amalan tampil 0%.

**Backend:** `RaporBulanan.gs` (field baru `weeks` berisi data mentah per pekan)
**Frontend:** `utils/mutabaahSummary.js` (hitung jumlah, dipakai bersama), `components/WeekDetail.jsx` + `.css`, `Laporan.jsx`, `AnggotaGrup.jsx`, `RaporBulanan.jsx`, `MutabaahContext.jsx`

Catatan: Rapor Bulanan tetap tampil dengan persen saja jika backend belum di-deploy ulang.

---

## Endpoint API Baru v1.3

| Action | Method | Fungsi |
|--------|--------|--------|
| `getPendingUsers` | GET | Daftar user pending |
| `getNotifications` | GET | Notifikasi user |
| `adminEditProfile` | POST | Edit profil user |
| `approvePendingUser` | POST | Setujui pendaftaran |
| `rejectPendingUser` | POST | Tolak pendaftaran |
| `markNotificationsRead` | POST | Mark notifikasi dibaca |
| `getInviteInfo` | GET | Info pembina + grup dari link undangan (`ref` / `pembina`) |

---

## Deploy Checklist v1.3

### Backend (GAS)
1. Update `Admin.gs`, `Users.gs`, `Code.gs`, `RaporBulanan.gs`
2. Tambah file baru `Notifications.gs`
3. Jalankan **`runMigration()`** — otomatis setup semua sheet & kolom baru
4. Re-deploy Web App (Manage deployments → Edit → Version: New version, agar URL tetap sama)

> Spreadsheet ID sudah di-hardcode di `Code.gs`: `1vUnJO8TDmMztYRNgjz4MnSJbWtZAKZ9mIVi7-lk6_EA`

### Frontend
1. `npm run build` → deploy Vercel
