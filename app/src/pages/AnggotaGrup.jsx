import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { TARGET_AMALAN } from '../config/constants'
import {
  getGrupAnggota as apiGetGrupAnggota,
  getMemberMutabaah as apiGetMemberMutabaah,
  isApiConfigured
} from '../services/api'
import {
  Users, Search, Loader2, Mail, Award, RefreshCw,
  ChevronRight, ArrowLeft, CalendarDays, ChevronDown, ChevronUp
} from 'lucide-react'
import './DashboardAdmin.css'
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
  const [expandedWeek, setExpandedWeek] = useState(null)

  const grupId = user?.grup_id
  const grupNama = user?.grup_nama || user?.nama || 'Grup Saya'
  const tingkatan = 'muda' // default for rendering bars

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
    setExpandedWeek(null)

    try {
      if (isApiConfigured()) {
        const result = await apiGetMemberMutabaah(
          user.user_id || user.id,
          member.user_id,
          new Date().getFullYear()
        )
        if (result?.error) {
          console.error('Permission denied:', result.error)
          setMemberHistory([])
        } else if (result?.records) {
          const formatted = result.records.map(r => ({
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
          }))
          setMemberHistory(formatted)
        }
      }
    } catch (err) {
      console.error('Failed to load member detail:', err)
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
    const amalan = Object.keys(TARGET_AMALAN[selectedMember.tingkatan || tingkatan])
    return (
      <div className="page-container">
        <div className="page-header">
          <button className="btn btn--outline btn--sm anggota-back" onClick={() => setSelectedMember(null)}>
            <ArrowLeft size={14} /> Kembali ke Daftar
          </button>
          <h1 className="page-header__title">{selectedMember.nama}</h1>
          <p className="page-header__subtitle">
            {selectedMember.email} · {selectedMember.tingkatan || '—'}
            {selectedMember.streak_current > 0 && (
              <span className="anggota-detail-streak">
                <Award size={14} /> {selectedMember.streak_current} pekan streak
              </span>
            )}
          </p>
        </div>

        {memberLoading ? (
          <div className="admin-loading">
            <Loader2 size={32} className="admin-loading__spinner" />
            <p>Memuat riwayat mutabaah...</p>
          </div>
        ) : memberHistory.length === 0 ? (
          <div className="admin-empty">
            <CalendarDays size={32} className="admin-empty__icon" />
            <p>Belum ada data mutabaah untuk anggota ini</p>
          </div>
        ) : (
          <div className="anggota-history">
            {memberHistory.map(week => {
              const pct = week.percentages?.rata_rata?.percentage || 0
              const colorClass = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'
              const isExpanded = expandedWeek === week.id

              return (
                <div key={week.id} className={`card anggota-week ${isExpanded ? 'anggota-week--expanded' : ''}`}>
                  <div className="anggota-week__summary" onClick={() => setExpandedWeek(isExpanded ? null : week.id)}>
                    <div className="anggota-week__left">
                      <CalendarDays size={14} />
                      <span className="anggota-week__label">Pekan {week.weekInfo.weekNumber}</span>
                      <span className="anggota-week__date">{week.weekInfo.label || week.weekInfo.year}</span>
                    </div>
                    <div className="anggota-week__right">
                      {week.isTerlambat && <span className="badge badge--warning badge--sm">Terlambat</span>}
                      <span className={`anggota-week__pct anggota-week__pct--${colorClass}`}>{pct}%</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="anggota-week__detail">
                      {amalan.map(key => {
                        const data = week.percentages?.[key]
                        if (!data) return null
                        const barColor = data.percentage >= 80 ? 'success' : data.percentage >= 50 ? 'warning' : 'danger'
                        return (
                          <div key={key} className="laporan-bar">
                            <div className="laporan-bar__header">
                              <span className="laporan-bar__label">{data.label}</span>
                              <span className={`laporan-bar__pct laporan-bar__pct--${barColor}`}>{data.percentage}%</span>
                            </div>
                            <div className="progress" style={{ height: 6 }}>
                              <div className={`progress__fill progress__fill--${barColor}`} style={{ width: `${data.percentage}%` }} />
                            </div>
                          </div>
                        )
                      })}
                      <p className="anggota-week__submitted">
                        Disubmit: {new Date(week.submittedAt).toLocaleString('id-ID')}
                        {week.editCount > 0 && (
                          <span className="laporan-card__edited">
                            {' '}· Diedit {week.editCount}× (terakhir: {new Date(week.lastEditedAt).toLocaleString('id-ID')})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
