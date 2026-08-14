import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getUpaNotes, saveUpaNote, deleteUpaNote, isApiConfigured
} from '../services/api'
import {
  StickyNote, Plus, Edit3, Trash2, Pin, PinOff, Search,
  Loader2, Save, X, ChevronDown, Check, AlertCircle, BookOpen
} from 'lucide-react'
import './UpaNotes.css'

const CATEGORIES = [
  { value: 'umum', label: 'Umum', color: 'primary' },
  { value: 'tilawah', label: 'Tilawah', color: 'secondary' },
  { value: 'kegiatan', label: 'Kegiatan', color: 'info' },
  { value: 'evaluasi', label: 'Evaluasi', color: 'warning' },
  { value: 'agenda', label: 'Agenda', color: 'accent' },
]

function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const cat = CATEGORIES.find(c => c.value === note.category) || CATEGORIES[0]
  const updatedDate = note.updated_at
    ? new Date(note.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`note-card ${note.is_pinned ? 'note-card--pinned' : ''}`}>
      <div className="note-card__header">
        <span className={`note-card__category note-card__category--${cat.color}`}>{cat.label}</span>
        <div className="note-card__actions">
          <button
            className={`note-card__action-btn ${note.is_pinned ? 'note-card__action-btn--pinned' : ''}`}
            onClick={() => onTogglePin(note)}
            title={note.is_pinned ? 'Lepas pin' : 'Pin catatan'}
          >
            {note.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button className="note-card__action-btn" onClick={() => onEdit(note)} title="Edit">
            <Edit3 size={14} />
          </button>
          <button className="note-card__action-btn note-card__action-btn--danger" onClick={() => onDelete(note)} title="Hapus">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <h3 className="note-card__title">{note.title}</h3>
      {note.content && (
        <p className="note-card__content">{note.content.length > 200 ? note.content.substring(0, 200) + '...' : note.content}</p>
      )}
      <div className="note-card__footer">
        <span className="note-card__date">{updatedDate}</span>
        {note.is_pinned && <Pin size={12} className="note-card__pin-icon" />}
      </div>
    </div>
  )
}

