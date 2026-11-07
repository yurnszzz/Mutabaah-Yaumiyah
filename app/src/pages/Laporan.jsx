import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMutabaah } from '../context/MutabaahContext'
import { useAuth } from '../context/AuthContext'
import { getEffectiveTingkatan } from '../config/constants'
import {
  getHistory as apiGetHistory,
  isApiConfigured,
} from '../services/api'
import { demoHistory } from '../services/demoData'
import { mapServerRecord, weekGlance, pctColor } from '../utils/mutabaahSummary'
import WeekDetail from '../components/WeekDetail'
import {
  CalendarDays, FileText, Trash2, RotateCcw, ChevronDown, ChevronUp, Loader2, AlertTriangle, Edit3, RefreshCw
} from 'lucide-react'
import './Laporan.css'

const ITEMS_PER_PAGE = 8

export default function Laporan() {
  const { user } = useAuth()
  const { savedWeeks, weekInfo, resetWeek } = useMutabaah()
  const tingkatan = getEffectiveTingkatan(user)
  const thisYear = new Date().getFullYear()

  const [tahun, setTahun] = useState(thisYear)
  const [expandedId, setExpandedId] = useState(null)
  const [showCount, setShowCount] = useState(ITEMS_PER_PAGE)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // API-loaded history
  const [apiHistory, setApiHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    loadHistoryFromApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tahun])

  async function loadHistoryFromApi() {
    if (!user) return
    if (!isApiConfigured()) {
      // Mode demo: data contoh
      const recs = tahun === thisYear
        ? demoHistory(user.user_id || user.id, tingkatan, { gender: user.gender })
        : []
      setApiHistory(recs.map(r => mapServerRecord(r, tingkatan)))
      setHistoryLoaded(true)
      return
    }
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const userId = user.user_id || user.id
      const result = await apiGetHistory(userId, tahun, 53, 0)
      if (result?.records && Array.isArray(result.records)) {
        setApiHistory(result.records.map(r => mapServerRecord(r, tingkatan)))
      } else {
        setApiHistory([])
      }
    } catch (err) {
      console.error('Failed to load history:', err)
      setHistoryError('Riwayat dari server belum bisa dimuat. Periksa koneksi internet lalu ketuk Muat Ulang.')
    } finally {
      setHistoryLoading(false)
      setHistoryLoaded(true)
    }
  }

  // Merge: prefer API data, supplement with local entries of the same year
  const localThisYear = savedWeeks.filter(w => (w.weekInfo?.year || thisYear) === tahun)
  const allWeeks = (() => {
    if (apiHistory.length > 0) {
      const apiIds = new Set(apiHistory.map(w => w.id))
      return [...localThisYear.filter(w => !apiIds.has(w.id)), ...apiHistory]
    }
    return localThisYear
  })()

  // Newest first
  const sortedWeeks = [...allWeeks].sort((a, b) => {
    const yearDiff = (b.weekInfo?.year || 0) - (a.weekInfo?.year || 0)
    if (yearDiff !== 0) return yearDiff
    return (b.weekInfo?.weekNumber || 0) - (a.weekInfo?.weekNumber || 0)
  })

  async function confirmDelete() {
    setDeleting(true)
    await resetWeek()
    setDeleting(false)
    setShowDeleteModal(false)
    loadHistoryFromApi()
  }

  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const displayedWeeks = sortedWeeks.slice(0, showCount)
  const hasMore = showCount < sortedWeeks.length

  const isCurrentWeek = (week) =>
    week.weekInfo?.year === weekInfo.year && week.weekInfo?.weekNumber === weekInfo.weekNumber

  const yearOptions = [thisYear, thisYear - 1, thisYear - 2]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Riwayat Mutabaah</h1>
        <p className="page-header__subtitle">
          Semua pengisian Anda, dari pekan terbaru sampai yang lama. Ketuk satu pekan untuk melihat jumlah amalan yang dikerjakan.
        </p>
      </div>

      {/* Toolbar */}
      <div className="laporan-toolbar">
        <label className="laporan-toolbar__year">
          <span>Tahun</span>
          <select
            id="laporan-tahun"
            value={tahun}
            onChange={e => { setTahun(Number(e.target.value)); setShowCount(ITEMS_PER_PAGE); setExpandedId(null) }}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <button
          id="laporan-refresh"
          className="btn btn--outline btn--sm"
          onClick={() => loadHistoryFromApi()}
          disabled={historyLoading}
        >
          <RefreshCw size={16} className={historyLoading ? 'admin-loading__spinner' : ''} />
          Muat Ulang
        </button>
      </div>

      {/* Current week quick action */}
      {tahun === weekInfo.year && (
        <div className="laporan-current card">
          <div className="card__body">
            <div className="laporan-current__info">
              <RotateCcw size={16} />
              <span>Ingin mengulang pengisian pekan ini dari awal?</span>
            </div>
            <button id="laporan-reset" className="btn btn--outline btn--sm" onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={16} />
              Hapus Data Pekan Ini
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="laporan-modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="laporan-modal" role="dialog" aria-modal="true" aria-labelledby="laporan-modal-title" onClick={e => e.stopPropagation()}>
            <div className="laporan-modal__icon">
              <AlertTriangle size={32} />
            </div>
            <h3 id="laporan-modal-title" className="laporan-modal__title">Hapus Data Pekan Ini?</h3>
            <p className="laporan-modal__desc">
              Data mutabaah <strong>Pekan {weekInfo.weekNumber}</strong> ({weekInfo.label}) akan dihapus
              dan tidak bisa dikembalikan.
            </p>
            <div className="laporan-modal__actions">
              <button className="btn btn--outline btn--sm" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Batal
              </button>
              <button className="btn btn--danger btn--sm" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={16} className="login-form__spinner" /> Menghapus...</> : <><Trash2 size={16} /> Ya, Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyError && <p className="laporan-error" role="alert">{historyError}</p>}

      {historyLoading && !historyLoaded ? (
        <div className="admin-loading" style={{ padding: 'var(--space-8)' }}>
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat riwayat...</p>
        </div>
      ) : sortedWeeks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <FileText size={64} />
          </div>
          <h3 className="empty-state__title">Belum ada pengisian di {tahun}</h3>
          <p className="empty-state__desc">
            Riwayat akan muncul di sini setelah Anda mengisi dan mengirim mutabaah pekanan.
          </p>
        </div>
      ) : (
        <>
          <p className="laporan-count">{sortedWeeks.length} pekan tercatat di {tahun}</p>
          <div className="laporan-list">
            {displayedWeeks.map(week => {
              const pct = week.percentages?.rata_rata?.percentage || 0
              const colorClass = pctColor(pct)
              const isExpanded = expandedId === week.id
              const glance = weekGlance(week.weekData || week.data, week.tingkatan || tingkatan)
              const detailId = `laporan-detail-${week.id}`

              return (
                <div key={week.id} className={`laporan-card card ${isExpanded ? 'laporan-card--expanded' : ''}`}>
                  <button
                    type="button"
                    className="laporan-card__summary"
                    onClick={() => toggleExpand(week.id)}
                    aria-expanded={isExpanded}
                    aria-controls={detailId}
                  >
                    <div className="laporan-card__summary-left">
                      <CalendarDays size={18} className="laporan-card__icon" />
                      <div className="laporan-card__titles">
                        <span className="laporan-card__week">
                          Pekan {week.weekInfo.weekNumber}
                          {isCurrentWeek(week) && <span className="laporan-card__now">Pekan ini</span>}
                        </span>
                        <span className="laporan-card__date-inline">{week.weekInfo.label || week.weekInfo.year}</span>
                        {glance && <span className="laporan-card__glance">{glance}</span>}
                      </div>
                    </div>
                    <div className="laporan-card__summary-right">
                      {week.isTerlambat && (
                        <span className="badge badge--warning badge--sm">Terlambat</span>
                      )}
                      <span className={`laporan-card__pct laporan-card__pct--${colorClass}`}>
                        {pct}%
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="laporan-card__detail" id={detailId}>
                      <WeekDetail
                        weekData={week.weekData || week.data}
                        tingkatan={week.tingkatan || tingkatan}
                        percentages={week.percentages}
                      />

                      <p className="laporan-card__submitted">
                        Dikirim: {week.submittedAt ? new Date(week.submittedAt).toLocaleString('id-ID') : '-'}
                        {week.editCount > 0 && (
                          <span className="laporan-card__edited">
                            · Diubah {week.editCount}× {week.lastEditedAt && `(terakhir ${new Date(week.lastEditedAt).toLocaleString('id-ID')})`}
                          </span>
                        )}
                      </p>

                      {isCurrentWeek(week) && (
                        <div className="laporan-card__edit-section">
                          <Link to="/input" className="btn btn--outline btn--sm">
                            <Edit3 size={16} />
                            Ubah Pengisian Pekan Ini
                          </Link>
                          <p className="laporan-card__edit-hint">
                            Pekan yang sedang berjalan masih bisa diubah. Setiap perubahan tercatat.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div className="laporan-loadmore">
              <button
                id="laporan-loadmore"
                className="btn btn--outline btn--sm"
                onClick={() => setShowCount(prev => prev + ITEMS_PER_PAGE)}
              >
                Tampilkan {Math.min(ITEMS_PER_PAGE, sortedWeeks.length - showCount)} pekan sebelumnya
                ({sortedWeeks.length - showCount} lagi)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
