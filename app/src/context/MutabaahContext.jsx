import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { HARI, WAKTU_SHALAT, TARGET_AMALAN, HALAMAN_PER_JUZ } from '../config/constants'
import {
  submitMutabaah as apiSubmit,
  resetWeek as apiReset,
  getCurrentWeek as apiGetCurrentWeek,
  getHistory as apiGetHistory,
  isApiConfigured,
} from '../services/api'
import { useAuth } from './AuthContext'

const MutabaahContext = createContext(null)

// Create empty weekly data structure
function createEmptyWeekData() {
  const sholat_fardu = {}
  const shalat_berjamaah = {}
  HARI.forEach(hari => {
    sholat_fardu[hari] = {}
    shalat_berjamaah[hari] = {}
    WAKTU_SHALAT.forEach(waktu => {
      sholat_fardu[hari][waktu] = false
      shalat_berjamaah[hari][waktu] = 'tidak' // jamaah | munfarid | tidak
    })
  })

  return {
    sholat_fardu,
    shalat_berjamaah,
    sholat_dhuha: 0,
    tilawah_juz: 0,
    tilawah_halaman: 0,
    matsurat: 0,
    shaum: 0,
    qiyamullail: 0,
    kehadiran_upa: 'hadir',
    terlambat_upa_menit: 0,
  }
}

// Calculate totals from the data
function calculateTotals(data) {
  let totalSholatFardu = 0
  let totalBerjamaah = 0

  HARI.forEach(hari => {
    WAKTU_SHALAT.forEach(waktu => {
      if (data.sholat_fardu[hari]?.[waktu]) totalSholatFardu++
      if (data.shalat_berjamaah[hari]?.[waktu] === 'jamaah') totalBerjamaah++
    })
  })

  const tilawahTotalJuz = data.tilawah_juz + (data.tilawah_halaman / HALAMAN_PER_JUZ)

  return {
    sholat_fardu: totalSholatFardu,
    shalat_berjamaah: totalBerjamaah,
    sholat_dhuha: data.sholat_dhuha || 0,
    tilawah: tilawahTotalJuz,
    matsurat: data.matsurat,
    shaum: data.shaum,
    qiyamullail: data.qiyamullail,
  }
}

// Calculate percentages per amalan
function calculatePercentages(totals, tingkatan) {
  const targets = TARGET_AMALAN[tingkatan]
  if (!targets) return {}

  const result = {}
  Object.keys(targets).forEach(key => {
    const target = targets[key].target
    const actual = totals[key] || 0
    result[key] = {
      actual,
      target,
      percentage: target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0,
      label: targets[key].label,
      satuan: targets[key].satuan,
    }
  })

  // Overall average
  const percentages = Object.values(result).map(r => r.percentage)
  result.rata_rata = {
    percentage: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
    label: 'Rata-rata Keseluruhan',
  }

  return result
}

