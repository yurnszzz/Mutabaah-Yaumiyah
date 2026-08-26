import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getLeaderboard as apiGetLeaderboard,
  isApiConfigured
} from '../services/api'
import {
  Trophy, Flame, BarChart3, Loader2, Medal, Crown, Users, User, Shield
} from 'lucide-react'
import './Leaderboard.css'

export default function Leaderboard() {
  const { user } = useAuth()
  const [mode, setMode] = useState('streak') // 'streak' | 'score'
  const [category, setCategory] = useState('anggota') // 'anggota' | 'pembina' | 'grup'
  const [rawData, setRawData] = useState([])
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
          setRawData(result.leaderboard)
        }
      } else {
        // Demo data
        setRawData([
          { user_id: 'usr_005', nama: 'Budi Santoso', streak_current: 12, streak_longest: 12, score: 92, role: 'anggota', tingkatan: 'pratama', grup_id: 'grp_001' },
          { user_id: 'usr_003', nama: 'Siti Nurhaliza', streak_current: 8, streak_longest: 10, score: 87, role: 'anggota', tingkatan: 'muda', grup_id: 'grp_001' },
          { user_id: 'usr_002', nama: 'Ahmad Fauzi', streak_current: 5, streak_longest: 7, score: 75, role: 'anggota', tingkatan: 'pratama', grup_id: 'grp_002' },
          { user_id: 'usr_006', nama: 'Dewi Sartika', streak_current: 10, streak_longest: 10, score: 88, role: 'anggota', tingkatan: 'muda', grup_id: 'grp_002' },
          { user_id: 'usr_P01', nama: 'Ust. Hamdan', streak_current: 15, streak_longest: 20, score: 95, role: 'pembina', tingkatan: 'pratama', grup_id: 'grp_001', grup_nama: 'Ust. Hamdan' },
          { user_id: 'usr_P02', nama: 'Ustz. Fatimah', streak_current: 11, streak_longest: 14, score: 90, role: 'pembina', tingkatan: 'pratama', grup_id: 'grp_002', grup_nama: 'Ustz. Fatimah' },
        ])
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and rank by category
  const getFilteredData = () => {
    if (category === 'grup') {
      return getGroupLeaderboard()
    }

    const filtered = rawData.filter(d => d.role === category)
    // Re-rank within category
    const sorted = [...filtered].sort((a, b) => {
      if (mode === 'score') return (b.score || 0) - (a.score || 0) || b.streak_current - a.streak_current
      return b.streak_current - a.streak_current || b.streak_longest - a.streak_longest
    })
    sorted.forEach((item, idx) => {
      const val = mode === 'score' ? item.score : item.streak_current
      if (idx > 0) {
        const prevVal = mode === 'score' ? sorted[idx - 1].score : sorted[idx - 1].streak_current
        item.rank = val === prevVal ? sorted[idx - 1].rank : idx + 1
      } else {
        item.rank = 1
      }
    })
    return sorted
  }

  // Group leaderboard: aggregate per grup
  const getGroupLeaderboard = () => {
    const grupMap = {}
    rawData.forEach(d => {
      if (!d.grup_id) return
      if (!grupMap[d.grup_id]) {
        grupMap[d.grup_id] = {
          grup_id: d.grup_id,
          nama: d.grup_nama || d.grup_id,
          members: [],
          totalScore: 0,
          totalStreak: 0,
          count: 0,
        }
      }
      // Only count anggota for group stats
      if (d.role === 'anggota') {
        grupMap[d.grup_id].members.push(d)
        grupMap[d.grup_id].totalScore += (d.score || 0)
        grupMap[d.grup_id].totalStreak += (d.streak_current || 0)
        grupMap[d.grup_id].count++
      }
      // Use pembina name as group name
      if (d.role === 'pembina') {
        grupMap[d.grup_id].nama = d.nama
      }
    })

    const groups = Object.values(grupMap).filter(g => g.count > 0)
    groups.forEach(g => {
      g.avgScore = g.count > 0 ? Math.round(g.totalScore / g.count) : 0
      g.avgStreak = g.count > 0 ? +(g.totalStreak / g.count).toFixed(1) : 0
      g.score = g.avgScore
      g.streak_current = g.avgStreak
    })

    groups.sort((a, b) => {
      if (mode === 'score') return b.avgScore - a.avgScore
      return b.avgStreak - a.avgStreak
    })

    groups.forEach((g, idx) => { g.rank = idx + 1 })
    return groups
  }

  const data = getFilteredData()

  // Find current user in current category
  const myData = category !== 'grup'
    ? data.find(d => d.user_id === currentUserId)
    : data.find(d => d.grup_id === user?.grup_id)

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={18} className="lb-rank-icon lb-rank-icon--gold" />
    if (rank === 2) return <Medal size={18} className="lb-rank-icon lb-rank-icon--silver" />
    if (rank === 3) return <Medal size={18} className="lb-rank-icon lb-rank-icon--bronze" />
    return <span className="lb-rank-num">{rank}</span>
  }

  const getDisplayValue = (item) => {
    if (mode === 'streak') {
      const val = category === 'grup' ? item.avgStreak : item.streak_current
      return (
        <div className="lb-value">
          <Flame size={14} className="lb-value__icon" />
          <span>{val}</span>
          <span className="lb-value__unit">pekan</span>
        </div>
      )
    }
    const pct = category === 'grup' ? item.avgScore : (item.score || 0)
    const colorClass = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'
    return (
      <div className={`lb-value lb-value--${colorClass}`}>
        <span className="lb-value__pct">{pct}%</span>
      </div>
    )
  }

  const CATEGORIES = [
    { key: 'anggota', label: 'Anggota', icon: User },
    { key: 'pembina', label: 'Pembina', icon: Shield },
    { key: 'grup', label: 'Grup', icon: Users },
  ]

  const categorySubtitles = {
    anggota: mode === 'streak' ? 'Konsistensi pengisian anggota' : 'Skor rata-rata anggota pekan ini',
    pembina: mode === 'streak' ? 'Konsistensi pengisian pembina' : 'Skor rata-rata pembina pekan ini',
    grup: mode === 'streak' ? 'Rata-rata streak per grup' : 'Rata-rata skor per grup',
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <p className="page-header__greeting">Papan Peringkat</p>
        <h1 className="page-header__title">Leaderboard</h1>
        <p className="page-header__subtitle">{categorySubtitles[category]}</p>
      </div>

      {/* Category tabs */}
      <div className="lb-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`lb-categories__tab ${category === cat.key ? 'lb-categories__tab--active' : ''}`}
            onClick={() => setCategory(cat.key)}
          >
            <cat.icon size={14} />
            {cat.label}
          </button>
        ))}
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
              <span className="lb-my-rank__label">
                {category === 'grup' ? 'Posisi Grup Anda' : 'Posisi Anda'}
              </span>
              <div className="lb-my-rank__main">
                {getRankIcon(myData.rank)}
                <span className="lb-my-rank__name">
                  {category === 'grup' ? myData.nama : myData.nama}
                </span>
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
          <p>Belum ada data untuk kategori ini</p>
        </div>
      ) : (
        <div className="lb-list">
          {data.map((item) => {
            const isMe = category === 'grup'
              ? item.grup_id === user?.grup_id
              : item.user_id === currentUserId
            return (
              <div
                key={item.user_id || item.grup_id}
                className={`lb-row ${isMe ? 'lb-row--me' : ''} ${item.rank <= 3 ? 'lb-row--top' : ''}`}
              >
                <div className="lb-row__rank">
                  {getRankIcon(item.rank)}
                </div>
                <div className="lb-row__info">
                  <span className="lb-row__name">
                    {item.nama}
                    {isMe && <span className="lb-row__you">{category === 'grup' ? 'Grup Anda' : 'Anda'}</span>}
                  </span>
                  {category === 'anggota' && item.tingkatan && (
                    <span className="lb-row__badge">
                      {item.tingkatan.charAt(0).toUpperCase() + item.tingkatan.slice(1)}
                    </span>
                  )}
                  {category === 'grup' && (
                    <span className="lb-row__badge">{item.count} anggota</span>
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
