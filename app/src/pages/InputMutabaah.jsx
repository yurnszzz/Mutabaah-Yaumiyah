import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMutabaah } from '../context/MutabaahContext'
import {
  HARI, HARI_SHORT, WAKTU_SHALAT, TARGET_AMALAN,
  KEHADIRAN_OPTIONS, JAMAAH_OPTIONS, HALAMAN_PER_JUZ,
  getEffectiveTingkatan
} from '../config/constants'
import {
  CalendarDays, BookOpen, Moon, Sunrise, Sun, HandHeart, Clock,
  Users, ChevronDown, ChevronUp, Check, X, Minus, Send,
  AlertCircle, Info, Star
} from 'lucide-react'
import './InputMutabaah.css'

function ProgressIndicator({ percentage }) {
  const color = percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'danger'
  return (
    <div className="input-progress">
      <div className="progress">
        <div
          className={`progress__fill progress__fill--${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`input-progress__text input-progress__text--${color}`}>
        {percentage}%
      </span>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle, percentage, isOpen, onToggle }) {
  return (
    <button className="section-toggle" onClick={onToggle} type="button">
      <div className="section-toggle__left">
        <div className="section-toggle__icon">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="section-toggle__title">{title}</h3>
          {subtitle && <p className="section-toggle__subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="section-toggle__right">
        {percentage !== undefined && <ProgressIndicator percentage={percentage} />}
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
    </button>
  )
}

function SholatFarduGrid({ data, onChange, onCheckAllRow, onCheckAllGrid }) {
  const total = useMemo(() => {
    let count = 0
    HARI.forEach(h => WAKTU_SHALAT.forEach(w => { if (data[h]?.[w]) count++ }))
    return count
  }, [data])

  function isRowAllChecked(waktu) {
    return HARI.every(h => data[h]?.[waktu])
  }

  function toggleRow(waktu) {
    const allChecked = isRowAllChecked(waktu)
    HARI.forEach(h => onChange(h, waktu, !allChecked))
  }

  function toggleAll() {
    const allChecked = total === 35
    HARI.forEach(h => WAKTU_SHALAT.forEach(w => onChange(h, w, !allChecked)))
  }

  return (
    <div className="shalat-section">
      <div className="shalat-info">
        <span className="shalat-info__count">{total}/35 waktu</span>
        <button
          type="button"
          className={`bulk-check-btn ${total === 35 ? 'bulk-check-btn--active' : ''}`}
          onClick={toggleAll}
          title={total === 35 ? 'Hapus centang semua' : 'Centang semua'}
        >
          <Check size={12} strokeWidth={3} />
          {total === 35 ? 'Batal Semua' : 'Centang Semua'}
        </button>
      </div>
      <div className="shalat-grid" role="grid">
        <div className="shalat-grid__header">
          <div className="shalat-grid__corner"></div>
          {HARI_SHORT.map(h => (
            <div key={h} className="shalat-grid__day-label">{h}</div>
          ))}
        </div>
        {WAKTU_SHALAT.map(waktu => {
          const rowAll = isRowAllChecked(waktu)
          return (
            <div key={waktu} className="shalat-grid__row" role="row">
              <button
                type="button"
                className={`shalat-grid__waktu-label shalat-grid__waktu-label--clickable ${rowAll ? 'shalat-grid__waktu-label--all' : ''}`}
                onClick={() => toggleRow(waktu)}
                title={rowAll ? `Hapus centang semua ${waktu}` : `Centang semua ${waktu}`}
              >
                {waktu}
              </button>
              {HARI.map((hari, idx) => {
                const checked = data[hari]?.[waktu] || false
                return (
                  <button
                    key={`${hari}-${waktu}`}
                    type="button"
                    role="gridcell"
                    className={`shalat-grid__cell ${checked ? 'shalat-grid__cell--active' : ''}`}
                    onClick={() => onChange(hari, waktu, !checked)}
                    aria-label={`${waktu} ${HARI_SHORT[idx]} - ${checked ? 'sudah' : 'belum'}`}
                  >
                    {checked ? <Check size={14} strokeWidth={3} /> : null}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}


function BerjamaahGrid({ data, onChange }) {
  const total = useMemo(() => {
    let count = 0
    HARI.forEach(h => WAKTU_SHALAT.forEach(w => { if (data[h]?.[w] === 'jamaah') count++ }))
    return count
  }, [data])

  function cycleValue(current) {
    const order = ['tidak', 'jamaah', 'munfarid']
    const idx = order.indexOf(current)
    return order[(idx + 1) % order.length]
  }

  function getCellClass(value) {
    if (value === 'jamaah') return 'jamaah-grid__cell--jamaah'
    if (value === 'munfarid') return 'jamaah-grid__cell--munfarid'
    return ''
  }

  function getCellIcon(value) {
    if (value === 'jamaah') return <Check size={12} strokeWidth={3} />
    if (value === 'munfarid') return <Minus size={12} strokeWidth={3} />
    return null
  }

  function isRowAllJamaah(waktu) {
    return HARI.every(h => data[h]?.[waktu] === 'jamaah')
  }

  function toggleRow(waktu) {
    const allJamaah = isRowAllJamaah(waktu)
    HARI.forEach(h => onChange(h, waktu, allJamaah ? 'tidak' : 'jamaah'))
  }

  function toggleAll() {
    const allJamaah = total === 35
    HARI.forEach(h => WAKTU_SHALAT.forEach(w => onChange(h, w, allJamaah ? 'tidak' : 'jamaah')))
  }

  return (
    <div className="shalat-section">
      <div className="shalat-info">
        <span className="shalat-info__count">{total} berjamaah</span>
        <button
          type="button"
          className={`bulk-check-btn ${total === 35 ? 'bulk-check-btn--active' : ''}`}
          onClick={toggleAll}
          title={total === 35 ? 'Reset semua' : 'Semua Jamaah'}
        >
          <Check size={12} strokeWidth={3} />
          {total === 35 ? 'Batal Semua' : 'Semua Jamaah'}
        </button>
      </div>
      <div className="jamaah-legend" style={{ marginBottom: 'var(--space-2)' }}>
        <span className="jamaah-legend__item jamaah-legend__item--jamaah">
          <Check size={10} strokeWidth={3} /> Jamaah
        </span>
        <span className="jamaah-legend__item jamaah-legend__item--munfarid">
          <Minus size={10} strokeWidth={3} /> Sendiri
        </span>
        <span className="jamaah-legend__item jamaah-legend__item--tidak">
          <X size={10} strokeWidth={3} /> Tidak
        </span>
      </div>
      <div className="shalat-grid" role="grid">
        <div className="shalat-grid__header">
          <div className="shalat-grid__corner"></div>
          {HARI_SHORT.map(h => (
            <div key={h} className="shalat-grid__day-label">{h}</div>
          ))}
        </div>
        {WAKTU_SHALAT.map(waktu => {
          const rowAll = isRowAllJamaah(waktu)
          return (
            <div key={waktu} className="shalat-grid__row" role="row">
              <button
                type="button"
                className={`shalat-grid__waktu-label shalat-grid__waktu-label--clickable ${rowAll ? 'shalat-grid__waktu-label--all' : ''}`}
                onClick={() => toggleRow(waktu)}
                title={rowAll ? `Reset ${waktu}` : `Semua Jamaah ${waktu}`}
              >
                {waktu}
              </button>
              {HARI.map((hari, idx) => {
                const val = data[hari]?.[waktu] || 'tidak'
                return (
                  <button
                    key={`${hari}-${waktu}`}
                    type="button"
                    role="gridcell"
                    className={`shalat-grid__cell jamaah-grid__cell ${getCellClass(val)}`}
                    onClick={() => onChange(hari, waktu, cycleValue(val))}
                    aria-label={`${waktu} ${HARI_SHORT[idx]} - ${val}`}
                  >
                    {getCellIcon(val)}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NumberInput({ label, value, onChange, max, unit, info }) {
  return (
    <div className="number-input">
      <div className="number-input__header">
        <label className="number-input__label">{label}</label>
        {info && <span className="number-input__info">{info}</span>}
      </div>
      <div className="number-input__controls">
        <button
          type="button"
          className="number-input__btn"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          <Minus size={16} />
        </button>
        <input
          type="number"
          className="number-input__field"
          value={value}
          onChange={e => {
            const v = parseInt(e.target.value) || 0
            onChange(max ? Math.min(v, max) : v)
          }}
          min="0"
          max={max}
        />
        <button
          type="button"
          className="number-input__btn"
          onClick={() => onChange(max ? Math.min(value + 1, max) : value + 1)}
          disabled={max && value >= max}
        >
          <Check size={16} />
        </button>
      </div>
      {unit && <span className="number-input__unit">{unit}</span>}
    </div>
  )
}

export default function InputMutabaah() {
  const { user } = useAuth()
  const {
    weekData, weekInfo, updateField,
    updateSholatFardu, updateBerjamaah,
    calculatePercentages, submitWeek
  } = useMutabaah()

  const [openSections, setOpenSections] = useState({
    sholat_fardu: true,
    shalat_berjamaah: false,
    tilawah: false,
    amalan_lain: false,
    kehadiran: false,
  })

  const [submitted, setSubmitted] = useState(false)

  const tingkatan = getEffectiveTingkatan(user)
  const targets = TARGET_AMALAN[tingkatan]
  const percentages = calculatePercentages(tingkatan)

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const record = submitWeek(tingkatan)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  // Calculate section percentages
  const sholatFarduPct = percentages.sholat_fardu?.percentage || 0
  const berjamaahPct = percentages.shalat_berjamaah?.percentage || 0
  const tilawahPct = percentages.tilawah?.percentage || 0

  const amalanLainPcts = ['sholat_dhuha', 'matsurat', 'shaum', 'qiyamullail']
    .map(k => percentages[k]?.percentage || 0)
  const amalanLainAvg = Math.round(amalanLainPcts.reduce((a, b) => a + b, 0) / amalanLainPcts.length)

  return (
    <div className="page-container">
      <div className="input-wrapper">
        <div className="page-header">
          <p className="page-header__greeting">Input Mutabaah Pekanan</p>
          <h1 className="page-header__title">Pekan Ini</h1>
          <p className="page-header__subtitle">
            <CalendarDays size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {weekInfo.label}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="input-form">

          {/* Overall Progress */}
          <div className="overall-progress card">
            <div className="card__body">
              <div className="overall-progress__header">
                <div>
                  <p className="overall-progress__label">Pencapaian Keseluruhan</p>
                  <p className="overall-progress__value">{percentages.rata_rata?.percentage || 0}%</p>
                </div>
                <div className="overall-progress__badge">
                  <Star size={16} />
                  <span>Tingkatan {tingkatan === 'pratama' ? 'Pratama' : 'Muda'}</span>
                </div>
              </div>
              <div className="progress" style={{ height: 10 }}>
                <div
                  className={`progress__fill progress__fill--${(percentages.rata_rata?.percentage || 0) >= 80 ? 'success' : (percentages.rata_rata?.percentage || 0) >= 50 ? 'warning' : 'danger'}`}
                  style={{ width: `${percentages.rata_rata?.percentage || 0}%` }}
                />
              </div>
            </div>
          </div>

        {/* Section 1: Sholat Fardu */}
        <div className="input-section card">
          <SectionHeader
            icon={Sunrise}
            title="Sholat Fardu (5 Waktu)"
            subtitle={`Target: ${targets.sholat_fardu.target}x/pekan`}
            percentage={sholatFarduPct}
            isOpen={openSections.sholat_fardu}
            onToggle={() => toggleSection('sholat_fardu')}
          />
          {openSections.sholat_fardu && (
            <div className="card__body">
              <p className="input-hint">
                <Info size={14} /> Ketuk sel untuk menandai sudah shalat
              </p>
              <SholatFarduGrid
                data={weekData.sholat_fardu}
                onChange={updateSholatFardu}
              />
            </div>
          )}
        </div>

        {/* Section 2: Shalat Berjamaah */}
        <div className="input-section card">
          <SectionHeader
            icon={Users}
            title="Shalat Berjamaah"
            subtitle={`Target: ${targets.shalat_berjamaah.target}x/pekan`}
            percentage={berjamaahPct}
            isOpen={openSections.shalat_berjamaah}
            onToggle={() => toggleSection('shalat_berjamaah')}
          />
          {openSections.shalat_berjamaah && (
            <div className="card__body">
              <p className="input-hint">
                <Info size={14} /> Ketuk untuk mengubah: Jamaah - Sendiri - Tidak
              </p>
              <BerjamaahGrid
                data={weekData.shalat_berjamaah}
                onChange={updateBerjamaah}
              />
            </div>
          )}
        </div>

        {/* Section 3: Tilawah */}
        <div className="input-section card">
          <SectionHeader
            icon={BookOpen}
            title="Tilawah Al-Quran"
            subtitle={`Target: ${targets.tilawah.target} juz/pekan`}
            percentage={tilawahPct}
            isOpen={openSections.tilawah}
            onToggle={() => toggleSection('tilawah')}
          />
          {openSections.tilawah && (
            <div className="card__body">
              <div className="tilawah-inputs">
                <NumberInput
                  label="Juz"
                  value={weekData.tilawah_juz}
                  onChange={v => updateField('tilawah_juz', v)}
                  max={30}
                  unit="juz"
                />
                <div className="tilawah-plus">+</div>
                <NumberInput
                  label="Halaman"
                  value={weekData.tilawah_halaman}
                  onChange={v => updateField('tilawah_halaman', v)}
                  max={HALAMAN_PER_JUZ - 1}
                  unit="halaman"
                />
              </div>
              <p className="tilawah-total">
                Total: {(weekData.tilawah_juz + weekData.tilawah_halaman / HALAMAN_PER_JUZ).toFixed(2)} juz
                (1 juz = {HALAMAN_PER_JUZ} halaman)
              </p>
            </div>
          )}
        </div>

        {/* Section 4: Amalan Lain */}
        <div className="input-section card">
          <SectionHeader
            icon={Moon}
            title="Amalan Lainnya"
            subtitle="Dhuha, Dzikir, Puasa Sunnah, Qiyamullail"
            percentage={amalanLainAvg}
            isOpen={openSections.amalan_lain}
            onToggle={() => toggleSection('amalan_lain')}
          />
          {openSections.amalan_lain && (
            <div className="card__body">
              <div className="amalan-grid">
                <NumberInput
                  label="Sholat Dhuha"
                  value={weekData.sholat_dhuha}
                  onChange={v => updateField('sholat_dhuha', v)}
                  max={7}
                  info={`Target: ${targets.sholat_dhuha.target}x/pekan`}
                />
                <NumberInput
                  label="Dzikir Pagi/Sore (Al-Matsurat)"
                  value={weekData.matsurat}
                  onChange={v => updateField('matsurat', v)}
                  max={14}
                  info={`Target: ${targets.matsurat.target}x/pekan`}
                />
                <NumberInput
                  label="Puasa Sunnah"
                  value={weekData.shaum}
                  onChange={v => updateField('shaum', v)}
                  max={7}
                  info={`Target: ${targets.shaum.target}x/bulan`}
                />
                <NumberInput
                  label="Shalat Malam (Qiyamullail)"
                  value={weekData.qiyamullail}
                  onChange={v => updateField('qiyamullail', v)}
                  max={7}
                  info={`Target: ${targets.qiyamullail.target}x/pekan`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Kehadiran UPA */}
        <div className="input-section card">
          <SectionHeader
            icon={HandHeart}
            title="Kehadiran UPA"
            subtitle="Pertemuan pekan ini"
            isOpen={openSections.kehadiran}
            onToggle={() => toggleSection('kehadiran')}
          />
          {openSections.kehadiran && (
            <div className="card__body">
              <div className="kehadiran-options">
                {KEHADIRAN_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`kehadiran-btn ${weekData.kehadiran_upa === opt.value ? `kehadiran-btn--active kehadiran-btn--${opt.color}` : ''}`}
                    onClick={() => updateField('kehadiran_upa', opt.value)}
                  >
                    <span className="kehadiran-btn__short">{opt.short}</span>
                    <span className="kehadiran-btn__label">{opt.label}</span>
                  </button>
                ))}
              </div>
              {weekData.kehadiran_upa === 'hadir' && (
                <div className="terlambat-input">
                  <label className="form-label">
                    <Clock size={14} /> Keterlambatan (menit)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={weekData.terlambat_upa_menit}
                    onChange={e => updateField('terlambat_upa_menit', parseInt(e.target.value) || 0)}
                    min="0"
                    max="120"
                    placeholder="0"
                  />
                  <p className="input-hint" style={{ marginTop: 4 }}>Isi 0 jika tepat waktu</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="submit-section">
          <button type="submit" className="btn btn--primary btn--block btn--lg">
            <Send size={20} />
            Simpan Mutabaah Pekan Ini
          </button>
          {submitted && (
            <div className="submit-success">
              <Check size={16} /> Data berhasil disimpan
            </div>
          )}
        </div>
      </form>
      </div>
    </div>
  )
}
