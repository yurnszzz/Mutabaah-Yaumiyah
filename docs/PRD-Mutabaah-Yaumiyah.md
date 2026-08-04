# PRD — Mutabaah Yaumiyah
### Evaluasi Pekanan Amalan · Sekolah Islam Terpadu Matahari

| Field | Value |
|-------|-------|
| **Versi** | 1.0 |
| **Tanggal** | 2 Agustus 2026 |
| **Organisasi** | SIT Matahari |
| **Status** | ✅ Implementasi |

---

## 1. Ringkasan Produk

**Mutabaah Yaumiyah** adalah web-app untuk mencatat, memonitor, dan mengevaluasi amalan pekanan (mingguan) guru di SIT Matahari. Sistem mendukung 3 level akses (Anggota, Pembina, Yayasan/Admin) dengan alur: anggota mengisi → pembina memonitor grup → yayasan memonitor keseluruhan.

### Visi
> Memudahkan evaluasi amalan ibadah secara terstruktur, transparan, dan konsisten melalui platform digital yang modern.

### Target User
- **Anggota (Guru):** Mengisi mutabaah pekanan, melihat laporan & streak pribadi
- **Pembina:** Memonitor grup binaan, melihat progress anggota, mengisi mutabaah sendiri
- **Yayasan/Admin:** Mengelola seluruh user & grup, melihat rekap global, menangani helpdesk

---

## 2. Arsitektur Sistem

```
┌──────────────┐        HTTPS/JSON        ┌───────────────────────┐
│  Frontend    │  ◄────────────────────►  │  Backend (GAS)        │
│  React/Vite  │                          │  Google Apps Script    │
│  Vercel      │                          │  ┌─────────────────┐  │
└──────────────┘                          │  │ Google Sheets DB │  │
                                          │  └─────────────────┘  │
                                          └───────────────────────┘
```

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19 + Vite, Vanilla CSS, Lucide Icons |
| Backend | Google Apps Script (Web App) |
| Database | Google Sheets (multi-sheet) |
| Auth | Manual (email/password hash SHA256) + Google OAuth (GIS) |
| Hosting | Vercel (frontend), Google (backend) |
| Caching | GAS CacheService (6 jam) + Frontend IndexedDB |

---

## 3. Struktur Database (Google Sheets)

### Sheet: `users`
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| user_id | string | PK, format `usr_XXXXXXXX` |
| email | string | Unique, untuk login |
| password_hash | string | SHA256 hash |
| nama | string | Nama lengkap (dengan gelar untuk pembina) |
| role | enum | `anggota` \| `pembina` \| `yayasan` |
| tingkatan | enum | `muda` \| `madya` \| `pratama` (anggota only) |
| grup_id | string | FK ke groups |
| status | enum | `aktif` \| `nonaktif` |
| transisi_dari | string | Tingkatan asal saat transisi |
| transisi_mulai | date | Tanggal mulai transisi |
| transisi_durasi_pekan | number | Durasi masa transisi |
| streak_current | number | Streak berturut-turut saat ini |
| streak_longest | number | Streak terpanjang |
| badges | json | Array badge yang diperoleh |
| no_whatsapp | string | Nomor WA (opsional) |
| created_at | datetime | Waktu registrasi |

### Sheet: `groups`
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| grup_id | string | PK, format `grp_XXXXXXXX` |
| nama_grup | string | Nama grup (= nama pembina) |
| pembina_user_id | string | FK ke users |
| created_at | datetime | Waktu pembuatan |

### Sheet: `mutabaah_YYYY` (per tahun)
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| record_id | string | PK |
| user_id | string | FK ke users |
| pekan_ke | number | Nomor pekan (ISO) |
| tahun | number | Tahun |
| sholat_fardu | json | Grid 7x5 (hari × waktu) |
| sholat_berjamaah | json | Grid 7x5 + status per cell |
| tilawah_juz | number | Jumlah juz |
| tilawah_halaman | number | Jumlah halaman |
| sholat_dhuha | number | Frekuensi/pekan |
| dzikir_pagi_sore | number | Frekuensi/pekan |
| puasa_sunnah | number | Jumlah hari/bulan |
| qiyamullail | number | Frekuensi/pekan |
| kehadiran_upa | enum | `H` \| `I` \| `S` \| `A` |
| keterlambatan_menit | number | Menit keterlambatan |
| persen_rata_rata | number | Persentase pencapaian keseluruhan |
| submitted_at | datetime | Waktu submit |

