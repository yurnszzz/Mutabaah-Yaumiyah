# PRD Addendum v1.3 — Admin & UX Enhancement
### Mutabaah Yaumiyah · SIT Matahari

| Field | Value |
|-------|-------|
| **Merujuk pada** | PRD-Mutabaah-Yaumiyah.md v1.0, Addendum v1.2 |
| **Tanggal update** | 24 Agustus 2026 |
| **Status** | Implementasi Poin 1–4 selesai, Poin 5 ditunda |

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

## Endpoint API Baru v1.3

| Action | Method | Fungsi |
|--------|--------|--------|
| `getPendingUsers` | GET | Daftar user pending |
| `getNotifications` | GET | Notifikasi user |
| `adminEditProfile` | POST | Edit profil user |
| `approvePendingUser` | POST | Setujui pendaftaran |
| `rejectPendingUser` | POST | Tolak pendaftaran |
| `markNotificationsRead` | POST | Mark notifikasi dibaca |

---

## Deploy Checklist v1.3

### Backend (GAS)
1. Update `Admin.gs`, `Users.gs`, `Code.gs`
2. Tambah file baru `Notifications.gs`
3. Jalankan **`runMigration()`** — otomatis setup semua sheet & kolom baru
4. Re-deploy Web App (New Deployment)

> Spreadsheet ID sudah di-hardcode di `Code.gs`: `1vUnJO8TDmMztYRNgjz4MnSJbWtZAKZ9mIVi7-lk6_EA`

### Frontend
1. `npm run build` → deploy Vercel
