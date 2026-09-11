import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import {
  LogIn, Users, Shield, Star, Mail, ArrowRight,
  Loader2, UserPlus, CheckCircle, Lock, User, Eye, EyeOff, ChevronDown, KeyRound,
  Sprout, Award, Flame, AlertTriangle, ClipboardCheck, X
} from 'lucide-react'
import './Login.css'

const roleIcons = { anggota: Users, pembina: Shield, yayasan: Star }
const roleColors = { anggota: 'primary', pembina: 'secondary', yayasan: 'warning' }

let gsiInitialized = false
// Use a ref-style wrapper so GIS always calls the latest callback
// without needing to re-initialize (which causes flickering)
let latestGoogleCallback = null

function GoogleSignInButton({ onSuccess, clientId, mode }) {
  const btnRef = useRef(null)
  const [gsiReady, setGsiReady] = useState(false)

  // Always keep the latest callback accessible
  useEffect(() => {
    latestGoogleCallback = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (!clientId || !btnRef.current) return

    function renderBtn() {
      if (!window.google?.accounts?.id || !btnRef.current) return

      if (!gsiInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            // Always call the latest callback
            if (latestGoogleCallback) latestGoogleCallback(response)
          },
          auto_select: false,
        })
        gsiInitialized = true
      }

      // Clear previous button
      btnRef.current.innerHTML = ''

      window.google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 360,
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        logo_alignment: 'center',
      })
      setGsiReady(true)
    }

    if (window.google?.accounts?.id) {
      renderBtn()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          renderBtn()
          clearInterval(interval)
        }
      }, 200)
      const timeout = setTimeout(() => clearInterval(interval), 10000)
      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [clientId, mode]) // re-render when mode changes

  if (!clientId) return null

  return (
    <div className="google-signin-wrapper">
      <div ref={btnRef} className="google-signin-btn" />
      {!gsiReady && (
        <div className="google-signin-placeholder">
          <Loader2 size={16} className="login-form__spinner" />
          <span>Memuat Google Sign-In...</span>
        </div>
      )}
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, disabled, id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="login-form__input-wrapper">
      <Lock size={18} className="login-form__icon" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="login-form__input login-form__input--password"
        placeholder={placeholder || 'Password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required
        autoComplete={id === 'register-password' ? 'new-password' : 'current-password'}
      />
      <button
        type="button"
        className="login-form__eye"
        onClick={() => setShow(!show)}
        tabIndex={-1}
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export default function Login() {
  const {
    loginWithPassword, registerWithPassword, handleGoogleLogin,
    forgotPassword, loginDemo, demoUsers,
    isLoading, error, successMessage, clearMessages,
    isApiMode, hasGoogleAuth, googleClientId
  } = useAuth()

  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState('login') // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nama, setNama] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('anggota')
  const [tingkatan, setTingkatan] = useState('muda') // 'muda' | 'pratama'
  const [gender, setGender] = useState('ikhwan') // 'ikhwan' | 'akhwat'
  const [namaPembina, setNamaPembina] = useState('')
  const [localError, setLocalError] = useState('')
  const [googleEmail, setGoogleEmail] = useState('') // for Google auto-fill
  const [googleAutoRegister, setGoogleAutoRegister] = useState(false) // auto-redirect from sign-in
  const [showConfirm, setShowConfirm] = useState(false) // registration confirmation modal
  const [confirmData, setConfirmData] = useState(null) // data to confirm before registering
  const [referralCode, setReferralCode] = useState('') // referral code from pembina link

  // Ref to always have current tab value in Google callback (avoids stale closure)
  const tabRef = useRef(tab)
  tabRef.current = tab

  // Check URL params for share link (?pembina=NamaPembina&ref=grp_xxx)
  useEffect(() => {
    const pembina = searchParams.get('pembina')
    const refCode = searchParams.get('ref')
    if (refCode) {
      setReferralCode(refCode)
    }
    if (pembina) {
      setTab('register')
      setRole('anggota')
      // Strip gelar prefix if present — gelar is auto-derived from gender in handleRegister
      const parts = pembina.trim()
      if (parts.startsWith('Ust. ') || parts.startsWith('Ust.')) {
        setNamaPembina(parts.replace(/^Ust\.\s*/, ''))
      } else if (parts.startsWith('Ustadzah ')) {
        setNamaPembina(parts.replace(/^Ustadzah\s*/, ''))
      } else {
        setNamaPembina(parts)
      }
    }
  }, [searchParams])

  function switchTab(newTab) {
    setTab(newTab)
    if (newTab !== 'register') {
      setEmail(googleEmail || '')
      setNama('')
    }
    setPassword('')
    setConfirmPassword('')
    if (!searchParams.get('pembina')) {
      setRole('anggota')
      setNamaPembina('')
    }
    setLocalError('')
    clearMessages()
  }

  function handleLogin(e) {
    e.preventDefault()
    setLocalError('')
    if (!email.trim() || !password) return
    loginWithPassword(email.trim(), password)
  }

  function handleRegister(e) {
    e.preventDefault()
    setLocalError('')

    if (!nama.trim() || !email.trim() || !password) return

    // Auto-derive gelar from gender
    const gelar = gender === 'akhwat' ? 'Ustadzah' : 'Ust.'

    // Build full pembina name with auto-gelar (for anggota referencing their pembina)
    let fullPembinaName = ''
    if (role === 'anggota') {
      if (!namaPembina.trim()) {
        setLocalError('Nama pembina wajib diisi')
        return
      }
      fullPembinaName = gelar + ' ' + namaPembina.trim()
    }

    // For pembina: auto-prepend gelar to their own name
    let finalNama = nama.trim()
    if (role === 'pembina') {
      finalNama = gelar + ' ' + finalNama
    }

    if (password.length < 6) {
      setLocalError('Password minimal 6 karakter')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Konfirmasi password tidak sama')
      return
    }

    // Pembina always uses 'pratama' target
    const finalTingkatan = role === 'pembina' ? 'pratama' : tingkatan

    // Show confirmation modal instead of submitting directly
    setConfirmData({
      finalNama,
      email: email.trim(),
      password,
      role,
      finalTingkatan,
      fullPembinaName: role === 'anggota' ? fullPembinaName : null,
      gender,
      // Display-friendly values for modal
      displayGender: gender === 'ikhwan' ? 'Ikhwan' : 'Akhwat',
      displayRole: role === 'anggota' ? 'Anggota' : role === 'pembina' ? 'Pembina' : 'Yayasan',
      displayTingkatan: finalTingkatan === 'muda' ? 'Muda' : 'Pratama',
    })
    setShowConfirm(true)
  }

  function handleConfirmRegister() {
    if (!confirmData) return
    setShowConfirm(false)
    registerWithPassword(
      confirmData.finalNama,
      confirmData.email,
      confirmData.password,
      confirmData.role,
      confirmData.finalTingkatan,
      confirmData.fullPembinaName,
      confirmData.gender,
      referralCode
    )
    setConfirmData(null)
  }

  function handleCancelConfirm() {
    setShowConfirm(false)
    setConfirmData(null)
  }

  function handleForgotPassword(e) {
    e.preventDefault()
    setLocalError('')
    if (!email.trim()) return
    forgotPassword(email.trim())
  }

  // Decode Google JWT locally (same logic as AuthContext)
  function decodeGoogleJwt(token) {
    try {
      const payload = token.split('.')[1]
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }

  // Google OAuth callback — unified for both login & register tabs
  // If user not found: auto-redirect to register with pre-filled data (no error)
  async function onGoogleSuccess(credentialResponse) {
    const currentTab = tabRef.current
    const payload = decodeGoogleJwt(credentialResponse.credential)
    if (!payload || !payload.email) {
      setLocalError('Gagal membaca data dari Google')
      return
    }

    if (currentTab === 'register') {
      // REGISTER MODE: Pre-fill form directly
      setEmail(payload.email)
      setGoogleEmail(payload.email)
      setNama(payload.name || payload.email.split('@')[0])
      setLocalError('')
      clearMessages()
    } else {
      // LOGIN MODE: Try login, auto-redirect to register if not found
      const result = await handleGoogleLogin(credentialResponse)
      if (result && result.unregistered) {
        // Smooth redirect — no error, show guidance
        setTab('register')
        setEmail(result.email)
        setGoogleEmail(result.email)
        setNama(result.nama || payload.name || '')
        setLocalError('')
        clearMessages()
        // Set a temporary success-like message to guide user
        setGoogleAutoRegister(true)
      }
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/SIT_MATAHARI_LOGO.png" alt="Logo SIT Matahari" className="login-logo" />
          <h1 className="login-title">Mutabaah Yaumiyah</h1>
          <p className="login-subtitle">Sekolah Islam Terpadu Matahari</p>
          <p className="login-desc">Evaluasi Pekanan Amalan</p>
        </div>

        {isApiMode ? (
          <>
            {/* === Google Sign-In / Sign-Up === */}
            {hasGoogleAuth && tab !== 'forgot' && (
              <>
                <GoogleSignInButton
                  clientId={googleClientId}
                  onSuccess={onGoogleSuccess}
                  mode={tab === 'register' ? 'signup' : 'signin'}
                />
                <div className="login-or">
                  <span className="login-or__line" />
                  <span className="login-or__text">
                    {tab === 'login' ? 'atau masuk dengan email' : 'atau daftar dengan email'}
                  </span>
                  <span className="login-or__line" />
                </div>
              </>
            )}

            {/* === Tab Switcher === */}
            {tab !== 'forgot' && (
              <div className="login-tabs">
                <button
                  type="button"
                  className={`login-tabs__btn ${tab === 'login' ? 'login-tabs__btn--active' : ''}`}
                  onClick={() => switchTab('login')}
                >
                  <LogIn size={16} />
                  Masuk
                </button>
                <button
                  type="button"
                  className={`login-tabs__btn ${tab === 'register' ? 'login-tabs__btn--active' : ''}`}
                  onClick={() => switchTab('register')}
                >
                  <UserPlus size={16} />
                  Daftar
                </button>
              </div>
            )}

            {/* === Login Form === */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="login-form">
                <div className="login-form__input-wrapper">
                  <Mail size={18} className="login-form__icon" />
                  <input
                    type="email"
                    className="login-form__input"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="email"
                  />
                </div>
                <PasswordInput
                  id="login-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="login-form__submit"
                  disabled={isLoading || !email.trim() || !password}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="login-form__spinner" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Masuk
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="login-form__forgot"
                  onClick={() => switchTab('forgot')}
                >
                  Lupa password?
                </button>
              </form>
            )}

            {/* === Register Form === */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="login-form">
                {/* Auto-redirect guidance */}
                {googleAutoRegister && googleEmail && (
                  <div className="login-form__guidance">
                    <CheckCircle size={16} />
                    <div>
                      <p className="login-form__guidance-title">Akun belum terdaftar</p>
                      <p className="login-form__guidance-desc">
                        Email <strong>{googleEmail}</strong> belum terdaftar. Lengkapi data di bawah untuk membuat akun baru.
                      </p>
                    </div>
                  </div>
                )}
                <div className="login-form__input-wrapper">
                  <User size={18} className="login-form__icon" />
                  <input
                    type="text"
                    className="login-form__input"
                    placeholder="Nama lengkap"
                    value={nama}
                    onChange={e => setNama(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="login-form__input-wrapper">
                  <Mail size={18} className="login-form__icon" />
                  <input
                    type="email"
                    className="login-form__input"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading || !!googleEmail}
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Gender selector */}
                <div className="login-form__gender">
                  <label className="login-form__gender-label">Jenis Kelamin:</label>
                  <div className="login-form__gender-options">
                    <button
                      type="button"
                      className={`login-form__gender-btn ${gender === 'ikhwan' ? 'login-form__gender-btn--active' : ''}`}
                      onClick={() => setGender('ikhwan')}
                      disabled={isLoading}
                    >
                      <Users size={14} /> Ikhwan
                    </button>
                    <button
                      type="button"
                      className={`login-form__gender-btn ${gender === 'akhwat' ? 'login-form__gender-btn--active login-form__gender-btn--akhwat' : ''}`}
                      onClick={() => setGender('akhwat')}
                      disabled={isLoading}
                    >
                      <User size={14} /> Akhwat
                    </button>
                  </div>
                </div>

                {/* Role dropdown */}
                <div className="login-form__select-wrapper">
                  <Shield size={18} className="login-form__icon" />
                  <select
                    className="login-form__select"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="anggota">Daftar sebagai: Anggota</option>
                    <option value="pembina">Daftar sebagai: Pembina</option>
                  </select>
                  <ChevronDown size={16} className="login-form__chevron" />
                </div>

                {/* Tingkatan selector (anggota only) */}
                {role === 'anggota' && (
                  <div className="login-form__gender">
                    <label className="login-form__gender-label">Jenjang Anggota:</label>
                    <div className="login-form__gender-options">
                      <button
                        type="button"
                        className={`login-form__gender-btn ${tingkatan === 'muda' ? 'login-form__gender-btn--active' : ''}`}
                        onClick={() => setTingkatan('muda')}
                        disabled={isLoading}
                      >
                        <Sprout size={14} /> Muda
                      </button>
                      <button
                        type="button"
                        className={`login-form__gender-btn ${tingkatan === 'pratama' ? 'login-form__gender-btn--active' : ''}`}
                        onClick={() => setTingkatan('pratama')}
                        disabled={isLoading}
                      >
                        <Award size={14} /> Pratama
                      </button>
                    </div>
                    <p className="login-form__hint" style={{ marginTop: '4px' }}>
                      {tingkatan === 'muda'
                        ? 'Target: Jamaah 14x, Tilawah 1 juz, Shaum 1x/bulan'
                        : 'Target: Jamaah 21x, Tilawah 3.5 juz, Shaum 2x/bulan'}
                    </p>
                  </div>
                )}





                {/* Nama Pembina (required for anggota) */}
                {role === 'anggota' && (
                  <>
                    <div className="login-form__input-wrapper">
                      <Shield size={18} className="login-form__icon" />
                      <input
                        type="text"
                        className="login-form__input"
                        placeholder="Nama pembina (tanpa gelar)"
                        value={namaPembina}
                        onChange={e => setNamaPembina(e.target.value)}
                        disabled={isLoading || !!searchParams.get('pembina')}
                        required
                      />
                    </div>
                    <p className="login-form__hint">
                      Masukkan nama pembina Anda. Gelar ({gender === 'akhwat' ? 'Ustadzah' : 'Ust.'}) akan otomatis ditambahkan. Anggota dengan pembina yang sama akan masuk ke grup yang sama.
                    </p>
                  </>
                )}



                <PasswordInput
                  id="register-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password (min. 6 karakter)"
                  disabled={isLoading}
                />
                <PasswordInput
                  id="register-confirm"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Konfirmasi password"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="login-form__submit"
                  disabled={isLoading || !nama.trim() || !email.trim() || !password || !confirmPassword || (role === 'anggota' && !namaPembina.trim())}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="login-form__spinner" />
                      Mendaftar...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Daftar
                    </>
                  )}
                </button>
              </form>
            )}

            {/* === Forgot Password Form === */}
            {tab === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="login-form">
                <div className="login-form__forgot-header">
                  <KeyRound size={32} className="login-form__forgot-icon" />
                  <h2 className="login-form__forgot-title">Lupa Password</h2>
                  <p className="login-form__forgot-desc">
                    Masukkan email Anda. Password sementara akan dikirim ke email tersebut.
                  </p>
                </div>
                <div className="login-form__input-wrapper">
                  <Mail size={18} className="login-form__icon" />
                  <input
                    type="email"
                    className="login-form__input"
                    placeholder="Email terdaftar"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  className="login-form__submit"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="login-form__spinner" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Kirim Password Sementara
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="login-form__back"
                  onClick={() => switchTab('login')}
                >
                  Kembali ke halaman masuk
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            {/* === Mock Mode: Demo User Buttons === */}
            <div className="login-divider">
              <span className="login-divider__line" />
              <span className="login-divider__text">Mode demo - pilih akun</span>
              <span className="login-divider__line" />
            </div>

            <div className="login-users">
              {demoUsers.map(u => {
                const Icon = roleIcons[u.role] || Users
                return (
                  <button
                    key={u.id}
                    className="login-user-btn"
                    onClick={() => loginDemo(u.id)}
                    disabled={isLoading}
                  >
                    <div className={`login-user-btn__avatar login-user-btn__avatar--${roleColors[u.role]}`}>
                      <Icon size={20} />
                    </div>
                    <div className="login-user-btn__info">
                      <p className="login-user-btn__name">{u.nama}</p>
                      <p className="login-user-btn__role">
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        {u.tingkatan ? ` - ${u.tingkatan.charAt(0).toUpperCase() + u.tingkatan.slice(1)}` : ''}
                        {u.grup_nama ? ` - ${u.grup_nama}` : ''}
                      </p>
                    </div>
                    <ArrowRight size={18} className="login-user-btn__arrow" />
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="login-success">
            <CheckCircle size={16} />
            {successMessage}
          </div>
        )}

        {/* Error Messages */}
        {(error || localError) && (
          <p className="login-error">{localError || error}</p>
        )}

        <div className="login-footer">
          <span className={`login-footer__badge ${isApiMode ? 'login-footer__badge--online' : 'login-footer__badge--offline'}`}>
            <span className="login-footer__dot" />
            {isApiMode ? 'Terhubung ke server' : 'Mode demo (offline)'}
          </span>
        </div>
      </div>

      {/* Registration Confirmation Modal */}
      {showConfirm && confirmData && (
        <div className="confirm-overlay" onClick={handleCancelConfirm}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <button className="confirm-modal__close" onClick={handleCancelConfirm} type="button">
              <X size={18} />
            </button>
            <div className="confirm-modal__icon">
              <ClipboardCheck size={32} />
            </div>
            <h3 className="confirm-modal__title">Konfirmasi Data Pendaftaran</h3>
            <p className="confirm-modal__desc">Pastikan semua data sudah benar sebelum mendaftar.</p>

            <div className="confirm-modal__data">
              <div className="confirm-modal__row">
                <span className="confirm-modal__label">Nama</span>
                <span className="confirm-modal__value">{confirmData.finalNama}</span>
              </div>
              <div className="confirm-modal__row">
                <span className="confirm-modal__label">Email</span>
                <span className="confirm-modal__value">{confirmData.email}</span>
              </div>
              <div className="confirm-modal__row">
                <span className="confirm-modal__label">Gender</span>
                <span className="confirm-modal__value">{confirmData.displayGender}</span>
              </div>
              <div className="confirm-modal__row">
                <span className="confirm-modal__label">Role</span>
                <span className="confirm-modal__value">{confirmData.displayRole}</span>
              </div>
              {confirmData.role !== 'pembina' && (
                <div className="confirm-modal__row">
                  <span className="confirm-modal__label">Jenjang</span>
                  <span className="confirm-modal__value">{confirmData.displayTingkatan}</span>
                </div>
              )}
              {confirmData.fullPembinaName && (
                <div className="confirm-modal__row">
                  <span className="confirm-modal__label">Pembina</span>
                  <span className="confirm-modal__value">{confirmData.fullPembinaName}</span>
                </div>
              )}
            </div>

            <div className="confirm-modal__warning">
              <AlertTriangle size={14} />
              <span>Data jenjang dan role tidak bisa diubah sendiri setelah mendaftar. Hubungi admin jika ada kesalahan.</span>
            </div>

            <div className="confirm-modal__actions">
              <button type="button" className="confirm-modal__btn confirm-modal__btn--ghost" onClick={handleCancelConfirm}>
                Kembali
              </button>
              <button type="button" className="confirm-modal__btn confirm-modal__btn--primary" onClick={handleConfirmRegister}>
                <UserPlus size={16} />
                Ya, Daftarkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
