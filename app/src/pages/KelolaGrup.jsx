import { useState, useEffect } from 'react'
import {
  getAllGroups as apiGetAllGroups,
  isApiConfigured
} from '../services/api'
import {
  LayoutGrid, Users, Search, Loader2, Shield, RefreshCw
} from 'lucide-react'
import './DashboardAdmin.css'

export default function KelolaGrup() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadGroups() }, [])

  async function loadGroups() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const result = await apiGetAllGroups()
        if (result?.groups) setGroups(result.groups)
      } else {
        setGroups([
          { grup_id: 'grp_001', nama_grup: 'Ustadz Hamdan', pembina_nama: 'Ustadz Hamdan', jumlah_anggota: 5 },
          { grup_id: 'grp_002', nama_grup: 'Ustadz Ali', pembina_nama: 'Ustadz Ali', jumlah_anggota: 3 },
          { grup_id: 'grp_003', nama_grup: 'Ustadzah Fatimah', pembina_nama: 'Ustadzah Fatimah', jumlah_anggota: 4 },
        ])
      }
    } catch (err) {
      console.error('Failed to load groups:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = groups.filter(g => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (g.nama_grup || '').toLowerCase().includes(q) ||
           (g.pembina_nama || '').toLowerCase().includes(q)
  })

  const totalAnggota = groups.reduce((sum, g) => sum + (g.jumlah_anggota || 0), 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Kelola Grup</h1>
        <p className="page-header__subtitle">{groups.length} grup, {totalAnggota} total anggota</p>
      </div>

      {/* Search */}
      <div className="admin-search">
        <input
          type="text"
          className="admin-search__input"
          placeholder="Cari grup atau pembina..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="admin-table__btn admin-table__btn--edit" onClick={loadGroups} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat data grup...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="admin-grup-grid">
          {filtered.map(g => (
            <div key={g.grup_id} className="admin-grup-card card">
              <div className="card__body">
                <div className="admin-grup-card__header">
                  <div className="admin-grup-card__icon">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h3 className="admin-grup-card__name">{g.nama_grup}</h3>
                    <p className="admin-grup-card__id">{g.grup_id}</p>
                  </div>
                </div>
                <div className="admin-grup-card__details">
                  <div className="admin-grup-card__detail">
                    <Shield size={14} />
                    <span>Pembina: <strong>{g.pembina_nama}</strong></span>
                  </div>
                  <div className="admin-grup-card__detail">
                    <Users size={14} />
                    <span>Anggota: <strong>{g.jumlah_anggota}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          <Search size={32} className="admin-empty__icon" />
          <p>Tidak ada grup yang cocok</p>
        </div>
      )}
    </div>
  )
}
