import { useNavigate } from 'react-router-dom'
import {
  BookOpen, CheckCircle, TrendingUp, Users, Award,
  ArrowRight, ChevronRight, ClipboardList, BarChart3
} from 'lucide-react'
import './Landing.css'

const features = [
  {
    icon: ClipboardList,
    title: 'Catat Amalan Harian',
    desc: 'Sholat 5 waktu, tilawah Al-Quran, sholat Dhuha, dan amalan sunnah lainnya tercatat rapi setiap pekan.',
    color: 'primary',
  },
  {
    icon: TrendingUp,
    title: 'Pantau Progress',
    desc: 'Lihat perkembangan ibadah dari pekan ke pekan. Streak berturut-turut memotivasi konsistensi.',
    color: 'secondary',
  },
  {
    icon: BarChart3,
    title: 'Laporan Lengkap',
    desc: 'Grafik dan statistik pencapaian amalan membantu evaluasi diri secara berkala.',
    color: 'accent',
  },
  {
    icon: Users,
    title: 'Bersama Pembina',
    desc: 'Terhubung langsung dengan pembina yang membimbing perjalanan ibadah Anda.',
    color: 'info',
  },
]

const steps = [
  { num: '1', title: 'Daftar Akun', desc: 'Buat akun dengan email atau masuk via Google.' },
  { num: '2', title: 'Isi Mutabaah', desc: 'Catat amalan harian setiap pekan sebelum hari Minggu.' },
  { num: '3', title: 'Pantau Progress', desc: 'Lihat pencapaian, streak, dan laporan di dashboard.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero__bg" />
        <div className="landing-hero__content">
          <img src="/SIT_MATAHARI_LOGO.png" alt="Logo SIT Matahari" className="landing-hero__logo" />
          <h1 className="landing-hero__title">Mutabaah Yaumiyah</h1>
          <p className="landing-hero__subtitle">Sekolah Islam Terpadu Matahari</p>
          <p className="landing-hero__tagline">
            Pantau dan evaluasi amalan harian secara mudah, terstruktur, dan konsisten
          </p>
          <div className="landing-hero__actions">
            <button className="landing-hero__btn landing-hero__btn--primary" onClick={() => navigate('/login')}>
              <span>Mulai Sekarang</span>
              <ArrowRight size={18} />
            </button>
            <a href="#tentang" className="landing-hero__btn landing-hero__btn--ghost">
              Pelajari Lebih Lanjut
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="tentang" className="landing-about">
        <div className="landing-container">
          <div className="landing-section-header">
            <BookOpen size={24} className="landing-section-header__icon" />
            <h2 className="landing-section-header__title">Apa itu Mutabaah Yaumiyah?</h2>
          </div>
          <p className="landing-about__text">
            Mutabaah Yaumiyah adalah sistem evaluasi pekanan amalan untuk anggota SIT Matahari.
            Setiap pekan, Anda mencatat ibadah harian seperti sholat fardu, tilawah Al-Quran,
            sholat Dhuha, dan amalan sunnah lainnya. Pembina akan membimbing perjalanan ibadah Anda
            melalui rekap dan evaluasi berkala.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-container">
          <div className="landing-section-header">
            <Award size={24} className="landing-section-header__icon" />
            <h2 className="landing-section-header__title">Fitur Unggulan</h2>
          </div>
          <div className="landing-features__grid">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className={`landing-feature-card landing-feature-card--${f.color}`}>
                  <div className="landing-feature-card__icon">
                    <Icon size={24} />
                  </div>
                  <h3 className="landing-feature-card__title">{f.title}</h3>
                  <p className="landing-feature-card__desc">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-steps">
        <div className="landing-container">
          <div className="landing-section-header">
            <CheckCircle size={24} className="landing-section-header__icon" />
            <h2 className="landing-section-header__title">Cara Menggunakan</h2>
          </div>
          <div className="landing-steps__list">
            {steps.map((s, i) => (
              <div key={i} className="landing-step">
                <div className="landing-step__num">{s.num}</div>
                <div className="landing-step__content">
                  <h3 className="landing-step__title">{s.title}</h3>
                  <p className="landing-step__desc">{s.desc}</p>
                </div>
                {i < steps.length - 1 && <ChevronRight size={20} className="landing-step__arrow" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-container">
          <h2 className="landing-cta__title">Siap Memulai Perjalanan Ibadah Anda?</h2>
          <p className="landing-cta__desc">
            Daftar sekarang dan mulai mencatat amalan harian bersama pembina Anda.
          </p>
          <button className="landing-hero__btn landing-hero__btn--primary" onClick={() => navigate('/login')}>
            <span>Daftar / Masuk</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>SIT Matahari - Mutabaah Yaumiyah</p>
      </footer>
    </div>
  )
}
