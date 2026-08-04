import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MutabaahProvider } from './context/MutabaahContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardPembina from './pages/DashboardPembina'
import DashboardYayasan from './pages/DashboardYayasan'
import InputMutabaah from './pages/InputMutabaah'
import Laporan from './pages/Laporan'
import Panduan from './pages/Panduan'
import Profil from './pages/Profil'
import AnggotaGrup from './pages/AnggotaGrup'
import KelolaUser from './pages/KelolaUser'
import KelolaGrup from './pages/KelolaGrup'
import Helpdesk from './pages/Helpdesk'
import HelpdeskAdmin from './pages/HelpdeskAdmin'
import TicketDetail from './pages/TicketDetail'
import Leaderboard from './pages/Leaderboard'
import RaporBulanan from './pages/RaporBulanan'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/welcome" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

/** Route dashboard based on role */
function RoleDashboard() {
  const { user } = useAuth()
  switch (user?.role) {
    case 'yayasan': return <DashboardYayasan />
    case 'pembina': return <DashboardPembina />
    default: return <Dashboard />
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/welcome"
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <MutabaahProvider>
              <Layout />
            </MutabaahProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleDashboard />} />
        {/* Anggota routes */}
        <Route path="input" element={<InputMutabaah />} />
        <Route path="laporan" element={<Laporan />} />
        <Route path="panduan" element={<Panduan />} />
        <Route path="profil" element={<Profil />} />
        {/* Pembina routes */}
        <Route path="anggota" element={<AnggotaGrup />} />
        {/* Leaderboard + Rapor */}
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="rapor-bulanan" element={<RaporBulanan />} />
        {/* Helpdesk */}
        <Route path="helpdesk" element={<Helpdesk />} />
        <Route path="helpdesk-admin" element={<HelpdeskAdmin />} />
        <Route path="helpdesk/:ticketId" element={<TicketDetail />} />
        {/* Yayasan routes */}
        <Route path="kelola-user" element={<KelolaUser />} />
        <Route path="kelola-grup" element={<KelolaGrup />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
