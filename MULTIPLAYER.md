# Semesta — Login & Multiplayer Setup

Panduan ini ditulis untuk dikerjakan berurutan dari atas. Tidak perlu paham
kodenya; cukup ikuti langkahnya. Setiap bagian ditutup dengan **cara mengecek
bahwa langkah itu benar-benar berhasil** — jangan lanjut sebelum ceknya hijau.

Total waktu realistis: **90–120 menit** untuk Tahap 1 + 2. Biaya: **Rp0** (di
luar domain, ~Rp150rb/tahun, dan itu pun ada opsi gratis).

---

## Ringkasan arsitektur

```
                 ┌──────────────────────────────┐
   Browser ──────┤ Vercel — file game (HTTPS)   │  gratis
   pemain        └──────────────────────────────┘
        │
        ├────────► Supabase — login + simpan data   gratis
        │          (Google / email, Postgres)
        │
        └────────► VPS kamu — server multiplayer    sudah punya
                   (Node + WebSocket, TLS via Caddy)
```

**Kenapa dibagi tiga, bukan satu?** Vercel tidak bisa menjalankan WebSocket
(arsitekturnya serverless, tiap request mati setelah selesai) — jadi server
multiplayer wajib di VPS. Sebaliknya, menulis sistem login sendiri di VPS berarti
kamu yang menanggung keamanan password orang; Supabase sudah menyelesaikan itu
dan gratis sampai 50.000 pengguna aktif per bulan.

**Peta tidak pernah dikirim lewat jaringan.** Semesta membangkitkan seluruh dunia
dari angka acak bersegel (seed) yang tetap, jadi setiap pemain menghasilkan peta
yang byte-nya identik hanya dari kodenya. Server cuma mengirim hal yang berubah:
posisi orang, monster, jam, cuaca, chat. Ini sebabnya satu VPS kecil cukup.

---

## Tahap 0 — Yang perlu kamu siapkan dulu

- [ ] **Akun Supabase** — daftar gratis di supabase.com (bisa pakai GitHub)
- [ ] **Domain** untuk VPS. Ini **wajib**, bukan opsional — alasannya di Tahap 2.
      Opsi: beli di Niagahoster/Cloudflare (~Rp150rb/th), atau gratis lewat
      DuckDNS / Cloudflare Tunnel.
- [ ] **IP dan akses root VPS** kamu
- [ ] Repo ini sudah ke-push ke GitHub

---

## Tahap 1 — LOGIN + SIMPAN DATA DI CLOUD

Selesai tahap ini pemain bisa login dan progresnya ikut ke perangkat lain.
Multiplayer belum, tapi bagian ini sudah berguna sendiri dan aman untuk rilis.

### 1.1 Buat project Supabase

1. Buka supabase.com → **New project**
2. Nama: `semesta`. Region: **Southeast Asia (Singapore)** — paling dekat.
3. Password database: simpan di tempat aman (jarang dipakai, tapi jangan hilang)
4. Tunggu ±2 menit sampai selesai dibuat

### 1.2 Buat tabel penyimpanan

Buka **SQL Editor** → **New query**, tempel semua ini, klik **Run**:

