import { useState } from 'react'
import {
  HelpCircle, BookOpen, ChevronDown, ChevronUp,
  ClipboardList, BarChart3, Users, Shield, Star,
  Smartphone, Globe, CheckCircle, AlertTriangle,
  Info, User, Calendar, Clock
} from 'lucide-react'
import './Panduan.css'

const GUIDE_SECTIONS = [
  {
    id: 'mulai',
    icon: Smartphone,
    title: 'Memulai Menggunakan Mutabaah',
    content: [
      {
        q: 'Apa itu Mutabaah Yaumiyah?',
        a: 'Mutabaah Yaumiyah adalah website untuk mencatat dan mengevaluasi amalan pekanan guru SIT Matahari. Setiap pekan, Anda mengisi data amalan seperti sholat, tilawah, dan puasa sunnah. Pembina dan yayasan bisa melihat rekap otomatis.'
      },
      {
        q: 'Bagaimana cara login?',
        a: 'Klik tombol login dengan akun Google Anda. Jika belum terdaftar, hubungi pembina atau yayasan untuk mendaftarkan Anda. Anda juga bisa mendaftar mandiri melalui link undangan yang diberikan pembina.'
      },
      {
        q: 'Bisa diakses dari mana saja?',
        a: 'Website ini bisa diakses dari HP maupun laptop/komputer. Untuk pengalaman terbaik, kami sarankan mengaksesnya dari HP karena desainnya memang dioptimasi untuk layar HP.'
      },
    ]
  },
  {
    id: 'input',
    icon: ClipboardList,
    title: 'Cara Mengisi Mutabaah',
    content: [
      {
        q: 'Kapan batas waktu pengisian?',
        a: 'Batas pengisian mutabaah setiap pekan adalah hari Minggu malam pukul 23:59 WIB. Setelah batas waktu, Anda tetap bisa mengisi tapi data akan ditandai "Terlambat".'
      },
      {
        q: 'Bagaimana cara mengisi Sholat Fardu?',
        a: 'Buka halaman Input, lalu pada bagian "Sholat Fardu (5 Waktu)" ketuk kotak grid sesuai hari dan waktu sholat. Kotak akan berubah hijau jika sudah ditandai. Ketuk lagi untuk membatalkan. Target: 35x/pekan (5 waktu x 7 hari).'
      },
      {
        q: 'Bagaimana cara mengisi Shalat Berjamaah?',
        a: 'Di bagian "Shalat Berjamaah", ketuk kotak grid untuk mengubah status. Setiap ketukan mengubah status secara bergilir: Berjamaah (hijau) - Shalat Sendiri (kuning) - Tidak Shalat (kosong). Hanya yang "Berjamaah" dihitung ke target.'
      },
      {
        q: 'Bagaimana cara mengisi Tilawah?',
        a: 'Isi jumlah juz dan halaman Al-Quran yang dibaca selama sepekan. Jika belum genap 1 juz, cukup isi di kolom halaman saja. Sistem akan menghitung otomatis (1 juz = 20 halaman).'
      },
      {
        q: 'Apa itu Amalan Lainnya?',
        a: 'Bagian ini mencakup 4 amalan: (1) Sholat Dhuha - isi berapa kali dalam sepekan (target 7x/pekan), (2) Dzikir Pagi/Sore (Al-Matsurat) - isi berapa kali dalam sepekan, (3) Puasa Sunnah - isi berapa hari puasa sunnah dalam sebulan, (4) Shalat Malam (Qiyamullail) - isi berapa kali dalam sepekan. Gunakan tombol + dan - atau ketik angka langsung.'
      },
      {
        q: 'Bagaimana cara mengisi Kehadiran UPA?',
        a: 'Pilih salah satu dari 4 status: H (Hadir), I (Izin), S (Sakit), atau A (Alfa). Jika memilih "Hadir", akan muncul kolom tambahan untuk mengisi keterlambatan dalam menit (isi 0 jika tepat waktu).'
      },
      {
        q: 'Bisa mengedit data yang sudah disubmit?',
        a: 'Ya, selama masih dalam pekan yang sama (sebelum batas waktu Minggu 23:59 WIB), Anda bisa mengedit data yang sudah disubmit. Setelah batas waktu, edit hanya bisa dilakukan oleh pembina atau yayasan.'
      },
    ]
  },
  {
    id: 'tingkatan',
    icon: Star,
    title: 'Tingkatan dan Target',
    content: [
      {
        q: 'Apa bedanya tingkatan Muda dan Pratama?',
        a: 'Tingkatan menentukan target amalan Anda per pekan. Muda adalah tingkatan pemula dengan target lebih ringan, sedangkan Pratama adalah tingkatan lanjutan dengan target lebih tinggi. Contoh: target shalat berjamaah Muda 14x/pekan, Pratama 21x/pekan.'
      },
      {
        q: 'Bagaimana cara naik tingkatan?',
        a: 'Kenaikan tingkatan dilakukan oleh yayasan. Saat naik tingkatan (Muda ke Pratama), ada masa transisi di mana target masih menggunakan tingkatan lama. Setelah masa transisi selesai, target otomatis berubah ke tingkatan baru.'
      },
    ]
  },
  {
    id: 'laporan',
    icon: BarChart3,
    title: 'Memahami Laporan',
    content: [
      {
        q: 'Bagaimana cara membaca persentase pencapaian?',
        a: 'Persentase dihitung dari (realisasi / target) x 100%. Warna menunjukkan pencapaian: Hijau = 80% ke atas (bagus), Kuning = 50-79% (perlu ditingkatkan), Merah = di bawah 50% (perlu perhatian khusus).'
      },
      {
        q: 'Apa itu rata-rata keseluruhan?',
        a: 'Rata-rata keseluruhan adalah rata-rata dari persentase semua amalan Anda dalam sepekan. Ini menunjukkan pencapaian umum Anda secara keseluruhan.'
      },
      {
        q: 'Apa itu Streak?',
        a: 'Streak menunjukkan berapa pekan berturut-turut Anda mengisi mutabaah tepat waktu. Streak akan reset jika Anda tidak mengisi dalam 1 pekan. Ini bukan tentang pencapaian 100%, tapi tentang konsistensi mengisi.'
      },
    ]
  },
  {
    id: 'pembina',
    icon: Shield,
    title: 'Panduan untuk Pembina',
    content: [
      {
        q: 'Bagaimana melihat rekap grup saya?',
        a: 'Di halaman Beranda, Anda akan melihat ringkasan grup binaan Anda. Termasuk daftar anggota, status pengisian (siapa yang sudah/belum mengisi), dan rata-rata pencapaian. Untuk detail lengkap, buka menu "Anggota Grup".'
      },
      {
        q: 'Bagaimana mendaftarkan anggota baru?',
        a: 'Buka halaman Profil, lalu scroll ke bagian "Link Pendaftaran Anggota". Salin link tersebut dan kirimkan ke calon anggota. Saat anggota membuka link tersebut, nama pembina akan terisi otomatis dan mereka bisa mendaftar langsung ke grup Anda.'
      },
      {
        q: 'Apa yang harus saya perhatikan saat evaluasi?',
        a: 'Perhatikan: (1) Siapa yang belum mengisi - perlu diingatkan, (2) Anggota dengan pencapaian rendah (merah) - perlu pembinaan ekstra, (3) Tren penurunan dari pekan ke pekan - mungkin ada masalah, (4) Anggota yang konsisten (streak tinggi) - beri apresiasi.'
      },
    ]
  },
]

