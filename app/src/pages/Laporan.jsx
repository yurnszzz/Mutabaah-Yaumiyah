import { useState, useCallback } from 'react'
import { useMutabaah } from '../context/MutabaahContext'
import { useAuth } from '../context/AuthContext'
import { TARGET_AMALAN } from '../config/constants'
import {
  BarChart3, CalendarDays, TrendingUp, FileText, Trash2,
  RotateCcw, ChevronDown, ChevronUp, Loader2, AlertTriangle
} from 'lucide-react'
import './Laporan.css'

const ITEMS_PER_PAGE = 8

export default function Laporan() {
  const { user } = useAuth()
  const { savedWeeks, weekInfo, resetWeek } = useMutabaah()
  const tingkatan = user?.tingkatan || 'muda'

  const [expandedId, setExpandedId] = useState(null)
  const [showCount, setShowCount] = useState(ITEMS_PER_PAGE)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const displayedWeeks = savedWeeks.slice(0, showCount)
  const hasMore = showCount < savedWeeks.length

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
          <button className="btn btn--outline btn--sm" onClick={handleReset}>
            <Trash2 size={14} />
            Hapus Data Pekan Ini
          </button>
        </div>
      </div>

      {/* B3 FIX: Delete confirmation modal with specific week info */}
      {showDeleteModal && (
        <div className="laporan-modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="laporan-modal" onClick={e => e.stopPropagation()}>
            <div className="laporan-modal__icon">
              <AlertTriangle size={32} />
            </div>
            <h3 className="laporan-modal__title">Hapus Data Pekan?</h3>
            <p className="laporan-modal__desc">
              Anda akan menghapus data mutabaah <strong>Pekan {weekInfo.weekNumber}</strong> ({weekInfo.label}).
              Data yang sudah disimpan di server juga akan dihapus. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="laporan-modal__actions">
              <button
                className="btn btn--outline btn--sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                className="btn btn--danger btn--sm"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? <><Loader2 size={14} className="login-form__spinner" /> Menghapus...</> : <><Trash2 size={14} /> Ya, Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {savedWeeks.length === 0 ? (
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
                        Disubmit: {new Date(week.submittedAt).toLocaleString('id-ID')}
                        {week.editCount > 0 && (
                          <span className="laporan-card__edited">
                            · Diedit {week.editCount}× (terakhir: {new Date(week.lastEditedAt).toLocaleString('id-ID')})
                          </span>
                        )}
                      </p>
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
                Muat {Math.min(ITEMS_PER_PAGE, savedWeeks.length - showCount)} pekan lagi
                ({savedWeeks.length - showCount} tersisa)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
