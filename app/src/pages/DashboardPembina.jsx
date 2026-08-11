import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getGrupAnggota as apiGetGrupAnggota,
  getPembinaGroups as apiGetPembinaGroups,
  isApiConfigured
} from '../services/api'
import {
  Users, BarChart3, ChevronRight, Loader2,
  CheckCircle, XCircle, Clock, UserCheck, Activity, TrendingUp,
  ChevronDown, Flame
} from 'lucide-react'
import './DashboardAdmin.css'

export default function DashboardPembina() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [myGroups, setMyGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [rataRata, setRataRata] = useState(0)

  const pembinaUserId = user?.user_id || user?.id

  // Load pembina's groups first
  useEffect(() => {
    loadGroups()
  }, [pembinaUserId])

  // When selected group changes, load members
  useEffect(() => {
    if (selectedGroupId) loadMembers(selectedGroupId)
  }, [selectedGroupId])

  async function loadGroups() {
    setLoading(true)
    try {
      if (isApiConfigured() && pembinaUserId) {
        const res = await apiGetPembinaGroups(pembinaUserId)
        if (res?.groups && res.groups.length > 0) {
          setMyGroups(res.groups)
          setSelectedGroupId(res.groups[0].grup_id)
          return // loadMembers will be triggered by useEffect
        }
      }
      
      // Fallback: use user's single grup_id
      if (user?.grup_id) {
        setMyGroups([{ grup_id: user.grup_id, nama_grup: user.grup_nama || 'Grup Saya' }])
        setSelectedGroupId(user.grup_id)
        return
      }

      // Mock data for demo
      setMyGroups([
        { grup_id: 'grp_001', nama_grup: 'Al-Fatih' },
        { grup_id: 'grp_002', nama_grup: 'An-Najah' },
      ])
      setSelectedGroupId('grp_001')
    } catch (err) {
      console.error('Failed to load groups:', err)
      // Fallback
      if (user?.grup_id) {
        setMyGroups([{ grup_id: user.grup_id, nama_grup: user.grup_nama || 'Grup Saya' }])
        setSelectedGroupId(user.grup_id)
      }
    }
  }

  async function loadMembers(grupId) {
    setLoading(true)
    try {
      if (isApiConfigured() && grupId) {
        const res = await apiGetGrupAnggota(grupId)
        if (res?.anggota) {
          setMembers(res.anggota)
          const filled = res.anggota.filter(m => m.sudah_isi && m.persen_rata_rata)
          if (filled.length > 0) {
            setRataRata(Math.round(filled.reduce((s, m) => s + m.persen_rata_rata, 0) / filled.length))
          } else {
            setRataRata(0)
          }
          setLoading(false)
          return
        }
      }

      // Mock data
      setMembers([
        { user_id: 'u1', nama: 'Ahmad Fauzi', tingkatan: 'pratama', sudah_isi: true, persen_rata_rata: 85, streak_current: 5 },
        { user_id: 'u2', nama: 'Siti Nurhaliza', tingkatan: 'muda', sudah_isi: false, persen_rata_rata: 0, streak_current: 0 },
        { user_id: 'u3', nama: 'Budi Santoso', tingkatan: 'pratama', sudah_isi: true, persen_rata_rata: 72, streak_current: 3 },
        { user_id: 'u4', nama: 'Dewi Sartika', tingkatan: 'muda', sudah_isi: true, persen_rata_rata: 90, streak_current: 8 },
        { user_id: 'u5', nama: 'Raka Pratama', tingkatan: 'pratama', sudah_isi: false, persen_rata_rata: 0, streak_current: 1 },
      ])
      setRataRata(82)
    } catch (err) {
      console.error('Failed to load group data:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedGroup = myGroups.find(g => g.grup_id === selectedGroupId)
  const grupNama = selectedGroup?.nama_grup || 'Grup Saya'

  const sudahIsi = members.filter(m => m.sudah_isi).length
  const belumIsi = members.filter(m => !m.sudah_isi).length
  const totalAnggota = members.length
  const pctFilled = totalAnggota > 0 ? Math.round((sudahIsi / totalAnggota) * 100) : 0

  const statCards = [
    { label: 'Total Anggota', value: totalAnggota, icon: Users, color: 'primary' },
    { label: 'Sudah Isi', value: sudahIsi, icon: CheckCircle, color: 'secondary' },
    { label: 'Belum Isi', value: belumIsi, icon: Clock, color: belumIsi > 0 ? 'accent' : 'secondary' },
    { label: 'Rata-rata', value: `${rataRata}%`, icon: TrendingUp, color: 'info' },
  ]

  // Sort: belum isi first, then by percentage desc
  const sortedMembers = [...members].sort((a, b) => {
    if (a.sudah_isi !== b.sudah_isi) return a.sudah_isi ? 1 : -1
    return (b.persen_rata_rata || 0) - (a.persen_rata_rata || 0)
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Beranda Pembina</h1>
        {/* Multi-group selector */}
        {myGroups.length > 1 ? (
          <div className="login-form__select-wrapper" style={{ marginTop: 'var(--space-2)', maxWidth: '280px' }}>
            <Users size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
            <select
              className="login-form__select"
              value={selectedGroupId || ''}
              onChange={e => setSelectedGroupId(e.target.value)}
              style={{ paddingLeft: '36px' }}
            >
              {myGroups.map(g => (
                <option key={g.grup_id} value={g.grup_id}>{g.nama_grup}</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
          </div>
        ) : (
          <p className="page-header__subtitle">Grup: {grupNama}</p>
        )}
      </div>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat data grup...</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="admin-stats">
            {statCards.map((card, i) => {
              const Icon = card.icon
              return (
                <div key={i} className={`admin-stat-card admin-stat-card--${card.color}`}>
                  <div className="admin-stat-card__icon">
                    <Icon size={22} />
                  </div>
                  <div className="admin-stat-card__content">
                    <p className="admin-stat-card__value">{card.value}</p>
                    <p className="admin-stat-card__label">{card.label}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weekly Progress Bar */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card__body">
              <h3 className="admin-overview__title">
                <Activity size={18} />
                Progress Pengisian Pekan Ini — {grupNama}
              </h3>
              <div className="admin-progress-item" style={{ marginBottom: 'var(--space-3)' }}>
                <div className="admin-progress-item__bar" style={{ height: '12px' }}>
                  <div
                    className={`admin-progress-item__fill ${
                      pctFilled >= 80 ? 'admin-progress-item__fill--success' :
                      pctFilled >= 50 ? 'admin-progress-item__fill--warning' :
                      'admin-progress-item__fill--danger'
                    }`}
                    style={{ width: `${pctFilled}%` }}
                  />
                </div>
                <div className="admin-progress-item__info">
                  <span className="admin-progress-item__label">{sudahIsi} dari {totalAnggota} sudah mengisi</span>
                  <span className="admin-progress-item__value">{pctFilled}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Member Status List */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card__body">
              <h3 className="admin-overview__title">
                <UserCheck size={18} />
                Status Anggota
              </h3>

              {sortedMembers.length > 0 ? (
                <div className="pembina-members">
                  {sortedMembers.map(m => (
                    <div key={m.user_id} className="pembina-member">
                      <div className="pembina-member__avatar">
                        {m.nama?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="pembina-member__info">
                        <p className="pembina-member__name">{m.nama}</p>
                        <p className="pembina-member__meta">
                          {m.tingkatan ? m.tingkatan.charAt(0).toUpperCase() + m.tingkatan.slice(1) : 'Anggota'}
                          {m.streak_current > 0 && (
                            <span className="pembina-member__streak">
                              <Flame size={12} /> {m.streak_current}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="pembina-member__status">
                        {m.sudah_isi ? (
                          <span className="pembina-status pembina-status--done">
                            <CheckCircle size={14} />
                            {m.persen_rata_rata ? `${Math.round(m.persen_rata_rata)}%` : 'Sudah'}
                          </span>
                        ) : (
                          <span className="pembina-status pembina-status--pending">
                            <XCircle size={14} />
                            Belum
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-empty">
                  <Users size={32} className="admin-empty__icon" />
                  <p>Belum ada anggota di grup ini</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="admin-actions">
            <button className="admin-action-btn" onClick={() => navigate('/anggota')}>
              <div className="admin-action-btn__icon"><Users size={20} /></div>
              <div className="admin-action-btn__content">
                <p className="admin-action-btn__label">Detail Anggota</p>
                <p className="admin-action-btn__desc">Info lengkap & riwayat mutabaah</p>
              </div>
              <ChevronRight size={18} className="admin-action-btn__arrow" />
            </button>
            <button className="admin-action-btn" onClick={() => navigate('/laporan')}>
              <div className="admin-action-btn__icon"><BarChart3 size={20} /></div>
              <div className="admin-action-btn__content">
                <p className="admin-action-btn__label">Laporan Mingguan</p>
                <p className="admin-action-btn__desc">Statistik dan rekap pekan</p>
              </div>
              <ChevronRight size={18} className="admin-action-btn__arrow" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
