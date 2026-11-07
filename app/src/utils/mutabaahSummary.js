// Turns raw weekly data into plain counts ("32 dari 35 kali") so pages can
// show what was actually done, not only a percentage.

import {
  HARI, WAKTU_SHALAT, HALAMAN_PER_JUZ, TARGET_AMALAN, getAdjustedTargets,
} from '../config/constants'

export const AMALAN_ORDER = [
  'sholat_fardu', 'shalat_berjamaah', 'sholat_dhuha', 'tilawah',
  'matsurat', 'shaum', 'qiyamullail',
]

export const AMALAN_SHORT_LABEL = {
  sholat_fardu: 'Sholat Fardu',
  shalat_berjamaah: 'Berjamaah',
  sholat_dhuha: 'Dhuha',
  tilawah: 'Tilawah',
  matsurat: 'Al-Matsurat',
  shaum: 'Puasa Sunnah',
  qiyamullail: 'Qiyamullail',
}

const PERSEN_COLUMN = {
  sholat_fardu: 'persen_sholat_fardu',
  shalat_berjamaah: 'persen_berjamaah',
  sholat_dhuha: 'persen_sholat_dhuha',
  tilawah: 'persen_tilawah',
  matsurat: 'persen_matsurat',
  shaum: 'persen_shaum',
  qiyamullail: 'persen_qiyamullail',
  rata_rata: 'persen_rata_rata',
}

const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })

export function formatNumber(n) {
  return nf.format(Number(n) || 0)
}

export function unitOf(satuan = '') {
  return satuan.startsWith('juz') ? 'juz' : 'kali'
}

export function pctColor(pct) {
  return pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'
}

/** "1 juz 5 halaman" from the raw tilawah fields */
export function formatTilawah(juz, halaman) {
  const j = Number(juz) || 0
  const h = Number(halaman) || 0
  if (!j && !h) return 'Belum ada'
  const parts = []
  if (j) parts.push(`${formatNumber(j)} juz`)
  if (h) parts.push(`${formatNumber(h)} halaman`)
  return parts.join(' ')
}

/**
 * Per-amalan counts for one week.
 * Returns { rows, haidDays, days, tilawahText, kehadiran, terlambatMenit, average }
 */
export function summarizeWeek(weekData, tingkatan = 'muda', haidDaysOverride) {
  if (!weekData) return null
  const hariHaid = Array.isArray(weekData.hari_haid) ? weekData.hari_haid : []
  const haidDays = haidDaysOverride ?? hariHaid.length
  const targets = haidDays > 0
    ? getAdjustedTargets(tingkatan, haidDays)
    : (TARGET_AMALAN[tingkatan] || TARGET_AMALAN.muda)

  // Per-day prayer breakdown. Totals follow the server formula:
  // fardu = ticked slots, berjamaah = slots marked "jamaah".
  let totalFardu = 0
  let totalJamaah = 0
  const days = HARI.map(hari => {
    const fardu = weekData.sholat_fardu?.[hari] || {}
    const jamaah = weekData.shalat_berjamaah?.[hari] || {}
    const slots = WAKTU_SHALAT.map(waktu => {
      const prayed = fardu[waktu] === true || fardu[waktu] === 1 || fardu[waktu] === '1'
      const isJamaah = jamaah[waktu] === 'jamaah'
      if (prayed) totalFardu++
      if (isJamaah) totalJamaah++
      return { waktu, status: isJamaah ? 'jamaah' : prayed ? 'sendiri' : 'tidak' }
    })
    return {
      hari,
      isHaid: hariHaid.includes(hari),
      slots,
      prayed: slots.filter(s => s.status !== 'tidak').length,
      jamaah: slots.filter(s => s.status === 'jamaah').length,
    }
  })

  const tilawahJuz = (Number(weekData.tilawah_juz) || 0) +
    (Number(weekData.tilawah_halaman) || 0) / HALAMAN_PER_JUZ

  const actuals = {
    sholat_fardu: totalFardu,
    shalat_berjamaah: totalJamaah,
    sholat_dhuha: Number(weekData.sholat_dhuha) || 0,
    tilawah: Math.round(tilawahJuz * 100) / 100,
    matsurat: Number(weekData.matsurat) || 0,
    shaum: Number(weekData.shaum) || 0,
    qiyamullail: Number(weekData.qiyamullail) || 0,
  }

  const rows = AMALAN_ORDER.filter(k => targets[k]).map(key => {
    const t = targets[key]
    const target = t.target
    const actual = actuals[key]
    const pct = target > 0
      ? Math.min(Math.round((actual / target) * 100), 100)
      : (haidDays >= 7 ? 100 : 0)
    return {
      key,
      label: t.label,
      shortLabel: AMALAN_SHORT_LABEL[key] || t.label,
      actual,
      target,
      originalTarget: t.originalTarget ?? target,
      isAdjusted: !!t.isAdjusted,
      unit: unitOf(t.satuan),
      pct,
    }
  })

  const average = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length)
    : 0

  return {
    rows,
    days,
    haidDays,
    average,
    tilawahText: formatTilawah(weekData.tilawah_juz, weekData.tilawah_halaman),
    kehadiran: weekData.kehadiran_upa || '',
    terlambatMenit: Number(weekData.terlambat_upa_menit) || 0,
  }
}

