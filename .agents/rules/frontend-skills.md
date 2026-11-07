---
trigger: always_on
---

# Frontend & Copy Skills

Skill ada di `.agents/skills/`. Baca `SKILL.md` terkait sebelum mengerjakan tugas yang cocok.

| Tugas | Skill |
|-------|-------|
| Halaman baru, redesign, landing, arah visual | `taste-skill` |
| Palet, tipografi, style, panduan UX, aksesibilitas | `ui-ux-pro-max` |
| Audit, polish, critique, harden, responsive, UX copy, deteksi AI slop | `impeccable` |
| Detail komponen, rasa "dipoles", keputusan animasi (Emil Kowalski) | `emil-design-eng` |
| Menambah / meninjau / memperbaiki animasi | `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities` |
| Performa & istilah animasi | `animation-performance`, `animation-vocabulary` |
| Uji ketahanan UI (teks panjang, data kosong, layar kecil) | `break-ui` |
| Gaya ala Apple (kejelasan, hierarki, material) | `apple-design` |
| Animasi Motion / Framer Motion, CSS spring | `motion` |
| Halaman scroll sinematik (landing / showcase) | `scroll-craft` |
| Menulis atau menyunting teks (UI copy, README, PRD, pesan) | `stop-slop` |

`scroll-craft` hanya untuk permukaan Persuade (Landing). Jangan dipakai di layar kerja (input, laporan, dashboard).

## Aturan proyek

- Stack: React + Vite + CSS biasa. Jangan tambahkan Tailwind.
- UI berbahasa Indonesia. Konteks: aplikasi mutabaah ibadah harian, mayoritas dibuka dari HP.
- Import animasi dari `motion/react`, bukan `framer-motion`. Hormati `prefers-reduced-motion`.
- Pencarian desain: `python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system`.
- Setelah perubahan signifikan, perbarui PRD addendum di root dan README.
