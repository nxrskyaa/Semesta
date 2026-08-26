<div align="center">

<img src="docs/media/banner.svg" alt="SEMESTA — voxel action RPG prosedural" width="100%">

<br>

[English](README.md) · **Bahasa Indonesia** · [中文](README.zh.md)

<br>

[![Main](https://img.shields.io/badge/▶_MAIN_SEKARANG-semesta--gray.vercel.app-f0c455?style=for-the-badge&labelColor=16264a)](https://semesta-gray.vercel.app/)
[![Dibangun dengan three.js](https://img.shields.io/badge/three.js-r169-16264a?style=for-the-badge&logo=threedotjs&logoColor=f0c455)](https://threejs.org)
[![Build for Rialo](https://img.shields.io/badge/BUILD_FOR-RIALO-0b6b6b?style=for-the-badge)](https://rialo.io)

*Voxel action RPG open-world yang jalan langsung di browser.
Semua tekstur dilukis saat runtime. Semua musik disintesis live.
Tidak ada satu pun file gambar atau audio di dalam game.*

</div>

---

## Apa itu Semesta?

**Semesta** adalah action RPG voxel 2.5D bergaya cozy yang berlatar di dunia
**Anavela** — negeri lentera dengan hutan pinus, padang salju, dan gugusan sembilan
pulau. Kamu adalah murid terakhir ordo **Lanternkeeper**, dan tugasmu menyalakan
kembali dunia yang lampunya padam.

Semesta juga sebuah pernyataan teknis: seluruh game — terrain, karakter, monster,
senjata, ikon UI, musik, dan efek suara — **di-generate prosedural lewat kode**.
Repositori ini tidak menyimpan satu pun aset gambar atau file audio (satu-satunya
pengecualian adalah dua logo branding). Canvas 16 piksel dan WebAudio API mengerjakan
semuanya.

<div align="center">
<img src="docs/media/village.jpg" width="49%" alt="Basecamp Anavela Universe di sore hari">
<img src="docs/media/hollow.jpg" width="49%" alt="The Hollow — dungeon endgame 30 lantai">
<img src="docs/media/skills.jpg" width="49%" alt="Pillar of Light — vocabulary VFX skill yang baru">
<img src="docs/media/ocean.jpg" width="49%" alt="Gugusan pulau — 9 pulau, berenang, dan perahu">
</div>

---

## Fitur — semuanya sudah rilis dan bisa dimainkan hari ini

| Sistem | Isinya |
|---|---|
| ⚔ **Class** | Mulai sebagai **Origin** bermodal pedang pinjaman; di Lv 10, lakukan ritual awakening menjadi salah satu dari **7 class** — Warrior (pedang *atau* kapak), Archer, Mage, Priest, Assassin, Summoner (meriam + pasukan), Fighter (kombo 3 pukulan tangan kosong). Skill tree per class, total 48 skill. |
| 🏰 **The Hollow** | Dungeon endgame **30 lantai × 3 tingkat kesulitan**. Tiga zona bertema (Stone Halls / Frost Crypt / Ember Core), **6 spesies monster dan 6 bos eksklusif** dengan mekanik multi-fase yang selalu di-telegraph, 21 drop edisi terbatas. Semua lantai yang sudah tamat bisa di-replay. |
| 🎫 **GamePass Musiman** | Season pass **50 tier** dalam kalender 30 hari yang disepakati semua client tanpa server. Empat season berputar dengan reward track yang benar-benar berbeda, prestige cache tanpa batas setelah tier 50, dan **Keeper's Vault** — spin yang *tidak pernah* memberi duplikat. |
| 🎰 **Wonder Capsules** | Gacha enam tier dengan soft pity, mesin kapsul yang dilukis, pull 10×, dan katalog hadiah + odds lengkap sebelum kamu keluar satu koin pun. Sadar class: pull tidak akan pernah memberi senjata yang tidak bisa kamu pakai. |
| 🌍 **Open world** | Dunia deterministik 200 sel: bioma musim dingin, samudra menutupi ± sepertiga peta, **9 pulau yang ditata tangan**, berenang & menyelam, dua kendaraan air, satwa liar yang bereaksi padamu, cuaca, dan siklus siang-malam penuh. |
| 🐾 **Koleksi** | **203 item · 57 senjata · 60 kosmetik · 17 pet · 8 mount** — setiap pet benar-benar mengambilkan loot-mu. **The Index** mencatat 200 entri dengan siluet petunjuk untuk yang belum ditemukan. |
| 🏡 **Homestead** | Satu pulau estate dengan tangga 3 tingkat (kabin → cottage → villa). Pembangunan makan waktu nyata — scaffolding berdiri sementara kamu pergi. |
| 🌾 **Life skill** | Memancing, bertani, dan memasak punya XP dan skill tree masing-masing. Ikan mythic itu ada — dan hanya satu node di seluruh game yang membukanya. |
| 👥 **Multiplayer** | Server otoritatif memegang jam, cuaca, spawn, dan world boss. Login Google, **3 slot karakter**, cloud save dengan merge yang tidak akan pernah menghapus hero. World chat, teman, pemain lain dirender dengan gear asli mereka. |
| 🎵 **Audio generatif** | **10 track musik yang dikomposisi prosedural** dalam 4 mood, berganti setiap 16 bar, plus ± 60 efek suara sintesis. Tanpa file audio. |
| 📱 **Semua perangkat** | Kontrol sentuh penuh dengan pinch-zoom, tata letak tombol yang tidak saling tumpang tindih, dan preset grafis LOW sampai ULTRA dengan resolusi adaptif. |

---

## Teknisnya, singkat

- **Renderer** — [three.js](https://threejs.org) dengan ACES filmic tone mapping,
  UnrealBloom, ambient occlusion N8AO opsional, render-scale adaptif yang mengikuti
  budget frame terukur, dan light culler yang menjaga jumlah lampu terlihat tetap
  konstan (jumlah yang berubah memicu kompilasi ulang semua shader — itulah perbaikan
  stutter-nya).
- **Seni** — semua tekstur, sprite, dan ikon dilukis ke canvas 16 px saat load.
  Kosmetik, senjata, monster dan bangunan dirakit dari mesh primitif lewat cache
  geometri/material bersama, lalu di-bake statis per struktur (properti desa:
  401 → 67 draw call).
- **Dunia** — deterministik dari seed tetap. Server multiplayer tidak pernah mengirim
  peta; setiap client menghasilkan dunia yang byte-identik, jadi jaringan hanya
  membawa entitas.
- **Audio** — progresi akor, melodi, dan semua SFX disintesis di WebAudio.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build produksi
```

Multiplayer opsional: arahkan `VITE_GAME_SERVER` ke instance [`server/`](server/)
yang sudah di-deploy (lihat [MULTIPLAYER.md](MULTIPLAYER.md)) dan pintu
**🌐 PLAY ONLINE** muncul di menu. Tanpa itu, game tetap bisa dimainkan penuh
secara solo.

---

## Kontrol

| Input | Aksi | | Input | Aksi |
|---|---|---|---|---|
| `WASD` / joystick | Gerak | | `N` | Peta dunia + waypoint |
| `LMB` / ⚔ | Serang (auto-aim) | | `O` | Wardrobe & penampilan |
| `RMB` / `Shift` | Dodge roll / menyelam | | `M` | Mount |
| `Space` | Lompat | | `B` | Auto-battle |
| `1–3` | Skill · `4` Tonic | | `G` | Mancing AFK |
| `F` / `R` | Interaksi (utama / kedua) | | `J` / `U` | Hadiah harian / GamePass |
| `T` / `Y` | Teleport rumah / basecamp | | `K` / `L` / `Z` / `X` | Skill / Life skill / Stats / Index |

---

## Build for Rialo

Semesta sedang disiapkan untuk [**Rialo**](https://rialo.io), yang testnet-nya
[sudah live](https://playground.rialo.io). Kecocokannya arsitektural, bukan kosmetik:
game ini sudah menjalankan jam season, timer pembangunan, dan jadwal world boss —
persis beban kerja asinkron yang dieksekusi Rialo secara native sebagai reactive
transaction. Desain on-chain lengkap (kelas aset, firewall ekonomi, empat tahap rilis)
ada di [docs/Semesta-Chronicle.pdf](docs/Semesta-Chronicle.pdf).

**Roadmap** — ① Token launchpad → ② Tier akses holder → ③ Gacha token berdampingan dengan gold → ④ Free-mint Genesis NFT untuk pemain aktif.

---

## Tim

| | Peran | |
|---|---|---|
| **Nxrskyaa** | Game Developer | [x.com/nxrskyaa](https://x.com/nxrskyaa) |
| **Dikzzy** | Game Tester & Bug Hunter | [x.com/diikzzyy__](https://x.com/diikzzyy__) |
| **Baster** | Technical Game Developer | [x.com/Bas_Basterx](https://x.com/Bas_Basterx) |

<div align="center">
<br>

**[▶ Main Semesta sekarang](https://semesta-gray.vercel.app/)** — tanpa install, tanpa wallet, tanpa download. Cukup browser.

<sub>◆ BUILD FOR RIALO ◆</sub>

</div>
