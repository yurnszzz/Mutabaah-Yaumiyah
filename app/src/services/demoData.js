// Data contoh untuk mode demo (VITE_GAS_URL kosong).
// Bentuknya sama dengan respons server supaya halaman memakai jalur kode
// yang sama. Angkanya deterministik per user agar tampilan stabil saat direkam.

import { HARI, WAKTU_SHALAT, getAdjustedTargets, TARGET_AMALAN } from '../config/constants'

function seeded(seedStr) {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return ((h >>> 0) % 10000) / 10000
  }
}

function mondayOfWeek(weeksAgo) {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1) - weeksAgo * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekNumberOf(monday) {
  const startOfYear = new Date(monday.getFullYear(), 0, 1)
  return Math.ceil(((monday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
}

function pct(actual, target) {
  return target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0
}

function buildWeek(rand, tingkatan, { haidDays = 0, diligence = 0.85 } = {}) {
  const hariHaid = HARI.slice(0, haidDays)
  const sholat_fardu = {}
  const shalat_berjamaah = {}
  let fardu = 0
  let jamaah = 0
  HARI.forEach(hari => {
    sholat_fardu[hari] = {}
    shalat_berjamaah[hari] = {}
    WAKTU_SHALAT.forEach(waktu => {
      const isHaid = hariHaid.includes(hari)
      const prayed = !isHaid && rand() < diligence + 0.1
      const berjamaah = prayed && rand() < diligence - 0.25
      sholat_fardu[hari][waktu] = prayed
      shalat_berjamaah[hari][waktu] = berjamaah ? 'jamaah' : prayed ? 'munfarid' : 'tidak'
      if (prayed) fardu++
      if (berjamaah) jamaah++
    })
  })
  const weekData = {
    sholat_fardu,
    shalat_berjamaah,
    sholat_dhuha: Math.round(rand() * 7 * diligence),
    tilawah_juz: rand() < diligence ? 1 : 0,
    tilawah_halaman: Math.round(rand() * 12),
    matsurat: Math.min(3, Math.round(rand() * 4 * diligence)),
    shaum: rand() < diligence - 0.2 ? 1 : 0,
    qiyamullail: rand() < diligence - 0.15 ? 1 : 0,
    kehadiran_upa: rand() < 0.85 ? 'hadir' : 'izin',
    terlambat_upa_menit: rand() < 0.2 ? 10 : 0,
    hari_haid: hariHaid,
  }
  const t = haidDays > 0 ? getAdjustedTargets(tingkatan, haidDays) : TARGET_AMALAN[tingkatan] || TARGET_AMALAN.muda
  const tilawah = weekData.tilawah_juz + weekData.tilawah_halaman / 20
  const p = {
    persen_sholat_fardu: pct(fardu, t.sholat_fardu.target),
    persen_berjamaah: pct(jamaah, t.shalat_berjamaah.target),
    persen_sholat_dhuha: pct(weekData.sholat_dhuha, t.sholat_dhuha.target),
    persen_tilawah: pct(tilawah, t.tilawah.target),
    persen_matsurat: pct(weekData.matsurat, t.matsurat.target),
    persen_shaum: pct(weekData.shaum, t.shaum.target),
    persen_qiyamullail: pct(weekData.qiyamullail, t.qiyamullail.target),
  }
  const vals = Object.values(p)
  p.persen_rata_rata = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  return { weekData, persen: p }
}

/** History records (newest first), same shape as getHistory on the server. */
export function demoHistory(userId, tingkatan = 'muda', { weeks = 10, gender = 'ikhwan' } = {}) {
  const rand = seeded(String(userId))
  const records = []
  for (let i = 0; i < weeks; i++) {
    // Skip the running week: it is still being filled in
    const monday = mondayOfWeek(i + 1)
    const haidDays = gender === 'akhwat' && i % 4 === 1 ? 3 : 0
    const { weekData, persen } = buildWeek(rand, tingkatan, { haidDays, diligence: 0.7 + rand() * 0.25 })
    const submit = new Date(monday)
    submit.setDate(submit.getDate() + 6)
    submit.setHours(20, 15)
    records.push({
      user_id: userId,
      pekan_ke: weekNumberOf(monday),
      tahun: monday.getFullYear(),
      tingkatan,
      tanggal_mulai_pekan: monday.toISOString(),
      tanggal_submit: submit.toISOString(),
      is_terlambat: i === 3 ? 1 : 0,
      edit_count: i === 0 ? 1 : 0,
      ...persen,
      weekData,
    })
  }
  return records
}

const PREDIKAT = [
  [90, 'Istimewa', 'A'], [80, 'Sangat Baik', 'B+'], [70, 'Baik', 'B'],
  [60, 'Cukup', 'C'], [50, 'Kurang', 'D'], [0, 'Perlu Perbaikan', 'E'],
]

const SUMMARY_LABEL = {
  persen_sholat_fardu: 'Sholat Fardu',
  persen_berjamaah: 'Shalat Berjamaah',
  persen_sholat_dhuha: 'Sholat Dhuha',
  persen_tilawah: 'Tilawah Al-Quran',
  persen_matsurat: 'Al-Matsurat',
  persen_shaum: 'Puasa Sunnah',
  persen_qiyamullail: 'Qiyamullail',
}

/** Monthly report, same shape as getMonthlyReport on the server. */
export function demoMonthlyReport(user, bulan, tahun) {
  const tingkatan = user?.tingkatan || 'muda'
  const all = demoHistory(user?.user_id || user?.id || 'demo', tingkatan, { weeks: 16, gender: user?.gender })
  const records = all.filter(r => {
    const d = new Date(r.tanggal_mulai_pekan)
    return d.getMonth() + 1 === bulan && d.getFullYear() === tahun
  }).sort((a, b) => a.pekan_ke - b.pekan_ke)

  if (records.length === 0) {
    return { user, bulan, tahun, records: [], summary: null, totalWeeks: 0 }
  }

  const summary = {}
  Object.keys(SUMMARY_LABEL).forEach(field => {
    const avg = Math.round(records.reduce((s, r) => s + r[field], 0) / records.length)
    summary[field] = { average: avg, label: SUMMARY_LABEL[field] }
  })
  const rataRata = Math.round(Object.values(summary).reduce((s, x) => s + x.average, 0) / 7)
  const [, label, level] = PREDIKAT.find(([min]) => rataRata >= min)

  return {
    user,
    bulan,
    tahun,
    totalWeeks: records.length,
    rataRata,
    predikat: { label, level },
    summary,
    weekSummaries: records.map(r => ({ pekan: r.pekan_ke, rata_rata: r.persen_rata_rata, is_terlambat: !!r.is_terlambat })),
    weeks: records.map(r => ({
      pekan: r.pekan_ke,
      tahun: r.tahun,
      tingkatan,
      is_terlambat: !!r.is_terlambat,
      persen_rata_rata: r.persen_rata_rata,
      weekData: r.weekData,
    })),
  }
}
