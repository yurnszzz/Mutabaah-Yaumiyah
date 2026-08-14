// Konfigurasi amalan per tingkatan
// Mapping dari Excel:
// - Tingkatan "Muda" menggunakan data sheet "Pemula"
// - Tingkatan "Pratama" menggunakan data sheet "Muda"

export const TINGKATAN = {
  muda: {
    label: 'Muda',
    description: 'Tingkatan pemula',
  },
  pratama: {
    label: 'Pratama',
    description: 'Tingkatan lanjutan',
  },
}

export const WAKTU_SHALAT = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya']
export const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
export const HARI_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export const KEHADIRAN_OPTIONS = [
  { value: 'hadir', label: 'Hadir', short: 'H', color: 'success' },
  { value: 'izin', label: 'Izin', short: 'I', color: 'info' },
  { value: 'sakit', label: 'Sakit', short: 'S', color: 'warning' },
  { value: 'alfa', label: 'Alfa', short: 'A', color: 'danger' },
]

export const JAMAAH_OPTIONS = [
  { value: 'jamaah', label: 'Berjamaah', short: 'J', color: 'success' },
  { value: 'munfarid', label: 'Sendiri', short: 'M', color: 'warning' },
  { value: 'tidak', label: 'Tidak', short: 'X', color: 'danger' },
]

// Target amalan per tingkatan per pekan
export const TARGET_AMALAN = {
  muda: {
    sholat_fardu: { target: 35, satuan: 'x/pekan', label: 'Sholat Fardu (5 Waktu)' },
    shalat_berjamaah: { target: 14, satuan: 'x/pekan', label: 'Shalat Berjamaah' },
    sholat_dhuha: { target: 7, satuan: 'x/pekan', label: 'Sholat Dhuha' },
    tilawah: { target: 1, satuan: 'juz/pekan', label: 'Tilawah Al-Quran' },
    matsurat: { target: 3, satuan: 'x/pekan', label: 'Dzikir Pagi/Sore (Al-Matsurat)' },
    shaum: { target: 1, satuan: 'x/bulan', label: 'Puasa Sunnah' },
    qiyamullail: { target: 1, satuan: 'x/pekan', label: 'Shalat Malam (Qiyamullail)' },
  },
  pratama: {
    sholat_fardu: { target: 35, satuan: 'x/pekan', label: 'Sholat Fardu (5 Waktu)' },
    shalat_berjamaah: { target: 21, satuan: 'x/pekan', label: 'Shalat Berjamaah' },
    sholat_dhuha: { target: 7, satuan: 'x/pekan', label: 'Sholat Dhuha' },
    tilawah: { target: 3.5, satuan: 'juz/pekan', label: 'Tilawah Al-Quran' },
    matsurat: { target: 3, satuan: 'x/pekan', label: 'Dzikir Pagi/Sore (Al-Matsurat)' },
    shaum: { target: 2, satuan: 'x/bulan', label: 'Puasa Sunnah' },
    qiyamullail: { target: 1, satuan: 'x/pekan', label: 'Shalat Malam (Qiyamullail)' },
  },
}

// Role definitions
export const ROLES = {
  anggota: { label: 'Anggota', level: 1 },
  pembina: { label: 'Pembina', level: 2 },
  yayasan: { label: 'Yayasan', level: 3 },
}

// Batas waktu pengisian default (Minggu malam 23:59 WIB)
export const BATAS_WAKTU_HARI = 0 // 0 = Sunday
export const BATAS_WAKTU_JAM = 23
export const BATAS_WAKTU_MENIT = 59

// Halaman per juz (standar)
export const HALAMAN_PER_JUZ = 20

/**
 * Get effective tingkatan for a user.
 * - Pembina & Yayasan always use 'pratama' targets
 * - Anggota uses their stored tingkatan or defaults to 'muda'
 */
export function getEffectiveTingkatan(user) {
  if (!user) return 'muda'
  if (user.role === 'pembina' || user.role === 'yayasan') return 'pratama'
  return user.tingkatan || 'muda'
}

/**
 * Ibadah categories affected by haid (menstruation).
 * During haid, these targets are proportionally reduced.
 * Tilawah, matsurat, and qiyamullail are NOT affected.
 */
export const IBADAH_TERDAMPAK_HAID = ['sholat_fardu', 'shalat_berjamaah', 'sholat_dhuha', 'shaum']

/**
 * Adjust targets based on haid days.
 * haidDays = number of days marked as haid (0-7)
 * Returns adjusted target object with reduced values for affected ibadah.
 */
export function getAdjustedTargets(tingkatan, haidDays = 0) {
  const base = TARGET_AMALAN[tingkatan] || TARGET_AMALAN['muda']
  if (haidDays <= 0) return base

  const activeDays = Math.max(7 - haidDays, 0)
  const ratio = activeDays / 7

  const adjusted = {}
  Object.keys(base).forEach(key => {
    if (IBADAH_TERDAMPAK_HAID.includes(key)) {
      adjusted[key] = {
        ...base[key],
        target: Math.round(base[key].target * ratio * 10) / 10, // round to 1 decimal
        originalTarget: base[key].target,
        isAdjusted: haidDays > 0,
      }
    } else {
      adjusted[key] = { ...base[key] }
    }
  })
  return adjusted
}