const FAQ_ITEMS = [
  {
    q: 'Bagaimana jika saya lupa mengisi dalam sepekan?',
    a: 'Anda tetap bisa mengisi, tapi data akan ditandai "Terlambat". Jika benar-benar tidak mengisi, pekan tersebut dicatat sebagai 0% dan streak Anda akan reset.'
  },
  {
    q: 'Saya sudah sholat tapi lupa mencentang, bisa diedit?',
    a: 'Ya, selama masih dalam pekan yang sama (sebelum Minggu 23:59 WIB), Anda bisa mengedit data kapan saja. Setelah batas waktu, hubungi pembina untuk koreksi.'
  },
  {
    q: 'Kenapa persentase saya rendah padahal sudah banyak beribadah?',
    a: 'Persentase dihitung berdasarkan target tingkatan Anda. Tingkatan Pratama memiliki target lebih tinggi dari Muda. Cek target di bagian "Tingkatan dan Target" pada panduan di atas.'
  },
  {
    q: 'Bisa digunakan tanpa internet?',
    a: 'Saat ini website memerlukan koneksi internet untuk menyimpan data. Fitur offline sedang dalam rencana pengembangan.'
  },
  {
    q: 'Bagaimana jika saya pindah grup?',
    a: 'Hubungi yayasan untuk memproses perpindahan grup. Data historis di grup lama akan diarsipkan dan di grup baru pencatatan dimulai dari awal.'
  },
  {
    q: 'Ada error saat menggunakan website, hubungi siapa?',
    a: 'Buka menu "Helpdesk" di navigasi, lalu buat tiket baru dengan menjelaskan masalah yang Anda alami. Tim admin akan merespons melalui sistem tiket. Anda bisa memantau status dan membalas langsung dari halaman tiket.'
  },
]


