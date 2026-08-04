import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getLeaderboard as apiGetLeaderboard,
  isApiConfigured
} from '../services/api'
import {
  Trophy, Flame, BarChart3, Loader2, Medal, Crown, Award
} from 'lucide-react'
import './Leaderboard.css'

export default function Leaderboard() {
  const { user } = useAuth()
  const [mode, setMode] = useState('streak') // 'streak' | 'score'
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const currentUserId = user?.user_id || user?.id

  useEffect(() => {
    loadLeaderboard()
  }, [mode])

  async function loadLeaderboard() {
    setLoading(true)
    try {
      if (isApiConfigured()) {
        const result = await apiGetLeaderboard(mode)
        if (result?.leaderboard) {
          setData(result.leaderboard)
        }
      } else {
        // Demo data
        setData([
          { user_id: 'usr_005', nama: 'Budi Santoso', streak_current: 12, streak_longest: 12, score: 92, rank: 1, tingkatan: 'pratama' },
          { user_id: 'usr_003', nama: 'Siti Nurhaliza', streak_current: 8, streak_longest: 10, score: 87, rank: 2, tingkatan: 'muda' },
          { user_id: 'usr_002', nama: 'Ahmad Fauzi', streak_current: 5, streak_longest: 7, score: 75, rank: 3, tingkatan: 'pratama' },
        ])
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  // Find current user's position
  const myIndex = data.findIndex(d => d.user_id === currentUserId)
  const myData = myIndex >= 0 ? data[myIndex] : null

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={18} className="lb-rank-icon lb-rank-icon--gold" />
    if (rank === 2) return <Medal size={18} className="lb-rank-icon lb-rank-icon--silver" />
    if (rank === 3) return <Medal size={18} className="lb-rank-icon lb-rank-icon--bronze" />
    return <span className="lb-rank-num">{rank}</span>
  }

  const getDisplayValue = (item) => {
    if (mode === 'streak') {
      return (
        <div className="lb-value">
          <Flame size={14} className="lb-value__icon" />
          <span>{item.streak_current}</span>
          <span className="lb-value__unit">pekan</span>
        </div>
      )
    }
    const pct = item.score || 0
    const colorClass = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'
    return (
      <div className={`lb-value lb-value--${colorClass}`}>
        <span className="lb-value__pct">{pct}%</span>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <p className="page-header__greeting">Papan Peringkat</p>
        <h1 className="page-header__title">Leaderboard</h1>
        <p className="page-header__subtitle">
          {mode === 'streak' ? 'Konsistensi pengisian mingguan' : 'Skor rata-rata pekan ini'}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="lb-toggle">
        <button
          className={`lb-toggle__btn ${mode === 'streak' ? 'lb-toggle__btn--active' : ''}`}
          onClick={() => setMode('streak')}
        >
          <Flame size={14} /> Streak
        </button>
        <button
          className={`lb-toggle__btn ${mode === 'score' ? 'lb-toggle__btn--active' : ''}`}
          onClick={() => setMode('score')}
        >
          <BarChart3 size={14} /> Skor
        </button>
      </div>

      {/* My position card */}
      {myData && (
        <div className="lb-my-rank card">
          <div className="card__body">
            <div className="lb-my-rank__info">
              <span className="lb-my-rank__label">Posisi Anda</span>
              <div className="lb-my-rank__main">
                {getRankIcon(myData.rank)}
                <span className="lb-my-rank__name">{myData.nama}</span>
              </div>
            </div>
            {getDisplayValue(myData)}
          </div>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-loading__spinner" />
          <p>Memuat leaderboard...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="admin-empty">
          <Trophy size={32} className="admin-empty__icon" />
          <p>Belum ada data untuk ditampilkan</p>
        </div>
      ) : (
        <div className="lb-list">
          {data.map((item, idx) => {
            const isMe = item.user_id === currentUserId
            return (
              <div
                key={item.user_id}
                className={`lb-row ${isMe ? 'lb-row--me' : ''} ${item.rank <= 3 ? 'lb-row--top' : ''}`}
              >
                <div className="lb-row__rank">
                  {getRankIcon(item.rank)}
                </div>
                <div className="lb-row__info">
                  <span className="lb-row__name">
                    {item.nama}
                    {isMe && <span className="lb-row__you">Anda</span>}
                  </span>
                  {item.tingkatan && (
                    <span className="lb-row__badge">{item.tingkatan}</span>
                  )}
                </div>
                <div className="lb-row__value">
                  {getDisplayValue(item)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
