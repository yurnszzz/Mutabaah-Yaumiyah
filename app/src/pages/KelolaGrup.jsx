import { useState, useEffect } from 'react'
import {
  getAllGroups as apiGetAllGroups,
  getAllUsers as apiGetAllUsers,
  getGrupAnggota as apiGetGrupAnggota,
  isApiConfigured,
  apiPost
} from '../services/api'
import {
  LayoutGrid, Users, Search, Loader2, Shield, RefreshCw,
  Plus, Trash2, Edit3, Eye, X, CheckCircle, UserPlus, UserMinus, ChevronDown, ChevronUp
} from 'lucide-react'
import './DashboardAdmin.css'

export default function KelolaGrup() {
  const [groups, setGroups] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Modal states
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [viewModal, setViewModal] = useState(null) // { grup_id, nama_grup, members: [] }
  const [viewLoading, setViewLoading] = useState(false)

  // Create/Edit form
  const [formNama, setFormNama] = useState('')
  const [formPembina, setFormPembina] = useState('')

  // Expanded group cards
  const [expandedGroup, setExpandedGroup] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const [groupResult, userResult] = await Promise.all([
          apiGetAllGroups(),
          apiGetAllUsers()
        ])
        if (groupResult?.groups) setGroups(groupResult.groups)
        if (userResult?.users) setAllUsers(userResult.users)
      } else {
        setGroups([
          { grup_id: 'grp_001', nama_grup: 'Ust. Hamdan', pembina_nama: 'Ust. Hamdan', pembina_user_id: 'usr_001', jumlah_anggota: 5 },
          { grup_id: 'grp_002', nama_grup: 'Ust. Ali', pembina_nama: 'Ust. Ali', pembina_user_id: 'usr_005', jumlah_anggota: 3 },
          { grup_id: 'grp_003', nama_grup: 'Ustadzah Fatimah', pembina_nama: 'Ustadzah Fatimah', pembina_user_id: 'usr_006', jumlah_anggota: 4 },
        ])
        setAllUsers([
          { user_id: 'usr_001', nama: 'Ust. Hamdan', role: 'pembina', grup_id: 'grp_001' },
          { user_id: 'usr_002', nama: 'Ahmad Fauzi', role: 'anggota', grup_id: 'grp_001' },
          { user_id: 'usr_007', nama: 'Budi', role: 'anggota', grup_id: null },
        ])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get pembina users (for creating groups)
  const pembinaUsers = allUsers.filter(u => u.role === 'pembina')
  // Get unassigned anggota (for adding to groups)
  const unassignedAnggota = allUsers.filter(u => u.role === 'anggota' && (!u.grup_id || u.grup_id === ''))

  async function handleCreateGroup() {
    if (!formNama.trim()) return
    setActionLoading(true)
    try {
      if (isApiConfigured()) {
        const result = await apiPost('createGroup', {
          nama_grup: formNama.trim(),
          pembina_user_id: formPembina || undefined
        })
        if (result?.message) {
          setMessage({ type: 'success', text: result.message })
          loadData()
        } else {
          setMessage({ type: 'error', text: result?.error || 'Gagal membuat grup' })
        }
      } else {
        const newGroup = {
          grup_id: 'grp_' + Date.now(),
          nama_grup: formNama.trim(),
          pembina_nama: pembinaUsers.find(p => p.user_id === formPembina)?.nama || '-',
          pembina_user_id: formPembina,
          jumlah_anggota: 0
        }
        setGroups(prev => [...prev, newGroup])
        setMessage({ type: 'success', text: 'Grup berhasil dibuat (demo)' })
      }
      setCreateModal(false)
      setFormNama('')
      setFormPembina('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEditGroup() {
    if (!editModal || !formNama.trim()) return
    setActionLoading(true)
    try {
      if (isApiConfigured()) {
        const result = await apiPost('updateGroup', {
          grup_id: editModal.grup_id,
          nama_grup: formNama.trim(),
          pembina_user_id: formPembina || undefined
        })
        if (result?.message) {
          setMessage({ type: 'success', text: result.message })
          loadData()
        } else {
          setMessage({ type: 'error', text: result?.error || 'Gagal mengubah grup' })
        }
      } else {
        setGroups(prev => prev.map(g => g.grup_id === editModal.grup_id
          ? { ...g, nama_grup: formNama.trim(), pembina_user_id: formPembina }
          : g
        ))
        setMessage({ type: 'success', text: 'Grup diperbarui (demo)' })
      }
      setEditModal(null)
      setFormNama('')
      setFormPembina('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteGroup(grupId, namaGrup) {
    if (!confirm(`Yakin ingin menghapus grup "${namaGrup}"? Anggota grup akan menjadi tidak tergabung.`)) return
    setActionLoading(true)
    try {
      if (isApiConfigured()) {
        const result = await apiPost('deleteGroup', { grup_id: grupId })
        if (result?.message) {
          setMessage({ type: 'success', text: result.message })
          setGroups(prev => prev.filter(g => g.grup_id !== grupId))
        } else {
          setMessage({ type: 'error', text: result?.error || 'Gagal menghapus grup' })
        }
      } else {
        setGroups(prev => prev.filter(g => g.grup_id !== grupId))
        setMessage({ type: 'success', text: 'Grup dihapus (demo)' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  async function viewGroupMembers(group) {
    setViewModal({ ...group, members: [] })
    setViewLoading(true)
    try {
      if (isApiConfigured()) {
        const result = await apiGetGrupAnggota(group.grup_id)
        if (result?.anggota) {
          setViewModal(prev => prev ? { ...prev, members: result.anggota } : null)
        }
      } else {
        const demoMembers = allUsers.filter(u => u.grup_id === group.grup_id && u.role === 'anggota')
        setViewModal(prev => prev ? { ...prev, members: demoMembers } : null)
      }
    } catch (err) {
      console.error('Failed to load members:', err)
    } finally {
      setViewLoading(false)
    }
  }

  async function handleRemoveMember(grupId, userId) {
    if (!confirm('Keluarkan anggota dari grup ini?')) return
    try {
      if (isApiConfigured()) {
        const result = await apiPost('removeMemberFromGroup', { grup_id: grupId, user_id: userId })
        if (result?.message) {
          setViewModal(prev => prev ? {
            ...prev,
            members: prev.members.filter(m => (m.user_id || m.id) !== userId)
          } : null)
          loadData()
          setMessage({ type: 'success', text: 'Anggota dikeluarkan dari grup' })
        }
      } else {
        setViewModal(prev => prev ? {
          ...prev,
          members: prev.members.filter(m => m.user_id !== userId)
        } : null)
        setMessage({ type: 'success', text: 'Anggota dikeluarkan (demo)' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  async function handleAddMember(grupId, userId) {
    try {
      if (isApiConfigured()) {
        const result = await apiPost('addMemberToGroup', { grup_id: grupId, user_id: userId })
        if (result?.message) {
          loadData()
          viewGroupMembers(groups.find(g => g.grup_id === grupId) || { grup_id: grupId })
          setMessage({ type: 'success', text: 'Anggota ditambahkan ke grup' })
        }
      } else {
        setMessage({ type: 'success', text: 'Anggota ditambahkan (demo)' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  function openCreateModal() {
    setFormNama('')
    setFormPembina('')
    setCreateModal(true)
  }

  function openEditModal(group) {
    setFormNama(group.nama_grup)
    setFormPembina(group.pembina_user_id || '')
    setEditModal(group)
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

      {/* Search + Actions */}
      <div className="admin-search">
        <input
          type="text"
          className="admin-search__input"
          placeholder="Cari grup atau pembina..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="admin-table__btn admin-table__btn--edit" onClick={loadData} title="Refresh">
          <RefreshCw size={14} />
        </button>
        <button className="btn btn--primary btn--sm" onClick={openCreateModal}>
          <Plus size={14} /> Buat Grup
        </button>
      </div>

      {message && (
        <div className={`login-${message.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 'var(--space-4)' }}>
          {message.type === 'success' && <CheckCircle size={14} />}
          {message.text}
        </div>
      )}

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
                  <div style={{ flex: 1 }}>
                    <h3 className="admin-grup-card__name">{g.nama_grup}</h3>
                    <p className="admin-grup-card__id">{g.grup_id}</p>
                  </div>
                </div>
                <div className="admin-grup-card__details">
                  <div className="admin-grup-card__detail">
                    <Shield size={14} />
                    <span>Pembina: <strong>{g.pembina_nama || '-'}</strong></span>
                  </div>
                  <div className="admin-grup-card__detail">
                    <Users size={14} />
                    <span>Anggota: <strong>{g.jumlah_anggota || 0}</strong></span>
                  </div>
                </div>
                <div className="admin-grup-card__actions">
                  <button
                    className="admin-table__btn admin-table__btn--edit"
                    onClick={() => viewGroupMembers(g)}
                    title="Lihat anggota"
                  >
                    <Eye size={12} /> Anggota
                  </button>
                  <button
                    className="admin-table__btn admin-table__btn--edit"
                    onClick={() => openEditModal(g)}
                    title="Edit grup"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                  <button
                    className="admin-table__btn admin-table__btn--danger"
                    onClick={() => handleDeleteGroup(g.grup_id, g.nama_grup)}
                    title="Hapus grup"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
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

      {/* Create Group Modal */}
      {createModal && (
        <>
          <div className="modal-overlay" onClick={() => setCreateModal(false)} />
          <div className="modal-dialog">
            <div className="modal-dialog__header">
              <h3>Buat Grup Baru</h3>
              <button className="modal-dialog__close" onClick={() => setCreateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-dialog__body">
              <div className="form-group">
                <label className="form-label">Nama Grup</label>
                <input
                  className="form-input"
                  placeholder="Contoh: Ust. Ahmad"
                  value={formNama}
                  onChange={e => setFormNama(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pembina (opsional)</label>
                <select
                  className="form-input"
                  value={formPembina}
                  onChange={e => setFormPembina(e.target.value)}
                >
                  <option value="">-- Pilih Pembina --</option>
                  {pembinaUsers.map(p => (
                    <option key={p.user_id} value={p.user_id}>{p.nama}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-dialog__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setCreateModal(false)}>Batal</button>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleCreateGroup}
                disabled={!formNama.trim() || actionLoading}
              >
                {actionLoading ? <Loader2 size={14} className="admin-loading__spinner" /> : <Plus size={14} />}
                Buat Grup
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Group Modal */}
      {editModal && (
        <>
          <div className="modal-overlay" onClick={() => setEditModal(null)} />
          <div className="modal-dialog">
            <div className="modal-dialog__header">
              <h3>Edit Grup</h3>
              <button className="modal-dialog__close" onClick={() => setEditModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-dialog__body">
              <div className="form-group">
                <label className="form-label">Nama Grup</label>
                <input
                  className="form-input"
                  value={formNama}
                  onChange={e => setFormNama(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pembina</label>
                <select
                  className="form-input"
                  value={formPembina}
                  onChange={e => setFormPembina(e.target.value)}
                >
                  <option value="">-- Pilih Pembina --</option>
                  {pembinaUsers.map(p => (
                    <option key={p.user_id} value={p.user_id}>{p.nama}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-dialog__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setEditModal(null)}>Batal</button>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleEditGroup}
                disabled={!formNama.trim() || actionLoading}
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </>
      )}

      {/* View Members Modal */}
      {viewModal && (
        <>
          <div className="modal-overlay" onClick={() => setViewModal(null)} />
          <div className="modal-dialog modal-dialog--wide">
            <div className="modal-dialog__header">
              <h3>Anggota Grup: {viewModal.nama_grup}</h3>
              <button className="modal-dialog__close" onClick={() => setViewModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-dialog__body">
              {viewLoading ? (
                <div className="admin-loading" style={{ padding: 'var(--space-6)' }}>
                  <Loader2 size={24} className="admin-loading__spinner" />
                  <p>Memuat anggota...</p>
                </div>
              ) : viewModal.members.length > 0 ? (
                <div className="member-list">
                  {viewModal.members.map(m => (
                    <div key={m.user_id || m.id} className="member-list__item">
                      <div className="member-list__info">
                        <strong>{m.nama}</strong>
                        <span className="member-list__email">{m.email}</span>
                      </div>
                      <button
                        className="admin-table__btn admin-table__btn--danger"
                        onClick={() => handleRemoveMember(viewModal.grup_id, m.user_id || m.id)}
                        title="Keluarkan dari grup"
                      >
                        <UserMinus size={12} /> Keluarkan
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 'var(--space-4)' }}>
                  Belum ada anggota di grup ini
                </p>
              )}

              {/* Add member section */}
              {unassignedAnggota.length > 0 && (
                <div className="add-member-section">
                  <h4 className="add-member-section__title">
                    <UserPlus size={14} /> Tambah Anggota ({unassignedAnggota.length} tersedia)
                  </h4>
                  <div className="member-list">
                    {unassignedAnggota.slice(0, 10).map(u => (
                      <div key={u.user_id} className="member-list__item">
                        <div className="member-list__info">
                          <strong>{u.nama}</strong>
                          <span className="member-list__email">{u.email}</span>
                        </div>
                        <button
                          className="admin-table__btn admin-table__btn--edit"
                          onClick={() => handleAddMember(viewModal.grup_id, u.user_id)}
                        >
                          <UserPlus size={12} /> Tambah
                        </button>
                      </div>
                    ))}
                    {unassignedAnggota.length > 10 && (
                      <p style={{ textAlign: 'center', color: 'var(--color-gray-400)', fontSize: '12px' }}>
                        ...dan {unassignedAnggota.length - 10} anggota lainnya
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-dialog__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setViewModal(null)}>Tutup</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
