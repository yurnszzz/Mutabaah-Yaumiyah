import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getGrupAnggota as apiGetGrupAnggota,
  getPembinaGroups as apiGetPembinaGroups,
  getPendingUsers as apiGetPendingUsers,
  approvePendingUser as apiApproveUser,
  rejectPendingUser as apiRejectUser,
  isApiConfigured
} from '../services/api'
import {
  Users, BarChart3, ChevronRight, Loader2,
  CheckCircle, XCircle, Clock, UserCheck, Activity, TrendingUp,
  ChevronDown, Flame, UserPlus, Link2, Check, AlertTriangle
} from 'lucide-react'
import './DashboardAdmin.css'

export default function DashboardPembina() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [myGroups, setMyGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [members, setMembers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [rataRata, setRataRata] = useState(0)
  const [linkCopied, setLinkCopied] = useState(false)
  const [approveLoading, setApproveLoading] = useState(null) // userId being processed

  const pembinaUserId = user?.user_id || user?.id

  // Load pembina's groups first
  useEffect(() => {
    loadGroups()
  }, [pembinaUserId])

  // When selected group changes, load members + pending
  useEffect(() => {
    if (selectedGroupId) {
      loadMembers(selectedGroupId)
      loadPendingUsers(selectedGroupId)
    }
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

  async function loadPendingUsers(grupId) {
    try {
      if (isApiConfigured() && grupId) {
        const res = await apiGetPendingUsers(grupId)
        if (res?.users) {
          setPendingUsers(res.users)
          return
        }
      }
      setPendingUsers([])
    } catch (err) {
      console.error('Failed to load pending users:', err)
      setPendingUsers([])
    }
  }

  async function handleApprove(userId) {
    setApproveLoading(userId)
    try {
      const res = await apiApproveUser(userId)
      if (res?.error) {
        alert(res.error)
      } else {
        // Remove from pending, reload members
        setPendingUsers(prev => prev.filter(u => u.user_id !== userId))
        if (selectedGroupId) loadMembers(selectedGroupId)
      }
    } catch (err) {
      alert('Gagal menyetujui: ' + err.message)
    } finally {
      setApproveLoading(null)
    }
  }

  async function handleReject(userId, nama) {
    if (!confirm(`Tolak pendaftaran ${nama}?`)) return
    setApproveLoading(userId)
    try {
      const res = await apiRejectUser(userId)
      if (res?.error) {
        alert(res.error)
      } else {
        setPendingUsers(prev => prev.filter(u => u.user_id !== userId))
      }
    } catch (err) {
      alert('Gagal menolak: ' + err.message)
    } finally {
      setApproveLoading(null)
    }
  }

  function copyReferralLink() {
    if (!selectedGroupId) return
    const baseUrl = window.location.origin
    const grupNama = selectedGroup?.nama_grup || user?.nama || ''
    const link = `${baseUrl}/login?pembina=${encodeURIComponent(grupNama)}&ref=${selectedGroupId}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    }).catch(() => {
      // Fallback for older browsers
      prompt('Salin link ini:', link)
    })
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

          {/* Referral Link */}
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card__body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)', marginBottom: '2px' }}>
                  <Link2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Link Undangan Grup
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                  Bagikan ke anggota baru agar langsung terdaftar tanpa menunggu persetujuan
                </p>
              </div>
              <button
                onClick={copyReferralLink}
                className="admin-action-btn"
                style={{
                  padding: '8px 16px', minWidth: 'auto', borderRadius: 'var(--radius-md)',
                  background: linkCopied ? 'var(--color-success)' : 'var(--color-primary)',
                  color: 'white', border: 'none', fontSize: 'var(--text-xs)',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                }}
              >
                {linkCopied ? <><Check size={14} /> Tersalin</> : <><Link2 size={14} /> Salin Link</>}
              </button>
            </div>
          </div>

          {/* Pending Approval */}
          {pendingUsers.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-5)', borderLeft: '4px solid var(--color-accent-dark)' }}>
              <div className="card__body">
                <h3 className="admin-overview__title" style={{ color: 'var(--color-accent-dark)' }}>
                  <UserPlus size={18} />
                  Menunggu Persetujuan ({pendingUsers.length})
                </h3>

                <div className="pembina-members">
                  {pendingUsers.map(pu => (
                    <div key={pu.user_id} className="pembina-member" style={{ background: 'rgba(245, 158, 11, 0.04)' }}>
                      <div className="pembina-member__avatar" style={{ background: 'var(--color-accent)', color: 'white' }}>
                        {pu.nama?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="pembina-member__info">
                        <p className="pembina-member__name">{pu.nama}</p>
                        <p className="pembina-member__meta">
                          {pu.tingkatan ? pu.tingkatan.charAt(0).toUpperCase() + pu.tingkatan.slice(1) : 'Muda'}
                          {' - '}
                          {pu.gender === 'akhwat' ? 'Akhwat' : 'Ikhwan'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleApprove(pu.user_id)}
                          disabled={approveLoading === pu.user_id}
                          style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-md)',
                            border: 'none', background: 'var(--color-success)', color: 'white',
                            fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            opacity: approveLoading === pu.user_id ? 0.6 : 1,
                          }}
                        >
                          <CheckCircle size={13} /> Terima
                        </button>
                        <button
                          onClick={() => handleReject(pu.user_id, pu.nama)}
                          disabled={approveLoading === pu.user_id}
                          style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-gray-200)', background: 'white', color: 'var(--color-danger)',
                            fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            opacity: approveLoading === pu.user_id ? 0.6 : 1,
                          }}
                        >
                          <XCircle size={13} /> Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