```sql
-- Satu baris per pemain. `payload` adalah seluruh save game apa adanya,
-- jadi menambah fitur baru di game tidak pernah butuh migrasi database.
create table if not exists public.saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY. Ini bagian terpenting di seluruh file.
-- Tanpa ini, siapa pun yang punya kunci publik bisa membaca save semua orang.
-- Dengan ini, Postgres sendiri yang menolak — bukan kode kita yang "sopan".
alter table public.saves enable row level security;

create policy "baca save sendiri"  on public.saves
  for select using (auth.uid() = user_id);
create policy "tulis save sendiri" on public.saves
  for insert with check (auth.uid() = user_id);
create policy "ubah save sendiri"  on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Papan peringkat opsional: hanya angka, tidak ada data pribadi.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null default 'Wanderer',
  level      int  not null default 1,
  playtime   int  not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profil boleh dilihat siapa saja" on public.profiles for select using (true);
create policy "ubah profil sendiri" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Cek berhasil:** buka **Table Editor** → harus ada tabel `saves` dan `profiles`,
dan di sebelah namanya ada label **RLS enabled**.

### 1.3 Nyalakan login Google

1. **Authentication** → **Providers** → **Google** → aktifkan
2. Supabase menampilkan sebuah **Callback URL** — salin
3. Buka console.cloud.google.com → **APIs & Services** → **Credentials**
   → **Create Credentials** → **OAuth client ID** → **Web application**
4. Di **Authorized redirect URIs**, tempel Callback URL tadi
5. Salin **Client ID** dan **Client Secret** kembali ke Supabase → **Save**

Juga aktifkan **Email** provider (sudah aktif secara bawaan). Ini jalur cadangan
untuk yang tidak mau pakai Google — mereka dapat link masuk lewat email, tanpa
password sama sekali.

**Cek berhasil:** di **Authentication → Providers**, Google dan Email keduanya
bertanda hijau.

### 1.4 Ambil kunci

**Project Settings** → **API**, salin dua hal:

- **Project URL** → `https://xxxxx.supabase.co`
- **anon public** key → string panjang

> Kunci `anon` ini **memang dirancang untuk publik** dan boleh terlihat di
> browser. Yang menjaga data adalah RLS di langkah 1.2, bukan kerahasiaan kunci
> ini. Yang **tidak boleh** bocor adalah `service_role` key — jangan pernah
> menyentuh yang itu di sisi klien.

### 1.5 Pasang di Vercel

Vercel → project Semesta → **Settings** → **Environment Variables**, tambahkan:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL tadi |
| `VITE_SUPABASE_ANON_KEY` | anon public key tadi |

Centang **Production**, **Preview**, dan **Development**. Lalu **Redeploy**.

Untuk uji di komputer sendiri, buat file `.env` di akar repo:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

`.env` sudah masuk `.gitignore` — jangan di-commit.

**Cek berhasil:** jalankan `npm run dev`, buka game, di menu utama harus muncul
tombol login. Klik → masuk pakai Google → kembali ke menu dengan nama kamu
tertulis di situ.

---

## Tahap 2 — SERVER MULTIPLAYER DI VPS

### 2.1 Arahkan domain ke VPS

Di panel DNS domain kamu, buat satu record:

| Type | Name | Value |
|---|---|---|
| A | `play` | IP VPS kamu |

Hasilnya `play.namadomainmu.com`.

**Tunggu sampai benar-benar menyebar sebelum lanjut** — sertifikat HTTPS akan
gagal kalau domainnya belum menunjuk ke sana. Cek dari komputer kamu:

```bash
ping play.namadomainmu.com
```

IP yang muncul harus IP VPS kamu.

> **Kenapa domain wajib?** Game disajikan Vercel lewat HTTPS. Browser modern
> menolak mentah-mentah koneksi WebSocket tidak terenkripsi (`ws://`) dari
> halaman HTTPS — namanya mixed content, dan tidak ada cara mematikannya. Jadi
> server butuh `wss://`, dan sertifikat TLS hanya bisa diterbitkan untuk nama
> domain, bukan untuk alamat IP.

### 2.2 Siapkan VPS

SSH ke VPS sebagai root, lalu:

```bash
git clone https://github.com/USERNAME/Semesta.git /opt/semesta
bash /opt/semesta/server/deploy/setup-vps.sh play.namadomainmu.com
```

Skrip itu memasang Node 20, Caddy (yang mengurus sertifikat HTTPS sendiri),
membuat user tanpa hak istimewa untuk menjalankan game, menyalakan firewall,
dan mendaftarkan service systemd supaya server hidup lagi otomatis kalau mati
atau VPS-nya di-reboot.

Lalu nyalakan:

```bash
cd /opt/semesta/server
npm install --omit=dev
chown -R semesta:semesta /opt/semesta
systemctl start semesta
```

**Cek berhasil:**

```bash
curl https://play.namadomainmu.com/health
```

Harus keluar `{"ok":true,"players":0,...}`. Kalau muncul error sertifikat,
domainnya belum menyebar — tunggu, lalu `systemctl restart caddy`.

### 2.3 Sambungkan game ke server