// Get week info — pure function, always returns correct current week
function getWeekInfo(date = new Date()) {
  const d = new Date(date)
  // Get Monday of this week
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  // Week number
  const startOfYear = new Date(monday.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((monday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)

  return {
    weekNumber: weekNum,
    year: monday.getFullYear(),
    monday,
    sunday,
    label: `${monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  }
}

/**
 * Week-bound localStorage key — draft is tied to {year}_{week}
 */
function getWeekStorageKey(year, week) {
  return `mutabaah_data_${year}_${week}`
}

/**
 * Load draft from localStorage for a specific week
 */
function loadWeekDraft(year, week) {
  try {
    const key = getWeekStorageKey(year, week)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

/**
 * Save draft to localStorage for a specific week
 */
function saveWeekDraft(year, week, data) {
  try {
    const key = getWeekStorageKey(year, week)
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Silently fail
  }
}

/**
 * Clean up old week drafts (keep last 4 weeks only)
 */
function cleanupOldDrafts(currentYear, currentWeek) {
  try {
    const keysToKeep = new Set()
    for (let i = 0; i < 4; i++) {
      let w = currentWeek - i
      let y = currentYear
      if (w < 1) { w += 52; y-- }
      keysToKeep.add(getWeekStorageKey(y, w))
    }
    // Remove old mutabaah_data keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('mutabaah_data_') && !keysToKeep.has(key)) {
        localStorage.removeItem(key)
      }
    }
    // Also remove legacy flat key
    localStorage.removeItem('mutabaah_data')
  } catch {
    // Silently fail
  }
}

export function MutabaahProvider({ children }) {
  const { user } = useAuth()

  // weekInfo is now state so it can be updated
  const [weekInfo, setWeekInfo] = useState(() => getWeekInfo())

  const [weekData, setWeekData] = useState(() => {
    const wi = getWeekInfo()
    const draft = loadWeekDraft(wi.year, wi.weekNumber)
    return draft || createEmptyWeekData()
  })
  const [savedWeeks, setSavedWeeks] = useState(() => {
    const saved = localStorage.getItem('mutabaah_saved_weeks')
    return saved ? JSON.parse(saved) : []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  // Track which week we're currently editing
  const currentWeekRef = useRef(`${weekInfo.year}_${weekInfo.weekNumber}`)

  /**
   * B2 FIX: Detect week change on:
   * - Tab focus (visibilitychange)
   * - Periodic timer (every 60s)
   */
  useEffect(() => {
    function checkWeekChange() {
      const now = getWeekInfo()
      const newKey = `${now.year}_${now.weekNumber}`
      
      if (newKey !== currentWeekRef.current) {
        // Week changed! Reset form to empty (or draft for new week)
        currentWeekRef.current = newKey
        setWeekInfo(now)
        
        const draft = loadWeekDraft(now.year, now.weekNumber)
        setWeekData(draft || createEmptyWeekData())
        
        // Clean up old drafts
        cleanupOldDrafts(now.year, now.weekNumber)
      }
    }

    // Check on tab focus
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkWeekChange()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Check periodically (every 60s)
    const interval = setInterval(checkWeekChange, 60000)

    // Initial cleanup
    cleanupOldDrafts(weekInfo.year, weekInfo.weekNumber)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage — now week-bound
  const persistWeekData = useCallback((data) => {
    saveWeekDraft(weekInfo.year, weekInfo.weekNumber, data)
  }, [weekInfo.year, weekInfo.weekNumber])

  const updateField = useCallback((field, value) => {
    setWeekData(prev => {
      const updated = { ...prev, [field]: value }
      persistWeekData(updated)
      return updated
    })
  }, [persistWeekData])

  const updateSholatFardu = useCallback((hari, waktu, value) => {
    setWeekData(prev => {
      const updated = {
        ...prev,
        sholat_fardu: {
          ...prev.sholat_fardu,
          [hari]: {
            ...prev.sholat_fardu[hari],
            [waktu]: value,
          },
        },
      }
      persistWeekData(updated)
      return updated
    })
  }, [persistWeekData])

  const updateBerjamaah = useCallback((hari, waktu, value) => {
    setWeekData(prev => {
      const updated = {
        ...prev,
        shalat_berjamaah: {
          ...prev.shalat_berjamaah,
          [hari]: {
            ...prev.shalat_berjamaah[hari],
            [waktu]: value,
          },
        },
      }
      persistWeekData(updated)
      return updated
    })
  }, [persistWeekData])

  const submitWeek = useCallback(async (tingkatan) => {
    setIsSubmitting(true)
    setSyncError(null)

    try {
      const totals = calculateTotals(weekData)
      const percentages = calculatePercentages(totals, tingkatan)

      const record = {
        id: `${weekInfo.year}-${weekInfo.weekNumber}`,
        weekInfo,
        data: weekData,
        totals,
        percentages,
        submittedAt: new Date().toISOString(),
        isTerlambat: false,
      }

      // Save locally first (optimistic)
      setSavedWeeks(prev => {
        const filtered = prev.filter(w => w.id !== record.id)
        const updated = [record, ...filtered]
        localStorage.setItem('mutabaah_saved_weeks', JSON.stringify(updated))
        return updated
      })

      // Sync to API if configured
      if (isApiConfigured() && user) {
        try {
          await apiSubmit({
            userId: user.user_id || user.id,
            grupId: user.grup_id || '',
            tingkatan: tingkatan,
            pekan: weekInfo.weekNumber,
            tahun: weekInfo.year,
            weekData,
          })
        } catch (err) {
          console.error('[Sync] Submit gagal, data tersimpan lokal:', err)
          setSyncError('Data tersimpan lokal. Akan disinkronkan saat koneksi tersedia.')
        }
      }

      return record
    } finally {
      setIsSubmitting(false)
    }
  }, [weekData, weekInfo, user])

  /**
   * B3 FIX: resetWeek now also removes the entry from savedWeeks array
   */
  const resetWeek = useCallback(async () => {
    const empty = createEmptyWeekData()
    setWeekData(empty)
    persistWeekData(empty)

    // B3: Remove from savedWeeks immediately
    const currentId = `${weekInfo.year}-${weekInfo.weekNumber}`
    setSavedWeeks(prev => {
      const updated = prev.filter(w => w.id !== currentId)
      localStorage.setItem('mutabaah_saved_weeks', JSON.stringify(updated))
      return updated
    })

    // Sync reset to API if configured
    if (isApiConfigured() && user) {
      try {
        await apiReset(
          user.user_id || user.id,
          String(weekInfo.year),
          String(weekInfo.weekNumber)
        )
      } catch (err) {
        console.error('[Sync] Reset gagal:', err)
      }
    }
  }, [user, weekInfo, persistWeekData])

  /**
   * Load data from server (call on app init or manual refresh)
   * B2 FIX: properly resets weekData when server has no data for current week
   */
  const syncFromServer = useCallback(async () => {
    if (!isApiConfigured() || !user) return

    setIsSyncing(true)
    setSyncError(null)

    try {
      const userId = user.user_id || user.id

      // Load current week data from server
      const weekResult = await apiGetCurrentWeek(
        userId,
        String(weekInfo.year),
        String(weekInfo.weekNumber)
      )

      if (weekResult && weekResult.exists && weekResult.data) {
        setWeekData(weekResult.data)
        persistWeekData(weekResult.data)
      } else {
        // B2 FIX: server has no data for this week — reset to empty
        // (don't keep stale draft from a previous week)
        const draft = loadWeekDraft(weekInfo.year, weekInfo.weekNumber)
        if (!draft) {
          // No local draft either — truly empty
          const empty = createEmptyWeekData()
          setWeekData(empty)
          persistWeekData(empty)
        }
        // If there IS a local draft for this week, keep it (user is typing offline)
      }

      // Load history
      const historyResult = await apiGetHistory(
        userId,
        String(weekInfo.year),
        '20',
        '0'
      )

      if (historyResult && historyResult.records) {
        const formatted = historyResult.records.map(r => ({
          id: `${r.tahun}-${r.pekan_ke}`,
          weekInfo: {
            weekNumber: parseInt(r.pekan_ke),
            year: parseInt(r.tahun),
            label: r.tanggal_mulai_pekan ? new Date(r.tanggal_mulai_pekan).toLocaleDateString('id-ID') : '',
          },
          percentages: {
            sholat_fardu: { percentage: parseInt(r.persen_sholat_fardu) || 0, label: 'Sholat Fardu' },
            shalat_berjamaah: { percentage: parseInt(r.persen_berjamaah) || 0, label: 'Shalat Berjamaah' },
            sholat_dhuha: { percentage: parseInt(r.persen_sholat_dhuha) || 0, label: 'Sholat Dhuha' },
            tilawah: { percentage: parseInt(r.persen_tilawah) || 0, label: 'Tilawah' },
            matsurat: { percentage: parseInt(r.persen_matsurat) || 0, label: 'Al-Matsurat' },
            shaum: { percentage: parseInt(r.persen_shaum) || 0, label: 'Puasa Sunnah' },
            qiyamullail: { percentage: parseInt(r.persen_qiyamullail) || 0, label: 'Qiyamullail' },
            rata_rata: { percentage: parseInt(r.persen_rata_rata) || 0, label: 'Rata-rata' },
          },
          submittedAt: r.tanggal_submit,
          isTerlambat: r.is_terlambat === 1 || r.is_terlambat === '1',
          editCount: parseInt(r.edit_count) || 0,
          lastEditedAt: r.last_edited_at || null,
          firstSubmittedAt: r.first_submitted_at || r.tanggal_submit,
        }))
        setSavedWeeks(formatted)
        localStorage.setItem('mutabaah_saved_weeks', JSON.stringify(formatted))
      }
    } catch (err) {
      console.error('[Sync] Gagal sinkronisasi:', err)
      setSyncError('Gagal memuat data dari server. Menampilkan data lokal.')
    } finally {
      setIsSyncing(false)
    }
  }, [user, weekInfo, persistWeekData])

  return (
    <MutabaahContext.Provider value={{
      weekData,
      weekInfo,
      savedWeeks,
      setSavedWeeks,
      isSubmitting,
      isSyncing,
      syncError,
      updateField,
      updateSholatFardu,
      updateBerjamaah,
      submitWeek,
      resetWeek,
      syncFromServer,
      calculateTotals: () => calculateTotals(weekData),
      calculatePercentages: (tingkatan) => calculatePercentages(calculateTotals(weekData), tingkatan),
    }}>
      {children}
    </MutabaahContext.Provider>
  )
}

export function useMutabaah() {
  const ctx = useContext(MutabaahContext)
  if (!ctx) throw new Error('useMutabaah must be used within MutabaahProvider')
  return ctx
}
