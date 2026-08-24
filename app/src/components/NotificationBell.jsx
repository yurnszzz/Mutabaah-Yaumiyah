import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getNotifications as apiGetNotifications,
  markNotificationsRead as apiMarkRead,
  isApiConfigured
} from '../services/api'
import {
  Bell, CheckCheck, Clock, UserCheck, UserX, Info, AlertCircle
} from 'lucide-react'
import './NotificationBell.css'

const NOTIF_ICONS = {
  approval: UserCheck,
  rejection: UserX,
  profile_update: Info,
  reminder: Clock,
  info: Info,
}

const NOTIF_COLORS = {
  approval: '#10b981',
  rejection: '#ef4444',
  profile_update: '#6366f1',
  reminder: '#f59e0b',
  info: '#3b82f6',
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (user?.user_id) loadNotifications()
    // Refresh every 2 minutes
    const interval = setInterval(() => {
      if (user?.user_id) loadNotifications()
    }, 120000)
    return () => clearInterval(interval)
  }, [user?.user_id])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadNotifications() {
    if (!isApiConfigured()) return
    try {
      const result = await apiGetNotifications(user.user_id)
      if (result?.notifications) {
        setNotifications(result.notifications)
        setUnreadCount(result.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return
    setLoading(true)
    try {
      await apiMarkRead(user.user_id)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Baru saja'
    if (minutes < 60) return `${minutes} menit lalu`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} jam lalu`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} hari lalu`
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button
        className="notif-bell__trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifikasi"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-bell__badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-dropdown__header">
            <h4>Notifikasi</h4>
            {unreadCount > 0 && (
              <button
                className="notif-dropdown__mark-all"
                onClick={handleMarkAllRead}
                disabled={loading}
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="notif-dropdown__list">
            {notifications.length === 0 ? (
              <div className="notif-dropdown__empty">
                <Bell size={28} />
                <p>Belum ada notifikasi</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = NOTIF_ICONS[n.type] || Info
                const color = NOTIF_COLORS[n.type] || '#6b7280'
                return (
                  <div
                    key={n.notif_id}
                    className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
                  >
                    <div className="notif-item__icon" style={{ color, background: color + '12' }}>
                      <Icon size={16} />
                    </div>
                    <div className="notif-item__content">
                      <p className="notif-item__title">{n.title}</p>
                      <p className="notif-item__message">{n.message}</p>
                      <span className="notif-item__time">{formatTimeAgo(n.created_at)}</span>
                    </div>
                    {!n.is_read && <span className="notif-item__dot" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
