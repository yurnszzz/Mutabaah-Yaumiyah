import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getInviteInfo as apiGetInviteInfo, isApiConfigured } from '../services/api'
import {
  LogIn, Users, Shield, Star, Mail, ArrowRight, Loader2, UserPlus, CheckCircle, Lock, User, Eye, EyeOff,
  ChevronDown, KeyRound, Sprout, Award, AlertTriangle, ClipboardCheck, X, Link2, LogOut
} from 'lucide-react'
import './Login.css'

const roleIcons = { anggota: Users, pembina: Shield, yayasan: Star }
const roleColors = { anggota: 'primary', pembina: 'secondary', yayasan: 'warning' }

// Gelar prefixes people may type themselves; stripped before we add the right one
const GELAR_RE = /^(ust\.?|ustadz|ustadzah|ustz\.?|ustzh\.?)\s+/i

function stripGelar(name) {
  return String(name || '').trim().replace(GELAR_RE, '').trim()
}

function gelarFor(gender) {
  return gender === 'akhwat' ? 'Ustadzah' : 'Ust.'
}

/**
 * Google button that we draw ourselves.
 *
 * Google's own rendered button decides its label: it shows "Sign in" or a
 * personalised "Lanjutkan sebagai …" even on the Daftar page. Drawing the
 * button ourselves and opening Google's OAuth popup keeps the label honest:
 * "Masuk dengan Google" on /login, "Daftar dengan Google" on /daftar.
 *
 * onSuccess receives { email, name } from Google's userinfo endpoint.
 */