function AccordionItem({ item, isOpen, onToggle }) {
  return (
    <div className={`accordion-item ${isOpen ? 'accordion-item--open' : ''}`}>
      <button className="accordion-item__header" onClick={onToggle} type="button">
        <span className="accordion-item__question">{item.q}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && (
        <div className="accordion-item__body">
          <p>{item.a}</p>
        </div>
      )}
    </div>
  )
}

export default function Panduan() {
  const [openGuide, setOpenGuide] = useState('mulai')
  const [openItems, setOpenItems] = useState({})

  function toggleItem(sectionId, index) {
    const key = `${sectionId}-${index}`
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleFaq(index) {
    setOpenItems(prev => ({ ...prev, [`faq-${index}`]: !prev[`faq-${index}`] }))
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <p className="page-header__greeting">Bantuan</p>
        <h1 className="page-header__title">Panduan dan FAQ</h1>
        <p className="page-header__subtitle">
          Pelajari cara menggunakan Mutabaah Yaumiyah
        </p>
      </div>

      {/* Guide Sections */}
      <section className="panduan-sections">
        <h2 className="section-title">
          <BookOpen size={18} /> Panduan Penggunaan
        </h2>

        {GUIDE_SECTIONS.map(section => {
          const isActive = openGuide === section.id
          const Icon = section.icon
          return (
            <div key={section.id} className="panduan-section card">
              <button
                className={`panduan-section__header ${isActive ? 'panduan-section__header--active' : ''}`}
                onClick={() => setOpenGuide(isActive ? null : section.id)}
                type="button"
              >
                <div className="panduan-section__left">
                  <div className="panduan-section__icon">
                    <Icon size={18} />
                  </div>
                  <span className="panduan-section__title">{section.title}</span>
                </div>
                {isActive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {isActive && (
                <div className="panduan-section__body">
                  {section.content.map((item, idx) => (
                    <AccordionItem
                      key={idx}
                      item={item}
                      isOpen={openItems[`${section.id}-${idx}`]}
                      onToggle={() => toggleItem(section.id, idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* FAQ */}
      <section className="panduan-faq">
        <h2 className="section-title">
          <HelpCircle size={18} /> Pertanyaan Umum (FAQ)
        </h2>

        <div className="card">
          <div className="panduan-faq__list">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem
                key={idx}
                item={item}
                isOpen={openItems[`faq-${idx}`]}
                onToggle={() => toggleFaq(idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <div className="panduan-contact card">
        <div className="card__body">
          <div className="panduan-contact__inner">
            <Info size={20} className="panduan-contact__icon" />
            <div>
              <p className="panduan-contact__title">Masih butuh bantuan?</p>
              <p className="panduan-contact__desc">
                Hubungi pembina grup Anda atau admin yayasan melalui WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
