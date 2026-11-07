import { KEHADIRAN_OPTIONS, WAKTU_SHALAT } from '../config/constants'
import { summarizeWeek, formatNumber, pctColor } from '../utils/mutabaahSummary'
import './WeekDetail.css'

const WAKTU_SHORT = { Subuh: 'Sub', Dzuhur: 'Dzu', Ashar: 'Ash', Maghrib: 'Mag', Isya: 'Isy' }
const STATUS_TEXT = { jamaah: 'Berjamaah', sendiri: 'Sendiri', tidak: 'Tidak tercatat' }
const STATUS_MARK = { jamaah: 'J', sendiri: 'S', tidak: '–' }

/**
 * Rincian satu pekan: jumlah asli tiap amalan, sholat per hari, dan
 * kehadiran UPA. Dipakai di Laporan (anggota) dan Anggota Grup (pembina).
 *
 * Kalau data mentah tidak ada (catatan lama), tampil persentase saja.
 */
export default function WeekDetail({ weekData, tingkatan = 'muda', percentages, compact = false }) {
  const summary = summarizeWeek(weekData, tingkatan)

  if (!summary) {
    return <PercentOnly percentages={percentages} />
  }

  const haidHari = summary.days.filter(d => d.isHaid).map(d => d.hari)
  const kehadiran = KEHADIRAN_OPTIONS.find(o => o.value === summary.kehadiran)

  return (
    <div className="week-detail">
      {summary.haidDays > 0 && (
        <p className="week-detail__note">
          Haid {summary.haidDays} hari ({haidHari.join(', ')}). Target sholat, dhuha,
          dan puasa sudah dikurangi sesuai jumlah hari haid.
        </p>
      )}

      <h4 className="week-detail__heading">Jumlah yang dikerjakan</h4>
      <ul className="week-detail__list">
        {summary.rows.map(row => {
          const color = pctColor(row.pct)
          return (
            <li key={row.key} className="week-detail__row">
              <div className="week-detail__row-top">
                <span className="week-detail__label">{row.label}</span>
                <span className="week-detail__count">
                  <strong>{formatNumber(row.actual)}</strong>
                  <span className="week-detail__of"> dari {formatNumber(row.target)} {row.unit}</span>
                </span>
              </div>
              <div className="week-detail__row-bottom">
                <div
                  className="week-detail__bar"
                  role="progressbar"
                  aria-valuenow={row.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.label} ${row.pct} persen`}
                >
                  <span className={`week-detail__fill week-detail__fill--${color}`} style={{ width: `${row.pct}%` }} />
                </div>
                <span className={`week-detail__pct week-detail__pct--${color}`}>{row.pct}%</span>
              </div>
              {row.key === 'tilawah' && (
                <span className="week-detail__sub">Tercatat: {summary.tilawahText}</span>
              )}
              {row.isAdjusted && (
                <span className="week-detail__sub">Target normal {formatNumber(row.originalTarget)} {row.unit}</span>
              )}
            </li>
          )
        })}
      </ul>

      {!compact && (
        <>
          <h4 className="week-detail__heading">Sholat fardu per hari</h4>
          <div className="week-detail__legend" aria-hidden="true">
            <span><b className="week-detail__mark week-detail__mark--jamaah">J</b> Berjamaah</span>
            <span><b className="week-detail__mark week-detail__mark--sendiri">S</b> Sendiri</span>
            <span><b className="week-detail__mark week-detail__mark--tidak">–</b> Tidak tercatat</span>
          </div>
          <div className="week-detail__table-wrap">
            <table className="week-detail__days">
              <thead>
                <tr>
                  <th scope="col">Hari</th>
                  {WAKTU_SHALAT.map(w => (
                    <th key={w} scope="col" title={w}>{WAKTU_SHORT[w]}</th>
                  ))}
                  <th scope="col">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {summary.days.map(day => (
                  <tr key={day.hari} className={day.isHaid ? 'is-haid' : ''}>
                    <th scope="row">{day.hari}</th>
                    {day.isHaid && day.prayed === 0 ? (
                      <td colSpan={5} className="week-detail__haid">Haid</td>
                    ) : (
                      day.slots.map(slot => (
                        <td key={slot.waktu}>
                          <span
                            className={`week-detail__mark week-detail__mark--${slot.status}`}
                            title={`${slot.waktu}: ${STATUS_TEXT[slot.status]}`}
                          >
                            {STATUS_MARK[slot.status]}
                            <span className="sr-only">{`${slot.waktu}: ${STATUS_TEXT[slot.status]}`}</span>
                          </span>
                        </td>
                      ))
                    )}
                    <td className="week-detail__day-total">{day.prayed}/5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {kehadiran && (
            <dl className="week-detail__extra">
              <div>
                <dt>Kehadiran UPA</dt>
                <dd>
                  {kehadiran.label}
                  {summary.terlambatMenit > 0 && `, terlambat ${summary.terlambatMenit} menit`}
                </dd>
              </div>
            </dl>
          )}
        </>
      )}
    </div>
  )
}

function PercentOnly({ percentages }) {
  if (!percentages) return null
  const keys = Object.keys(percentages).filter(k => k !== 'rata_rata')
  return (
    <div className="week-detail">
      <p className="week-detail__note week-detail__note--muted">
        Rincian jumlah tidak tersedia untuk catatan ini. Ketuk Muat Ulang untuk mengambil data terbaru dari server.
      </p>
      <ul className="week-detail__list">
        {keys.map(key => {
          const p = percentages[key]?.percentage || 0
          const color = pctColor(p)
          return (
            <li key={key} className="week-detail__row">
              <div className="week-detail__row-top">
                <span className="week-detail__label">{percentages[key]?.label || key}</span>
              </div>
              <div className="week-detail__row-bottom">
                <div className="week-detail__bar">
                  <span className={`week-detail__fill week-detail__fill--${color}`} style={{ width: `${p}%` }} />
                </div>
                <span className={`week-detail__pct week-detail__pct--${color}`}>{p}%</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
