# SEMESTA

Voxel action RPG 2.5D di browser — hutan pinus berkabut, empat class ala MMO, skill, forge, dan malam yang datang perlahan. Dibangun dengan [three.js](https://threejs.org) + [Vite](https://vitejs.dev).

Semua pixel art asset (tekstur blok, sprite, ikon item/skill, senjata) **di-generate prosedural** saat runtime lewat canvas 16×16 nearest-neighbor — tanpa satu pun file gambar. Musik & SFX juga **disintesis penuh via WebAudio** — tanpa satu pun file audio.

## Fitur

- **Create Character** — nama, gender (Pria/Wanita), 4 class, kustomisasi warna kulit, gaya & warna rambut, warna pakaian, dengan preview 3D live. Progress tersimpan otomatis (localStorage) dan bisa dilanjutkan.
- **4 Class ala MMO**, masing-masing dengan tipe senjata & 3 skill unik:
  | Class | Senjata | Skill |
  | --- | --- | --- |
  | Ksatria | Pedang + Perisai (Shift) | Bash, Whirlwind, War Cry |
  | Pemanah | Busur (proyektil) | Power Shot, Multishot, Swiftness |
  | Penyihir | Tongkat (bolt meledak) | Fireball, Ice Nova, Blink |
  | Pembunuh | Belati ganda (2 hit/serangan) | Dash Strike, Fan of Knives, Shadow Step |
- **8 jenis monster** dengan AI berbeda: Slime, Nibbit, Armorbug (perairan), Fungling (penembak spora), Boarling (menyeruduk), Wisp (hanya malam), Treant, Golem (mini-boss, jauh dari spawn).
- **Levelling** — XP dari kill; level up menambah HP/stamina/damage. Musuh makin kuat makin jauh dari spawn.
- **Crafting per class** — tempa senjata tier 1–3 dari drop monster + Health Tonic.
- **Forge (Pandai Besi)** — upgrade senjata +1 s/d +9 pakai Batu Tempa; makin tinggi makin berisiko gagal (bahan hangus, senjata aman).
- **Dunia voxel prosedural** — heightmap fBm deterministik: hutan pinus, jalan setapak berkelok dengan obor, danau berbuih, kabut, siklus siang-malam (Wisp muncul malam hari).
- **Musik generatif** — tema siang tenang / malam mencekam, lapisan perkusi muncul saat combat. SFX lengkap untuk semua aksi.
- **Mobile support** — joystick virtual + tombol aksi dengan aim-assist, UI ringkas yang tidak menutupi dunia.

## Kontrol

| Input | Aksi |
| --- | --- |
| `W A S D` / joystick | Gerak |
| Klik kiri / tombol ⚔ | Serang (ke arah kursor / auto-aim di mobile) |
| Klik kanan / tombol ↺ | Evade roll (i-frames, pakai stamina) |
| `Shift` (tahan) | Perisai — hanya Ksatria |
| `1` `2` `3` | Skill class |
| `4` | Health Tonic |
| `Q` / `E`, swipe kanan-atas | Putar kamera |
| Scroll | Zoom |
| `Tab` / `C` / `V` | Tas / Crafting / Forge |

## Menjalankan

```bash
npm install
npm run dev      # development di http://localhost:5173
npm run build    # build produksi ke dist/
npm run preview  # pratinjau build produksi
```

## Deploy ke Vercel

Zero-config: Vercel otomatis mendeteksi Vite (`npm run build`, output `dist/`). Import repo di [vercel.com/new](https://vercel.com/new), atau `npx vercel`.

## Roadmap

- Multiplayer + connect wallet (direncanakan)