function GoogleButton({ onSuccess, clientId, mode, disabled }) {
  const clientRef = useRef(null)
  const onSuccessRef = useRef(onSuccess)
  const [ready, setReady] = useState(!!window.google?.accounts?.oauth2)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])

  useEffect(() => {
    if (!clientId) return

    function init() {
      if (!window.google?.accounts?.oauth2) return false
      clientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (resp) => {
          if (resp?.error || !resp?.access_token) {
            setBusy(false)
            if (resp?.error !== 'access_denied') setErr('Google tidak memberi izin. Coba lagi.')
            return
          }
          try {
            const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${resp.access_token}` },
            })
            const profile = await r.json()
            if (!profile?.email) throw new Error('no email')
            await onSuccessRef.current?.({ email: profile.email, name: profile.name || '' })
          } catch {
            setErr('Gagal membaca data akun Google. Periksa internet lalu coba lagi.')
          } finally {
            setBusy(false)
          }
        },
        error_callback: (e) => {
          setBusy(false)
          // Closing the popup is a normal choice, not an error worth shouting about
          if (e?.type !== 'popup_closed') {
            setErr('Jendela Google tidak bisa dibuka. Izinkan pop-up di browser lalu coba lagi.')
          }
        },
      })
      setReady(true)
      return true
    }

    if (init()) return
    const interval = setInterval(() => { if (init()) clearInterval(interval) }, 200)
    const timeout = setTimeout(() => clearInterval(interval), 10000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [clientId])

  if (!clientId) return null

  const label = mode === 'register' ? 'Daftar dengan Google' : 'Masuk dengan Google'

  function handleClick() {
    setErr('')
    if (!clientRef.current) return
    setBusy(true)
    clientRef.current.requestAccessToken()
  }

  return (
    <div className="google-signin-wrapper">
      <button
        type="button"
        id={mode === 'register' ? 'google-register-btn' : 'google-login-btn'}
        className="google-btn"
        onClick={handleClick}
        disabled={!ready || busy || disabled}
      >
        {busy || !ready ? (
          <Loader2 size={20} className="login-form__spinner" />
        ) : (
          <GoogleLogo />
        )}
        <span>{!ready ? 'Memuat Google…' : busy ? 'Menunggu Google…' : label}</span>
      </button>
      {err && <p className="google-btn__error" role="alert">{err}</p>}
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}

function PasswordInput({ value, onChange, placeholder, disabled, id, label }) {
  const [show, setShow] = useState(false)
  return (
    <div className="login-form__input-wrapper">
      <Lock size={18} className="login-form__icon" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="login-form__input login-form__input--password"
        placeholder={placeholder || 'Password'}
        aria-label={label || placeholder || 'Password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required
        autoComplete={id === 'login-password' ? 'current-password' : 'new-password'}
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

/**
 * Halaman Masuk (/login) dan Daftar (/daftar).
 * mode: 'login' | 'register'
 */
export default function Login({ mode = 'login' }) {
  const {
    user, logout,
    loginWithPassword, registerWithPassword, handleGoogleLogin,
    forgotPassword, loginDemo, demoUsers,
    isLoading, error, successMessage, clearMessages,
    isApiMode, hasGoogleAuth, googleClientId
  } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isRegister = mode === 'register'

  // Remember whether someone was already signed in when this page opened.
  // Used to tell "opened an invite link while logged in" apart from
  // "just finished registering and got logged in".
  const [hadSessionOnOpen] = useState(() => !!user)

  const [forgotView, setForgotView] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nama, setNama] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('anggota')
  const [tingkatan, setTingkatan] = useState('muda')
  const [gender, setGender] = useState('ikhwan')
  const [namaPembina, setNamaPembina] = useState('')
  const [localError, setLocalError] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  const [googleNotice, setGoogleNotice] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState(null)

  // Invite link state: idle | loading | ok | invalid
  const refParam = searchParams.get('ref') || ''
  const pembinaParam = searchParams.get('pembina') || ''
  const hasInviteLink = isRegister && !!(refParam || pembinaParam)
  const [invite, setInvite] = useState({ status: hasInviteLink ? 'loading' : 'idle' })
  const inviteActive = invite.status === 'ok'

  // Clear stale messages from the other page
  useEffect(() => {
    clearMessages()
    setLocalError('')
  }, [mode, clearMessages])

  // Arriving from the Masuk page after Google said "belum terdaftar"
  useEffect(() => {
    const st = location.state
    if (isRegister && st?.googleEmail) {
      setEmail(st.googleEmail)
      setGoogleEmail(st.googleEmail)
      setNama(st.googleName || '')
      setGoogleNotice(st.googleEmail)
    }
  }, [isRegister, location.state])

  // Resolve the invite link → pembina, group and gender
  useEffect(() => {
    if (!hasInviteLink) return
    let cancelled = false

    function legacyFallback() {
      // Older backend without getInviteInfo: read what the link carries
      const raw = pembinaParam.trim()
      const derivedGender = /^ustadzah\b|^ustz/i.test(raw) ? 'akhwat' : 'ikhwan'
      if (!raw && !refParam) {
        setInvite({ status: 'invalid', message: 'Link undangan tidak lengkap.' })
        return
      }
      setInvite({
        status: 'ok',
        grupId: refParam,
        grupNama: raw,
        pembinaNama: raw || 'pembina Anda',
        gender: derivedGender,
      })
      setGender(derivedGender)
      setRole('anggota')
    }

    if (!isApiConfigured()) {
      legacyFallback()
      return
    }

    setInvite({ status: 'loading' })
    apiGetInviteInfo(refParam, pembinaParam)
      .then(res => {
        if (cancelled) return
        if (res?.invite) {
          setInvite({ status: 'ok', ...res.invite })
          setGender(res.invite.gender === 'akhwat' ? 'akhwat' : 'ikhwan')
          setRole('anggota')
        } else {
          legacyFallback()
        }
      })
      .catch(err => {
        if (cancelled) return
        if (/action tidak dikenal/i.test(err.message || '')) {
          legacyFallback()
        } else {
          setInvite({ status: 'invalid', message: err.message || 'Link undangan tidak dikenali.' })
          if (pembinaParam) setNamaPembina(stripGelar(pembinaParam))
        }
      })
    return () => { cancelled = true }
  }, [hasInviteLink, refParam, pembinaParam])

  // ===== Redirect rules =====
  // Signed in before opening this page:
  //  - plain /login or /daftar → go home
  //  - invite link → explain and offer to sign out (handled in render)
  // Signed in during this visit (login or registration finished) → go home
  if (user && (!hadSessionOnOpen || !hasInviteLink)) {
    return <Navigate to="/" replace />
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

    if (password.length < 6) {
      setLocalError('Password minimal 6 karakter.')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Konfirmasi password belum sama. Ketik ulang password yang sama.')
      return
    }

    const finalRole = inviteActive ? 'anggota' : role
    const finalGender = inviteActive ? invite.gender : gender

    let fullPembinaName = null
    if (finalRole === 'anggota') {
      if (inviteActive) {
        fullPembinaName = invite.pembinaNama
      } else {
        const core = stripGelar(namaPembina)
        if (!core) {
          setLocalError('Nama pembina wajib diisi.')
          return
        }
        fullPembinaName = gelarFor(finalGender) + ' ' + core
      }
    }

    // Pembina: their own name carries the gelar
    const finalNama = finalRole === 'pembina'
      ? gelarFor(finalGender) + ' ' + stripGelar(nama)
      : nama.trim()

    const finalTingkatan = finalRole === 'pembina' ? 'pratama' : tingkatan

    setConfirmData({
      finalNama,
      email: email.trim(),
      password,
      role: finalRole,
      finalTingkatan,
      fullPembinaName,
      gender: finalGender,
      referralCode: inviteActive ? (invite.grupId || refParam) : '',
      displayGender: finalGender === 'akhwat' ? 'Akhwat' : 'Ikhwan',
      displayRole: finalRole === 'pembina' ? 'Pembina' : 'Anggota',
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
      confirmData.referralCode
    )
    setConfirmData(null)
  }

  function handleForgotPassword(e) {
    e.preventDefault()
    setLocalError('')
    if (!email.trim()) return
    forgotPassword(email.trim())
  }

  // Masuk: log in; if the Google account has no profile yet, move to Daftar
  async function onGoogleLogin(profile) {
    setLocalError('')
    const result = await handleGoogleLogin(profile)
    if (result?.unregistered) {
      navigate('/daftar', {
        state: { googleEmail: result.email, googleName: result.nama },
      })
    }
  }

  // Daftar: if the account already exists, just log in; otherwise pre-fill
  async function onGoogleRegister(profile) {
    setLocalError('')
    if (!profile?.email) {
      setLocalError('Gagal membaca data dari Google. Coba lagi atau isi formulir secara manual.')
      return
    }
    const result = await handleGoogleLogin(profile)
    if (result?.unregistered) {
      setEmail(result.email)
      setGoogleEmail(result.email)
      setNama(prev => prev || result.nama || profile.name || '')
      setGoogleNotice(result.email)
      clearMessages()
    }
  }

  function switchToForgot(on) {
    setForgotView(on)
    setPassword('')
    setLocalError('')
    clearMessages()
  }

  const registerDisabled = isLoading || invite.status === 'loading' ||
    !nama.trim() || !email.trim() || !password || !confirmPassword ||
    (!inviteActive && role === 'anggota' && !namaPembina.trim())

  // ===== Signed-in user opened an invite link =====
  if (user && hadSessionOnOpen && hasInviteLink) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <img src="/SIT_MATAHARI_LOGO.png" alt="Logo SIT Matahari" className="login-logo" />
            <h1 className="login-title">Link Pendaftaran Anggota</h1>
          </div>
          <div className="login-session">
            <p className="login-session__title">Anda sedang masuk sebagai {user.nama}</p>
            <p className="login-session__desc">
              Link ini untuk mendaftarkan akun anggota baru. Jika ingin mendaftarkan akun lain di HP ini,
              keluar dulu dari akun Anda.
            </p>
            <div className="login-session__actions">
              <button type="button" className="login-form__submit" onClick={logout}>
                <LogOut size={18} /> Keluar lalu daftar
              </button>
              <button type="button" className="login-form__back" onClick={() => navigate('/', { replace: true })}>
                Kembali ke beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pageTitle = forgotView ? 'Lupa Password' : isRegister ? 'Daftar Akun Baru' : 'Masuk'

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/SIT_MATAHARI_LOGO.png" alt="Logo SIT Matahari" className="login-logo" />
          <h1 className="login-title">Mutabaah Yaumiyah</h1>
          <p className="login-subtitle">Sekolah Islam Terpadu Matahari</p>
        </div>

        {isApiMode ? (
          <>
            {/* === Page switcher: two real pages, not tabs on one page === */}
            {!forgotView && (
              <nav className="login-tabs" aria-label="Pilih halaman">
                <Link
                  to="/login"
                  className={`login-tabs__btn ${!isRegister ? 'login-tabs__btn--active' : ''}`}
                  aria-current={!isRegister ? 'page' : undefined}
                >
                  <LogIn size={16} />
                  Masuk
                </Link>
                <Link
                  to={`/daftar${location.search}`}
                  className={`login-tabs__btn ${isRegister ? 'login-tabs__btn--active' : ''}`}
                  aria-current={isRegister ? 'page' : undefined}
                >
                  <UserPlus size={16} />
                  Daftar
                </Link>
              </nav>
            )}

            <h2 className="login-page-title">{pageTitle}</h2>

            {/* === Invite card (sign-up via pembina link) === */}
            {isRegister && invite.status === 'loading' && (
              <div className="login-invite login-invite--loading" role="status">
                <Loader2 size={18} className="login-form__spinner" />
                <span>Memeriksa link undangan...</span>
              </div>
            )}
            {isRegister && inviteActive && (
              <div className="login-invite" role="status">
                <Link2 size={20} className="login-invite__icon" />
                <div>
                  <p className="login-invite__title">Undangan dari {invite.pembinaNama}</p>
                  <p className="login-invite__desc">
                    Setelah mendaftar, Anda langsung masuk grup ini sebagai anggota {invite.gender === 'akhwat' ? 'akhwat' : 'ikhwan'}.
                    Tidak perlu menunggu persetujuan.
                  </p>
                </div>
              </div>
            )}
            {isRegister && invite.status === 'invalid' && (
              <div className="login-invite login-invite--invalid" role="alert">
                <AlertTriangle size={20} className="login-invite__icon" />
                <div>
                  <p className="login-invite__title">Link undangan tidak dikenali</p>
                  <p className="login-invite__desc">
                    {invite.message} Anda tetap bisa mendaftar dengan mengetik nama pembina,
                    tetapi akun harus disetujui pembina dulu.
                  </p>
                </div>
              </div>
            )}

            {/* === Google === */}
            {hasGoogleAuth && !forgotView && (
              <>
                <p className="login-google-label">
                  {isRegister
                    ? 'Punya akun Google? Daftar lebih cepat, nama dan email terisi otomatis.'
                    : 'Sudah pernah daftar dengan Google? Masuk di sini.'}
                </p>
                <GoogleButton
                  key={mode}
                  clientId={googleClientId}
                  onSuccess={isRegister ? onGoogleRegister : onGoogleLogin}
                  mode={mode}
                  disabled={isLoading}
                />
                <div className="login-or">
                  <span className="login-or__line" />
                  <span className="login-or__text">
                    {isRegister ? 'atau isi formulir di bawah' : 'atau masuk dengan email'}
                  </span>
                  <span className="login-or__line" />
                </div>
              </>
            )}

            {/* === Login Form === */}
            {!isRegister && !forgotView && (
              <form onSubmit={handleLogin} className="login-form">
                <div className="login-form__input-wrapper">
                  <Mail size={18} className="login-form__icon" />
                  <input
                    id="login-email"
                    type="email"
                    className="login-form__input"
                    placeholder="Email"
                    aria-label="Email"
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
                  id="login-submit"
                  type="submit"
                  className="login-form__submit"
                  disabled={isLoading || !email.trim() || !password}
                >
                  {isLoading ? (
                    <><Loader2 size={18} className="login-form__spinner" /> Memeriksa...</>
                  ) : (
                    <><LogIn size={18} /> Masuk</>
                  )}
                </button>
                <button type="button" className="login-form__forgot" onClick={() => switchToForgot(true)}>
                  Lupa password?
                </button>
                <p className="login-switch">
                  Belum punya akun? <Link to="/daftar">Daftar di sini</Link>
                </p>
              </form>
            )}

            {/* === Register Form === */}
            {isRegister && (
              <form onSubmit={handleRegister} className="login-form">
                {googleNotice && (
                  <div className="login-form__guidance">
                    <CheckCircle size={16} />
                    <div>
                      <p className="login-form__guidance-title">Data Google sudah terisi</p>
                      <p className="login-form__guidance-desc">
                        Email <strong>{googleNotice}</strong> belum terdaftar. Lengkapi sisa data di bawah, lalu tekan Daftar.
                      </p>
                    </div>
                  </div>
                )}

                <div className="login-form__input-wrapper">
                  <User size={18} className="login-form__icon" />
                  <input
                    id="register-nama"
                    type="text"
                    className="login-form__input"
                    placeholder="Nama lengkap (tanpa gelar)"
                    aria-label="Nama lengkap"
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
                    id="register-email"
                    type="email"
                    className="login-form__input"
                    placeholder="Email"
                    aria-label="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading || !!googleEmail}
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Gender: locked when the invite decides it */}
                <div className="login-form__gender">
                  <span className="login-form__gender-label" id="gender-label">Jenis kelamin:</span>
                  {inviteActive ? (
                    <p className="login-form__locked">
                      {invite.gender === 'akhwat' ? 'Akhwat' : 'Ikhwan'}
                      <span> · mengikuti grup pembina</span>
                    </p>
                  ) : (
                    <div className="login-form__gender-options" role="group" aria-labelledby="gender-label">
                      <button
                        type="button"
                        className={`login-form__gender-btn ${gender === 'ikhwan' ? 'login-form__gender-btn--active' : ''}`}
                        onClick={() => setGender('ikhwan')}
                        disabled={isLoading}
                        aria-pressed={gender === 'ikhwan'}
                      >
                        <Users size={14} /> Ikhwan
                      </button>
                      <button
                        type="button"
                        className={`login-form__gender-btn ${gender === 'akhwat' ? 'login-form__gender-btn--active login-form__gender-btn--akhwat' : ''}`}
                        onClick={() => setGender('akhwat')}
                        disabled={isLoading}
                        aria-pressed={gender === 'akhwat'}
                      >
                        <User size={14} /> Akhwat
                      </button>
                    </div>
                  )}
                </div>

                {/* Role: invite links are always for anggota */}
                {!inviteActive && (
                  <div className="login-form__select-wrapper">
                    <Shield size={18} className="login-form__icon" />
                    <select
                      id="register-role"
                      className="login-form__select"
                      aria-label="Daftar sebagai"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      disabled={isLoading}
                    >
                      <option value="anggota">Daftar sebagai: Anggota</option>
                      <option value="pembina">Daftar sebagai: Pembina</option>
                    </select>
                    <ChevronDown size={16} className="login-form__chevron" />
                  </div>
                )}

                {/* Jenjang (anggota only) */}
                {(inviteActive || role === 'anggota') && (
                  <div className="login-form__gender">
                    <span className="login-form__gender-label" id="jenjang-label">Jenjang anggota:</span>
                    <div className="login-form__gender-options" role="group" aria-labelledby="jenjang-label">
                      <button
                        type="button"
                        className={`login-form__gender-btn ${tingkatan === 'muda' ? 'login-form__gender-btn--active' : ''}`}
                        onClick={() => setTingkatan('muda')}
                        disabled={isLoading}
                        aria-pressed={tingkatan === 'muda'}
                      >
                        <Sprout size={14} /> Muda
                      </button>
                      <button
                        type="button"
                        className={`login-form__gender-btn ${tingkatan === 'pratama' ? 'login-form__gender-btn--active' : ''}`}
                        onClick={() => setTingkatan('pratama')}
                        disabled={isLoading}
                        aria-pressed={tingkatan === 'pratama'}
                      >
                        <Award size={14} /> Pratama
                      </button>
                    </div>
                  </div>
                )}

                {/* Nama pembina: only when there is no valid invite */}
                {!inviteActive && role === 'anggota' && invite.status !== 'loading' && (
                  <div className="login-form__input-wrapper">
                    <Shield size={18} className="login-form__icon" />
                    <input
                      id="register-pembina"
                      type="text"
                      className="login-form__input"
                      placeholder="Nama pembina Anda"
                      aria-label="Nama pembina"
                      value={namaPembina}
                      onChange={e => setNamaPembina(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                )}

                <PasswordInput
                  id="register-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password (minimal 6 karakter)"
                  disabled={isLoading}
                />
                <PasswordInput
                  id="register-confirm"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password"
                  disabled={isLoading}
                />
                <button id="register-submit" type="submit" className="login-form__submit" disabled={registerDisabled}>
                  {isLoading ? (
                    <><Loader2 size={18} className="login-form__spinner" /> Mendaftarkan...</>
                  ) : (
                    <><UserPlus size={18} /> Daftar</>
                  )}
                </button>
                <p className="login-switch">
                  Sudah punya akun? <Link to="/login">Masuk di sini</Link>
                </p>
              </form>
            )}

            {/* === Forgot Password === */}
            {!isRegister && forgotView && (
              <form onSubmit={handleForgotPassword} className="login-form">
                <div className="login-form__forgot-header">
                  <KeyRound size={32} className="login-form__forgot-icon" />
                  <p className="login-form__forgot-desc">
                    Masukkan email Anda. Password sementara akan dikirim ke email tersebut.
                  </p>
                </div>
                <div className="login-form__input-wrapper">
                  <Mail size={18} className="login-form__icon" />
                  <input
                    id="forgot-email"
                    type="email"
                    className="login-form__input"
                    placeholder="Email terdaftar"
                    aria-label="Email terdaftar"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="email"
                  />
                </div>
                <button type="submit" className="login-form__submit" disabled={isLoading || !email.trim()}>
                  {isLoading ? (
                    <><Loader2 size={18} className="login-form__spinner" /> Mengirim...</>
                  ) : (
                    <><Mail size={18} /> Kirim Password Sementara</>
                  )}
                </button>
                <button type="button" className="login-form__back" onClick={() => switchToForgot(false)}>
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

        {successMessage && (
          <div className="login-success" role="status">
            <CheckCircle size={16} />
            {successMessage}
          </div>
        )}

        {(error || localError) && (
          <p className="login-error" role="alert">{localError || error}</p>
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
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={e => e.stopPropagation()}>
            <button className="confirm-modal__close" onClick={() => setShowConfirm(false)} type="button" aria-label="Tutup">
              <X size={18} />
            </button>
            <div className="confirm-modal__icon">
              <ClipboardCheck size={32} />
            </div>
            <h3 className="confirm-modal__title" id="confirm-title">Periksa Data Anda</h3>
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
                <span className="confirm-modal__label">Jenis kelamin</span>
                <span className="confirm-modal__value">{confirmData.displayGender}</span>
              </div>
              <div className="confirm-modal__row">
                <span className="confirm-modal__label">Daftar sebagai</span>
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
              {confirmData.role === 'anggota' && (
                <div className="confirm-modal__row">
                  <span className="confirm-modal__label">Status akun</span>
                  <span className="confirm-modal__value">
                    {confirmData.referralCode ? 'Langsung aktif' : 'Menunggu persetujuan pembina'}
                  </span>
                </div>
              )}
            </div>

            <div className="confirm-modal__warning">
              <AlertTriangle size={14} />
              <span>Jenjang dan peran tidak bisa diubah sendiri setelah mendaftar. Hubungi admin jika ada kesalahan.</span>
            </div>

            <div className="confirm-modal__actions">
              <button type="button" className="confirm-modal__btn confirm-modal__btn--ghost" onClick={() => setShowConfirm(false)}>
                Perbaiki
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
