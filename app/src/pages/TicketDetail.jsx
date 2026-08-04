import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getTicketDetail as apiGetTicketDetail,
  replyTicket as apiReplyTicket,
  updateTicketStatus as apiUpdateTicketStatus,
  isApiConfigured
} from '../services/api'
import {
  ArrowLeft, Loader2, Send, AlertCircle, CheckCircle,
  Clock, X, MessageSquare, Shield
} from 'lucide-react'
import './Helpdesk.css'

const STATUS_LABELS = {
  baru: { label: 'Baru', icon: AlertCircle },
  diproses: { label: 'Diproses', icon: Clock },
  selesai: { label: 'Selesai', icon: CheckCircle },
  ditutup: { label: 'Ditutup', icon: X },
}

const KATEGORI_LABELS = {
  bug: 'Bug / Error', fitur: 'Permintaan Fitur',
  akun: 'Masalah Akun', umum: 'Pertanyaan Umum', lainnya: 'Lainnya'
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function TicketDetail() {
  const { ticketId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const repliesEndRef = useRef(null)

  const [ticket, setTicket] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const isAdmin = user?.role === 'yayasan'
  const isPembina = user?.role === 'pembina'
  const canManage = isAdmin || isPembina

  useEffect(() => { loadDetail() }, [ticketId])

  async function loadDetail() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const res = await apiGetTicketDetail(ticketId, user?.user_id || user?.id, user?.role)
        if (res?.ticket) {
          setTicket(res.ticket)
          setReplies(res.replies || [])
          setNewStatus(res.ticket.status)
        }
      } else {
        // Mock
        setTicket({
          ticket_id: ticketId,
          user_nama: 'Ahmad Fauzi',
          user_email: 'ahmad@test.com',
          user_role: 'anggota',
          kategori: 'bug',
          subjek: 'Tidak bisa submit mutabaah',
          deskripsi: 'Ketika saya klik tombol submit, muncul error "Gagal menyimpan data". Sudah dicoba berkali-kali tapi tetap sama.\n\nBrowser: Chrome di HP Android.',
          prioritas: 'tinggi',
          status: 'diproses',
          created_at: '2026-07-28T10:00:00Z',
          updated_at: '2026-07-29T15:30:00Z',
        })
        setReplies([
          { reply_id: 'r1', user_nama: 'Ahmad Fauzi', user_role: 'anggota', pesan: 'Sudah dicoba clear cache tapi tetap error.', created_at: '2026-07-28T10:05:00Z' },
          { reply_id: 'r2', user_nama: 'Admin Yayasan', user_role: 'yayasan', pesan: 'Terima kasih laporannya. Kami sedang cek di server. Mohon tunggu update selanjutnya.', created_at: '2026-07-29T09:00:00Z' },
        ])
        setNewStatus('diproses')
      }
    } catch (err) {
      console.error('Failed to load ticket:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleReply(e) {
    e.preventDefault()
    if (!replyText.trim()) return

    setSending(true)
    try {
      const res = await apiReplyTicket({
        ticketId,
        userId: user?.user_id || user?.id,
        userNama: user?.nama || '',
        userRole: user?.role || 'anggota',
        pesan: replyText.trim(),
      })
      if (res?.success) {
        setReplyText('')
        loadDetail()
        setTimeout(() => repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
      }
    } catch (err) {
      console.error('Failed to reply:', err)
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange() {
    if (!newStatus || newStatus === ticket?.status) return
    setUpdatingStatus(true)
    try {
      const res = await apiUpdateTicketStatus(ticketId, newStatus, user?.nama || 'Admin')
      if (res?.success) {
        loadDetail()
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="admin-loading">
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat detail tiket...</p>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="page-container">
        <div className="helpdesk-empty">
          <AlertCircle size={40} className="helpdesk-empty__icon" />
          <p className="helpdesk-empty__text">Tiket tidak ditemukan</p>
          <button className="helpdesk-form__btn helpdesk-form__btn--primary" onClick={() => navigate(-1)}>
            Kembali
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[ticket.status] || STATUS_LABELS.baru
  const StatusIcon = statusInfo.icon

  return (
    <div className="page-container">
      <div className="ticket-detail">
        {/* Back + Header */}
        <div className="ticket-detail__header">
          <button className="ticket-detail__back" onClick={() => navigate(canManage ? '/helpdesk-admin' : '/helpdesk')}>
            <ArrowLeft size={16} /> Kembali ke daftar tiket
          </button>

          <h2 className="ticket-detail__title">{ticket.subjek}</h2>

          <div className="ticket-detail__meta">
            <span className={`helpdesk-status helpdesk-status--${ticket.status}`}>
              <StatusIcon size={12} />
              {statusInfo.label}
            </span>
            <span className="helpdesk-ticket__tag helpdesk-ticket__tag--kategori">
              {KATEGORI_LABELS[ticket.kategori] || ticket.kategori}
            </span>
            <span className={`helpdesk-ticket__tag helpdesk-ticket__priority helpdesk-ticket__priority--${ticket.prioritas}`} style={{ minHeight: 'auto', width: 'auto', padding: '2px 8px', borderRadius: '999px', color: '#fff', fontSize: '10px' }}>
              {ticket.prioritas?.toUpperCase()}
            </span>
            <span className="helpdesk-ticket__tag helpdesk-ticket__tag--date">
              {ticket.ticket_id}
            </span>
          </div>

          {/* Ticket Info */}
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-2)' }}>
            Oleh <strong>{ticket.user_nama}</strong> ({ticket.user_role}) · {formatDate(ticket.created_at)}
          </div>

          <div className="ticket-detail__info">
            {ticket.deskripsi}
          </div>
        </div>

        {/* Admin Status Change */}
        {canManage && (
          <div className="ticket-admin-actions">
            <Shield size={16} style={{ color: '#7c3aed', flexShrink: 0 }} />
            <span className="ticket-admin-actions__label">Status:</span>
            <select
              className="ticket-admin-actions__select"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
            >
              <option value="baru">Baru</option>
              <option value="diproses">Diproses</option>
              <option value="selesai">Selesai</option>
              <option value="ditutup">Ditutup</option>
            </select>
            <button
              className="ticket-admin-actions__btn"
              onClick={handleStatusChange}
              disabled={updatingStatus || newStatus === ticket.status}
            >
              {updatingStatus ? 'Memperbarui...' : 'Ubah Status'}
            </button>
          </div>
        )}

        {/* Replies */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="card__body">
            <h3 className="admin-overview__title" style={{ marginBottom: 'var(--space-3)' }}>
              <MessageSquare size={18} />
              Percakapan ({replies.length})
            </h3>

            {replies.length > 0 ? (
              <div className="ticket-replies">
                {replies.map(r => {
                  const isAdminReply = r.user_role === 'yayasan' || r.user_role === 'pembina'
                  return (
                    <div key={r.reply_id} className={`ticket-reply ${isAdminReply ? 'ticket-reply--admin' : 'ticket-reply--user'}`}>
                      <div className={`ticket-reply__avatar ${isAdminReply ? 'ticket-reply__avatar--admin' : 'ticket-reply__avatar--user'}`}>
                        {r.user_nama?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ticket-reply__body">
                        <div className="ticket-reply__header">
                          <span className="ticket-reply__name">{r.user_nama}</span>
                          <span className="ticket-reply__role">{r.user_role}</span>
                          <span className="ticket-reply__date">{formatDate(r.created_at)}</span>
                        </div>
                        <p className="ticket-reply__text">{r.pesan}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={repliesEndRef} />
              </div>
            ) : (
              <div className="helpdesk-empty" style={{ padding: 'var(--space-4)' }}>
                <p className="helpdesk-empty__text">Belum ada balasan</p>
              </div>
            )}

            {/* Reply Input */}
            {ticket.status !== 'ditutup' && (
              <form onSubmit={handleReply} className="ticket-reply-form">
                <textarea
                  className="ticket-reply-form__input"
                  placeholder="Tulis balasan..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={2}
                />
                <button
                  type="submit"
                  className="ticket-reply-form__send"
                  disabled={sending || !replyText.trim()}
                >
                  {sending ? <Loader2 size={16} className="login-form__spinner" /> : <Send size={16} />}
                  Kirim
                </button>
              </form>
            )}

            {ticket.status === 'ditutup' && (
              <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 'var(--space-3)' }}>
                Tiket ini sudah ditutup. Buat tiket baru jika ada kendala lain.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
