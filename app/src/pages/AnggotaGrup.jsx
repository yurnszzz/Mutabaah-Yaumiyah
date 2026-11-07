import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getGrupAnggota as apiGetGrupAnggota,
  getMemberMutabaah as apiGetMemberMutabaah,
  isApiConfigured
} from '../services/api'
import { demoHistory } from '../services/demoData'
import { mapServerRecord, weekGlance, pctColor } from '../utils/mutabaahSummary'
import WeekDetail from '../components/WeekDetail'
import {
  Search, Loader2, Mail, Award, RefreshCw, ChevronRight, ArrowLeft, CalendarDays, ChevronDown, ChevronUp
} from 'lucide-react'
import './DashboardAdmin.css'
import './Laporan.css'
import './AnggotaGrup.css'

export default function AnggotaGrup() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Drill-down state
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberHistory, setMemberHistory] = useState([])
  const [memberLoading, setMemberLoading] = useState(false)
  const [memberError, setMemberError] = useState('')
  const [expandedWeek, setExpandedWeek] = useState(null)

  const grupId = user?.grup_id
  const grupNama = user?.grup_nama || user?.nama || 'Grup Saya'

  useEffect(() => { loadMembers() }, [grupId])

  async function loadMembers() {
    setLoading(true)
    try {
      if (isApiConfigured() && grupId) {
        const result = await apiGetGrupAnggota(grupId)
        if (result?.anggota) setMembers(result.anggota)
      } else {
        setMembers([
          { user_id: 'usr_002', nama: 'Ahmad Fauzi', email: 'ahmad@sit.id', tingkatan: 'pratama', status: 'aktif', streak_current: 5 },
          { user_id: 'usr_003', nama: 'Siti Nurhaliza', email: 'siti@sit.id', tingkatan: 'muda', status: 'aktif', streak_current: 3 },
          { user_id: 'usr_005', nama: 'Budi Santoso', email: 'budi@sit.id', tingkatan: 'madya', status: 'aktif', streak_current: 8 },
        ])
      }
    } catch (err) {
      console.error('Failed to load members:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openMemberDetail(member) {
    setSelectedMember(member)
    setMemberLoading(true)
    setMemberHistory([])
    setMemberError('')
    setExpandedWeek(null)

    try {
      if (isApiConfigured()) {
        const result = await apiGetMemberMutabaah(
          user.user_id || user.id,
          member.user_id,
          new Date().getFullYear(),
          53,
          0
        )
        if (result?.records) {
          const formatted = result.records.map(r => mapServerRecord(r, member.tingkatan || 'muda'))
          setMemberHistory(formatted)
          // Open the newest week straight away: that is what pembina usually checks
          if (formatted[0]) setExpandedWeek(formatted[0].id)
        }
      } else {
        // Mode demo: data contoh
        const formatted = demoHistory(member.user_id, member.tingkatan || 'muda', { gender: member.gender })
          .map(r => mapServerRecord(r, member.tingkatan || 'muda'))
        setMemberHistory(formatted)
        if (formatted[0]) setExpandedWeek(formatted[0].id)
      }
    } catch (err) {
      console.error('Failed to load member detail:', err)
      setMemberError(err.message || 'Riwayat anggota belum bisa dimuat. Coba lagi.')
    } finally {
      setMemberLoading(false)
    }
  }

  const filtered = members.filter(m => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (m.nama || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)
  })

  // === Detail View ===
  if (selectedMember) {
    const memberTingkatan = selectedMember.tingkatan || 'muda'
    return (
      <div className="page-container">
        <div className="page-header">
          <button className="btn btn--outline btn--sm anggota-back" onClick={() => setSelectedMember(null)}>
            <ArrowLeft size={16} /> Kembali ke Daftar
          </button>
          <h1 className="page-header__title">{selectedMember.nama}</h1>
          <p className="page-header__subtitle">
            {selectedMember.email} · Tingkatan {memberTingkatan.charAt(0).toUpperCase() + memberTingkatan.slice(1)}
            {selectedMember.streak_current > 0 && (
              <span className="anggota-detail-streak">
                <Award size={14} /> {selectedMember.streak_current} pekan berturut-turut
              </span>
            )}
          </p>
        </div>

        {memberLoading ? (
          <div className="admin-loading">
            <Loader2 size={32} className="admin-loading__spinner" />
            <p>Memuat riwayat mutabaah...</p>
          </div>
        ) : memberError ? (
          <div className="admin-empty">
            <p>{memberError}</p>
            <button className="btn btn--outline btn--sm" onClick={() => openMemberDetail(selectedMember)}>
              <RefreshCw size={16} /> Coba Lagi
            </button>
          </div>
        ) : memberHistory.length === 0 ? (
          <div className="admin-empty">
            <CalendarDays size={32} className="admin-empty__icon" />
            <p>Anggota ini belum mengirim mutabaah tahun ini.</p>
          </div>
        ) : (
          <>
            <p className="laporan-count">
              {memberHistory.length} pekan tercatat tahun ini. Ketuk satu pekan untuk melihat jumlah amalannya.
            </p>
            <div className="laporan-list">
              {memberHistory.map(week => {
                const pct = week.percentages?.rata_rata?.percentage || 0
                const colorClass = pctColor(pct)
                const isExpanded = expandedWeek === week.id
                const glance = weekGlance(week.weekData, week.tingkatan || memberTingkatan)
                const detailId = `anggota-detail-${week.id}`

                return (
                  <div key={week.id} className={`laporan-card card ${isExpanded ? 'laporan-card--expanded' : ''}`}>
                    <button
                      type="button"
                      className="laporan-card__summary"
                      onClick={() => setExpandedWeek(isExpanded ? null : week.id)}
                      aria-expanded={isExpanded}
                      aria-controls={detailId}
                    >
                      <div className="laporan-card__summary-left">
                        <CalendarDays size={18} className="laporan-card__icon" />
                        <div className="laporan-card__titles">
                          <span className="laporan-card__week">Pekan {week.weekInfo.weekNumber}</span>
                          <span className="laporan-card__date-inline">{week.weekInfo.label || week.weekInfo.year}</span>
                          {glance && <span className="laporan-card__glance">{glance}</span>}
                        </div>
                      </div>
                      <div className="laporan-card__summary-right">
                        {week.isTerlambat && <span className="badge badge--warning badge--sm">Terlambat</span>}
                        <span className={`laporan-card__pct laporan-card__pct--${colorClass}`}>{pct}%</span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="laporan-card__detail" id={detailId}>
                        <WeekDetail
                          weekData={week.weekData}
                          tingkatan={week.tingkatan || memberTingkatan}
                          percentages={week.percentages}
                        />
                        <p className="laporan-card__submitted">
                          Dikirim: {week.submittedAt ? new Date(week.submittedAt).toLocaleString('id-ID') : '-'}
                          {week.editCount > 0 && (
                            <span className="laporan-card__edited">
                              {' '}· Diubah {week.editCount}×{week.lastEditedAt && ` (terakhir ${new Date(week.lastEditedAt).toLocaleString('id-ID')})`}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // === List View ===
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Anggota Grup</h1>
        <p className="page-header__subtitle">Grup: {grupNama} ({members.length} anggota)</p>
      </div>

      <div className="admin-search">
        <input
          type="text"
          className="admin-search__input"
          placeholder="Cari anggota..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="admin-table__btn admin-table__btn--edit" onClick={loadMembers} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat data anggota...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="pembina-members-full">
          {filtered.map(m => (
            <div
              key={m.user_id}
              className="card anggota-card"
              onClick={() => openMemberDetail(m)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card__body">
                <div className="pembina-member">
                  <div className="pembina-member__avatar">
                    {m.nama?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="pembina-member__info" style={{ flex: 1 }}>
                    <p className="pembina-member__name">{m.nama}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-gray-400)' }}>
                        <Mail size={12} /> {m.email}
                      </span>
                      {m.tingkatan && (
                        <span className="badge badge--info" style={{ fontSize: '10px' }}>
                          {m.tingkatan.charAt(0).toUpperCase() + m.tingkatan.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent-dark)', fontSize: '13px', fontWeight: 600 }}>
                        <Award size={14} />
                        {m.streak_current || 0} pekan
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>streak</span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--color-gray-300)' }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          <Search size={32} className="admin-empty__icon" />
          <p>{search ? 'Tidak ada anggota yang cocok' : 'Belum ada anggota di grup ini'}</p>
        </div>
      )}
    </div>
  )
}