### Sheet: `tickets`
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| ticket_id | string | PK, format `TKT-YYYY-MM-XXXXXX` |
| user_id | string | FK ke users (pembuat) |
| user_nama | string | Nama pembuat |
| user_email | string | Email pembuat |
| user_role | string | Role pembuat |
| kategori | enum | `bug` \| `fitur` \| `akun` \| `umum` \| `lainnya` |
| subjek | string | Judul tiket |
| deskripsi | text | Detail masalah |
| prioritas | enum | `rendah` \| `sedang` \| `tinggi` \| `urgent` |
| status | enum | `baru` \| `diproses` \| `selesai` \| `ditutup` |
| created_at | datetime | Waktu pembuatan |
| updated_at | datetime | Waktu update terakhir |
| resolved_at | datetime | Waktu penyelesaian |
| resolved_by | string | Nama penyelesai |

### Sheet: `ticket_replies`
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| reply_id | string | PK |
| ticket_id | string | FK ke tickets |
| user_id | string | FK ke users |
| user_nama | string | Nama pengirim |
| user_role | string | Role pengirim |
| pesan | text | Isi balasan |
| created_at | datetime | Waktu kirim |

---

## 4. User Roles & Permissions

### 4.1 Anggota (Guru)
| Fitur | Akses |
|-------|-------|
| Input Mutabaah | ✅ Isi & edit (sebelum deadline) |
| Laporan Pribadi | ✅ Lihat pencapaian & trend |
| Streak & Badge | ✅ Lihat streak konsistensi |
| Profil | ✅ Edit nama, email, password |
| Panduan | ✅ Lihat FAQ & cara pakai |
| Helpdesk | ✅ Buat & lihat tiket sendiri |

### 4.2 Pembina
| Fitur | Akses |
|-------|-------|
| Semua fitur Anggota | ✅ |
| Dashboard Pembina | ✅ Progress pengisian grup |
| Anggota Grup | ✅ Lihat status & rekap anggota |
| Link Pendaftaran | ✅ Share link referral (di Profil) |
| Helpdesk | ✅ Buat tiket + balas + ubah status |

### 4.3 Yayasan / Admin
| Fitur | Akses |
|-------|-------|
| Dashboard Admin | ✅ Statistik global |
| Kelola User | ✅ Lihat, hapus, ubah role |
| Kelola Grup | ✅ Lihat semua grup + anggota |
| Helpdesk Admin | ✅ Lihat semua tiket, balas, ubah status |
| Profil | ✅ Edit profil sendiri (tanpa streak/mutabaah) |
| ❌ Input Mutabaah | Tidak ada — admin bukan pengisi |

---

## 5. Fitur Detail per Modul

### 5.1 Autentikasi
- Login manual (email + password)
- Login via Google OAuth (GIS - Google Identity Services)
- Auto-redirect ke form daftar jika akun Google belum terdaftar
- Tombol Google berubah: "Sign in" (tab Masuk) ↔ "Sign up" (tab Daftar)
- Lupa password → kirim password sementara via email (MailApp)
- Registrasi mandiri:
  - **Anggota**: Pilih gelar pembina (Ust./Ustadzah) + nama → auto-join grup
  - **Pembina**: Pilih gelar sendiri (Ust./Ustadzah) + nama → auto-create grup
  - **Yayasan**: Hanya via admin

### 5.2 Input Mutabaah (Anggota + Pembina)
- Grid interaktif sholat fardu 7×5 (hari × waktu)
- Grid sholat berjamaah 7×5 dengan 3 status (berjamaah/sendiri/tidak)
- Input tilawah (juz + halaman)
- Input amalan: dhuha, dzikir, puasa sunnah, qiyamullail
- Kehadiran UPA (H/I/S/A) + keterlambatan
- Auto-save draft ke IndexedDB
- Validasi deadline: Minggu 23:59 WIB → tandai "Terlambat"

### 5.3 Laporan (Anggota + Pembina)
- Persentase per amalan dengan color coding (hijau/kuning/merah)
- Target berdasarkan tingkatan (Muda vs Pratama)
- Navigasi antar pekan
- Trend pencapaian

### 5.4 Dashboard Pembina
- Ringkasan progress pengisian pekan ini
- Status anggota: sudah/belum mengisi
- Rekap rata-rata pencapaian per amalan
- Filter: hanya tampilkan anggota (pembina sendiri tidak masuk list)

### 5.5 Dashboard Admin (Yayasan)
- Statistik: total anggota, pembina, grup, user aktif
- Rekap semua grup (rata-rata pencapaian)
- Quick overview per grup

### 5.6 Kelola User (Yayasan)
- Tabel semua user (nama, email, role, grup, status)
- Pencarian by nama/email
- Ubah role user
- Hapus user

### 5.7 Kelola Grup (Yayasan)
- Daftar semua grup + pembina + jumlah anggota
- Detail anggota per grup

### 5.8 Helpdesk / Ticketing
- **Anggota/Pembina:**
  - Buat tiket baru (kategori, prioritas, subjek, deskripsi)
  - Lihat tiket sendiri + status
  - Balas tiket (chat-style thread)
