import { useAuth } from '../context/AuthContext'
import { useMutabaah } from '../context/MutabaahContext'
import { TARGET_AMALAN, getEffectiveTingkatan } from '../config/constants'
import {
  CalendarDays, TrendingUp, BookOpen, Users, Moon,
  Sunrise, HandHeart, Flame, Award, ArrowRight, Star
} from 'lucide-react'
import { Link } from 'react-router-dom'
import './Dashboard.css'

function StatCard({ icon: Icon, iconClass, label, value, meta }) {
  return (
    <div className="stat-card">
      <div className={`stat-card__icon ${iconClass}`}>
        <Icon size={20} />
      </div>
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {meta && <p className="stat-card__meta">{meta}</p>}
    </div>
  )
}

function AmalanRow({ label, icon: Icon, actual, target, percentage, satuan }) {
  const colorClass = percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'danger'
  return (
    <div className="amalan-row">
      <div className="amalan-row__left">
        <div className={`amalan-row__icon amalan-row__icon--${colorClass}`}>
          <Icon size={16} />
        </div>
        <div className="amalan-row__info">
          <p className="amalan-row__label">{label}</p>
          <p className="amalan-row__detail">{actual} / {target} {satuan}</p>
        </div>
      </div>
      <div className="amalan-row__right">
        <div className="progress" style={{ width: 60, height: 5 }}>
          <div
            className={`progress__fill progress__fill--${colorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`amalan-row__pct amalan-row__pct--${colorClass}`}>
          {percentage}%
        </span>
      </div>
    </div>
  )
}

function WeekHistoryItem({ week }) {
  const pct = week.percentages?.rata_rata?.percentage || 0
  const colorClass = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'
  return (
    <div className="week-history-item">
      <div className="week-history-item__left">
        <div className={`week-history-item__dot week-history-item__dot--${colorClass}`} />
        <div>
          <p className="week-history-item__label">Pekan {week.weekInfo.weekNumber}</p>
          <p className="week-history-item__date">{week.weekInfo.label}</p>
        </div>
      </div>
      <span className={`badge badge--${colorClass}`}>{pct}%</span>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { weekInfo, calculatePercentages, calculateTotals, savedWeeks } = useMutabaah()

  const tingkatan = getEffectiveTingkatan(user)
  const targets = TARGET_AMALAN[tingkatan]
  const percentages = calculatePercentages(tingkatan)
  const totals = calculateTotals()

  const amalanIcons = {
    sholat_fardu: Sunrise,
    shalat_berjamaah: Users,
    tilawah: BookOpen,
    matsurat: Star,
    shaum: Moon,
    qiyamullail: Moon,
  }

  // Get greeting based on time
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'

  const overallPct = percentages.rata_rata?.percentage || 0
  const streak = savedWeeks.length // simplified streak

  return (
    <div className="page-container">
      <div className="page-header">
        <p className="page-header__greeting">{greeting},</p>
        <h1 className="page-header__title">{user?.nama || 'Anggota'}</h1>
        <p className="page-header__subtitle">
          <CalendarDays size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {weekInfo.label}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid-stats">
        <StatCard
          icon={TrendingUp}
          iconClass="stat-card__icon--primary"
          label="Pencapaian"
          value={`${overallPct}%`}
          meta="Pekan ini"
        />
        <StatCard
          icon={Flame}
          iconClass="stat-card__icon--warning"
          label="Streak"
          value={`${streak} pekan`}
          meta="Berturut-turut"
        />
        <StatCard
          icon={Sunrise}
          iconClass="stat-card__icon--success"
          label="Sholat"
          value={`${totals.sholat_fardu}/35`}
          meta="Lima waktu"
        />
        <StatCard
          icon={BookOpen}
          iconClass="stat-card__icon--secondary"
          label="Tilawah"
          value={`${totals.tilawah.toFixed(1)}`}
          meta={`/ ${targets.tilawah.target} juz`}
        />
      </div>

      {/* Quick Input CTA */}
      <Link to="/input" className="quick-cta card">
        <div className="card__body quick-cta__body">
          <div className="quick-cta__left">
            <p className="quick-cta__title">Input Mutabaah</p>
            <p className="quick-cta__desc">Isi amalan pekan ini sebelum hari Minggu</p>
          </div>
          <ArrowRight size={20} className="quick-cta__arrow" />
        </div>
      </Link>

      {/* Amalan Breakdown */}
      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="card__header">
          <h3 className="card__title">
            <TrendingUp size={16} /> Rincian Amalan Pekan Ini
          </h3>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {Object.keys(targets).map(key => {
            const p = percentages[key]
            if (!p) return null
            return (
              <AmalanRow
                key={key}
                label={p.label}
                icon={amalanIcons[key] || Star}
                actual={typeof p.actual === 'number' ? (Number.isInteger(p.actual) ? p.actual : p.actual.toFixed(1)) : p.actual}
                target={p.target}
                percentage={p.percentage}
                satuan={p.satuan}
              />
            )
          })}
        </div>
      </div>

      {/* History */}
      {savedWeeks.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="card__header">
            <h3 className="card__title">
              <CalendarDays size={16} /> Riwayat Pekan Sebelumnya
            </h3>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {savedWeeks.slice(0, 5).map(w => (
              <WeekHistoryItem key={w.id} week={w} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
