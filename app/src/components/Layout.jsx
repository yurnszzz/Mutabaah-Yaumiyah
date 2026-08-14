import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ClipboardList, BarChart3, User,
  LogOut, ChevronLeft, Menu, X, HelpCircle, Users, Settings, Shield, LifeBuoy,
  Trophy, FileText, StickyNote
} from 'lucide-react'
import { useState } from 'react'
import './Layout.css'

/**
 * Navigation items per role
 */
function getNavItems(role) {
  switch (role) {
    case 'yayasan':
      return [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/kelola-user', icon: Users, label: 'Kelola User' },
        { to: '/kelola-grup', icon: Shield, label: 'Kelola Grup' },
        { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
        { to: '/helpdesk-admin', icon: LifeBuoy, label: 'Helpdesk' },
        { to: '/profil', icon: User, label: 'Profil' },
      ]
    case 'pembina':
      return [
        { to: '/', icon: LayoutDashboard, label: 'Beranda' },
        { to: '/input', icon: ClipboardList, label: 'Input Mutabaah' },
        { to: '/anggota', icon: Users, label: 'Anggota Grup' },
        { to: '/laporan', icon: BarChart3, label: 'Laporan' },
        { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
        { to: '/rapor-bulanan', icon: FileText, label: 'Rapor Bulanan' },
        { to: '/upa-notes', icon: StickyNote, label: 'UPA Notes' },
        { to: '/helpdesk', icon: LifeBuoy, label: 'Helpdesk' },
        { to: '/panduan', icon: HelpCircle, label: 'Panduan' },
        { to: '/profil', icon: User, label: 'Profil' },
      ]
    default: // anggota
      return [
        { to: '/', icon: LayoutDashboard, label: 'Beranda' },
        { to: '/input', icon: ClipboardList, label: 'Input Mutabaah' },
        { to: '/laporan', icon: BarChart3, label: 'Laporan' },
        { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
        { to: '/rapor-bulanan', icon: FileText, label: 'Rapor Bulanan' },
        { to: '/helpdesk', icon: LifeBuoy, label: 'Helpdesk' },
        { to: '/panduan', icon: HelpCircle, label: 'Panduan' },
        { to: '/profil', icon: User, label: 'Profil' },
      ]
  }
}

function getPageTitles(role) {
  const base = { '/': 'Beranda', '/profil': 'Profil', '/panduan': 'Panduan', '/input': 'Input Mutabaah', '/laporan': 'Laporan', '/helpdesk': 'Helpdesk', '/leaderboard': 'Leaderboard', '/rapor-bulanan': 'Rapor Bulanan' }
  switch (role) {
    case 'yayasan':
      return { ...base, '/': 'Dashboard Admin', '/kelola-user': 'Kelola User', '/kelola-grup': 'Kelola Grup', '/helpdesk-admin': 'Helpdesk' }
    case 'pembina':
      return { ...base, '/anggota': 'Anggota Grup', '/upa-notes': 'UPA Notes' }
    default:
      return base
  }
}

function Sidebar({ user, logout, navItems }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="/SIT_MATAHARI_LOGO.png" alt="Logo SIT Matahari" className="sidebar__logo" />
        <div>
          <span className="sidebar__brand-name">Mutabaah Yaumiyah</span>
          <span className="sidebar__brand-org">SIT Matahari</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__user-avatar">
            {user?.nama?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div className="sidebar__user-info">
            <p className="sidebar__user-name">{user?.nama}</p>
            <p className="sidebar__user-role">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
              {user?.tingkatan ? ` - ${user.tingkatan.charAt(0).toUpperCase() + user.tingkatan.slice(1)}` : ''}
            </p>
          </div>
        </div>
        <button className="sidebar__logout" onClick={logout} title="Keluar">
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )
}

function MobileDrawer({ user, logout, isOpen, onClose, navItems }) {
  if (!isOpen) return null
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer__header">
          <div className="sidebar__brand">
            <img src="/SIT_MATAHARI_LOGO.png" alt="Logo SIT Matahari" className="sidebar__logo" />
            <div>
              <span className="sidebar__brand-name">Mutabaah</span>
              <span className="sidebar__brand-org">SIT Matahari</span>
            </div>
          </div>
          <button className="drawer__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={onClose}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">
              {user?.nama?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{user?.nama}</p>
              <p className="sidebar__user-role">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
              </p>
            </div>
          </div>
          <button className="sidebar__logout" onClick={() => { logout(); onClose(); }}>
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const role = user?.role || 'anggota'
  const navItems = getNavItems(role)
  const pageTitles = getPageTitles(role)

  const isHome = location.pathname === '/'
  const pageTitle = pageTitles[location.pathname] || 'Halaman'

  // Bottom nav: show max 4 items (exclude panduan for anggota/pembina on mobile)
  const bottomNavItems = navItems.filter(item => item.to !== '/panduan').slice(0, 4)

  return (
    <div className="app-layout">
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar user={user} logout={logout} navItems={navItems} />

      {/* Mobile Drawer */}
      <MobileDrawer
        user={user}
        logout={logout}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
      />

      <div className="app-content">
        {/* Header */}
        <header className="header">
          {/* Mobile: hamburger or back button */}
          <div className="header__left">
            {isHome ? (
              <button
                className="header__menu-btn header__mobile-only"
                onClick={() => setDrawerOpen(true)}
                title="Menu"
              >
                <Menu size={22} />
              </button>
            ) : (
              <button
                className="header__back-btn"
                onClick={() => navigate('/')}
                title="Kembali ke Beranda"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Desktop: show logo only (sidebar handles nav) */}
            <div className="header__logo header__desktop-only">
              <img src="/SIT_MATAHARI_LOGO.png" alt="Logo" className="header__logo-img" />
              <div>
                <span className="header__logo-text">Mutabaah</span>
                <span className="header__logo-sub">SIT Matahari</span>
              </div>
            </div>
          </div>

          <div className="header__actions">
            {user && (
              <button className="header__avatar" title={user.nama} onClick={() => navigate('/profil')}>
                {user.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </button>
            )}
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav - mobile only */}
      <nav className="bottom-nav">
        {bottomNavItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
            }
          >
            <span className="bottom-nav__icon-wrap">
              <item.icon size={20} />
            </span>
            <span>{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
