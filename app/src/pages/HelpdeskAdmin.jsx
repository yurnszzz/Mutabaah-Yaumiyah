import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAllTickets as apiGetAllTickets,
  getHelpdeskStats as apiGetHelpdeskStats,
  isApiConfigured
} from '../services/api'
import {
  LifeBuoy, Loader2, MessageSquare, AlertCircle,
  CheckCircle, Clock, X, ChevronRight, BarChart3,
  Inbox, User
} from 'lucide-react'
import './Helpdesk.css'
import './DashboardAdmin.css'

const KATEGORI_LABELS = {
  bug: 'Bug / Error', fitur: 'Permintaan Fitur',
  akun: 'Masalah Akun', umum: 'Pertanyaan Umum', lainnya: 'Lainnya'
}

const STATUS_LABELS = {
  baru: { label: 'Baru', icon: AlertCircle },
  diproses: { label: 'Diproses', icon: Clock },
  selesai: { label: 'Selesai', icon: CheckCircle },
  ditutup: { label: 'Ditutup', icon: X },
}

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'baru', label: 'Baru' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'ditutup', label: 'Ditutup' },
]

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function HelpdeskAdmin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({ baru: 0, diproses: 0, selesai: 0, ditutup: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => { loadData() }, [filter])

  async function loadData() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const res = await apiGetAllTickets(filter)
        if (res?.tickets) {
          setTickets(res.tickets)
          if (res.stats) setStats(res.stats)
        }
      } else {
        // Mock data
        setTickets([
          { ticket_id: 'TKT-2026-07-ABC123', user_nama: 'Ahmad Fauzi', user_role: 'anggota', subjek: 'Tidak bisa submit mutabaah', kategori: 'bug', prioritas: 'tinggi', status: 'baru', created_at: '2026-07-28T10:00:00Z', jumlah_balasan: 0 },
          { ticket_id: 'TKT-2026-07-DEF456', user_nama: 'Siti Nurhaliza', user_role: 'pembina', subjek: 'Data anggota tidak muncul', kategori: 'bug', prioritas: 'sedang', status: 'diproses', created_at: '2026-07-30T14:00:00Z', jumlah_balasan: 3 },
          { ticket_id: 'TKT-2026-08-GHI789', user_nama: 'Budi Santoso', user_role: 'anggota', subjek: 'Request fitur export PDF', kategori: 'fitur', prioritas: 'rendah', status: 'selesai', created_at: '2026-08-01T08:00:00Z', jumlah_balasan: 1 },
        ])
        setStats({ baru: 3, diproses: 2, selesai: 5, ditutup: 1, total: 11 })
      }
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Tiket', value: stats.total, icon: Inbox, color: 'primary' },
    { label: 'Baru', value: stats.baru, icon: AlertCircle, color: stats.baru > 0 ? 'accent' : 'secondary' },
    { label: 'Diproses', value: stats.diproses, icon: Clock, color: 'info' },
    { label: 'Selesai', value: stats.selesai, icon: CheckCircle, color: 'secondary' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Manajemen Helpdesk</h1>
        <p className="page-header__subtitle">Kelola tiket dan laporan dari pengguna</p>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className={`admin-stat-card admin-stat-card--${card.color}`}>
              <div className="admin-stat-card__icon"><Icon size={22} /></div>
              <div className="admin-stat-card__content">
                <p className="admin-stat-card__value">{card.value}</p>
                <p className="admin-stat-card__label">{card.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="helpdesk-filters">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`helpdesk-filter-btn ${filter === f.value ? 'helpdesk-filter-btn--active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {f.value && stats[f.value] !== undefined && (
              <span className="helpdesk-filter-btn__count">({stats[f.value]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      <div className="card">
        <div className="card__body">
          {loading ? (
            <div className="admin-loading">
              <Loader2 size={24} className="admin-loading__spinner" />
              <p>Memuat tiket...</p>
            </div>
          ) : tickets.length > 0 ? (
            <div className="helpdesk-tickets">
              {tickets.map(t => {
                const statusInfo = STATUS_LABELS[t.status] || STATUS_LABELS.baru
                const StatusIcon = statusInfo.icon
                return (
                  <div key={t.ticket_id} className="helpdesk-ticket" onClick={() => navigate(`/helpdesk/${t.ticket_id}`)}>
                    <div className={`helpdesk-ticket__priority helpdesk-ticket__priority--${t.prioritas}`} />
                    <div className="helpdesk-ticket__body">
                      <div className="helpdesk-ticket__header">
                        <span className="helpdesk-ticket__id">{t.ticket_id}</span>
                        <span className="helpdesk-ticket__tag helpdesk-ticket__tag--user">
                          <User size={10} /> {t.user_nama} ({t.user_role})
                        </span>
                      </div>
                      <p className="helpdesk-ticket__subject">{t.subjek}</p>
                      <div className="helpdesk-ticket__meta">
                        <span className="helpdesk-ticket__tag helpdesk-ticket__tag--kategori">
                          {KATEGORI_LABELS[t.kategori] || t.kategori}
                        </span>
                        {t.jumlah_balasan > 0 && (
                          <span className="helpdesk-ticket__tag helpdesk-ticket__tag--replies">
                            <MessageSquare size={10} /> {t.jumlah_balasan}
                          </span>
                        )}
                        <span className="helpdesk-ticket__tag helpdesk-ticket__tag--date">
                          {formatDate(t.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="helpdesk-ticket__status">
                      <span className={`helpdesk-status helpdesk-status--${t.status}`}>
                        <StatusIcon size={12} />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="helpdesk-empty">
              <LifeBuoy size={40} className="helpdesk-empty__icon" />
              <p className="helpdesk-empty__text">
                {filter ? `Tidak ada tiket dengan status "${filter}"` : 'Belum ada tiket masuk'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
