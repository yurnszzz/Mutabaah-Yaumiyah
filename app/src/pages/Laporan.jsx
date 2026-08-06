import { useState, useCallback, useEffect } from 'react'
import { useMutabaah } from '../context/MutabaahContext'
import { useAuth } from '../context/AuthContext'
import { TARGET_AMALAN, getEffectiveTingkatan } from '../config/constants'
import {
  getHistory as apiGetHistory,
  isApiConfigured,
} from '../services/api'
import {
  BarChart3, CalendarDays, TrendingUp, FileText, Trash2,
  RotateCcw, ChevronDown, ChevronUp, Loader2, AlertTriangle,
  Edit3, RefreshCw
} from 'lucide-react'
import './Laporan.css'

const ITEMS_PER_PAGE = 8

export default function Laporan() {
  const { user } = useAuth()
  const { savedWeeks, weekInfo, resetWeek } = useMutabaah()
  const tingkatan = getEffectiveTingkatan(user)

  const [expandedId, setExpandedId] = useState(null)
  const [showCount, setShowCount] = useState(ITEMS_PER_PAGE)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // API-loaded history
  const [apiHistory, setApiHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // Load history from API on mount
  useEffect(() => {
    loadHistoryFromApi()
  }, [user])

  async function loadHistoryFromApi() {
    if (!user || !isApiConfigured()) return
    setHistoryLoading(true)
    try {
      const userId = user.user_id || user.id
      const tahun = new Date().getFullYear()
      const result = await apiGetHistory(userId, tahun, 52, 0)
      if (result?.records && Array.isArray(result.records)) {
        // Transform API records to match savedWeeks format
        const mapped = result.records.map(r => ({
          id: `${r.tahun}-${r.pekan}`,
          weekInfo: {
            year: parseInt(r.tahun),
            weekNumber: parseInt(r.pekan),
            label: r.label || `Pekan ${r.pekan}, ${r.tahun}`,
          },
          percentages: r.percentages || {
            sholat_fardu: { label: 'Sholat Fardu', percentage: r.persen_sholat || 0 },
            shalat_berjamaah: { label: 'Berjamaah', percentage: r.persen_jamaah || 0 },
            sholat_dhuha: { label: 'Dhuha', percentage: r.persen_dhuha || 0 },
            tilawah: { label: 'Tilawah', percentage: r.persen_tilawah || 0 },
            matsurat: { label: 'Matsurat', percentage: r.persen_matsurat || 0 },
            shaum: { label: 'Puasa Sunnah', percentage: r.persen_shaum || 0 },
            qiyamullail: { label: 'Qiyamullail', percentage: r.persen_qiyam || 0 },
            rata_rata: { label: 'Rata-rata', percentage: r.persen_total || r.rata_rata || 0 },
          },
          submittedAt: r.tanggal_submit || r.created_at,
          editCount: r.edit_count || 0,
          lastEditedAt: r.last_edited_at || null,
          isTerlambat: r.is_terlambat || false,
          fromApi: true,
        }))
        setApiHistory(mapped)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
      setHistoryLoaded(true)
    }
  }

  // Merge: prefer API data, supplement with local savedWeeks
  const allWeeks = (() => {
    if (apiHistory.length > 0) {
      // Use API data, merge with local-only entries
      const apiIds = new Set(apiHistory.map(w => w.id))
      const localOnly = savedWeeks.filter(w => !apiIds.has(w.id))
      return [...localOnly, ...apiHistory]
    }
    return savedWeeks
  })()

  // Sort by year desc, then week desc
  const sortedWeeks = [...allWeeks].sort((a, b) => {
    const yearDiff = (b.weekInfo?.year || 0) - (a.weekInfo?.year || 0)
    if (yearDiff !== 0) return yearDiff
    return (b.weekInfo?.weekNumber || 0) - (a.weekInfo?.weekNumber || 0)
  })

  function handleReset() {
    setShowDeleteModal(true)
  }

  async function confirmDelete() {
    setDeleting(true)
    await resetWeek()
    setDeleting(false)
    setShowDeleteModal(false)
  }


  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const displayedWeeks = sortedWeeks.slice(0, showCount)
  const hasMore = showCount < sortedWeeks.length

  const isCurrentWeek = (week) => {
    return week.weekInfo?.year === weekInfo.year && week.weekInfo?.weekNumber === weekInfo.weekNumber
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <p className="page-header__greeting">Laporan</p>
        <h1 className="page-header__title">Riwayat Mutabaah</h1>
        <p className="page-header__subtitle">
          Data pencapaian pekan-pekan sebelumnya
        </p>
      </div>

      {/* Current Week Quick Action */}
      <div className="laporan-current card">
        <div className="card__body">
          <div className="laporan-current__info">
            <RotateCcw size={16} />
            <span>Data pekan ini belum final? Anda bisa mengulang pengisian.</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button className="btn btn--outline btn--sm" onClick={() => loadHistoryFromApi()} disabled={historyLoading}>
              <RefreshCw size={14} className={historyLoading ? 'admin-loading__spinner' : ''} />
              Refresh
            </button>
            <button className="btn btn--outline btn--sm" onClick={handleReset}>
              <Trash2 size={14} />
              Hapus Data Pekan Ini
            </button>
          </div>
        </div>
      </div>

      {/* B3 FIX: Delete confirmation modal with specific week info */}
      {showDeleteModal && (
        <div className="laporan-modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="laporan-modal" onClick={e => e.stopPropagation()}>
            <div className="laporan-modal__icon">
              <AlertTriangle size={32} />
            </div>
            <h3 className="laporan-modal__title">Hapus Data Pekan Ini?</h3>
            <p className="laporan-modal__desc">
              Data mutabaah <strong>Pekan {weekInfo.weekNumber}</strong> ({weekInfo.label}) akan dihapus.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="laporan-modal__actions">
              <button className="btn btn--outline btn--sm" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Batal
              </button>
              <button className="btn btn--danger btn--sm" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className="login-form__spinner" /> Menghapus...</> : <><Trash2 size={14} /> Ya, Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyLoading && !historyLoaded ? (
        <div className="admin-loading" style={{ padding: 'var(--space-8)' }}>
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat riwayat dari server...</p>
        </div>
      ) : sortedWeeks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <FileText size={64} />
          </div>
          <h3 className="empty-state__title">Belum Ada Data</h3>
          <p className="empty-state__desc">
            Data laporan akan muncul setelah Anda mengisi mutabaah pekan pertama.
          </p>
        </div>
      ) : (
        <>
          {/* B4 FIX: Collapsed cards with expand-on-click */}
          <div className="laporan-list">
            {displayedWeeks.map(week => {
              const pct = week.percentages?.rata_rata?.percentage || 0
              const colorClass = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'
              const isExpanded = expandedId === week.id
              const amalan = Object.keys(TARGET_AMALAN[tingkatan])

              return (
                <div key={week.id} className={`laporan-card card ${isExpanded ? 'laporan-card--expanded' : ''}`}>
                  {/* Collapsed summary row — always visible */}
                  <div className="laporan-card__summary" onClick={() => toggleExpand(week.id)}>
                    <div className="laporan-card__summary-left">
                      <CalendarDays size={16} className="laporan-card__icon" />
                      <div>
                        <span className="laporan-card__week">Pekan {week.weekInfo.weekNumber}</span>
                        <span className="laporan-card__date-inline">{week.weekInfo.label || week.weekInfo.year}</span>
                      </div>
                    </div>
                    <div className="laporan-card__summary-right">
                      {week.fromApi && (
                        <span className="badge badge--secondary badge--sm" style={{ fontSize: '9px' }}>Server</span>
                      )}
                      {week.isTerlambat && (
                        <span className="badge badge--warning badge--sm">Terlambat</span>
                      )}
                      <span className={`laporan-card__pct laporan-card__pct--${colorClass}`}>
                        {pct}%
                      </span>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded detail — only when clicked */}
                  {isExpanded && (
                    <div className="laporan-card__detail">
                      <div className="laporan-card__bars">
                        {amalan.map(key => {
                          const data = week.percentages?.[key]
                          if (!data) return null
                          const barColor = data.percentage >= 80 ? 'success' : data.percentage >= 50 ? 'warning' : 'danger'
                          return (
                            <div key={key} className="laporan-bar">
                              <div className="laporan-bar__header">
                                <span className="laporan-bar__label">{data.label}</span>
                                <span className={`laporan-bar__pct laporan-bar__pct--${barColor}`}>
                                  {data.percentage}%
                                </span>
                              </div>
                              <div className="progress" style={{ height: 6 }}>
                                <div
                                  className={`progress__fill progress__fill--${barColor}`}
                                  style={{ width: `${data.percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <p className="laporan-card__submitted">
                        Disubmit: {week.submittedAt ? new Date(week.submittedAt).toLocaleString('id-ID') : '-'}
                        {week.editCount > 0 && (
                          <span className="laporan-card__edited">
                            · Diedit {week.editCount}× {week.lastEditedAt && `(terakhir: ${new Date(week.lastEditedAt).toLocaleString('id-ID')})`}
                          </span>
                        )}
                      </p>

                      {/* Edit button — navigates to input with this week's data */}
                      {isCurrentWeek(week) && (
                        <div className="laporan-card__edit-section">
                          <a href="/input" className="btn btn--outline btn--sm" style={{ textDecoration: 'none' }}>
                            <Edit3 size={14} />
                            Edit Pengisian Pekan Ini
                          </a>
                          <p className="laporan-card__edit-hint">
                            Anda dapat mengedit data pekan berjalan. Setiap perubahan tercatat di audit trail.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* B4: Load more pagination */}
          {hasMore && (
            <div className="laporan-loadmore">
              <button
                className="btn btn--outline btn--sm"
                onClick={() => setShowCount(prev => prev + ITEMS_PER_PAGE)}
              >
                Muat {Math.min(ITEMS_PER_PAGE, sortedWeeks.length - showCount)} pekan lagi
                ({sortedWeeks.length - showCount} tersisa)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