Tambahkan satu environment variable lagi di Vercel:

| Name | Value |
|---|---|
| `VITE_GAME_SERVER` | `wss://play.namadomainmu.com` |

**Redeploy.**

**Cek berhasil:** buka game di dua browser berbeda (atau satu biasa + satu
incognito). Kedua karakter harus saling terlihat dan bisa chat.

---

## Tahap 3 — Yang tersinkron, dan yang belum

Ini keadaan sebenarnya setelah Tahap 2 — ditulis apa adanya supaya kamu tidak
menemukan kejutan saat demo.

| Hal | Status | Catatan |
|---|---|---|
| Posisi & gerak pemain | ✅ | 10×/detik, dihaluskan di klien |
| Tampilan pemain lain | ✅ | baju, rambut, topi, jubah — persis pilihan mereka |
| Chat | ✅ | tombol Enter |
| Jam & siang-malam | ✅ | satu jam untuk semua orang |
| Cuaca | ✅ | hujan turun serentak di semua layar |
| Monster | ✅ | server yang menentukan; semua melihat monster yang sama |
| World boss | ✅ | HP bersama — dipukul bareng, jatuh bareng |
| Ladang tani | ✅ | tanam/panen terlihat oleh semua |
| Inventory & level | ⚠️ | tetap di sisi klien, tersimpan ke Supabase |
| Anti-cheat | ⚠️ | damage dibatasi, tapi belum divalidasi penuh |

Dua ⚠️ itu keputusan sadar, bukan kelalaian. Menaruh inventory di server berarti
setiap pungutan item jadi perjalanan bolak-balik jaringan, dan untuk dunia
kooperatif tanpa peringkat kompetitif, biayanya jauh lebih besar daripada
manfaatnya. Kalau nanti ada leaderboard berhadiah, di situlah ini harus pindah —
dan file yang perlu diubah adalah `server/src/world.js`.

---

## Operasi harian

```bash
# lihat log berjalan
journalctl -u semesta -f

# berapa orang online sekarang
curl https://play.namadomainmu.com/health

# update setelah push kode baru
bash /opt/semesta/server/deploy/update.sh

# restart
systemctl restart semesta
```

---

## Masalah yang paling sering terjadi

**"Tidak bisa connect, di console ada mixed content"**
`VITE_GAME_SERVER` masih `ws://`. Harus `wss://`.

**"Sertifikat gagal"**
DNS belum menyebar saat Caddy mencoba. `systemctl restart caddy`, tunggu semenit.

**"Project Supabase saya kok mati sendiri"**
Project gratis dijeda setelah **7 hari tanpa aktivitas**. Kalau ini dipakai untuk
lomba, buka dashboard-nya sekali seminggu, atau pasang cron ping. Datanya tidak
hilang — tinggal di-resume, tapi butuh beberapa menit dan itu tidak lucu kalau
sedang dinilai.

**"Login berhasil tapi save-nya kosong"**
Kemungkinan besar RLS. Buka **Table Editor → saves → RLS**, pastikan ketiga
policy di langkah 1.2 ada.

**"Pemain lain patah-patah"**
Wajar kalau ping di atas ~200ms. Yang tidak wajar adalah teleportasi; kalau itu
terjadi, kemungkinan dua tab memakai akun yang sama.

---

## Setelah semua jalan

Urutan yang masuk akal berikutnya:

1. **Party/teman** — lihat posisi teman di peta dunia
2. **Trading** — perlu inventory pindah ke server dulu
3. **Rumah bersama** — sudah ada di save, tinggal dipindah ke Postgres
4. **Beberapa dunia (sharding)** — kalau satu server penuh (>60 orang)

---

## Catatan tentang Hermes agent

VPS kamu sudah terpasang Hermes agent. Itu **tidak mengganggu** apa pun di sini:
server game memakai port 8787 di localhost dan hanya diakses lewat Caddy di port
443. Kalau Hermes kebetulan sudah memakai port 80 atau 443, beri tahu saya —
konfigurasi Caddy perlu disesuaikan supaya keduanya tidak berebut. Cek dengan:

```bash
ss -tlnp | grep -E ':(80|443|8787)'
```