function NoteEditor({ note, onSave, onCancel, isSaving }) {
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [category, setCategory] = useState(note?.category || 'umum')
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      noteId: note?.note_id || null,
      title: title.trim(),
      content,
      category,
      isPinned,
    })
  }

  return (
    <div className="note-editor card">
      <div className="card__body">
        <form onSubmit={handleSubmit}>
          <div className="note-editor__header">
            <h3 className="note-editor__title">
              {note?.note_id ? 'Edit Catatan' : 'Catatan Baru'}
            </h3>
            <button type="button" className="note-editor__close" onClick={onCancel}>
              <X size={18} />
            </button>
          </div>

          <div className="note-editor__field">
            <input
              type="text"
              className="note-editor__input"
              placeholder="Judul catatan..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="note-editor__field">
            <textarea
              className="note-editor__textarea"
              placeholder="Tulis catatan Anda di sini... (agenda, evaluasi, catatan tilawah, dsb.)"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
            />
          </div>

          <div className="note-editor__options">
            <div className="note-editor__category-group">
              <label className="note-editor__label">Kategori</label>
              <div className="note-editor__categories">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`note-editor__cat-btn note-editor__cat-btn--${cat.color} ${category === cat.value ? 'note-editor__cat-btn--active' : ''}`}
                    onClick={() => setCategory(cat.value)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={`note-editor__pin-btn ${isPinned ? 'note-editor__pin-btn--active' : ''}`}
              onClick={() => setIsPinned(!isPinned)}
            >
              <Pin size={14} />
              {isPinned ? 'Pinned' : 'Pin'}
            </button>
          </div>

          <div className="note-editor__actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Batal
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSaving || !title.trim()}>
              {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              {note?.note_id ? 'Simpan Perubahan' : 'Buat Catatan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UpaNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editingNote, setEditingNote] = useState(null) // null = not editing, {} = new, {note_id: ...} = edit
  const [showEditor, setShowEditor] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const userId = user?.user_id || user?.id

  const loadNotes = useCallback(async () => {
    if (!isApiConfigured() || !userId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getUpaNotes(userId)
      if (result.error) throw new Error(result.error)
      setNotes(result.notes || [])
    } catch (err) {
      setError('Gagal memuat catatan: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  async function handleSave(data) {
    setIsSaving(true)
    setError(null)
    try {
      const result = await saveUpaNote({ ...data, userId })
      if (result.error) throw new Error(result.error)
      setShowEditor(false)
      setEditingNote(null)
      await loadNotes()
    } catch (err) {
      setError('Gagal menyimpan: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(note) {
    setError(null)
    try {
      const result = await deleteUpaNote({ userId, noteId: note.note_id })
      if (result.error) throw new Error(result.error)
      setDeleteConfirm(null)
      await loadNotes()
    } catch (err) {
      setError('Gagal menghapus: ' + err.message)
    }
  }

  async function handleTogglePin(note) {
    try {
      await saveUpaNote({
        userId,
        noteId: note.note_id,
        title: note.title,
        content: note.content,
        category: note.category,
        isPinned: !note.is_pinned,
      })
      await loadNotes()
    } catch (err) {
      setError('Gagal mengubah pin: ' + err.message)
    }
  }

  function startEdit(note) {
    setEditingNote(note)
    setShowEditor(true)
  }

  function startNew() {
    setEditingNote(null)
    setShowEditor(true)
  }

  // Filter & search
  const filtered = notes.filter(n => {
    if (filterCategory !== 'all' && n.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <p className="page-header__greeting">UPA Notes</p>
        <h1 className="page-header__title">Catatan UPA</h1>
        <p className="page-header__subtitle">
          <BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Arsip catatan, agenda, dan evaluasi kegiatan UPA
        </p>
      </div>

      {error && (
        <div className="unote-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Editor */}
      {showEditor && (
        <NoteEditor
          note={editingNote}
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditingNote(null) }}
          isSaving={isSaving}
        />
      )}

      {/* Toolbar */}
      {!showEditor && (
        <div className="unote-toolbar">
          <div className="unote-toolbar__search">
            <Search size={16} className="unote-toolbar__search-icon" />
            <input
              type="text"
              className="unote-toolbar__search-input"
              placeholder="Cari catatan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn--primary btn--sm" onClick={startNew}>
            <Plus size={16} />
            <span className="unote-toolbar__btn-label">Baru</span>
          </button>
        </div>
      )}

      {/* Category filter */}
      {!showEditor && (
        <div className="unote-filters">
          <button
            className={`unote-filter-btn ${filterCategory === 'all' ? 'unote-filter-btn--active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            Semua ({notes.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = notes.filter(n => n.category === cat.value).length
            return (
              <button
                key={cat.value}
                className={`unote-filter-btn unote-filter-btn--${cat.color} ${filterCategory === cat.value ? 'unote-filter-btn--active' : ''}`}
                onClick={() => setFilterCategory(cat.value)}
              >
                {cat.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="unote-loading">
          <Loader2 size={24} className="spin" />
          <p>Memuat catatan...</p>
        </div>
      ) : !showEditor && filtered.length === 0 ? (
        <div className="unote-empty">
          <StickyNote size={48} className="unote-empty__icon" />
          <h3 className="unote-empty__title">
            {notes.length === 0 ? 'Belum ada catatan' : 'Tidak ditemukan'}
          </h3>
          <p className="unote-empty__desc">
            {notes.length === 0
              ? 'Mulai buat catatan untuk mencatat agenda, evaluasi, dan kegiatan UPA Anda.'
              : 'Tidak ada catatan yang cocok dengan filter atau pencarian.'}
          </p>
          {notes.length === 0 && (
            <button className="btn btn--primary" onClick={startNew}>
              <Plus size={16} /> Buat Catatan Pertama
            </button>
          )}
        </div>
      ) : !showEditor && (
        <div className="unote-grid">
          {filtered.map(note => (
            <NoteCard
              key={note.note_id}
              note={note}
              onEdit={startEdit}
              onDelete={n => setDeleteConfirm(n)}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="unote-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="unote-modal" onClick={e => e.stopPropagation()}>
            <h3 className="unote-modal__title">Hapus Catatan?</h3>
            <p className="unote-modal__desc">
              Catatan "<strong>{deleteConfirm.title}</strong>" akan dihapus permanen.
            </p>
            <div className="unote-modal__actions">
              <button className="btn btn--ghost" onClick={() => setDeleteConfirm(null)}>Batal</button>
              <button className="btn btn--danger" onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