/** One-line glance for collapsed cards: "Sholat 32/35 · Tilawah 1 juz" */
export function weekGlance(weekData, tingkatan = 'muda') {
  const s = summarizeWeek(weekData, tingkatan)
  if (!s) return ''
  const fardu = s.rows.find(r => r.key === 'sholat_fardu')
  const tilawah = s.rows.find(r => r.key === 'tilawah')
  const parts = []
  if (fardu) parts.push(`Sholat ${formatNumber(fardu.actual)}/${formatNumber(fardu.target)}`)
  if (tilawah) parts.push(`Tilawah ${formatNumber(tilawah.actual)} juz`)
  return parts.join(' · ')
}

/**
 * One record from getHistory / getMemberMutabaah → the shape the history
 * lists use. Keeps the raw weekData so counts can be shown.
 */
export function mapServerRecord(r, fallbackTingkatan = 'muda') {
  const pekan = parseInt(r.pekan_ke ?? r.pekan)
  const tahun = parseInt(r.tahun)
  const percentages = {}
  Object.entries(PERSEN_COLUMN).forEach(([key, col]) => {
    percentages[key] = {
      percentage: parseInt(r[col]) || 0,
      label: key === 'rata_rata' ? 'Rata-rata' : AMALAN_SHORT_LABEL[key],
    }
  })
  return {
    id: `${tahun}-${pekan}`,
    weekInfo: {
      weekNumber: pekan,
      year: tahun,
      label: formatWeekRange(r.tanggal_mulai_pekan),
    },
    tingkatan: r.tingkatan || fallbackTingkatan,
    weekData: r.weekData || null,
    percentages,
    submittedAt: r.tanggal_submit || r.created_at || null,
    isTerlambat: r.is_terlambat === 1 || r.is_terlambat === '1' || r.is_terlambat === true,
    editCount: parseInt(r.edit_count) || 0,
    lastEditedAt: r.last_edited_at || null,
    firstSubmittedAt: r.first_submitted_at || r.tanggal_submit || null,
    fromApi: true,
  }
}

/** "6 Okt – 12 Okt 2026" from the Monday of the week */
export function formatWeekRange(mondayIso) {
  if (!mondayIso) return ''
  const monday = new Date(mondayIso)
  if (Number.isNaN(monday.getTime())) return ''
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const a = monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const b = sunday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${a} – ${b}`
}

/**
 * Add up several weeks (monthly report). Targets are summed per week so
 * haid adjustments stay correct.
 */
export function summarizeWeeks(weeks, fallbackTingkatan = 'muda') {
  const totals = {}
  const perWeek = []
  weeks.forEach(w => {
    const s = summarizeWeek(w.weekData, w.tingkatan || fallbackTingkatan)
    if (!s) return
    perWeek.push({ pekan: w.pekan, summary: s, isTerlambat: w.is_terlambat })
    s.rows.forEach(row => {
      if (!totals[row.key]) {
        totals[row.key] = { ...row, actual: 0, target: 0 }
      }
      totals[row.key].actual += row.actual
      totals[row.key].target += row.target
    })
  })
  Object.values(totals).forEach(t => {
    t.actual = Math.round(t.actual * 100) / 100
    t.target = Math.round(t.target * 100) / 100
  })
  return {
    totals: AMALAN_ORDER.map(k => totals[k]).filter(Boolean),
    perWeek,
  }
}
