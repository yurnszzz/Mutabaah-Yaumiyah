import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAdminStats as apiGetAdminStats,
  getAllGrupRekap as apiGetAllGrupRekap,
  isApiConfigured
} from '../services/api'
import {
  Users, LayoutGrid, BarChart3, ChevronRight, Loader2,
  TrendingUp, UserCheck, UserX, Activity, Shield, Percent
} from 'lucide-react'
import './DashboardAdmin.css'

export default function DashboardYayasan() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0, totalAnggota: 0, totalPembina: 0, totalGroups: 0,
    activeUsers: 0, sudahIsi: 0, belumIsi: 0, rataRata: 0
  })
  const [groups, setGroups] = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const [statsRes, groupsRes] = await Promise.all([
          apiGetAdminStats(),
          apiGetAllGrupRekap()
        ])
        if (statsRes) setStats(s => ({ ...s, ...statsRes }))
        if (groupsRes?.groups) setGroups(groupsRes.groups)
      } else {
        // Mock data
        setStats({
          totalUsers: 24, totalAnggota: 18, totalPembina: 5, totalGroups: 5,
          activeUsers: 20, sudahIsi: 14, belumIsi: 4, rataRata: 76
        })
        setGroups([
          { grup_id: 'g1', nama_grup: 'Ust. Hamdan', totalAnggota: 5, sudahIsi: 4, belumIsi: 1, rataRata: 82 },
          { grup_id: 'g2', nama_grup: 'Ust. Ali', totalAnggota: 3, sudahIsi: 3, belumIsi: 0, rataRata: 91 },
          { grup_id: 'g3', nama_grup: 'Ustadzah Fatimah', totalAnggota: 6, sudahIsi: 4, belumIsi: 2, rataRata: 68 },
          { grup_id: 'g4', nama_grup: 'Ust. Rizki', totalAnggota: 4, sudahIsi: 3, belumIsi: 1, rataRata: 75 },
        ])
      }
    } catch (err) {
      console.error('Failed to load admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total User', value: stats.totalUsers, icon: Users, color: 'primary' },
    { label: 'Anggota', value: stats.totalAnggota, icon: UserCheck, color: 'secondary' },
    { label: 'Pembina', value: stats.totalPembina, icon: Shield, color: 'accent' },
    { label: 'Grup', value: stats.totalGroups, icon: LayoutGrid, color: 'info' },
  ]

  const totalIsi = groups.reduce((s, g) => s + (g.sudahIsi || 0), 0)
  const totalBelum = groups.reduce((s, g) => s + (g.belumIsi || 0), 0)
  const totalAllAnggota = groups.reduce((s, g) => s + (g.totalAnggota || 0), 0)
  const avgAll = groups.length > 0
    ? Math.round(groups.reduce((s, g) => s + (g.rataRata || 0), 0) / groups.length)
    : 0

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Dashboard Admin</h1>
        <p className="page-header__subtitle">Selamat datang, {user?.nama}</p>
      </div>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat data...</p>
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

          {/* Weekly Progress Summary */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card__body">
              <h3 className="admin-overview__title">
                <Activity size={18} />
                Ringkasan Pekan Ini
              </h3>
              <div className="admin-progress-grid">
                <div className="admin-progress-item">
                  <div className="admin-progress-item__bar">
                    <div
                      className="admin-progress-item__fill admin-progress-item__fill--success"
                      style={{ width: totalAllAnggota > 0 ? `${(totalIsi / totalAllAnggota) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="admin-progress-item__info">
                    <span className="admin-progress-item__label">Sudah Isi</span>
                    <span className="admin-progress-item__value">{totalIsi}/{totalAllAnggota}</span>
                  </div>
                </div>
                <div className="admin-progress-item">
                  <div className="admin-progress-item__bar">
                    <div
                      className="admin-progress-item__fill admin-progress-item__fill--danger"
                      style={{ width: totalAllAnggota > 0 ? `${(totalBelum / totalAllAnggota) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="admin-progress-item__info">
                    <span className="admin-progress-item__label">Belum Isi</span>
                    <span className="admin-progress-item__value">{totalBelum}/{totalAllAnggota}</span>
                  </div>
                </div>
                <div className="admin-progress-item">
                  <div className="admin-progress-item__bar">
                    <div
                      className="admin-progress-item__fill admin-progress-item__fill--primary"
                      style={{ width: `${avgAll}%` }}
                    />
                  </div>
                  <div className="admin-progress-item__info">
                    <span className="admin-progress-item__label">Rata-rata Pencapaian</span>
                    <span className="admin-progress-item__value">{avgAll}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Per-Group Rekap */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card__body">
              <h3 className="admin-overview__title">
                <BarChart3 size={18} />
                Rekap Per Grup
              </h3>
              {groups.length > 0 ? (
                <div className="admin-grup-rekap">
                  {groups.map(g => {
                    const pct = g.totalAnggota > 0 ? Math.round((g.sudahIsi / g.totalAnggota) * 100) : 0
                    return (
                      <div key={g.grup_id} className="admin-grup-rekap__item">
                        <div className="admin-grup-rekap__header">
                          <span className="admin-grup-rekap__name">{g.nama_grup}</span>
                          <span className="admin-grup-rekap__pct">{g.rataRata || 0}%</span>
                        </div>
                        <div className="admin-progress-item__bar">
                          <div
                            className={`admin-progress-item__fill ${
                              (g.rataRata || 0) >= 80 ? 'admin-progress-item__fill--success' :
                              (g.rataRata || 0) >= 50 ? 'admin-progress-item__fill--warning' :
                              'admin-progress-item__fill--danger'
                            }`}
                            style={{ width: `${g.rataRata || 0}%` }}
                          />
                        </div>
                        <div className="admin-grup-rekap__meta">
                          <span>{g.totalAnggota} anggota</span>
                          <span>Sudah: {g.sudahIsi} / Belum: {g.belumIsi}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="admin-empty" style={{ padding: 'var(--space-4)' }}>Belum ada data grup</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="admin-actions">
            <button className="admin-action-btn" onClick={() => navigate('/kelola-user')}>
              <div className="admin-action-btn__icon"><Users size={20} /></div>
              <div className="admin-action-btn__content">
                <p className="admin-action-btn__label">Kelola User</p>
                <p className="admin-action-btn__desc">Manajemen semua user</p>
              </div>
              <ChevronRight size={18} className="admin-action-btn__arrow" />
            </button>
            <button className="admin-action-btn" onClick={() => navigate('/kelola-grup')}>
              <div className="admin-action-btn__icon"><LayoutGrid size={20} /></div>
              <div className="admin-action-btn__content">
                <p className="admin-action-btn__label">Kelola Grup</p>
                <p className="admin-action-btn__desc">Overview semua grup</p>
              </div>
              <ChevronRight size={18} className="admin-action-btn__arrow" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
