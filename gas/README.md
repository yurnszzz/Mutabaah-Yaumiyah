# Google Apps Script Backend - Panduan Setup

## Arsitektur Sistem

```
Frontend (React/Vite)          Google Apps Script              Google Sheets (DB)
  ┌────────────────┐          ┌─────────────────┐            ┌──────────────────┐
  │  apiClient.js   │── GET ──>│  Code.gs         │── R/W ──>│  Sheet: users     │
  │  (IndexedDB     │<─ JSON ─│  Auth.gs         │           │  Sheet: groups    │
  │   caching)      │          │  Mutabaah.gs     │           │  Sheet: mutabaah_ │
  │                 │── POST ─>│  Users.gs        │           │  Sheet: rekap_    │
  │  Optimistic     │<─ JSON ─│  Utils.gs        │           │  Sheet: arsip_    │
  │  Updates        │          │                  │           └──────────────────┘
  └────────────────┘          │  CacheService    │
                              │  (6hr cache)     │
                              └─────────────────┘
```

## Langkah Setup (Step by Step)

### Langkah 1: Buat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com)
2. Buat spreadsheet baru, beri nama: **mutabaah_db**
3. Salin **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID_DISINI]/edit
   ```

### Langkah 2: Buat Google Apps Script Project

1. Buka [Google Apps Script](https://script.google.com)
2. Klik **"Proyek baru"**
3. Ganti nama project menjadi: **Mutabaah Backend**
4. **Hubungkan ke Spreadsheet**:
   - Di editor, klik menu **File > Link Spreadsheet**
   - Tempel URL spreadsheet yang dibuat di langkah 1

### Langkah 3: Copy Kode Backend

Salin isi file-file berikut ke Google Apps Script:

| File Lokal | Di GAS |
|---|---|
| `gas/Code.gs` | `Code.gs` (file utama, sudah ada) |
| `gas/Auth.gs` | Buat file baru: `Auth.gs` |
| `gas/Mutabaah.gs` | Buat file baru: `Mutabaah.gs` |
| `gas/Users.gs` | Buat file baru: `Users.gs` |
| `gas/Utils.gs` | Buat file baru: `Utils.gs` |

> Untuk membuat file baru di GAS: klik **"+"** di panel kiri > Script

### Langkah 4: Konfigurasi

1. Buka file `Code.gs`
2. Ganti baris:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
   Dengan Spreadsheet ID yang disalin di Langkah 1.

### Langkah 5: Setup Database

1. Di menu bar GAS, pilih fungsi **`setupDatabase`** dari dropdown
2. Klik **"Run"**
3. Pertama kali akan minta izin - klik **"Allow"**
4. Cek spreadsheet - harus ada 5+ sheet baru:
   - `users` (dengan 4 sample user)
   - `groups` (dengan 3 sample group)
   - `mutabaah_2026`
   - `rekap_mingguan`
   - `arsip_anggota`

### Langkah 6: Deploy sebagai Web App

1. Klik **"Deploy"** > **"Kelola deployment"** > **"Deployment baru"**
2. Pilih type: **Web app**
3. Setting:
   - **Description**: Mutabaah API v1
   - **Execute as**: **Me** (email Anda)
   - **Who has access**: **Anyone**
4. Klik **"Deploy"**
5. **Salin URL Web App** yang muncul

### Langkah 7: Konfigurasi Frontend

1. Buka file `app/.env`
2. Paste URL Web App:
   ```
   VITE_GAS_URL=https://script.google.com/macros/s/AKfycbxxxxxxx/exec
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```
4. Login page sekarang menampilkan **"Terhubung ke server"**

## Cara Test API

### Test via Browser

Buka URL berikut di browser (ganti `[URL]` dengan Web App URL):

```
[URL]?action=login&email=ahmad@sit-matahari.sch.id
```

Harus mengembalikan JSON:
```json
{
  "success": true,
  "user": {
    "user_id": "usr_002",
    "nama": "Ahmad Fauzi",
    ...
  }
}
```

### Test Endpoints Lain

| Action | URL |
|---|---|
| Login | `?action=login&email=xxx` |
| Dashboard | `?action=getDashboard&userId=usr_002` |
| Current Week | `?action=getCurrentWeek&userId=usr_002&tahun=2026&pekan=30` |
| History | `?action=getHistory&userId=usr_002&tahun=2026&limit=10&offset=0` |
| Grup Rekap | `?action=getGrupRekap&grupId=grp_001&tahun=2026&pekan=30` |

## Strategi Performa

| Strategi | Detail |
|---|---|
| **IndexedDB Cache** | Data di-cache di browser (stale-while-revalidate) |
| **CacheService** | GAS meng-cache query sering (6 jam) |
| **Batch Read** | 1x `getValues()` per sheet, bukan sel per sel |
| **Partisi Tahun** | 1 sheet per tahun (`mutabaah_2026`, `mutabaah_2027`) |
| **Rekap Cache** | Sheet `rekap_mingguan` = pre-computed aggregates |
| **Optimistic Updates** | Data disimpan lokal dulu, sync ke server di background |

## Troubleshooting

**Q: Error "SPREADSHEET_ID not found"**
A: Pastikan SPREADSHEET_ID di Code.gs benar. Bisa dicek di URL spreadsheet.

**Q: Error CORS saat fetch dari frontend**
A: GAS Web App otomatis handle CORS. Pastikan deploy dengan "Anyone" access.

**Q: Execution time > 6 menit**
A: Ini limit GAS. Solusi: kurangi data per query, gunakan pagination.

**Q: "User tidak ditemukan" saat login**
A: Pastikan email yang dimasukkan cocok dengan data di sheet `users`. Case insensitive.
