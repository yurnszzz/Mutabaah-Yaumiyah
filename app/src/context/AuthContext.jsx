import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  loginGoogle as apiLoginGoogle,
  loginManual as apiLoginManual,
  register as apiRegister,
  resetPassword as apiResetPassword,
  isApiConfigured
} from '../services/api'

const AuthContext = createContext(null)

// Demo user for development (used when GAS_URL is not configured)
const DEMO_USERS = [
  { id: 'usr_002', user_id: 'usr_002', nama: 'Ahmad Fauzi', email: 'ahmad@sit-matahari.sch.id', role: 'anggota', tingkatan: 'pratama', grup_id: 'grp_001', grup_nama: 'Al-Fatih' },
  { id: 'usr_003', user_id: 'usr_003', nama: 'Siti Nurhaliza', email: 'siti@sit-matahari.sch.id', role: 'anggota', tingkatan: 'muda', grup_id: 'grp_001', grup_nama: 'Al-Fatih' },
  { id: 'usr_001', user_id: 'usr_001', nama: 'Ustadz Hamdan', email: 'ustadz.hamdan@sit-matahari.sch.id', role: 'pembina', tingkatan: null, grup_id: 'grp_001', grup_nama: 'Al-Fatih' },
  { id: 'usr_004', user_id: 'usr_004', nama: 'Admin Yayasan', email: 'yayasan@sit-matahari.sch.id', role: 'yayasan', tingkatan: null, grup_id: null, grup_nama: null },
]

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

/**
 * Decode JWT token from Google Identity Services
 */
function decodeGoogleJwt(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function setUserData(u) {
  return { ...u, id: u.user_id }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mutabaah_user')
    return saved ? JSON.parse(saved) : null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    if (user) {
      localStorage.setItem('mutabaah_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('mutabaah_user')
    }
  }, [user])

  // Manual login: email + password
  const loginWithPassword = useCallback(async (email, password) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (isApiConfigured()) {
        const result = await apiLoginManual(email, password)
        if (result && result.user) {
          if (result.user.status === 'pending') {
            setError('Akun Anda masih menunggu persetujuan pembina. Silakan hubungi pembina Anda.')
          } else if (result.user.status === 'nonaktif') {
            setError('Akun Anda telah dinonaktifkan. Hubungi admin untuk informasi.')
          } else {
            setUser(setUserData(result.user))
          }
        } else {
          setError(result?.error || 'Login gagal')
        }
      } else {
        // Mock mode
        await new Promise(r => setTimeout(r, 400))
        const found = DEMO_USERS.find(u => u.email === email)
        if (found) {
          setUser(found)
        } else {
          setError('User tidak ditemukan')
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal terhubung ke server')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Manual registration: nama + email + password + role + tingkatan + namaPembina + gender
  const registerWithPassword = useCallback(async (nama, email, password, role, tingkatan, namaPembina, gender) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (isApiConfigured()) {
        const result = await apiRegister(email, nama, password, role, tingkatan, namaPembina, gender)
        if (result && result.user) {
          if (result.isPending || result.user.status === 'pending') {
            // Don't auto-login pending users — show message
            setSuccessMessage(result.message || 'Pendaftaran berhasil! Akun Anda menunggu persetujuan pembina.')
          } else {
            setUser(setUserData(result.user))
            setSuccessMessage(result.message || 'Pendaftaran berhasil!')
          }
        } else {
          setError(result?.error || 'Pendaftaran gagal')
        }
      } else {
        setError('Pendaftaran tidak tersedia dalam mode demo')
      }
    } catch (err) {
      setError(err.message || 'Gagal terhubung ke server')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Google OAuth callback
  // If user exists: auto-login. If not: redirect to register form with pre-filled email/name
  const handleGoogleLogin = useCallback(async (credentialResponse) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const payload = decodeGoogleJwt(credentialResponse.credential)
      if (!payload || !payload.email) {
        setError('Gagal membaca data dari Google')
        return
      }

      const email = payload.email
      const nama = payload.name || payload.email.split('@')[0]

      // Try login first
      try {
        const loginResult = await apiLoginGoogle(email)
        if (loginResult && loginResult.user) {
          if (loginResult.user.status === 'pending') {
            setError('Akun Anda masih menunggu persetujuan pembina. Silakan hubungi pembina Anda.')
            return
          } else if (loginResult.user.status === 'nonaktif') {
            setError('Akun Anda telah dinonaktifkan. Hubungi admin untuk informasi.')
            return
          }
          setUser(setUserData(loginResult.user))
          return
        }
      } catch (loginErr) {
        // "User tidak ditemukan" is expected — not an error to show
        const msg = (loginErr.message || '').toLowerCase()
        if (msg.includes('tidak ditemukan') || msg.includes('not found') || msg.includes('belum terdaftar')) {
          // Expected: user doesn't exist yet — return unregistered signal
          return { unregistered: true, email, nama }
        }
        // Other errors (network, server) — show to user
        throw loginErr
      }

      // If loginResult exists but has no user property
      return { unregistered: true, email, nama }
    } catch (err) {
      setError(err.message || 'Gagal terhubung ke server')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Forgot password: send temp password to email
  const forgotPassword = useCallback(async (email) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (isApiConfigured()) {
        const result = await apiResetPassword(email)
        if (result && result.message) {
          setSuccessMessage(result.message)
        } else {
          setError(result?.error || 'Gagal mereset password')
        }
      } else {
        setError('Reset password tidak tersedia dalam mode demo')
      }
    } catch (err) {
      setError(err.message || 'Gagal terhubung ke server')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Mock mode login by ID
  const loginDemo = useCallback(async (userId) => {
    setIsLoading(true)
    setError(null)
    await new Promise(r => setTimeout(r, 400))
    const found = DEMO_USERS.find(u => u.id === userId)
    if (found) {
      setUser(found)
    } else {
      setError('User tidak ditemukan')
    }
    setIsLoading(false)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setError(null)
    setSuccessMessage(null)
    localStorage.removeItem('mutabaah_user')
    localStorage.removeItem('mutabaah_data')
    localStorage.removeItem('mutabaah_saved_weeks')
  }, [])

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  // Update local user data (after profile edit)
  const updateLocalUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem('mutabaah_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error,
      successMessage,
      loginWithPassword,
      registerWithPassword,
      handleGoogleLogin,
      forgotPassword,
      loginDemo,
      logout,
      clearMessages,
      updateLocalUser,
      demoUsers: DEMO_USERS,
      isApiMode: isApiConfigured(),
      hasGoogleAuth: !!GOOGLE_CLIENT_ID,
      googleClientId: GOOGLE_CLIENT_ID,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
