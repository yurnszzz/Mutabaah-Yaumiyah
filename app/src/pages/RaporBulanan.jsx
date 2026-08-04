import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getMonthlyReport as apiGetMonthlyReport,
  isApiConfigured
} from '../services/api'
import {
  FileText, Calendar, Loader2, Printer, ChevronLeft, ChevronRight,
  Award, TrendingUp
} from 'lucide-react'
import './RaporBulanan.css'

const BULAN_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function RaporBulanan() {
  const { user } = useAuth()
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef(null)

  const userId = user?.user_id || user?.id

  useEffect(() => {
    loadReport()
  }, [bulan, tahun])

  async function loadReport() {
    setLoading(true)
    try {
      if (isApiConfigured() && userId) {
        const result = await apiGetMonthlyReport(userId, bulan, tahun)
        if (result && !result.error) {
          setData(result)
        } else {
          setData(null)
        }
      }
    } catch (err) {
      console.error('Failed to load monthly report:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function prevMonth() {
    if (bulan === 1) {
      setBulan(12)
      setTahun(prev => prev - 1)
    } else {
      setBulan(prev => prev - 1)
    }
  }

  function nextMonth() {
    if (bulan === 12) {
      setBulan(1)
      setTahun(prev => prev + 1)
    } else {
      setBulan(prev => prev + 1)
    }
  }

  const isCurrentOrFuture = tahun > now.getFullYear() ||
    (tahun === now.getFullYear() && bulan > now.getMonth() + 1)

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <p className="page-header__greeting">Rapor</p>
        <h1 className="page-header__title">Rapor Bulanan</h1>
        <p className="page-header__subtitle">
          Rekapitulasi pencapaian amalan per bulan
        </p>
      </div>

      {/* Month navigation */}
      <div className="rapor-nav no-print">
        <button className="btn btn--outline btn--sm" onClick={prevMonth}>
          <ChevronLeft size={14} />
        </button>
        <span className="rapor-nav__label">
          <Calendar size={14} />
          {BULAN_NAMES[bulan]} {tahun}
        </span>
        <button
          className="btn btn--outline btn--sm"
          onClick={nextMonth}
          disabled={isCurrentOrFuture}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat rapor...</p>
        </div>
      ) : !data || !data.summary ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <FileText size={64} />
          </div>
          <h3 className="empty-state__title">Belum Ada Data</h3>
          <p className="empty-state__desc">
            Tidak ada data mutabaah untuk {BULAN_NAMES[bulan]} {tahun}.
          </p>
        </div>
      ) : (
        <>
          {/* Print button */}
          <div className="rapor-actions no-print">
            <button className="btn btn--primary btn--sm" onClick={handlePrint}>
              <Printer size={14} /> Cetak / Simpan PDF
            </button>
          </div>

          {/* Report card — printable */}
          <div className="rapor-card" ref={printRef}>
            {/* Header */}
            <div className="rapor-card__header">
              <h2 className="rapor-card__school">SIT Matahari</h2>
              <h3 className="rapor-card__title">RAPOR MUTABAAH YAUMIYAH</h3>
              <p className="rapor-card__period">{BULAN_NAMES[bulan]} {tahun}</p>
            </div>

            {/* Student info */}
            <div className="rapor-card__info">
              <div className="rapor-card__info-row">
                <span className="rapor-card__info-label">Nama</span>
                <span className="rapor-card__info-value">{data.user?.nama || '-'}</span>
              </div>
              <div className="rapor-card__info-row">
                <span className="rapor-card__info-label">Tingkatan</span>
                <span className="rapor-card__info-value" style={{ textTransform: 'capitalize' }}>
                  {data.user?.tingkatan || '-'}
                </span>
              </div>
              <div className="rapor-card__info-row">
                <span className="rapor-card__info-label">Jumlah Pekan</span>
                <span className="rapor-card__info-value">{data.totalWeeks} pekan data</span>
              </div>
            </div>

            {/* Score table */}
            <table className="rapor-table">
              <thead>
                <tr>
                  <th className="rapor-table__th">Amalan</th>
                  <th className="rapor-table__th rapor-table__th--center">Rata-rata</th>
                  <th className="rapor-table__th rapor-table__th--center">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {data.summary && Object.keys(data.summary).map(key => {
                  const item = data.summary[key]
                  const avg = item.average
                  const colorClass = avg >= 80 ? 'success' : avg >= 50 ? 'warning' : 'danger'
                  return (
                    <tr key={key}>
                      <td className="rapor-table__td">{item.label}</td>
                      <td className={`rapor-table__td rapor-table__td--center rapor-table__td--${colorClass}`}>
                        {avg}%
                      </td>
                      <td className="rapor-table__td rapor-table__td--center">
                        {avg >= 80 ? '✓ Baik' : avg >= 50 ? '△ Perlu ditingkatkan' : '✗ Perlu perbaikan'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="rapor-table__footer">
                  <td className="rapor-table__td"><strong>Rata-rata Keseluruhan</strong></td>
                  <td className="rapor-table__td rapor-table__td--center"><strong>{data.rataRata}%</strong></td>
                  <td className="rapor-table__td rapor-table__td--center">
                    <strong>{data.predikat?.label} ({data.predikat?.level})</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Week breakdown */}
            {data.weekSummaries && data.weekSummaries.length > 0 && (
              <div className="rapor-weeks">
                <h4 className="rapor-weeks__title">Rekap per Pekan</h4>
                <div className="rapor-weeks__grid">
                  {data.weekSummaries.map(w => {
                    const wColor = w.rata_rata >= 80 ? 'success' : w.rata_rata >= 50 ? 'warning' : 'danger'
                    return (
                      <div key={w.pekan} className="rapor-week-chip">
                        <span className="rapor-week-chip__label">P{w.pekan}</span>
                        <span className={`rapor-week-chip__value rapor-week-chip__value--${wColor}`}>
                          {w.rata_rata}%
                        </span>
                        {w.is_terlambat && <span className="rapor-week-chip__late">T</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Predikat badge */}
            <div className="rapor-card__predikat">
              <Award size={24} />
              <div>
                <p className="rapor-card__predikat-level">Predikat: {data.predikat?.level}</p>
                <p className="rapor-card__predikat-label">{data.predikat?.label}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="rapor-card__footer">
              <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
