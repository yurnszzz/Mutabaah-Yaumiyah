import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  createTicket as apiCreateTicket,
  getMyTickets as apiGetMyTickets,
  isApiConfigured
} from '../services/api'
import {
  LifeBuoy, Plus, Loader2, Send, MessageSquare,
  AlertCircle, CheckCircle, Clock, X, ChevronRight
} from 'lucide-react'
import './Helpdesk.css'

const KATEGORI = [
  { value: 'bug', label: 'Bug / Error' },
  { value: 'fitur', label: 'Permintaan Fitur' },
  { value: 'akun', label: 'Masalah Akun' },
  { value: 'umum', label: 'Pertanyaan Umum' },
  { value: 'lainnya', label: 'Lainnya' },
]

const PRIORITAS = [
  { value: 'rendah', label: 'Rendah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'tinggi', label: 'Tinggi' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUS_LABELS = {
  baru: { label: 'Baru', icon: AlertCircle },
  diproses: { label: 'Diproses', icon: Clock },
  selesai: { label: 'Selesai', icon: CheckCircle },
  ditutup: { label: 'Ditutup', icon: X },
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function Helpdesk() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Form state
  const [kategori, setKategori] = useState('umum')
  const [prioritas, setPrioritas] = useState('sedang')
  const [subjek, setSubjek] = useState('')
  const [deskripsi, setDeskripsi] = useState('')

  useEffect(() => { loadTickets() }, [])

  async function loadTickets() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const res = await apiGetMyTickets(user?.user_id || user?.id)
        if (res?.tickets) setTickets(res.tickets)
      } else {
        // Mock data
        setTickets([
          { ticket_id: 'TKT-2026-07-ABC123', subjek: 'Tidak bisa submit mutabaah', kategori: 'bug', prioritas: 'tinggi', status: 'diproses', created_at: '2026-07-28T10:00:00Z', jumlah_balasan: 2 },
          { ticket_id: 'TKT-2026-07-DEF456', subjek: 'Request fitur export PDF', kategori: 'fitur', prioritas: 'sedang', status: 'baru', created_at: '2026-07-30T14:00:00Z', jumlah_balasan: 0 },
        ])
      }
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!subjek.trim() || !deskripsi.trim()) return

    setSubmitting(true)
    try {
      const res = await apiCreateTicket({
        userId: user?.user_id || user?.id,
        userNama: user?.nama || '',
        userEmail: user?.email || '',
        userRole: user?.role || 'anggota',
        kategori,
        subjek: subjek.trim(),
        deskripsi: deskripsi.trim(),
        prioritas,
      })

      if (res?.success) {
        setSuccessMsg(`Tiket ${res.ticketId} berhasil dibuat!`)
        setShowForm(false)
        setSubjek('')
        setDeskripsi('')
        setKategori('umum')
        setPrioritas('sedang')
        loadTickets()
        setTimeout(() => setSuccessMsg(''), 4000)
      }
    } catch (err) {
      console.error('Failed to create ticket:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-header__title">Helpdesk</h1>
        <p className="page-header__subtitle">Laporkan kendala atau kirim pertanyaan</p>
      </div>

      {successMsg && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <div className="card__body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#065f46' }}>
            <CheckCircle size={18} />
            <span style={{ fontSize: 'var(--text-sm)' }}>{successMsg}</span>
          </div>
        </div>
      )}

      {/* New Ticket Button */}
      {!showForm && (
        <button className="helpdesk-new-btn" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          Buat Tiket Baru
        </button>
      )}

      {/* Create Ticket Form */}
      {showForm && (
        <div className="card helpdesk-create">
          <div className="card__body">
            <h3 className="admin-overview__title" style={{ marginBottom: 'var(--space-3)' }}>
              <Send size={18} />
              Tiket Baru
            </h3>
            <form onSubmit={handleSubmit} className="helpdesk-form">
              <div className="helpdesk-form__row">
                <div className="helpdesk-form__group">
                  <label className="helpdesk-form__label">Kategori</label>
                  <select className="helpdesk-form__select" value={kategori} onChange={e => setKategori(e.target.value)}>
                    {KATEGORI.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
                <div className="helpdesk-form__group">
                  <label className="helpdesk-form__label">Prioritas</label>
                  <select className="helpdesk-form__select" value={prioritas} onChange={e => setPrioritas(e.target.value)}>
                    {PRIORITAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="helpdesk-form__group">
                <label className="helpdesk-form__label">Subjek</label>
                <input
                  type="text"
                  className="helpdesk-form__input"
                  placeholder="Ringkasan singkat masalah Anda"
                  value={subjek}
                  onChange={e => setSubjek(e.target.value)}
                  required
                />
              </div>

              <div className="helpdesk-form__group">
                <label className="helpdesk-form__label">Deskripsi</label>
                <textarea
                  className="helpdesk-form__textarea"
                  placeholder="Jelaskan detail masalah yang Anda alami..."
                  value={deskripsi}
                  onChange={e => setDeskripsi(e.target.value)}
                  required
                />
              </div>

              <div className="helpdesk-form__actions">
                <button type="button" className="helpdesk-form__btn helpdesk-form__btn--secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="helpdesk-form__btn helpdesk-form__btn--primary" disabled={submitting || !subjek.trim() || !deskripsi.trim()}>
                  {submitting ? <><Loader2 size={16} className="login-form__spinner" /> Mengirim...</> : <><Send size={16} /> Kirim Tiket</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket List */}
      <div className="card">
        <div className="card__body">
          <h3 className="admin-overview__title">
            <MessageSquare size={18} />
            Tiket Saya ({tickets.length})
          </h3>

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
                      </div>
                      <p className="helpdesk-ticket__subject">{t.subjek}</p>
                      <div className="helpdesk-ticket__meta">
                        <span className="helpdesk-ticket__tag helpdesk-ticket__tag--kategori">
                          {KATEGORI.find(k => k.value === t.kategori)?.label || t.kategori}
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
              <p className="helpdesk-empty__text">Belum ada tiket. Klik "Buat Tiket Baru" jika ada kendala.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
