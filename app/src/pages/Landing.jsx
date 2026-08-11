import { useNavigate } from 'react-router-dom'
import {
  BookOpen, CheckCircle, TrendingUp, Users, Award,
  ArrowRight, ChevronRight, ClipboardList, BarChart3,
  LogIn, UserPlus, Smartphone, MousePointer, ShieldCheck
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

const tutorialSteps = [
  {
    num: '1',
    icon: MousePointer,
    title: 'Klik "Mulai Sekarang"',
    desc: 'Tekan tombol di atas atau di bawah halaman ini untuk masuk ke halaman login.',
    detail: null,
  },
  {
    num: '2',
    icon: LogIn,
    title: 'Masuk atau Daftar',
    desc: 'Pilih salah satu cara untuk masuk ke aplikasi:',
    detail: [
      'Klik tombol "Sign in with Google" untuk masuk otomatis dengan akun Google Anda.',
      'Jika akun belum terdaftar, Anda akan otomatis diarahkan ke form pendaftaran.',
      'Atau daftar manual dengan mengisi email dan password di tab "Daftar".',
    ],
  },
  {
    num: '3',
    icon: UserPlus,
    title: 'Lengkapi Data Pendaftaran',
    desc: 'Isi data yang diminta saat mendaftar:',
    detail: [
      'Nama lengkap — akan ditampilkan di profil Anda.',
      'Jenis kelamin — pilih Ikhwan atau Akhwat.',
      'Peran — pilih Anggota (siswa) atau Pembina (guru).',
      'Jenjang — Muda atau Pratama (menentukan target amalan).',
      'Password — minimal 6 karakter untuk keamanan akun.',
    ],
  },
  {
    num: '4',
    icon: ClipboardList,
    title: 'Isi Mutabaah Setiap Pekan',
    desc: 'Setelah masuk, catat amalan harian Anda setiap pekan:',
    detail: [
      'Buka menu "Input" untuk mengisi data sholat, tilawah, dan amalan lainnya.',
      'Centang sholat fardu dan berjamaah untuk setiap hari.',
      'Isi jumlah tilawah, sholat dhuha, puasa sunnah, dan amalan lainnya.',
      'Klik "Simpan" sebelum hari Minggu agar tercatat tepat waktu.',
    ],
  },
  {
    num: '5',
    icon: TrendingUp,
    title: 'Pantau Progress di Dashboard',
    desc: 'Lihat pencapaian ibadah Anda dari waktu ke waktu:',
    detail: [
      'Dashboard menampilkan progress pekan ini dan perbandingan target.',
      'Menu Laporan menampilkan riwayat semua pekan yang sudah diisi.',
      'Rapor Bulanan memberikan evaluasi predikat (A–E) setiap bulan.',
      'Leaderboard menunjukkan ranking konsistensi dan pencapaian.',
    ],
  },
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
            <a href="#panduan" className="landing-hero__btn landing-hero__btn--ghost">
              Panduan Penggunaan
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

      {/* Tutorial / Panduan */}
      <section id="panduan" className="landing-tutorial">
        <div className="landing-container">
          <div className="landing-section-header">
            <ShieldCheck size={24} className="landing-section-header__icon" />
            <h2 className="landing-section-header__title">Panduan Penggunaan</h2>
            <p className="landing-section-header__subtitle">
              Ikuti langkah-langkah berikut untuk mulai menggunakan Mutabaah Yaumiyah
            </p>
          </div>
          <div className="landing-tutorial__timeline">
            {tutorialSteps.map((step, i) => {
              const StepIcon = step.icon
              return (
                <div key={i} className="landing-tutorial__step">
                  <div className="landing-tutorial__step-marker">
                    <div className="landing-tutorial__step-num">{step.num}</div>
                    {i < tutorialSteps.length - 1 && <div className="landing-tutorial__step-line" />}
                  </div>
                  <div className="landing-tutorial__step-content">
                    <div className="landing-tutorial__step-header">
                      <StepIcon size={20} className="landing-tutorial__step-icon" />
                      <h3 className="landing-tutorial__step-title">{step.title}</h3>
                    </div>
                    <p className="landing-tutorial__step-desc">{step.desc}</p>
                    {step.detail && (
                      <ul className="landing-tutorial__step-list">
                        {step.detail.map((item, j) => (
                          <li key={j} className="landing-tutorial__step-item">
                            <CheckCircle size={14} className="landing-tutorial__check" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
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