- **Admin:**
  - Dashboard tiket (stat cards: baru/diproses/selesai/ditutup)
  - Filter by status
  - Lihat semua tiket + submitter info
  - Balas tiket → auto-set status "diproses"
  - Ubah status tiket (baru → diproses → selesai → ditutup)
- Tiket ditutup → balasan dinonaktifkan

### 5.9 Profil
- Edit nama & email
- Ganti password
- **Anggota**: Lihat streak & tingkatan
- **Pembina**: Link pendaftaran anggota (auto-generate, copy-able)
- **Admin**: Tanpa streak/mutabaah (bukan pengisi)

### 5.10 Panduan & FAQ
- Accordion FAQ per kategori
- Panduan input mutabaah step-by-step
- Panduan pembina (cara daftar anggota via link)
- Info tingkatan & target
- Arahkan ke Helpdesk untuk pelaporan error

---

## 6. Auto-Group Assignment

Alur registrasi anggota → auto-join grup:

```
Anggota pilih gelar (Ust./Ustadzah) + isi nama pembina
  ↓
Frontend kirim: namaPembina = "Ust. Rahayu Fitrianti"
  ↓
Backend: findGroupByPembinaName("Ust. Rahayu Fitrianti")
  ↓
  1. Strip gelar → "rahayu fitrianti" (core name)
  2. Match vs nama_grup di sheet groups (strip gelar juga)
  3. Match vs nama pembina di sheet users (strip gelar juga)
  ↓
✅ Found → assign grup_id ke user baru
❌ Not found → return error "Pembina belum terdaftar"
```

---

## 7. Tech Stack & Dependencies

### Frontend
```json
{
  "react": "^19.x",
  "react-dom": "^19.x",
  "react-router-dom": "^7.x",
  "lucide-react": "^0.4xx",
  "vite": "^8.x"
}
```

### Backend (GAS Files)
| File | Fungsi |
|------|--------|
| `Code.gs` | Main router (doGet/doPost), config, setup |
| `Auth.gs` | Login (manual + Google), getUserById, getGroupById |
| `Users.gs` | CRUD user, registerSelf, findGroup, getGrupAnggota/Rekap |
| `Admin.gs` | getAllUsers, getAllGroups, getAdminStats, deleteUser |
| `Mutabaah.gs` | submitMutabaah, getCurrentWeekData, getWeeklyReport |
| `Utils.gs` | rowToObject, getWeekInfoServer, cache helpers |
| `Helpdesk.gs` | CRUD tickets, replies, stats |

### Frontend Pages
| File | Route | Role |
|------|-------|------|
| `Landing.jsx` | `/welcome` | Public |
| `Login.jsx` | `/login` | Public |
| `Dashboard.jsx` | `/` | Anggota |
| `DashboardPembina.jsx` | `/` | Pembina |
| `DashboardYayasan.jsx` | `/` | Yayasan |
| `InputMutabaah.jsx` | `/input` | Anggota/Pembina |
| `Laporan.jsx` | `/laporan` | Anggota/Pembina |
| `AnggotaGrup.jsx` | `/anggota` | Pembina |
| `KelolaUser.jsx` | `/kelola-user` | Yayasan |
| `KelolaGrup.jsx` | `/kelola-grup` | Yayasan |
| `Helpdesk.jsx` | `/helpdesk` | Anggota/Pembina |
| `HelpdeskAdmin.jsx` | `/helpdesk-admin` | Yayasan |
| `TicketDetail.jsx` | `/helpdesk/:id` | Semua |
| `Profil.jsx` | `/profil` | Semua |
| `Panduan.jsx` | `/panduan` | Anggota/Pembina |

---

## 8. Deployment

### Frontend (Vercel)
```bash
cd app
npm run build    # Output: dist/
# Deploy dist/ ke Vercel
```

### Backend (Google Apps Script)
1. Buka script.google.com → New Project
2. Copy semua file `.gs` ke editor
3. Set `SPREADSHEET_ID` di `Code.gs`
4. Run `setupDatabase()` sekali
5. Deploy > Web App > Execute as: Me, Access: Anyone
6. Copy URL Web App → paste di `app/.env` sebagai `VITE_GAS_URL`

---

## 9. Roadmap (Planned)

| Prioritas | Fitur | Status |
|-----------|-------|--------|
| P0 | Core mutabaah input & laporan | ✅ Done |
| P0 | Autentikasi (manual + Google) | ✅ Done |
| P0 | Dashboard per role | ✅ Done |
| P0 | Auto-group assignment | ✅ Done |
| P1 | Helpdesk ticketing | ✅ Done |
| P1 | Bug fix: group matching | ✅ Done |
| P2 | Export PDF laporan | 🔲 Planned |
| P2 | Notifikasi reminder (email/WA) | 🔲 Planned |
| P2 | Offline mode (PWA) | 🔲 Planned |
| P3 | Bulk import user dari Excel | 🔲 Planned |
| P3 | Perbandingan antar pekan (chart) | 🔲 Planned |
