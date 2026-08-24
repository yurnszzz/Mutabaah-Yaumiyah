import { useState, useEffect } from 'react'
import {
  getAllUsers as apiGetAllUsers,
  getAllGroups as apiGetAllGroups,
  deleteUser as apiDeleteUser,
  updateUserRole as apiUpdateUserRole,
  isApiConfigured,
  apiPost
} from '../services/api'
import {
  Users, Search, Trash2, Shield, Loader2, AlertCircle,
  CheckCircle, RefreshCw, X, Edit3, ChevronDown
} from 'lucide-react'
import './DashboardAdmin.css'

const ROLE_LABELS = { anggota: 'Anggota', pembina: 'Pembina', yayasan: 'Yayasan' }
const ROLE_COLORS = { anggota: 'primary', pembina: 'secondary', yayasan: 'warning' }
const TINGKATAN_OPTIONS = [
  { value: 'muda', label: 'Muda' },
  { value: 'pratama', label: 'Pratama' },
]
const STATUS_OPTIONS = [
  { value: 'aktif', label: 'Aktif', color: '#10b981' },
  { value: 'nonaktif', label: 'Nonaktif', color: '#6b7280' },
]

export default function KelolaUser() {
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)
  const [editModal, setEditModal] = useState(null) // { user, editNama, editRole, editTingkatan, editGrupId, editStatus }
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const [usersResult, groupsResult] = await Promise.all([
          apiGetAllUsers(),
          apiGetAllGroups()
        ])
        if (usersResult?.users) setUsers(usersResult.users)
        if (groupsResult?.groups) setGroups(groupsResult.groups)
      } else {
        setUsers([
          { user_id: 'usr_001', nama: 'Ust. Hamdan', email: 'ustadz.hamdan@sit.id', role: 'pembina', grup_id: 'grp_001', grup_nama: 'Ust. Hamdan', status: 'aktif', gender: 'ikhwan' },
          { user_id: 'usr_002', nama: 'Ahmad Fauzi', email: 'ahmad@sit.id', role: 'anggota', grup_id: 'grp_001', grup_nama: 'Ust. Hamdan', status: 'aktif', tingkatan: 'pratama', gender: 'ikhwan' },
          { user_id: 'usr_003', nama: 'Siti Nurhaliza', email: 'siti@sit.id', role: 'anggota', grup_id: 'grp_001', grup_nama: 'Ust. Hamdan', status: 'aktif', tingkatan: 'muda', gender: 'akhwat' },
          { user_id: 'usr_004', nama: 'Admin Yayasan', email: 'yayasan@sit.id', role: 'yayasan', grup_id: null, grup_nama: null, status: 'aktif', gender: 'ikhwan' },
        ])
        setGroups([
          { grup_id: 'grp_001', nama_grup: 'Ust. Hamdan', pembina_user_id: 'usr_001' },
        ])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  function openEditModal(user) {
    setEditModal({
      user,
      editNama: user.nama || '',
      editRole: user.role || 'anggota',
      editTingkatan: user.tingkatan || 'muda',
      editGrupId: user.grup_id || '',
      editStatus: user.status || 'aktif',
    })
  }

  function updateEditField(field, value) {
    setEditModal(prev => prev ? { ...prev, [field]: value } : null)
  }

  async function handleSaveEdit() {
    if (!editModal) return

    const { user, editNama, editRole, editTingkatan, editGrupId, editStatus } = editModal
    const changes = {}
    let hasChange = false

    if (editNama.trim() && editNama.trim() !== user.nama) { changes.nama = editNama.trim(); hasChange = true }
    if (editRole !== user.role) { changes.role = editRole; hasChange = true }
    if (editTingkatan !== (user.tingkatan || 'muda')) { changes.tingkatan = editTingkatan; hasChange = true }
    if (editGrupId !== (user.grup_id || '')) { changes.grupId = editGrupId; hasChange = true }
    if (editStatus !== (user.status || 'aktif')) { changes.status = editStatus; hasChange = true }

    if (!hasChange) {
      setEditModal(null)
      return
    }

    setActionLoading(user.user_id)
    setMessage(null)
    setEditModal(null)

    try {
      if (isApiConfigured()) {
        const result = await apiPost('adminEditProfile', { userId: user.user_id, ...changes })
        if (result?.message) {
          setMessage({ type: 'success', text: result.message })
          // Update local state
          const grupNama = editGrupId ? (groups.find(g => g.grup_id === editGrupId)?.nama_grup || '') : ''
          setUsers(prev => prev.map(u =>
            u.user_id === user.user_id
              ? { ...u, ...changes, grup_id: editGrupId || u.grup_id, grup_nama: editGrupId ? grupNama : u.grup_nama }
              : u
          ))
        } else {
          setMessage({ type: 'error', text: result?.error || 'Gagal menyimpan perubahan' })
        }
      } else {
        const grupNama = editGrupId ? (groups.find(g => g.grup_id === editGrupId)?.nama_grup || '') : ''
        setUsers(prev => prev.map(u =>
          u.user_id === user.user_id
            ? { ...u, nama: editNama.trim() || u.nama, role: editRole, tingkatan: editTingkatan, grup_id: editGrupId || u.grup_id, grup_nama: grupNama || u.grup_nama, status: editStatus }
            : u
        ))
        setMessage({ type: 'success', text: 'Profil berhasil diubah (demo)' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDeleteUser(user) {
    setActionLoading(user.user_id)
    setMessage(null)
    setDeleteConfirm(null)
    try {
      if (isApiConfigured()) {
        const result = await apiDeleteUser(user.user_id)
        if (result?.message) {
          setMessage({ type: 'success', text: result.message })
          setUsers(prev => prev.filter(u => u.user_id !== user.user_id))
        } else {
          setMessage({ type: 'error', text: result?.error || 'Gagal menghapus user' })
        }
      } else {
        setUsers(prev => prev.filter(u => u.user_id !== user.user_id))
        setMessage({ type: 'success', text: 'User dihapus (demo)' })
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
        <button className="admin-table__btn admin-table__btn--edit" onClick={loadData} title="Refresh">
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
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.user_id} className={u.status === 'nonaktif' ? 'admin-table__row--inactive' : ''}>
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
                      <span className={`admin-status admin-status--${u.status || 'aktif'}`}>
                        {(u.status || 'aktif').charAt(0).toUpperCase() + (u.status || 'aktif').slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          className="admin-table__btn admin-table__btn--edit"
                          onClick={() => openEditModal(u)}
                          disabled={actionLoading === u.user_id}
                          title="Edit profil"
                        >
                          <Edit3 size={12} />
                          Edit
                        </button>
                        <button
                          className="admin-table__btn admin-table__btn--danger"
                          onClick={() => setDeleteConfirm(u)}
                          disabled={actionLoading === u.user_id}
                          title="Hapus user"
                        >
                          <Trash2 size={12} />
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

      {/* Edit Profile Modal */}
      {editModal && (
        <>
          <div className="modal-overlay" onClick={() => setEditModal(null)} />
          <div className="modal-dialog modal-dialog--wide">
            <div className="modal-dialog__header">
              <h3>Edit Profil User</h3>
              <button className="modal-dialog__close" onClick={() => setEditModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-dialog__body">
              {/* User identity (read-only) */}
              <div className="edit-profile__readonly">
                <div className="edit-profile__readonly-row">
                  <span className="edit-profile__readonly-label">Email</span>
                  <span className="edit-profile__readonly-value">{editModal.user.email}</span>
                </div>
                {editModal.user.gender && (
                  <div className="edit-profile__readonly-row">
                    <span className="edit-profile__readonly-label">Gender</span>
                    <span className="edit-profile__readonly-value">{editModal.user.gender === 'akhwat' ? 'Akhwat' : 'Ikhwan'}</span>
                  </div>
                )}
              </div>

              {/* Editable fields */}
              <div className="edit-profile__field">
                <label className="edit-profile__label">Nama Tampilan</label>
                <input
                  type="text"
                  className="edit-profile__input"
                  value={editModal.editNama}
                  onChange={e => updateEditField('editNama', e.target.value)}
                />
              </div>

              <div className="edit-profile__field">
                <label className="edit-profile__label">Role</label>
                <div className="edit-profile__options">
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`edit-profile__option ${editModal.editRole === val ? 'edit-profile__option--active' : ''}`}
                      onClick={() => updateEditField('editRole', val)}
                    >
                      <span className={`badge badge--${ROLE_COLORS[val]} badge--sm`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="edit-profile__field">
                <label className="edit-profile__label">Jenjang</label>
                <div className="edit-profile__options">
                  {TINGKATAN_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`edit-profile__option ${editModal.editTingkatan === opt.value ? 'edit-profile__option--active' : ''}`}
                      onClick={() => updateEditField('editTingkatan', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="edit-profile__field">
                <label className="edit-profile__label">Grup / Pembina</label>
                <div className="edit-profile__select-wrap">
                  <select
                    className="edit-profile__select"
                    value={editModal.editGrupId}
                    onChange={e => updateEditField('editGrupId', e.target.value)}
                  >
                    <option value="">Tidak ada grup</option>
                    {groups.map(g => (
                      <option key={g.grup_id} value={g.grup_id}>{g.nama_grup}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="edit-profile__select-icon" />
                </div>
              </div>

              <div className="edit-profile__field">
                <label className="edit-profile__label">Status</label>
                <div className="edit-profile__options">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`edit-profile__option ${editModal.editStatus === opt.value ? 'edit-profile__option--active' : ''}`}
                      onClick={() => updateEditField('editStatus', opt.value)}
                    >
                      <span className="edit-profile__status-dot" style={{ background: opt.color }} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="edit-profile__note">
                <AlertCircle size={13} />
                <span>Email, password, dan gender tidak dapat diubah demi keamanan data pribadi.</span>
              </div>
            </div>
            <div className="modal-dialog__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setEditModal(null)}>Batal</button>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleSaveEdit}
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)} />
          <div className="modal-dialog">
            <div className="modal-dialog__header">
              <h3>Hapus User</h3>
              <button className="modal-dialog__close" onClick={() => setDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-dialog__body">
              <p style={{ color: 'var(--color-gray-600)', fontSize: '14px', lineHeight: '1.5' }}>
                Yakin ingin menghapus <strong>{deleteConfirm.nama}</strong> ({deleteConfirm.email})?
                Tindakan ini tidak dapat dibatalkan dan semua data user akan dihapus.
              </p>
            </div>
            <div className="modal-dialog__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setDeleteConfirm(null)}>Batal</button>
              <button
                className="btn btn--danger btn--sm"
                onClick={() => handleDeleteUser(deleteConfirm)}
              >
                <Trash2 size={14} />
                Ya, Hapus
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
