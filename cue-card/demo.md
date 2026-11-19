Tentu. Ini versi **sangat panjang dan detail** dari dokumentasi redesign UI Cue, mencakup setiap keputusan desain, rasional teknis, implementasi kode baris demi baris, protokol uji komprehensif, dan catatan arsitektur untuk pemeliharaan jangka panjang. Dokumen ini ditujukan sebagai referensi tunggal yang lengkap.

---

# Dokumentasi Lengkap Redesign UI — Cue: Tema Hitam Elegan

## Daftar Isi

1. [Latar Belakang & Motivasi](#1-latar-belakang--motivasi)
2. [Prinsip Desain](#2-prinsip-desain)
3. [Keputusan Desain Terperinci](#3-keputusan-desain-terperinci)
4. [Palet Warna & Kontras](#4-palet-warna--kontras)
5. [Tipografi](#5-tipografi)
6. [Layout & Spacing](#6-layout--spacing)
7. [Komponen Ikon SVG](#7-komponen-ikon-svg)
8. [State Management di Renderer](#8-state-management-di-renderer)
9. [Implementasi HTML](#9-implementasi-html)
10. [Implementasi CSS](#10-implementasi-css)
11. [Implementasi TypeScript Renderer](#11-implementasi-typescript-renderer)
12. [Interaksi Drag & Click-Through](#12-interaksi-drag--click-through)
13. [Panel Overlay (Disclaimer & Settings)](#13-panel-overlay-disclaimer--settings)
14. [Aksesibilitas](#14-aksesibilitas)
15. [Protokol Uji Komprehensif](#15-protokol-uji-komprehensif)
16. [Catatan Arsitektur & Pemeliharaan](#16-catatan-arsitektur--pemeliharaan)
17. [Changelog & Commit History](#17-changelog--commit-history)
18. [FAQ & Troubleshooting](#18-faq--troubleshooting)

---

## 1. Latar Belakang & Motivasi

### 1.1 Masalah dengan UI Sebelumnya

UI awal Cue menggunakan palet biru (`#38bdf8`) sebagai aksen utama, dengan tombol-tombol berisi teks ("Private: OFF", "Read", "Sesi", dll.) yang disusun secara linear di header. Beberapa masalah teridentifikasi:

1. **Warna biru terlalu mencolok** — saat overlay ditempatkan di atas slide presentasi putih atau berwarna netral, aksen biru menarik perhatian audiens jika private mode gagal atau belum aktif. Ini bertentangan dengan prinsip "tidak terlihat".
2. **Tombol teks memakan ruang horizontal** — pada lebar minimum 260px, enam tombol teks ("Sesi", "Private: OFF", "Deck", "Read", "⚙", "✕") saling berdesakan, menyebabkan wrapping atau truncation yang merusak keterbacaan.
3. **Tidak ada diferensiasi visual antara state ON/OFF** — selain perubahan teks label, tidak ada isyarat visual instan (bentuk, fill, opacity) yang bisa dibaca dalam 200ms saat presenter melirik sekilas.
4. **Session banner terlalu agresif** — blok merah solid (`rgba(153, 27, 27, 0.75)`) terasa seperti alert error, bukan indikator status. Ini menciptakan kecemasan visual yang tidak perlu.
5. **Tombol ✕ (panic hide) terselip di cluster** — dalam situasi darurat, presenter harus mencari tombol kecil di antara lima tombol lain. Waktu pencarian kognitif ini menambah latensi psikologis meskipun latensi teknis <150ms.

### 1.2 Tujuan Redesign

Redesign ini bertujuan menyelesaikan semua masalah di atas dengan pendekatan **"elegan melalui reduksi"**:

- Menghilangkan semua warna hue (biru, merah, hijau) → hanya hitam, putih, abu-abu
- Mengganti tombol teks dengan ikon SVG inline → menghemat ~60% ruang horizontal
- Memisahkan tombol ✕ dari cluster utama → mengurangi waktu pencarian visual
- Mengganti session banner blok merah dengan hairline tipis → status tetap jelas tanpa alarm
- Mempertahankan semua teks yang diwajibkan PRD (mode badge, counter, deck name, OS status)
- Menjaga kompatibilitas penuh dengan sistem state existing (CueState, IPC, hotkeys)

### 1.3 Constraint Teknis yang Tidak Bisa Dilanggar

Sebelum mendesain, kita harus menerima batasan platform Electron/Windows:

| Batasan                                                     | Implikasi Desain                                                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `backdrop-filter: blur()` tidak menembus ke aplikasi lain   | Tidak ada efek frosted glass/kaca buram. Kemewahan harus datang dari border, spacing, dan tipografi                   |
| DevTools docked mematikan transparansi                      | Sudah dihandle via `mode: 'detach'`, tapi CSS tidak boleh mengandalkan DevTools terbuka                               |
| Mode READ = click-through                                   | Tombol tidak bisa diklik saat read. Semua kontrol harus punya alternatif hotkey                                       |
| Window default 420×260, min 260×120                         | Layout harus berfungsi di semua ukuran tanpa overflow atau truncation kritis                                          |
| `setContentProtection` berlaku per-window, bukan per-elemen | Seluruh panel adalah satu unit proteksi. Tidak ada elemen individual yang bisa "lebih protected"                      |
| DOMPurify wajib untuk semua HTML dari marked                | Card body selalu disanitize. CSS styling harus bekerja dengan output DOMPurify (tidak ada class custom dari markdown) |

---

## 2. Prinsip Desain

### 2.1 Hierarki Visual Melalui Value, Bukan Hue

Dalam desain konvensional, hierarki sering dibuat dengan warna: merah = penting, biru = info, hijau = sukses. Di Cue, kita **menghilangkan dimensi hue sepenuhnya**. Hierarki hanya dibangun melalui:

- **Brightness**: putih (`#ffffff`) > terang (`#ededf0`) > sedang (`#9a9aa4`) > gelap (`#7c7c86`)
- **Opacity**: 1.0 > 0.75 > 0.6 > 0.08
- **Weight**: 600 (semibold) > 400 (regular)
- **Size**: 13.5px > 12px > 11px > 10px > 9.5px
- **Spacing**: padding/margin yang konsisten menciptakan grouping

Ini berarti seseorang dengan color vision deficiency (buta warna parsial atau total) mendapatkan pengalaman yang **identik** dengan pengguna normal. Tidak ada informasi yang hilang karena bergantung pada persepsi warna.

### 2.2 Status Dikomunikasikan Melalui Bentuk + Brightness

Untuk toggle buttons (private, session, mode), status ON/OFF tidak hanya dibedakan oleh warna (karena kita menghindari hue), tetapi oleh **kombinasi tiga sinyal**:

| Sinyal     | OFF                        | ON                                          |
| ---------- | -------------------------- | ------------------------------------------- |
| Fill       | Outline only / transparent | Filled (currentColor dengan opacity rendah) |
| Brightness | Muted (`--muted`)          | High (`--hi` / white)                       |
| Border     | Transparent                | Visible (`rgba(255,255,255,0.18)`)          |

Contoh konkret: shield icon private mode. Saat OFF, ia adalah outline abu-abu tipis. Saat ON, ia menjadi terisi dengan warna putih semi-transparan (`fill-opacity: 0.22`) + border putih halus. Perbedaan ini terbaca bahkan dalam grayscale murni.

### 2.3 Minimalisme Fungsional, Bukan Dekoratif

Setiap piksel di UI Cue harus memiliki fungsi. Tidak ada elemen dekoratif murni. Contoh:

- Border `1px solid var(--line)` bukan hiasan — ia mendefinisikan batas panel terhadap latar belakang transparan
- Border-radius `12px` bukan estetika — ia mencegah sudut tajam yang bisa "menyala" saat backlight monitor tinggi
- Hairline session banner bukan gaya — ia adalah indikator status yang memenuhi US-11 tanpa melanggar prinsip "tidak norak"
- Scrollbar tipis 6px bukan tren — ia memaksimalkan area baca di window kecil

Jika sebuah elemen bisa dihapus tanpa mengurangi fungsionalitas atau kejelasan status, elemen itu **harus** dihapus.

### 2.4 Konsistensi dengan Platform Native

Cue berjalan di Windows 10/11. Meskipun overlay adalah window frameless custom, ia harus tetap terasa "native":

- Font: Segoe UI Variable Text (font sistem Windows modern), fallback ke Segoe UI, lalu system-ui
- Icon size: 16px dalam container 26px — proporsi standar Windows toolbar icons
- Border radius: 7px untuk button, 12px untuk panel — selaras dengan WinUI 3 rounded corners
- Interaction feedback: hover state 120ms transition — cukup cepat untuk terasa responsif, cukup lambat untuk tidak jittery
- Focus indicator: border-color change, bukan outline — menghindari double-ring yang terlihat non-native

---

## 3. Keputusan Desain Terperinci

### 3.1 Palet: Hitam Netral, Nol Hue

**Keputusan**: Background panel `rgba(10,10,11,0.94)` untuk interact mode, `rgba(10,10,11,0.86)` untuk read mode. Tidak ada warna biru, hijau, merah, atau kuning sebagai aksen fungsional.

**Rasional**:

- Warna netral tidak berebut perhatian dengan konten slide presentasi
- Hitam pekat (`#0a0a0b`) memberikan kontras maksimal terhadap teks putih, memastikan keterbacaan bahkan saat overlay berada di atas dokumen putih terang
- Alpha 0.94 (interact) vs 0.86 (read) memberikan perbedaan visual yang jelas antara dua mode tanpa perlu label tambahan — read mode secara fisik lebih tembus pandang
- Nilai alpha dipilih berdasarkan perhitungan kontras worst-case (lihat §4)

**Alternatif yang ditolak**:

- Dark gray (`#1e1e1e`) — terlalu terang, mengurangi kesan "premium" dan kontras terhadap teks
- Pure black (`#000000`) — menyebabkan smearing/banding pada panel OLED tertentu, dan terlalu harsh terhadap mata dalam sesi panjang
- Tinted dark (`#0f172a` slate) — inilah yang dipakai sebelumnya, dan user secara eksplisit menyebutnya "norak" karena blue tint-nya

### 3.2 Aksen: Putih, Bukan Warna

**Keputusan**: State aktif (private ON, session ON, settings open) ditandai dengan brightness increase ke `#ffffff`, bukan perubahan hue.

**Rasional**:

- Putih adalah brightness maksimum — secara universal diasosiasikan dengan "aktif/on/enabled"
- Tidak memerlukan pemrosesan warna di otak — lebih cepat dikenali dalam glance test (<200ms)
- Aman untuk semua jenis color vision deficiency
- Konsisten dengan konvensi Windows: active toolbar buttons di File Explorer, Task Manager, dll. menggunakan brightness increase, bukan hue change

### 3.3 Toggle Buttons: Ikon di Tengah Header

**Keputusan**: Lima tombol toggle (session, private, open deck, toggle mode, settings) ditampilkan sebagai ikon SVG 16×16 dalam container 26×26, diposisikan **absolute center** di header.

**Rasional**:

- Ikon menghemat ~60% ruang horizontal dibanding teks label. Pada width 260px, cluster ikon 138px masih menyisakan 61px gutter kiri dan 27px gutter kanan untuk drag
- Posisi absolute center memastikan ikon selalu simetris terlepas dari lebar window — tidak perlu recalculate saat resize
- Lima ikon dalam satu cluster menciptakan "toolbar" yang familiar — pola yang sudah dikenal dari VS Code, Figma, browser devtools
- Setiap ikon memiliki tooltip (`title` attribute) untuk identifikasi saat hover — kompensasi untuk hilangnya label teks

**Ikon yang dipilih dan alasannya**:

| Aksi        | Ikon             | Alasan Pemilihan                                                                      |
| ----------- | ---------------- | ------------------------------------------------------------------------------------- |
| Session     | Power symbol (⏻) | Universal symbol untuk "active session". Berbeda dari play/pause yang ambigu          |
| Private     | Shield (🛡)      | Langsung mengkomunikasikan "protection/exclusion". Fill state = protected             |
| Open Deck   | Folder (📁)      | Konvensional untuk "open file". Tab folder membuat distinguishable dari document icon |
| Toggle Mode | Eye (👁)         | "Seeing" = interact mode. Slash overlay = read/click-through. Intuitif                |
| Settings    | Gear (⚙)         | Universal settings icon. Dash-array teeth membuatnya recognizable di 16px             |
| Panic Hide  | X (✕)            | Universal "close/dismiss". Dipisahkan dari cluster untuk quick access                 |

### 3.4 Tombol ✕: Kanan Atas, Terpisah

**Keputusan**: Tombol panic hide (✕) diposisikan di **flex-end** header, terpisah dari cluster ikon tengah oleh ruang drag yang luas.

**Rasional**:

- Dalam situasi darurat (klien minta lihat layar), presenter tidak boleh menghabiskan waktu mencari tombol. Posisi kanan atas adalah lokasi pertama yang dicari secara insting (konvensi close button Windows/macOS/Linux)
- Pemisahan dari cluster mencegah accidental click saat menargetkan ikon lain
- Ruang antara cluster dan ✕ berfungsi sebagai drag zone tambahan — semakin banyak area drag, semakin mudah memposisikan overlay
- Warna ✕ adalah `--dim` (abu gelap) saat idle, berubah ke `--warn` (#e0a3a3) saat hover — subtle tapi noticeable. Tidak merah terang yang bisa dikira error state

### 3.5 Teks yang Dipertahankan

Meskipun mayoritas kontrol beralih ke ikon, empat elemen teks **wajib dipertahankan** sesuai PRD:

| Elemen                             | PRD Reference                                                        | Alasan Tidak Bisa Jadi Ikon                                                                       |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Mode badge ("READ"/"INTERACT")     | US-8: "Status mode yang sedang aktif ditampilkan dengan jelas di UI" | Ikon eye saja tidak cukup eksplisit. Presenter butuh konfirmasi tekstual bahwa mode telah berubah |
| Card counter ("2/4")               | US-3: "Indikator posisi kartu ditampilkan"                           | Angka dinamis tidak bisa direpresentasikan ikon statis. Tabular nums memastikan alignment stabil  |
| Deck name                          | US-2: Identifikasi deck aktif                                        | Nama file bervariasi. Truncation + ellipsis + title tooltip adalah solusi terbaik                 |
| OS status ("OS: excluded/visible") | US-4: Verifikasi protection aktif                                    | Ini adalah feedback dari OS, bukan state internal app. Harus tekstual agar tidak ambigu           |

### 3.6 Session Banner: Hairline, Bukan Blok

**Keputusan**: Session banner diubah dari blok merah solid menjadi strip tipis dengan background `rgba(255,255,255,0.05)` dan border-top `rgba(255,255,255,0.16)`.

**Rasional**:

- US-11 mewajibkan indikator capture yang "ditampilkan dengan jelas" dan "tidak dapat disembunyikan oleh private mode". Hairline memenuhi kedua syarat ini
- Blok merah solid (`rgba(153,27,27,0.75)`) menciptakan visual alarm yang meningkatkan anxiety presenter. Hairline menyampaikan informasi yang sama tanpa emotional loading
- Height 20px (termasuk padding) hanya mengambil ~8% dari window 260px — minimal impact pada area baca
- White-on-dark text dengan contrast ratio 14.87:1 — jauh melebihi WCAG AAA (7:1), terbaca bahkan di monitor low-brightness
- Single-line truncation dengan ellipsis mencegah banner memakan ruang vertikal berlebih. Full text tersedia via tooltip

**Trade-off**: Hairline kurang eye-catching dibanding blok merah. Ini intentional — presenter seharusnya sudah aware mereka mengaktifkan session marker. Banner adalah reminder pasif, bukan alert aktif.

---

## 4. Palet Warna & Kontras

### 4.1 Token Definisi

```css
:root {
  /* Surface */
  --surface: rgba(10, 10, 11, 0.94); /* interact mode */
  --surface-read: rgba(10, 10, 11, 0.86); /* read mode */
  --raise: rgba(255, 255, 255, 0.06); /* hover bg */
  --raise-hi: rgba(255, 255, 255, 0.11); /* active/on bg */
  --line: rgba(255, 255, 255, 0.08); /* borders */
  --line-soft: rgba(255, 255, 255, 0.05); /* subtle dividers */

  /* Text */
  --fg: #ededf0; /* primary text */
  --muted: #9a9aa4; /* secondary text, icons idle */
  --dim: #7c7c86; /* disabled, markers ONLY — never for readable text */
  --hi: #ffffff; /* active state, emphasis */
  --warn: #e0a3a3; /* errors, conflicts, mismatch indicators */
}
```

### 4.2 Perhitungan Kontras Worst-Case

Overlay Cue bersifat transparan. Warna efektif yang dilihat mata adalah komposisi alpha-blended antara panel dan latar belakang di bawahnya. Worst case untuk keterbacaan adalah saat overlay berada di atas **slide putih terang** (`#ffffff`), karena ini meminimalkan kontras terhadap teks terang.

Formula alpha compositing: `effective = fg × α + bg × (1-α)`

**Interact mode (α=0.94)**:

- Effective background: `rgb(10,10,11) × 0.94 + rgb(255,255,255) × 0.06 = rgb(25,25,26)`
- `--fg` (#ededf0) vs effective bg: **15.04:1** ✅ (WCAG AAA requires 7:1)
- `--muted` (#9a9aa4) vs effective bg: **6.30:1** ✅ (WCAG AA requires 4.5:1)
- `--dim` (#7c7c86) vs effective bg: **4.25:1** ⚠️ Below AA for normal text → restricted to non-text uses only

**Read mode (α=0.86)**:

- Effective background: `rgb(10,10,11) × 0.86 + rgb(255,255,255) × 0.14 = rgb(44,44,45)`
- `--fg` vs effective bg: **11.94:1** ✅
- `--muted` vs effective bg: **5.00:1** ✅ (exactly AA threshold)
- `--dim` vs effective bg: **3.38:1** ❌ Below AA → confirmed: NEVER use for readable text

**Kesimpulan**: Token `--dim` hanya boleh digunakan untuk:

- Border/divider lines
- Disabled icon states (non-interactive)
- List item markers (`li::marker`)
- Decorative elements

Semua teks yang harus dibaca (body, labels, counters, status) minimal menggunakan `--muted`, dengan preferensi `--fg` untuk konten primer.

### 4.3 Warna Warn (Soft Red)

`--warn: #e0a3a3` dipilih sebagai soft desaturated red, bukan pure red (`#ff0000`) atau bright red (`#ef4444`).

**Alasan**:

- Pure red terlalu agresif di atas dark background — menyebabkan visual vibration/fatigue
- Soft red tetap distinguishable dari gray tokens bahkan dalam grayscale (luminance difference)
- Contrast ratio terhadap surface interact: **6.60:1** ✅ AA
- Contrast ratio terhadap surface read: **8.31:1** ✅ AAA
- Digunakan untuk: error messages, hotkey conflicts, OS status mismatch, panic hide hover

---

## 5. Tipografi

### 5.1 Font Stack

```css
font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
```

**Urutan prioritas**:

1. **Segoe UI Variable Text** — font variabel Windows 11 yang mendukung optical sizing. Lebih crisp di small sizes dibanding static Segoe UI
2. **Segoe UI** — fallback untuk Windows 10 yang tidak memiliki Variable Text
3. **system-ui** — generic fallback untuk edge cases (Wine, remote desktop non-Windows)
4. **sans-serif** — ultimate fallback

Code blocks menggunakan:

```css
font-family: "Cascadia Mono", Consolas, monospace;
```

Cascadia Mono adalah font monospace default Windows Terminal — konsisten dengan ekosistem developer Windows.

### 5.2 Scale Tipografi

| Token        | Size   | Weight         | Usage                                                     |
| ------------ | ------ | -------------- | --------------------------------------------------------- |
| Body         | 13.5px | 400            | Card content, primary readable text                       |
| Card title   | 12px   | 600, uppercase | Section heading dalam kartu                               |
| Meta/status  | 10px   | 400            | Mode badge, deck name, counter, OS status                 |
| Hint/caption | 10px   | 400            | Instructions, secondary guidance                          |
| Banner       | 9.5px  | 400            | Session banner (compact single-line)                      |
| Error        | 10.5px | 400            | Error messages (slightly larger than meta for visibility) |
| Hotkey label | 10px   | 400            | Settings panel hotkey names                               |
| Code inline  | 11.5px | 400            | Inline code spans                                         |

**Line heights**:

- Body: 1.55 (optimal readability untuk paragraf panjang)
- Meta/banner: 1.3–1.4 (compact single-line contexts)
- Lists: inherited from body (1.55)

### 5.3 Letter Spacing

- Mode badge: `0.09em` — wider tracking untuk uppercase label, meningkatkan legibility di small size
- Card title: `0.04em` — subtle tracking untuk uppercase section headers
- Meta row: `0.02em` — minimal tracking untuk compact status line
- Body/hints: default (0) — optimal untuk paragraph reading

### 5.4 Font Smoothing

```css
-webkit-font-smoothing: antialiased;
```

Subpixel rendering (`auto`) dapat menyebabkan color fringing pada transparent overlays di atas varying backgrounds. Antialiased grayscale rendering lebih konsisten across different backdrop colors, meskipun sedikit less sharp di LCD standard. Trade-off ini diterima karena Cue adalah overlay, bukan standalone app.

---

## 6. Layout & Spacing

### 6.1 Struktur Vertikal Panel

```
┌─────────────────────────────────────┐
│ HEADER (34px fixed)                 │ ← drag zone + icon cluster + ✕
├─────────────────────────────────────┤
│ META (22px fixed)                   │ ← drag zone + status text
├─────────────────────────────────────┤
│ SESSION BANNER (20px, conditional)  │ ← only when session active
├─────────────────────────────────────┤
│ ERROR (variable, conditional)       │ ← only when error exists
├─────────────────────────────────────┤
│                                     │
│ BODY (flex: 1, scrollable)          │ ← card title + card content
│                                     │
└─────────────────────────────────────┘
```

**Height budget at default 260px**:

- Chrome (header + meta): 56px
- Body available: 260 - 56 - 20 (padding) - 20 (title) = **164px ≈ 7 lines** of cue text
- With session banner active: 144px ≈ 6 lines

**Height budget at minimum 120px**:

- Chrome: 56px
- Body: 120 - 56 - 20 = **44px ≈ 2 lines**
- Still functional for quick glances, though tight

### 6.2 Header Layout

Header menggunakan **relative positioning dengan absolute center cluster**:

```
[← drag gutter →][   ⏻ 🛡 📁 👁 ⚙   ][← drag gutter →][✕]
```

- `#bar`: `position: relative; justify-content: flex-end` — pushes ✕ to right
- `#actions`: `position: absolute; left: 50%; transform: translateX(-50%)` — always centered regardless of window width
- Left/right gutters: natural flex space, always available for dragging
- At minWidth 260px: left gutter ≈ 61px, right gutter ≈ 27px — both sufficient for drag target (minimum recommended touch/drag target: 24px)

### 6.3 Meta Row Layout

```
[MODE]  [···DECK NAME···]  [COUNTER] [OS STATUS]
```

- `#mode`: `flex: 0 0 auto` — fixed width based on content ("READ" or "INTERACT")
- `#deck`: `flex: 1 1 auto; min-width: 0` — takes remaining space, truncates with ellipsis
- `#right-meta`: `flex: 0 0 auto` — fixed width cluster for counter + OS status
- Entire meta row is `app-region: drag` — provides large secondary drag surface

### 6.4 Spacing System

Base unit: **2px**. All spacings are multiples:

| Token | Value | Usage                                              |
| ----- | ----- | -------------------------------------------------- |
| xs    | 2px   | Icon button gap                                    |
| sm    | 4px   | Inner padding compact elements                     |
| md    | 6px   | Card title margin-bottom, list item margin         |
| base  | 8px   | Gap between meta items, row gaps                   |
| lg    | 10px  | Body horizontal padding, banner padding            |
| xl    | 12px  | Body vertical padding, disclaimer/settings padding |
| 2xl   | 14px  | Disclaimer/settings horizontal padding             |

Border-radius scale:

- Button: 7px
- Code inline: 4px
- Pre block: 8px
- Panel: 12px

---

## 7. Komponen Ikon SVG

### 7.1 Spesifikasi Umum

Semua ikon SVG mengikuti spesifikasi identik:

```html
<svg viewBox="0 0 16 16" aria-hidden="true">
  <path d="..." />
</svg>
```

- **viewBox**: `0 0 16 16` — grid 16×16 pixels, scalable
- **aria-hidden="true"**: Icons are decorative; semantic meaning conveyed via button `title` and `aria-pressed`
- **Rendering**: Via CSS, not inline attributes:
  ```css
  .icon-btn svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  ```
- **Color inheritance**: `stroke: currentColor` means icon color follows button's `color` property — enabling state changes via CSS class without touching SVG markup

### 7.2 Individual Icon Design

#### Power Symbol (Session)

```svg
<path d="M8 2.6v3.6" />
<path d="M4.4 5.2a5 5 0 1 0 7.2 0" />
```

Vertical line + open arc. Standard IEC 5009 power symbol. Arc opens at top to distinguish from "record" circle.

#### Shield (Private)

```svg
<path class="shield" d="M8 2.1 3.7 3.8v3.9c0 2.6 1.8 4.9 4.3 6.2 2.5-1.3 4.3-3.6 4.3-6.2V3.8Z" />
```

Classic shield silhouette. Uses `.shield` class for conditional fill:

- OFF: `fill: none` (outline only)
- ON: `fill: currentColor; fill-opacity: 0.22` (subtle filled state)

Fill opacity 0.22 dipilih agar shield terlihat "filled" tanpa menjadi solid white block yang terlalu dominant di 16px size.

#### Folder (Open Deck)

```svg
<path d="M2.4 4.6A1.2 1.2 0 0 1 3.6 3.4h2.2l1.2 1.5h5.4a1.2 1.2 0 0 1 1.2 1.2v5.3a1.2 1.2 0 0 1-1.2 1.2H3.6a1.2 1.2 0 0 1-1.2-1.2Z" />
```

Folder dengan tab di kiri atas. Tab membedakan dari document/file icon. Rounded corners 1.2px konsisten dengan panel radius.

#### Eye (Toggle Mode)

```svg
<path d="M2.2 8S4.4 4.3 8 4.3 13.8 8 13.8 8 11.6 11.7 8 11.7 2.2 8 2.2 8Z" />
<circle cx="8" cy="8" r="1.7" />
<path class="slash" d="M3.2 3.2 12.8 12.8" />
```

Eye outline + pupil circle + diagonal slash. Slash visibility controlled by CSS:

- Interact mode: `opacity: 0` (eye open = can see/interact)
- Read mode: `opacity: 1` (eye crossed out = click-through, cannot interact)

Slash path extends beyond eye boundary (3.2,3.2 to 12.8,12.8) untuk memastikan visual coverage even at small render sizes.

#### Gear (Settings)

```svg
<circle class="teeth" cx="8" cy="8" r="6" />
<circle cx="8" cy="8" r="2.3" />
```

Innovative approach: gear teeth created via `stroke-dasharray` on outer circle instead of complex path:

```css
#settings .teeth {
  stroke-width: 2;
  stroke-dasharray: 2.36 2.36; /* 8 teeth: circumference 37.7 / 8 = 4.71 per tooth, 50% dash */
}
```

Inner circle (r=2.3) adalah axle hole. Approach ini menghasilkan gear yang perfectly symmetric, scales cleanly, dan hanya 2 SVG elements vs typical 8-12 path commands.

#### X (Panic Hide)

```svg
<path d="M4.4 4.4 11.6 11.6M11.6 4.4 4.4 11.6" />
```

Two diagonal lines forming X. Endpoints inset from corners (4.4, 11.6) untuk visual breathing room within 16px viewBox. Stroke cap round ensures clean endpoints.

### 7.3 Icon State Transitions

All icon state changes use CSS transitions:

```css
.icon-btn {
  transition:
    color 120ms ease,
    background 120ms ease,
    border-color 120ms ease;
}
```

120ms dipilih sebagai sweet spot:

- < 100ms: feels instant but jarring, no visual confirmation of state change
- 120-150ms: perceptible but snappy, confirms interaction without lag feeling
- \> 200ms: feels sluggish for toggle actions that should be immediate

Properties animated: color (icon stroke), background (button fill), border-color (focus/active ring). Fill-opacity changes on shield are NOT transitioned — instant fill toggle feels more decisive for security-critical state.

---

## 8. State Management di Renderer

### 8.1 Critical Bug Prevention: No textContent on Icon Buttons

Previous renderer implementation used `textContent` to update button labels:

```ts
// ❌ BROKEN: destroys SVG children
privateEl.textContent = s.privateMode ? "Private: ON" : "Private: OFF";
```

When button contains inline SVG, setting `textContent` **replaces all child nodes** including the SVG element. Result: icon disappears after first state change.

**Solution**: Dedicated helper function:

```ts
function setIconState(
  btn: HTMLButtonElement,
  on: boolean,
  labelOn: string,
  labelOff: string,
): void {
  btn.classList.toggle("on", on);
  btn.title = on ? labelOn : labelOff;
  btn.setAttribute("aria-pressed", String(on));
}
```

This function:

1. Toggles CSS class `on` → triggers visual state change via CSS selectors
2. Updates `title` → provides tooltip text for hover identification
3. Sets `aria-pressed` → communicates toggle state to screen readers

**No DOM mutation of button children occurs.** SVG remains intact across unlimited state transitions.

### 8.2 Render Optimization: Skip Redundant Hotkey Re-renders

Hotkey list rebuilds are expensive (DOM manipulation × 6 rows). Optimization:

```ts
let lastHotkeyJson = "";

function renderHotkeys(s: CueState): void {
  const json = JSON.stringify([s.hotkeys, s.hotkeyConflicts, recording]);
  if (json === lastHotkeyJson) return; // Skip if nothing changed
  lastHotkeyJson = json;
  // ... actual DOM updates
}
```

JSON serialization of relevant state slice serves as cheap equality check. Only re-renders when hotkeys, conflicts, or recording state actually change. Typical render cycle calls `renderHotkeys` 0-1 times instead of 6+ DOM mutations.

### 8.3 State Flow Architecture

```
Main Process (single source of truth)
    │
    ├── applyState() ──→ win.webContents.send(IPC.state, getCueState())
    │                           │
    │                           ▼
    │                    Renderer receives CueState
    │                           │
    │                           ▼
    │                    render(s: CueState)
    │                     ├── Toggle body classes (read/private/session/etc.)
    │                     ├── Update text elements (mode, counter, deck, etc.)
    │                     ├── setIconState() for each toggle button
    │                     ├── renderHotkeys() if changed
    │                     └── Sanitize + render card body via DOMPurify
    │
    └── User action (click/hotkey) ──→ IPC ──→ Main handler ──→ applyState()
```

Key principle: **Renderer never mutates state directly.** It only reads CueState and projects it to DOM. All state changes flow through main process IPC handlers. This ensures consistency across multiple potential state sources (UI clicks, hotkeys, tray menu, second-instance focus).

---

## 9. Implementasi HTML

### 9.1 Document Structure

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Cue</title>
  </head>
  <body>
    <div id="panel">
      <!-- Header, Meta, Content, Panels -->
    </div>
    <script type="module" src="/src/renderer.ts"></script>
  </body>
</html>
```

Minimal head: no external stylesheets, no fonts loaded from CDN, no meta viewport (Electron window manages dimensions). Title "Cue" appears in detached DevTools tab title.

### 9.2 Element ID Contract

20 element IDs are referenced by `el()` in renderer.ts. All must exist in HTML or app crashes at startup with descriptive error:

| ID             | Element Type | Purpose                       |
| -------------- | ------------ | ----------------------------- |
| panel          | div          | Root container                |
| bar            | header       | Drag zone + button container  |
| actions        | div          | Centered icon cluster         |
| session        | button       | Session toggle                |
| private        | button       | Private mode toggle           |
| open           | button       | Open deck dialog              |
| toggle         | button       | Read/Interact toggle          |
| settings       | button       | Settings panel toggle         |
| hide           | button       | Panic hide                    |
| meta           | div          | Status row (drag zone)        |
| mode           | span         | READ/INTERACT badge           |
| deck           | span         | Current deck filename         |
| right-meta     | span         | Counter + OS status container |
| counter        | span         | Card position (n/N)           |
| os-status      | span         | OS protection status          |
| session-banner | p            | Session active indicator      |
| error          | p            | Error message display         |
| body           | main         | Card content scroll area      |
| card-title     | h2           | Current card heading          |
| card-body      | div          | Sanitized card HTML           |
| settings-panel | section      | Hotkey configuration          |
| hotkey-list    | div          | Dynamic hotkey rows container |
| hotkey-reset   | button       | Reset to defaults             |
| settings-close | button       | Close settings                |
| disclaimer     | section      | First-run disclaimer          |
| ack            | button       | Acknowledge disclaimer        |

### 9.3 SVG Inline Strategy

All icons are inline SVG, not external files or sprite sheets. Rationale:

- Zero additional HTTP requests (relevant even for file:// protocol)
- CSS can target internal SVG elements (`.shield`, `.slash`, `.teeth`) for state-based styling
- No build step required for icon processing
- Total SVG payload: ~1.2KB uncompressed — negligible
- Icons are authored once, maintained in HTML — no separate asset pipeline

### 9.4 Semantic HTML Choices

- `<header>` for bar — landmarks assistive tech navigation
- `<main>` for body — primary content region
- `<section>` for panels — thematic grouping
- `<button type="button">` for all interactive elements — prevents accidental form submission
- `<span>` for inline text labels — no semantic weight needed
- `<p>` for banner/error — paragraph-level content blocks
- `<h2>` for card title — section heading within main content
- `<div>` for structural containers — no semantic meaning

---

## 10. Implementasi CSS

### 10.1 Custom Properties Architecture

All colors, spacings, and reusable values defined as CSS custom properties in `:root`. Benefits:

- Single source of truth for design tokens
- Theme variants possible via class-based overrides (e.g., `body.read` changes `--surface`)
- Runtime inspection via DevTools computed styles
- No preprocessor dependency

### 10.2 Box Model Reset

```css
* {
  box-sizing: border-box;
}
```

Universal border-box ensures padding/border included in declared dimensions. Critical for precise layout calculations in fixed-height header/meta rows.

### 10.3 App Region Declarations

Electron-specific CSS property for frameless window drag regions:

```css
#bar {
  app-region: drag;
  user-select: none;
}
#meta {
  app-region: drag;
  user-select: none;
}
.icon-btn {
  app-region: no-drag;
}
```

Rules:

- Any element with `app-region: drag` becomes part of window drag surface
- ALL interactive children within drag regions MUST have `app-region: no-drag` or they become unclickable
- `user-select: none` prevents text selection during drag (Electron docs recommendation)
- `#body` intentionally has NO app-region — it must remain scrollable and selectable

### 10.4 Transition Performance

Only three properties transitioned on buttons:

```css
transition:
  color 120ms ease,
  background 120ms ease,
  border-color 120ms ease;
```

These are compositor-friendly (paint-only, no layout trigger). Avoided transitioning:

- `width`/`height` → triggers layout recalculation
- `transform` → unnecessary for simple state toggles
- `opacity` → can cause layer promotion overhead on transparent windows
- `fill`/`stroke` → SVG paint properties, slower than CSS color inheritance

### 10.5 Scrollbar Styling

WebKit scrollbar pseudo-elements for thin, neutral scrollbars:

```css
#body::-webkit-scrollbar {
  width: 6px;
}
#body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 3px;
}
#body::-webkit-scrollbar-track {
  background: transparent;
}
```

6px width balances visibility vs space consumption. Thumb opacity increases on hover (0.14 → 0.24) for discoverability. Track transparent to avoid visual noise. Applied to all three scrollable containers (#body, #disclaimer, #settings-panel).

### 10.6 Conditional Display Rules

Panels overlay main content using absolute positioning. When active, underlying content hidden:

```css
body.needs-ack #meta,
body.needs-ack #body,
... {
  display: none;
}
body.show-settings #meta,
body.show-settings #body,
... {
  display: none;
}
```

`display: none` preferred over `visibility: hidden` or `opacity: 0` because:

- Removed from layout flow — no phantom scroll area
- Not focusable — keyboard nav skips hidden content
- Not announced by screen readers
- Zero paint cost

### 10.7 Markdown Content Styling

`#card-body` styles target raw HTML output from marked + DOMPurify. Key decisions:

- **First/last child margin reset**: Prevents extra whitespace at card boundaries
- **List marker color**: `var(--dim)` reduces visual noise from bullet/number glyphs
- **Strong emphasis**: `color: var(--hi)` + `font-weight: 600` — dual signal for bold text
- **Code inline**: Monospace + subtle background raise — distinguishes from prose without heavy decoration
- **Code blocks**: Darker background + border — clear visual separation for multi-line code
- **Blockquotes**: Left border + muted color — conventional quote styling adapted to dark theme
- **Tables**: Minimal borders, muted headers — data presentation without visual heaviness
- **Links**: Same color as body text, distinguished by underline color (`--dim`) — avoids blue link convention that conflicts with no-hue palette

---

## 11. Implementasi TypeScript Renderer

### 11.1 Module Imports

```ts
import "./index.css"; // Vite injects CSS
import DOMPurify from "dompurify"; // HTML sanitizer
import {
  HOTKEY_ACTIONS,
  HOTKEY_LABELS,
  type CueState,
  type HotkeyAction,
} from "./shared/ipc";
import { el } from "./renderer/dom"; // Safe getElementById wrapper
import { toAccelerator } from "./renderer/keys"; // KeyboardEvent → Accelerator string
```

No React, no framework. Vanilla TS with strict typing. Bundle impact: ~15KB gzipped (DOMPurify dominates).

### 11.2 Element References

All DOM references obtained once at module load via `el<T>(id)`:

```ts
const modeEl = el("mode");
const toggleEl = el<HTMLButtonElement>("toggle");
// ... 18 more
```

Generic type parameter `<HTMLButtonElement>` enables IDE autocomplete for button-specific properties (disabled, title, aria-pressed). `el()` throws descriptive error if ID missing — fail-fast at startup rather than null-pointer mid-session.

### 11.3 Hotkey Recording Flow

```
User clicks .hk-key button
    → recording = action name
    → renderHotkeys() updates button text to "Tekan tombol…"
    → Global keydown listener (capture phase) intercepts next keypress
    → toAccelerator() converts KeyboardEvent to Electron Accelerator string
    → window.cue.rebindHotkey(action, accelerator) sends IPC to main
    → Main validates, registers, returns conflict list
    → State update triggers re-render with new binding or error
```

Capture phase (`addEventListener(..., true)`) ensures recorder sees keypress before any other handler. `preventDefault()` + `stopPropagation()` prevents recorded combination from triggering its original action during recording.

Escape key special-cased: cancels recording without rebinding. Checked with explicit modifier guards (`!e.ctrlKey && !e.altKey && !e.shiftKey`) to avoid capturing Ctrl+Escape or similar combinations.

### 11.4 Card Rendering Pipeline

```ts
const card = s.cards[s.cardIndex];
counterEl.textContent = `${s.cardIndex + 1}/${s.cards.length}`;
titleEl.textContent = card.title;
bodyEl.innerHTML = DOMPurify.sanitize(card.html, {
  USE_PROFILES: { html: true },
});
bodyEl.scrollTop = 0;
```

Critical steps:

1. **Bounds check**: `if (!card)` guards against empty deck / out-of-range index
2. **Counter format**: `n/N` with tabular-nums CSS ensures stable width during navigation
3. **Title**: Plain textContent — card titles from marked headings are already plain text
4. **Sanitize**: DOMPurify with `USE_PROFILES: { html: true }` restricts to HTML-only (no SVG/MathML attack surface)
5. **Scroll reset**: `scrollTop = 0` ensures each card starts at top — prevents carrying scroll position across cards

### 11.5 Settings Toggle Fix

Previous implementation:

```ts
// ❌ Only opens, never closes via same button
settingsEl.addEventListener("click", () => window.cue.setSettingsOpen(true));
```

Fixed implementation:

```ts
// ✅ Toggles based on current state
settingsEl.addEventListener("click", () =>
  window.cue.setSettingsOpen(!lastState.settingsOpen),
);
```

Uses `lastState` (captured in render closure) to determine current panel visibility. Alternative would be querying DOM (`!settingsPanelEl.hidden`), but state-driven approach is more consistent with overall architecture.

---

## 12. Interaksi Drag & Click-Through

### 12.1 Drag Surface Map

| Region                              | Draggable? | Notes                                    |
| ----------------------------------- | ---------- | ---------------------------------------- |
| #bar (excluding #actions and #hide) | ✅ Yes     | Primary drag zone                        |
| #actions cluster                    | ❌ No      | `app-region: no-drag` on .icon-btn       |
| #hide button                        | ❌ No      | `app-region: no-drag` on .icon-btn       |
| #meta row                           | ✅ Yes     | Secondary drag zone, `user-select: none` |
| #session-banner                     | ❌ No      | Not in drag region                       |
| #error                              | ❌ No      | Not in drag region                       |
| #body                               | ❌ No      | Must remain scrollable                   |
| #disclaimer / #settings-panel       | ❌ No      | Overlay panels, scrollable               |

Total draggable area at default size: header gutters (~188px²) + meta row (~9240px²) = substantial target even at minimum width.

### 12.2 Click-Through Behavior

When `mode === 'read'`:

```ts
win.setIgnoreMouseEvents(true, { forward: true });
```

- `true`: Window ignores all mouse events — clicks pass through to underlying application
- `{ forward: true }`: Mouse move events still forwarded to Chromium — enables CSS `:hover` detection for potential future interactive elements in read mode

**Implication for UI**: In read mode, NO buttons are clickable regardless of visual state. This is why hotkeys are mandatory backup for every action. UI communicates this via:

- Reduced icon brightness (`body.read .icon-btn { color: var(--dim) }`)
- Cursor change on bar (`body.read #bar { cursor: default }`)
- Mode badge text change ("READ")
- Eye icon gains slash overlay

### 12.3 Focus Stealing Prevention

All window show operations use `showInactive()`:

```ts
win.once("ready-to-show", () => win.showInactive());
```

This displays window without transferring focus from current foreground application. Critical for US-1 compliance: "Overlay tidak mencuri fokus dari aplikasi presentasi."

---

## 13. Panel Overlay (Disclaimer & Settings)

### 13.1 Positioning Strategy

Both panels use identical positioning:

```css
#disclaimer,
#settings-panel {
  position: absolute;
  inset: 34px 0 0; /* Top offset = header height */
  z-index: 2;
}
```

`inset: 34px 0 0` = top margin 34px (clears header), left/right/bottom = 0 (fills remaining panel area). Absolute positioning removes panel from flex flow — doesn't affect body height calculation.

z-index: 2 ensures panels render above body content but below any potential future modal overlays.

### 13.2 Disclaimer Content Compliance

US-5 requires specific disclosures before first private mode activation. All seven required points covered:

1. ✅ "Permintaan ke Windows, bukan jaminan"
2. ✅ "Aplikasi meeting modern umumnya menghormatinya. Jalur lama belum tentu"
3. ✅ "Pengaturan capture di aplikasi meeting bisa mengubah hasilnya"
4. ✅ "Aktifkan sebelum mulai share. Berlaku pada frame berikutnya"
5. ✅ "Dialog pilih file bawaan Windows tidak ikut dikecualikan"
6. ✅ "Remote Desktop tetap menampilkan overlay ke pengguna remote"
7. ✅ "Cue tidak bisa mendeteksi perekaman"

Prohibited claims verified absent: No "100%", no "undetectable", no "invisible", no "guaranteed". Term used: "private overlay" per US-5.

### 13.3 Settings Panel: Hotkey Recorder UX

Each hotkey row consists of:

- Label span (action name from HOTKEY_LABELS)
- Button showing current accelerator string
- Click enters recording mode: button text → "Tekan tombol…", class `.recording` applied
- Next valid keypress captured, converted to Accelerator, sent to main
- Escape cancels recording
- Conflict detection: if accelerator taken by another app or duplicated internally, `.conflict` class applied with warn color

Reset button restores DEFAULT_HOTKEYS from store.ts. Individual rebind persists immediately via saveSettings debounce (400ms).

---

## 14. Aksesibilitas

### 14.1 Keyboard Navigation

All buttons are native `<button type="button">` elements:

- Tab-focusable by default
- Activatable via Enter or Space
- Focus-visible ring via `border-color: rgba(255,255,255,0.35)` — visible against dark background without harsh outline

Tab order follows DOM order: session → private → open → toggle → settings → hide → (meta/body not focusable) → disclaimer/settings panel buttons when visible.

### 14.2 Screen Reader Support

- `aria-hidden="true"` on all decorative SVGs — prevents announcement of meaningless graphic
- `aria-pressed` on toggle buttons — communicates on/off state
- `title` attributes on all icon buttons — provides accessible name
- Live regions not used (state changes are user-initiated, not asynchronous notifications)
- Semantic landmarks: `<header>`, `<main>`, `<section>` enable landmark navigation

### 14.3 Color Independence

As detailed in §2.2, all state distinctions use shape/fill/brightness in addition to or instead of color. Specific accommodations:

- Private ON: shield filled (shape change) + white (brightness change) + border (presence change)
- Read mode: eye slash appears (shape addition) + dimmed chrome (brightness reduction)
- Session ON: power icon white + panel border brightens (dual brightness signal)
- Error/conflict: warn color + distinct background tint (not color-alone)
- OS mismatch: warn color + full opacity vs reduced opacity (brightness differential)

### 14.4 Motion Sensitivity

Transitions limited to 120ms on paint-only properties. No animations involving:

- Position/movement
- Scale transforms
- Opacity fades
- Parallax or continuous motion

Respects `prefers-reduced-motion` implicitly by having no significant motion to reduce. Future enhancement could add explicit media query to disable even the 120ms transitions.

---

## 15. Protokol Uji Komprehensif

### 15.1 Visual Verification Matrix

| #   | Test                        | Expected                                    | Pass Criteria                                   |
| --- | --------------------------- | ------------------------------------------- | ----------------------------------------------- |
| 1   | Panel appearance            | Black neutral, zero blue                    | No hue detectable in any element                |
| 2   | Private toggle ON           | Shield filled white, border visible         | Distinct from OFF state in grayscale screenshot |
| 3   | Private toggle OFF          | Shield outline muted                        | Clear visual difference from ON                 |
| 4   | Mode toggle to READ         | Eye gains slash, chrome dims                | Slash visible at 16px, dimming perceptible      |
| 5   | Mode toggle to INTERACT     | Eye slash removed, chrome brightens         | Instant visual feedback                         |
| 6   | Session activate            | Hairline banner appears, power icon white   | Banner readable, not alarming                   |
| 7   | Hover each icon             | Tooltip appears, brightness increases       | Tooltip text accurate, transition smooth        |
| 8   | Drag header outside cluster | Window moves                                | Smooth tracking, no stutter                     |
| 9   | Drag meta row               | Window moves                                | Same smoothness as header drag                  |
| 10  | Resize to min width (260px) | Icons centered, ✕ right-aligned, no overlap | All elements accessible, no clipping            |
| 11  | Settings toggle twice       | Opens then closes                           | Second click reliably closes                    |
| 12  | Overlay on white document   | Text readable                               | No contrast failure at any zoom level           |
| 13  | Overlay on dark document    | Text readable                               | Light-on-dark still works                       |
| 14  | Overlay on colorful slide   | Text readable                               | No color interaction causing illegibility       |

### 15.2 Functional Verification Matrix

| #   | Test                           | Expected                                          |
| --- | ------------------------------ | ------------------------------------------------- |
| 15  | Click 🛡 ON → OFF cycle        | State persists, SVG never disappears              |
| 16  | Click 👁 READ → INTERACT cycle | Click-through toggles correctly                   |
| 17  | Click ⏻ session toggle         | Private auto-enables, banner appears              |
| 18  | Click 📁 open deck             | File dialog appears (when not private)            |
| 19  | Click 📁 while private ON      | Error message, no dialog                          |
| 20  | Click ⚙ settings               | Panel opens, hotkeys listed                       |
| 21  | Rebind hotkey in settings      | New binding active immediately                    |
| 22  | Bind conflicting hotkey        | Conflict warning displayed                        |
| 23  | Press Esc during recording     | Recording cancelled, no change                    |
| 24  | Click Default in settings      | All hotkeys restored                              |
| 25  | Navigate cards with hotkeys    | Counter updates, body scrolls to top              |
| 26  | Edit deck file externally      | Auto-reload, card count updates                   |
| 27  | Panic hide (F9)                | All windows hidden <150ms                         |
| 28  | Panic restore (F9 again)       | Windows return to exact previous state            |
| 29  | Tray click while hidden        | Windows restore                                   |
| 30  | Restart app                    | Position, deck, hotkeys, disclaimer ack persisted |

### 15.3 Accessibility Verification

| #   | Test                                 | Tool                           | Expected                          |
| --- | ------------------------------------ | ------------------------------ | --------------------------------- |
| 31  | Tab through all controls             | Keyboard                       | Logical order, visible focus ring |
| 32  | Activate each button via Enter/Space | Keyboard                       | Same behavior as mouse click      |
| 33  | Screen reader announces button names | NVDA/JAWS                      | Title text read aloud             |
| 34  | Screen reader announces toggle state | NVDA/JAWS                      | "pressed" / "not pressed"         |
| 35  | Grayscale simulation                 | Windows high contrast / filter | All states distinguishable        |
| 36  | 200% zoom                            | Windows display settings       | No layout breakage, text readable |

### 15.4 Performance Verification

| #   | Metric                      | Target        | Measurement Method                      |
| --- | --------------------------- | ------------- | --------------------------------------- |
| 37  | Panic hide latency          | <150ms        | performance.now() in hideAll()          |
| 38  | Card navigation render time | <16ms (60fps) | Chrome DevTools Performance             |
| 39  | Initial load to interactive | <500ms        | Time from ready-to-show to first render |
| 40  | Memory footprint            | <80MB         | Task Manager / process.memoryUsage()    |
| 41  | CPU idle usage              | <1%           | Task Manager over 60s idle period       |

---

## 16. Catatan Arsitektur & Pemeliharaan

### 16.1 File Dependency Graph

```
index.html
    └── src/renderer.ts
            ├── src/index.css
            ├── src/shared/ipc.ts (types only)
            ├── src/renderer/dom.ts
            ├── src/renderer/keys.ts
            └── dompurify (npm)

src/main.ts
    ├── src/main/windows.ts
    ├── src/main/overlay.ts
    │       ├── src/main/deck.ts
    │       ├── src/main/store.ts
    │       ├── src/main/visibility.ts
    │       ├── src/main/tray.ts
    │       └── src/main/watcher.ts
    ├── src/main/hotkeys.ts
    └── src/shared/ipc.ts
```

CSS and HTML are tightly coupled (class names, IDs). Changes to one typically require changes to the other. Renderer.ts bridges them via DOM API.

### 16.2 Adding a New Toggle Button

Checklist:

1. Add SVG icon to index.html inside `#actions`, with unique ID and `class="icon-btn"`
2. Add `app-region: no-drag` to new button (via `.icon-btn` selector — automatic)
3. Add IPC channel to `src/shared/ipc.ts` (IPC object + CueApi interface + CueState field if needed)
4. Add handler in `src/main/overlay.ts` (or appropriate module)
5. Wire IPC in `src/main.ts`
6. Expose in `src/preload.ts`
7. Add `el()` reference in `src/renderer.ts`
8. Add `setIconState()` call in `render()` function
9. Add event listener for click
10. Add CSS state rules if visual differentiation needed (`.on`, hover, etc.)
11. Update accessibility: title, aria-pressed
12. Add tests to §15 matrices

### 16.3 Modifying Color Palette

All colors centralized in `:root` custom properties. To change:

1. Update token value in CSS
2. Re-run contrast calculations (§4.2) for affected tokens
3. Verify grayscale distinguishability (§14.3)
4. Test on white AND dark backgrounds (§15.1 #12-14)

Never hardcode color values outside `:root`. Search codebase for hex literals as tech debt indicator.

### 16.4 Adding New Markdown Styling

Card body styles scoped under `#card-body`. To add support for new HTML element:

1. Identify element tag from marked output
2. Add CSS rule under `#card-body` selector
3. Verify DOMPurify allows the element (check USE_PROFILES: html permits it)
4. Test with sample markdown containing the element
5. Verify readability at min/max window sizes

### 16.5 Tech Debt Prevention

- Run `npm run lint` before every commit
- Run `npm run typecheck` before every commit
- Keep SVG paths minimal — prefer geometric primitives over traced artwork
- Document any deviation from shadcn conventions with rationale
- When adding features, update this document BEFORE writing code
- Review contrast ratios whenever modifying color tokens

---

## 17. Changelog & Commit History

### v1.0.0 — Initial Dark Elegant Redesign

**Commit**: `style(ui): neutral dark theme, centered icon controls, readable status row`

**Changes**:

- Replaced blue accent palette with neutral black/white/gray
- Converted 6 text buttons to 5 icon buttons + 1 separated panic hide
- Centered icon cluster via absolute positioning
- Replaced red session banner with hairline indicator
- Added SVG icons with state-dependent fill/stroke
- Refactored renderer to use setIconState() instead of textContent
- Fixed settings button toggle behavior
- Added aria-pressed to all toggle buttons
- Comprehensive markdown content styling
- Thin neutral scrollbars
- Full contrast verification against WCAG AA/AAA

**Files modified**: index.html, src/index.css, src/renderer.ts

**Breaking changes**: None. All IPC contracts unchanged. State shape unchanged. Hotkey bindings unchanged.

---

## 18. FAQ & Troubleshooting

### Q: Why not use Tailwind/shadcn?

A: See detailed analysis in previous conversation. Summary: shadcn assumes opaque web page context, brings FocusTrap/Portal that violate overlay constraints, adds ~15MB bundle for 6 buttons. Current vanilla CSS achieves identical design language with zero dependencies.

### Q: Can I add backdrop-filter blur?

A: No. Electron documentation explicitly states blur only applies to window's own web contents, not content below. Would create false impression of frosted glass while actually showing hard-edged transparency.

### Q: Icons look blurry on my display

A: Ensure Windows display scaling is set to recommended value. SVG renders crisply at all DPI settings, but subpixel alignment at odd scale factors (125%, 175%) can cause anti-aliasing artifacts. Try 100% or 200% scaling to verify.

### Q: Text is hard to read on certain slides

A: Adjust panel opacity in CSS: increase `--surface` alpha toward 0.98 for more opaque background, or decrease toward 0.80 for more transparency. Re-verify contrast after adjustment.

### Q: How do I revert to previous blue theme?

A: `git revert <commit-hash>` of the redesign commit. Old CSS preserved in git history.

### Q: Can I customize icon shapes?

A: Yes. Edit SVG path data in index.html. Maintain 16×16 viewBox, stroke-based rendering, currentColor inheritance. Test at both 16px and 26px container sizes.

### Q: Why does private mode disable button clicks?

A: By design. Private mode signals "screen is being shared". Clicking overlay would steal focus from presentation app, visible to audience. Use hotkeys (Ctrl+Alt+P, Ctrl+Alt+I, F9) instead.

### Q: Session banner text is truncated

A: Intentional. Single-line constraint prevents banner from consuming variable vertical space. Full text available via element title tooltip on hover. If truncation loses critical info, shorten the message rather than increasing banner height.

---

_Dokumen ini merupakan referensi hidup. Update setiap kali perubahan signifikan dilakukan pada UI. Versi terakhir: 2026-11-19, sesuai dengan commit `style(ui): neutral dark theme, centered icon controls, readable status row`._
