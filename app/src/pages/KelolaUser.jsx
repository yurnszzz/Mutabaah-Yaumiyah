import { useState, useEffect } from 'react'
import {
  getAllUsers as apiGetAllUsers,
  deleteUser as apiDeleteUser,
  updateUserRole as apiUpdateUserRole,
  isApiConfigured
} from '../services/api'
import {
  Users, Search, Trash2, Shield, Loader2, AlertCircle,
  CheckCircle, RefreshCw, X
} from 'lucide-react'
import './DashboardAdmin.css'

const ROLE_LABELS = { anggota: 'Anggota', pembina: 'Pembina', yayasan: 'Yayasan' }
const ROLE_COLORS = { anggota: 'primary', pembina: 'secondary', yayasan: 'warning' }
const ROLE_OPTIONS = [
  { value: 'anggota', label: 'Anggota', desc: 'Peserta mutabaah — input & lihat data pribadi' },
  { value: 'pembina', label: 'Pembina', desc: 'Pembina grup — monitor anggota & evaluasi' },
  { value: 'yayasan', label: 'Yayasan', desc: 'Admin — kelola seluruh user, grup, & sistem' },
]

export default function KelolaUser() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)
  const [roleModal, setRoleModal] = useState(null)
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const result = await apiGetAllUsers()
        if (result?.users) setUsers(result.users)
      } else {
        setUsers([
          { user_id: 'usr_001', nama: 'Ustadz Hamdan', email: 'ustadz.hamdan@sit.id', role: 'pembina', grup_nama: 'Ustadz Hamdan', status: 'aktif' },
          { user_id: 'usr_002', nama: 'Ahmad Fauzi', email: 'ahmad@sit.id', role: 'anggota', grup_nama: 'Ustadz Hamdan', status: 'aktif', tingkatan: 'pratama' },
          { user_id: 'usr_003', nama: 'Siti Nurhaliza', email: 'siti@sit.id', role: 'anggota', grup_nama: 'Ustadz Hamdan', status: 'aktif', tingkatan: 'muda' },
          { user_id: 'usr_004', nama: 'Admin Yayasan', email: 'yayasan@sit.id', role: 'yayasan', grup_nama: null, status: 'aktif' },
        ])
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(userId, nama) {
    if (!confirm(`Yakin ingin menghapus user "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setActionLoading(userId)
    setMessage(null)
    try {
      if (isApiConfigured()) {
        const result = await apiDeleteUser(userId)
        if (result?.message) {
          setMessage({ type: 'success', text: result.message })
          setUsers(prev => prev.filter(u => u.user_id !== userId))
        } else {
          setMessage({ type: 'error', text: result?.error || 'Gagal menghapus user' })
        }
      } else {
        setUsers(prev => prev.filter(u => u.user_id !== userId))
        setMessage({ type: 'success', text: 'User dihapus (demo)' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(null)
    }
  }

  function openRoleModal(userId, nama, currentRole) {
    setRoleModal({ userId, nama, currentRole })
    setSelectedRole(currentRole)
  }

  async function confirmRoleChange() {
    if (!roleModal || selectedRole === roleModal.currentRole) {
      setRoleModal(null)
      return
    }
    const { userId } = roleModal
    setActionLoading(userId)
    setMessage(null)
    setRoleModal(null)
    try {
      if (isApiConfigured()) {
        const result = await apiUpdateUserRole(userId, selectedRole)
        if (result?.message) {
          setMessage({ type: 'success', text: result.message })
          setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: selectedRole } : u))
        } else {
          setMessage({ type: 'error', text: result?.error || 'Gagal mengubah role' })
        }
      } else {
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: selectedRole } : u))
        setMessage({ type: 'success', text: `Role diubah ke ${ROLE_LABELS[selectedRole]} (demo)` })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (u.nama || '').toLowerCase().includes(q) ||
           (u.email || '').toLowerCase().includes(q) ||
           (u.role || '').toLowerCase().includes(q) ||
           (u.grup_nama || '').toLowerCase().includes(q)
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Kelola User</h1>
        <p className="page-header__subtitle">{users.length} user terdaftar</p>
      </div>

      <div className="admin-search">
        <input
          type="text"
          className="admin-search__input"
          placeholder="Cari nama, email, role, atau grup..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="admin-table__btn admin-table__btn--edit" onClick={loadUsers} title="Refresh">
          <RefreshCw size={14} />
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
          <p>Memuat data user...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Grup</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.user_id}>
                    <td>
                      <strong>{u.nama}</strong>
                      {u.tingkatan && (
                        <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginLeft: '6px' }}>
                          ({u.tingkatan.charAt(0).toUpperCase() + u.tingkatan.slice(1)})
                        </span>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge--${ROLE_COLORS[u.role] || 'primary'}`} style={{ fontSize: '11px' }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td>{u.grup_nama || '-'}</td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          className="admin-table__btn admin-table__btn--edit"
                          onClick={() => openRoleModal(u.user_id, u.nama, u.role)}
                          disabled={actionLoading === u.user_id}
                          title="Ubah role"
                        >
                          <Shield size={12} />
                          Role
                        </button>
                        <button
                          className="admin-table__btn admin-table__btn--danger"
                          onClick={() => handleDeleteUser(u.user_id, u.nama)}
                          disabled={actionLoading === u.user_id}
                          title="Hapus user"
                        >
                          <Trash2 size={12} />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="admin-empty">
          <Search size={32} className="admin-empty__icon" />
          <p>Tidak ada user yang cocok dengan pencarian</p>
        </div>
      )}

      {/* Role Change Modal */}
      {roleModal && (
        <>
          <div className="modal-overlay" onClick={() => setRoleModal(null)} />
          <div className="modal-dialog">
            <div className="modal-dialog__header">
              <h3>Ubah Role</h3>
              <button className="modal-dialog__close" onClick={() => setRoleModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-dialog__body">
              <p style={{ marginBottom: 'var(--space-3)', color: 'var(--color-gray-600)', fontSize: '14px' }}>
                Pilih role baru untuk <strong>{roleModal.nama}</strong>:
              </p>
              <div className="role-selector">
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`role-selector__option ${selectedRole === opt.value ? 'role-selector__option--active' : ''} ${roleModal.currentRole === opt.value ? 'role-selector__option--current' : ''}`}
                    onClick={() => setSelectedRole(opt.value)}
                  >
                    <div className="role-selector__header">
                      <span className={`badge badge--${ROLE_COLORS[opt.value]} badge--sm`}>{opt.label}</span>
                      {roleModal.currentRole === opt.value && (
                        <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>saat ini</span>
                      )}
                    </div>
                    <p className="role-selector__desc">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-dialog__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setRoleModal(null)}>Batal</button>
              <button
                className="btn btn--primary btn--sm"
                onClick={confirmRoleChange}
                disabled={selectedRole === roleModal.currentRole}
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
