import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMutabaah } from '../context/MutabaahContext'
import {
  changePassword as apiChangePassword,
  isApiConfigured,
  apiPost
} from '../services/api'
import {
  User, Mail, Users, Shield, Award, LogOut, Lock,
  Eye, EyeOff, Loader2, CheckCircle, KeyRound, Edit3, Link2, Copy, QrCode
} from 'lucide-react'
import './Profil.css'

function PasswordField({ id, value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false)
  return (
    <div className="profil-pw__input-wrap">
      <Lock size={16} className="profil-pw__icon" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="profil-pw__input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required
      />
      <button
        type="button"
        className="profil-pw__eye"
        onClick={() => setShow(!show)}
        tabIndex={-1}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

export default function Profil() {
  const { user, logout, updateLocalUser } = useAuth()
  const { savedWeeks } = useMutabaah()

  const isAdmin = user?.role === 'yayasan'
  const isPembina = user?.role === 'pembina'
  const streak = savedWeeks.length

  // Password state
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [showPwForm, setShowPwForm] = useState(false)

  // Edit profile state
  const [editMode, setEditMode] = useState(false)
  const [editNama, setEditNama] = useState(user?.nama || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  // Share link state (pembina)
  const [copied, setCopied] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (newPw.length < 6) {
      setPwError('Password baru minimal 6 karakter')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Konfirmasi password tidak sama')
      return
    }

    setPwLoading(true)
    try {
      const result = await apiChangePassword(user.user_id || user.id, oldPw, newPw)
      if (result && result.message) {
        setPwSuccess(result.message)
        setOldPw('')
        setNewPw('')
        setConfirmPw('')
        setTimeout(() => setShowPwForm(false), 2000)
      } else {
        setPwError(result?.error || 'Gagal mengubah password')
      }
    } catch (err) {
      setPwError(err.message || 'Gagal terhubung ke server')
    } finally {
      setPwLoading(false)
    }
  }

  async function handleEditProfile(e) {
    e.preventDefault()
    setEditError('')
    setEditSuccess('')

    if (!editNama.trim()) {
      setEditError('Nama tidak boleh kosong')
      return
    }
    if (!editEmail.trim()) {
      setEditError('Email tidak boleh kosong')
      return
    }

    setEditLoading(true)
    try {
      if (isApiConfigured()) {
        const result = await apiPost('updateProfile', {
          userId: user.user_id || user.id,
          nama: editNama.trim(),
          email: editEmail.trim(),
        })
        if (result && result.message) {
          setEditSuccess(result.message)
          // Update local user state
          if (updateLocalUser) {
            updateLocalUser({ nama: editNama.trim(), email: editEmail.trim() })
          }
          setTimeout(() => setEditMode(false), 1500)
        } else {
          setEditError(result?.error || 'Gagal memperbarui profil')
        }
      } else {
        // Demo mode
        setEditSuccess('Profil diperbarui (demo)')
        setTimeout(() => setEditMode(false), 1500)
      }
    } catch (err) {
      setEditError(err.message || 'Gagal terhubung ke server')
    } finally {
      setEditLoading(false)
    }
  }

  // Generate share link for pembina
  function getShareLink() {
    const baseUrl = window.location.origin
    const pembinaName = user?.nama || ''
    return `${baseUrl}/login?pembina=${encodeURIComponent(pembinaName)}`
  }

  function copyShareLink() {
    navigator.clipboard.writeText(getShareLink()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Profil Saya</h1>
      </div>

      {/* Profile Card */}
      <div className="profil-card card">
        <div className="card__body">
          <div className="profil-card__top">
            <div className="profil-card__avatar">
              {user?.nama?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <h2 className="profil-card__name">{user?.nama || '-'}</h2>
            <div className="profil-card__badges">
              <span className="badge badge--primary">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '-'}
              </span>
              {user?.tingkatan && (
                <span className="badge badge--info">
                  {user.tingkatan.charAt(0).toUpperCase() + user.tingkatan.slice(1)}
                </span>
              )}
            </div>
          </div>

          <div className="profil-details">
            <div className="profil-detail">
              <Mail size={16} />
              <span>{user?.email || '-'}</span>
            </div>
            <div className="profil-detail">
              <User size={16} />
              <span>{user?.gender === 'akhwat' ? 'Akhwat' : 'Ikhwan'}</span>
            </div>
            {user?.grup_nama && (
              <div className="profil-detail">
                <Users size={16} />
                <span>{user.grup_nama}</span>
              </div>
            )}
            {/* Only show streak for non-admin */}
            {!isAdmin && (
              <div className="profil-detail">
                <Award size={16} />
                <span>Streak: {streak} pekan</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile (Item 8) */}
      <div className="profil-section card">
        <div className="card__body">
          <div className="profil-section__header">
            <Edit3 size={18} />
            <h3 className="profil-section__title">Edit Profil</h3>
          </div>

          {!editMode ? (
            <button
              className="profil-pw__toggle"
              onClick={() => {
                setEditMode(true)
                setEditNama(user?.nama || '')
                setEditEmail(user?.email || '')
                setEditError('')
                setEditSuccess('')
              }}
            >
              <Edit3 size={16} />
              Ubah Nama / Email
            </button>
          ) : (
            <form onSubmit={handleEditProfile} className="profil-pw__form">
              <div className="profil-pw__input-wrap">
                <User size={16} className="profil-pw__icon" />
                <input
                  type="text"
                  className="profil-pw__input"
                  placeholder="Nama lengkap"
                  value={editNama}
                  onChange={e => setEditNama(e.target.value)}
                  disabled={editLoading}
                  required
                />
              </div>
              <div className="profil-pw__input-wrap">
                <Mail size={16} className="profil-pw__icon" />
                <input
                  type="email"
                  className="profil-pw__input"
                  placeholder="Email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  disabled={editLoading}
                  required
                />
              </div>

              {editError && <p className="profil-pw__error">{editError}</p>}
              {editSuccess && (
                <p className="profil-pw__success">
                  <CheckCircle size={14} />
                  {editSuccess}
                </p>
              )}

              <div className="profil-pw__actions">
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={editLoading || !editNama.trim() || !editEmail.trim()}
                >
                  {editLoading ? (
                    <>
                      <Loader2 size={16} className="profil-pw__spinner" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan'
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setEditMode(false)}
                  disabled={editLoading}
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Share Link for Pembina (Item 9) */}
      {isPembina && (
        <div className="profil-section card">
          <div className="card__body">
            <div className="profil-section__header">
              <Link2 size={18} />
              <h3 className="profil-section__title">Link Pendaftaran Anggota</h3>
            </div>
            <p className="profil-share__desc">
              Bagikan link ini ke anggota Anda. Nama pembina akan terisi otomatis saat mereka mendaftar.
            </p>
            <div className="profil-share__link-box">
              <input
                type="text"
                readOnly
                value={getShareLink()}
                className="profil-share__input"
                onClick={e => e.target.select()}
              />
              <button
                className="profil-share__copy-btn"
                onClick={copyShareLink}
                title="Salin link"
              >
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copied ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="profil-section card">
        <div className="card__body">
          <div className="profil-section__header">
            <KeyRound size={18} />
            <h3 className="profil-section__title">Keamanan</h3>
          </div>

          {!showPwForm ? (
            <button
              className="profil-pw__toggle"
              onClick={() => {
                setShowPwForm(true)
                setPwError('')
                setPwSuccess('')
              }}
            >
              <Lock size={16} />
              Ganti Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="profil-pw__form">
              <PasswordField
                id="old-password"
                value={oldPw}
                onChange={e => setOldPw(e.target.value)}
                placeholder="Password lama (kosongkan jika belum punya)"
                disabled={pwLoading}
              />
              <PasswordField
                id="new-password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Password baru (min. 6 karakter)"
                disabled={pwLoading}
              />
              <PasswordField
                id="confirm-password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Konfirmasi password baru"
                disabled={pwLoading}
              />

              {pwError && <p className="profil-pw__error">{pwError}</p>}
              {pwSuccess && (
                <p className="profil-pw__success">
                  <CheckCircle size={14} />
                  {pwSuccess}
                </p>
              )}

              <div className="profil-pw__actions">
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={pwLoading || !newPw || !confirmPw}
                >
                  {pwLoading ? (
                    <>
                      <Loader2 size={16} className="profil-pw__spinner" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Password'
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setShowPwForm(false)
                    setOldPw('')
                    setNewPw('')
                    setConfirmPw('')
                    setPwError('')
                    setPwSuccess('')
                  }}
                  disabled={pwLoading}
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="profil-actions">
        <button className="btn btn--ghost btn--block" onClick={logout} style={{ color: 'var(--color-danger)' }}>
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </div>
  )
}
