# baileysx

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![WhatsApp Web Protocol](https://img.shields.io/badge/WhatsApp-Multi--Device-25D366?style=flat-square&logo=whatsapp&logoColor=white)](https://web.whatsapp.com/)

High-performance, memory-efficient TypeScript library for direct interaction with WhatsApp Multi-Device Web APIs via WebSocket. Operates completely headless with zero Chromium or Selenium dependencies, consuming minimal system resources (~30-60 MB RAM).

`baileysx` is a production-optimized custom fork of WhiskeySockets Baileys, engineered to restore critical WhatsApp Web features (interactive buttons, lists, group stories, channel status updates), resolve persistent decryption issues, and eliminate reconnect loops through protocol-level stanza handling.

---

## Daftar Isi

1. [Arsitektur & Keunggulan Rekayasa](#arsitektur--keunggulan-rekayasa)
2. [Instalasi](#instalasi)
3. [Memulai Cepat](#memulai-cepat)
   - [Inisialisasi Soket](#inisialisasi-soket)
   - [Autentikasi QR Code](#autentikasi-qr-code)
   - [Autentikasi Pairing Code (8-Digit & Kustom)](#autentikasi-pairing-code-8-digit--kustom)
   - [Siklus Hidup Koneksi (Connection Lifecycle)](#siklus-hidup-koneksi-connection-lifecycle)
4. [Penanganan Pesan (Messaging Guide)](#penanganan-pesan-messaging-guide)
   - [Mendengarkan Pesan Masuk](#mendengarkan-pesan-masuk)
   - [Mengirim Pesan Teks & Mention](#mengirim-pesan-teks--mention)
   - [Mengirim Media (Gambar, Video, Audio, Dokumen, Sticker)](#mengirim-media-gambar-video-audio-dokumen-sticker)
   - [Membalas Pesan (Quoted Message) & Reaksi](#membalas-pesan-quoted-message--reaksi)
   - [Pesan Sekali Lihat (View Once)](#pesan-sekali-lihat-view-once)
5. [Fitur Unggulan baileysx](#fitur-unggulan-baileysx)
   - [Cerita Grup (Group Stories / Group Status)](#1-cerita-grup-group-stories--group-status)
   - [Status Saluran (Newsletter Stories & Status)](#2-status-saluran-newsletter-stories--status)
   - [Pesan Interaktif & Native Buttons](#3-pesan-interaktif--native-buttons)
   - [Meta AI Formatting & Verified Star Badge](#4-meta-ai-formatting--verified-star-badge)
   - [Manajemen Panggilan (Voice & Video Calls)](#5-manajemen-panggilan-voice--video-calls)
   - [Penyimpanan Dalam Memori (In-Memory Store)](#6-penyimpanan-dalam-memori-in-memory-store)
   - [Stabilitas Koneksi & Anti-Disconnect](#7-stabilitas-koneksi--anti-disconnect)
6. [Manajemen Grup & Saluran](#manajemen-grup--saluran)
   - [Operasi Grup](#operasi-grup)
   - [Operasi Saluran (Newsletter)](#operasi-saluran-newsletter)
7. [Referensi Konfigurasi (SocketConfig)](#referensi-konfigurasi-socketconfig)
8. [Lisensi & Disclaimer](#lisensi--disclaimer)

---

## Arsitektur & Keunggulan Rekayasa

`baileysx` dirancang untuk sistem backend, mikroservis, dan automasi berskala produksi yang membutuhkan throughput tinggi dan latensi rendah:

- **Zero Chromium Dependency**: Berkomunikasi langsung menggunakan koneksi WebSocket terenkripsi Noise protocol ke kluster server WhatsApp. Tidak memerlukan browser headless, menghemat 85%+ pemakaian CPU dan memori dibandingkan Puppeteer/Playwright.
- **Dual-Module Support**: Mendukung interoperabilitas penuh antara format **CommonJS (CJS)** (`require('baileysx')`) dan **ECMAScript Modules (ESM)** (`import ... from 'baileysx'`) tanpa duplikasi instance runtime ProtoBuf (`$root.proto`).
- **WhatsApp Rust Bridge**: Menggunakan binding native Rust untuk komputasi kriptografi tingkat rendah, hashing AppState, dan sinkronisasi kunci sesi secara deterministik.
- **Dynamic LID-to-PN Resolution**: Menyimpan dan memetakan LID (LID ID internal WhatsApp) ke Phone Number (PN) secara transparan di memori, mengeliminasi delay dekripsi `"Menunggu pesan ini... / Waiting for this message"` pada obrolan privat 1-on-1.
- **Fast Resend Backoff**: Mempercepat siklus placeholder message resend dari 2000 ms menjadi **100 ms**, serta menurunkan ambang batas deteksi offline perangkat primer dari 8 detik menjadi **5 detik**.

---

## Instalasi

Pasang paket langsung dari GitHub repository:

```bash
# Menggunakan NPM
npm install github:zansxdev/baileysx

# Menggunakan Yarn
yarn add github:zansxdev/baileysx

# Menggunakan PNPM
pnpm add github:zansxdev/baileysx
```

### Dependensi Pendukung

Untuk menangani logging dan scanning QR terminal:

```bash
npm install pino qrcode-terminal
```

---

## Memulai Cepat

### Inisialisasi Soket

Berikut adalah pola standar untuk menginisialisasi soket dengan manajemen kredensial multi-file (`useMultiFileAuthState`):

```typescript
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from 'baileysx'
import pino from 'pino'

async function startSock() {
    // 1. Inisialisasi state autentikasi berbasis direktori lokal
    const { state, saveCreds } = await useMultiFileAuthState('./auth_session')

    // 2. Dapatkan versi protokol WhatsApp Web terbaru
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Menggunakan WA versi v${version.join('.')}, isLatest: ${isLatest}`)

    // 3. Konfigurasi koneksi soket
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false, // Set false jika menggunakan pairing code
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true
    })

    // 4. Simpan pembaruan kredensial secara otomatis
    sock.ev.on('creds.update', saveCreds)

    return sock
}
```

### Autentikasi QR Code

Jika Anda ingin menampilkan QR Code di terminal:

```typescript
import qrcode from 'qrcode-terminal'

sock.ev.on('connection.update', (update) => {
    const { qr } = update
    if (qr) {
        console.log('Pindai QR Code berikut menggunakan aplikasi WhatsApp:')
        qrcode.generate(qr, { small: true })
    }
})
```

### Autentikasi Pairing Code (8-Digit & Kustom)

Metode Companion Pairing Code memungkinkan login tanpa perlu scan kamera. `baileysx` menambahkan parameter opsional untuk kustomisasi kode pairing 8 karakter:

```typescript
const sock = makeWASocket({
    auth: { creds: state.creds, keys: state.keys },
    printQRInTerminal: false
})

if (!sock.authState.creds.registered) {
    const phoneNumber = '6281234567890' // Nomor internasional tanpa simbol '+'
    
    // Opsi A: Pairing code acak standar WhatsApp (8 digit)
    const code = await sock.requestPairingCode(phoneNumber)
    console.log(`Kode Pairing Anda: ${code}`)

    // Opsi B: Custom Pairing Code (wajib tepat 8 karakter alfabet/angka)
    // const customCode = await sock.requestPairingCode(phoneNumber, 'ZANSXDEV')
    // console.log(`Kode Pairing Kustom Anda: ${customCode}`)
}
```

### Siklus Hidup Koneksi (Connection Lifecycle)

Tangani status koneksi, pemutusan sementara, dan rekoneksi otomatis dengan memeriksa status koneksi pada event `connection.update`:

```typescript
import { Boom } from '@hapi/boom'
import { DisconnectReason } from 'baileysx'

sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        console.log(`Koneksi terputus (Status: ${statusCode}). Mencoba menghubungkan kembali: ${shouldReconnect}`)

        if (shouldReconnect) {
            startSock() // Rekoneksi soket
        } else {
            console.log('Sesi telah keluar (logged out). Hapus direktori auth_session dan scan ulang.')
        }
    } else if (connection === 'open') {
        console.log('Koneksi soket WhatsApp berhasil terhubung.')
    }
})
```

---

## Penanganan Pesan (Messaging Guide)

### Mendengarkan Pesan Masuk

Event `messages.upsert` memancarkan semua pesan baru yang diterima atau disinkronkan:

```typescript
sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
        // Abaikan pesan tanpa isi atau pesan status lama
        if (!msg.message || msg.key.fromMe) continue

        const sender = msg.key.remoteJid
        const messageText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            ''

        console.log(`Pesan diterima dari ${sender}: ${messageText}`)
    }
})
```

### Mengirim Pesan Teks & Mention

```typescript
// Pesan teks standar
await sock.sendMessage(jid, { text: 'Halo dari BaileysX!' })

// Pesan dengan mention pengguna
await sock.sendMessage(jid, {
    text: 'Halo @6281234567890, silakan periksa berkas Anda.',
    mentions: ['6281234567890@s.whatsapp.net']
})
```

### Mengirim Media (Gambar, Video, Audio, Dokumen, Sticker)

`baileysx` mendukung input media melalui path file, URL, Buffer memory, atau readable stream:

```typescript
import fs from 'fs'

// 1. Gambar dengan caption
await sock.sendMessage(jid, {
    image: { url: 'https://example.com/banner.png' },
    caption: 'Katalog Produk Terbaru'
})

// 2. Video
await sock.sendMessage(jid, {
    video: fs.readFileSync('./demo.mp4'),
    caption: 'Cuplikan Video Presentasi',
    gifPlayback: false
})

// 3. Audio / Voice Note (PTT)
await sock.sendMessage(jid, {
    audio: fs.readFileSync('./audio.mp3'),
    mimetype: 'audio/mp4',
    ptt: true // Dikirim sebagai Pesan Suara / VN (gelombang suara)
})

// 4. Dokumen PDF
await sock.sendMessage(jid, {
    document: fs.readFileSync('./report.pdf'),
    mimetype: 'application/pdf',
    fileName: 'Laporan_Keuangan.pdf'
})

// 5. Sticker WebP
await sock.sendMessage(jid, {
    sticker: fs.readFileSync('./sticker.webp')
})
```

### Membalas Pesan (Quoted Message) & Reaksi

```typescript
// Membalas pesan spesifik
await sock.sendMessage(
    jid,
    { text: 'Pesan ini adalah balasan resmi.' },
    { quoted: targetMessage }
)

// Mengirim reaksi emoji
await sock.sendMessage(jid, {
    react: {
        text: '👍', // Emoji reaksi (atau string kosong '' untuk mencabut reaksi)
        key: targetMessage.key
    }
})

// Menghapus pesan untuk semua orang (Delete for Everyone)
await sock.sendMessage(jid, { delete: targetMessage.key })
```

### Pesan Sekali Lihat (View Once)

```typescript
await sock.sendMessage(jid, {
    image: fs.readFileSync('./secret.jpg'),
    caption: 'Foto ini hanya dapat dilihat sekali.',
    viewOnce: true
})
```

---

## Fitur Unggulan baileysx

### 1. Cerita Grup (Group Stories / Group Status)

WhatsApp memperkenalkan fitur status berbasis grup tempat anggota dapat membagikan cerita (*story*) yang hanya terlihat oleh anggota grup tertentu. Di `baileysx`, Anda dapat mengirim status teks, gambar, atau video langsung ke segmen cerita grup.

```typescript
const groupJid = '120363012345678901@g.us'

// A. Mengirim Status Teks ke Grup
await sock.sendMessage(groupJid, {
    groupStatusMessage: {
        text: 'Pengumuman Cerita Grup: Pertemuan tim akan dimulai pukul 14:00 WIB.'
    }
})

// B. Mengirim Cerita Media (Gambar) ke Grup dengan opsi groupStatus
await sock.sendMessage(
    groupJid,
    {
        image: fs.readFileSync('./announcement.jpg'),
        caption: 'Poster Agenda Kegiatan Mingguan',
        groupStatus: true
    }
)

// C. Mengirim Cerita Video ke Grup
await sock.sendMessage(
    groupJid,
    {
        video: fs.readFileSync('./highlight.mp4'),
        caption: 'Dokumentasi Rapat Kerja',
        groupStatus: true
    }
)

// D. Membatasi audiens cerita grup ke anggota tertentu (statusJidList)
await sock.sendMessage(
    groupJid,
    {
        text: 'Cerita khusus koordinator divisi.',
        groupStatus: true
    },
    {
        statusJidList: [
            '6281234567890@s.whatsapp.net',
            '6289876543210@s.whatsapp.net'
        ]
    }
)
```

### 2. Status Saluran (Newsletter Stories & Status)

WhatsApp Newsletter (Saluran) kini mendukung penerbitan cerita/status saluran mandiri. `baileysx` menyediakan serangkaian method asli pada instance soket:

```typescript
const newsletterJid = '120363123456789012@newsletter'

// 1. Periksa apakah akun memiliki izin menerbitkan status di saluran
const capability = await sock.newsletterCanPostStatus(newsletterJid)
console.log('Izin Post Status:', capability.canPost) // true jika CHANNEL_STATUS_PRODUCER aktif

// 2. Terbitkan Status Teks ke Saluran
const textStatus = await sock.sendNewsletterStatus(newsletterJid, {
    text: 'Pembaruan Saluran: Fitur baru telah dirilis hari ini!'
})
console.log('Status Terkirim dengan Server ID:', textStatus.newsletterStatusServerId)

// 3. Terbitkan Status Media (Gambar/Video) ke Saluran
const mediaStatus = await sock.sendNewsletterStatus(newsletterJid, {
    image: { url: 'https://example.com/cover.jpg' },
    caption: 'Pengumuman Resmi Saluran'
})

// 4. Ambil Daftar Status Terbaru dari Saluran
const statusList = await sock.getNewsletterStatuses(newsletterJid, { count: 10 })
for (const entry of statusList.statuses) {
    console.log(`Status ID: ${entry.id}, Server ID: ${entry.serverId}, Views: ${entry.viewsCount}`)
}

// 5. Berikan Reaksi ke Status Saluran
await sock.sendNewsletterStatusReaction(newsletterJid, {
    messageId: textStatus.key.id,
    parentServerId: textStatus.newsletterStatusServerId,
    reaction: '🔥'
})

// 6. Hapus / Tarik Status Saluran (Admin Revoke)
await sock.revokeNewsletterStatus(newsletterJid, textStatus.key.id)
```

### 3. Pesan Interaktif & Native Buttons

`baileysx` merestorasi fungsionalitas pesan tombol dan interaktif modern WhatsApp (Native Flow) yang telah dihapus di pustaka resmi. Struktur XML `<biz>` dan pembungkus `viewOnceMessage` secara otomatis diterapkan agar tombol dapat ditampilkan pada Android, iOS, dan Web:

```typescript
// Mengirim tombol aksi cepat (Quick Reply, CTA URL, dan CTA Copy)
await sock.sendMessage(jid, {
    text: 'Pilih salah satu menu di bawah ini untuk melanjutkan:',
    footer: 'Antarmuka Otomatis BaileysX',
    buttons: [
        {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: 'Cek Status Layanan',
                id: 'btn_check_status'
            })
        },
        {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: 'Kunjungi Dokumentasi',
                url: 'https://github.com/zansxdev/baileysx'
            })
        },
        {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text: 'Salin Perintah Instalasi',
                copy_code: 'npm install github:zansxdev/baileysx'
            })
        }
    ]
})
```

### 4. Meta AI Formatting & Verified Star Badge

WhatsApp menampilkan badge verifikasi bintang ungu pada pesan yang direspons oleh Meta AI. `baileysx` menyediakan integrasi penuh untuk menghasilkan stilisasi Meta AI melalui stanza `<biz_bot>` dan `forwardedAiBotMessageInfo`:

```typescript
// A. Kirim pesan dengan badge Meta AI bawaan
await sock.sendMessage(
    jid,
    { text: 'Halo! Saya asisten virtual cerdas Anda.' },
    { ai: true }
)

// B. Personalisasi Nama Bot AI pada Badge
await sock.sendMessage(
    jid,
    { text: 'Analisis data Anda telah selesai diproses.' },
    {
        ai: 'ZansX Intelligence', // Nama bot yang ditampilkan pada badge
        aiBotJid: '867051314767696@bot'
    }
)

// C. Mengaktifkan/Menonaktifkan format AI secara global saat koneksi soket
const sock = makeWASocket({
    auth: state,
    aiChat: true // Aktif secara default di BaileysX
})
```

### 5. Manajemen Panggilan (Voice & Video Calls)

`baileysx` mendukung inisiasi, pembatalan, dan penolakan panggilan suara maupun video secara terprogram:

```typescript
const targetJid = '6281234567890@s.whatsapp.net'

// 1. Memulai Panggilan Suara (Audio Call)
const callSession = await sock.offerCall(targetJid, false)
console.log(`Panggilan keluar dimulai dengan Call ID: ${callSession.id}`)

// 2. Memulai Panggilan Video (Video Call)
// const videoCallSession = await sock.offerCall(targetJid, true)

// 3. Mengakhiri / Membatalkan Panggilan
await sock.terminateCall(callSession.id, targetJid)

// 4. Menolak Panggilan Masuk Otomatis (Event Listener 'call')
sock.ev.on('call', async (calls) => {
    for (const call of calls) {
        if (call.status === 'offer') {
            console.log(`Panggilan masuk dari ${call.from}, otomatis menolak...`)
            await sock.rejectCall(call.id, call.from)
        }
    }
})
```

### 6. Penyimpanan Dalam Memori (In-Memory Store)

Untuk memfasilitasi pencarian pesan, sinkronisasi kontak, dan data obrolan tanpa database eksternal yang lambat, `baileysx` menyertakan in-memory store berbasis struktur data `KeyedDB`:

```typescript
import { makeInMemoryStore } from 'baileysx'

// Inisialisasi store dengan batas riwayat pesan per obrolan
const store = makeInMemoryStore({
    maxMessagesPerChat: 50,
    filterSpam: true
})

// Muat data yang tersimpan sebelumnya jika ada
store.readFromFile('./baileys_store.json')

// Simpan data memori ke berkas JSON setiap 15 detik secara berkala
store.writeToFileInterval('./baileys_store.json', 15_000)

// Hubungkan store dengan event emitter soket
store.bind(sock.ev)

// Contoh: Mengambil pesan lama berdasarkan ID obrolan dan ID pesan
const cachedMsg = await store.loadMessage(jid, '3EB0ABC123DEF')
console.log('Pesan dari cache:', cachedMsg?.message)
```

### 7. Stabilitas Koneksi & Anti-Disconnect

`baileysx` mengimplementasikan serangkaian patch protokol untuk menjaga soket tetap aktif dalam durasi panjang di server VPS atau container:

- **Top-Level Status Auto-Ack**: Stanza `<status>` tingkat atas yang masuk dari server WhatsApp di-ACK secara otomatis sebelum memicu timeout handshake `stream:error`.
- **Anti Reconnect-Loop**: Mengisolasi error dekripsi sesi tanpa merusak rantai enkripsi Signal, mencegah siklus disconnect-reconnect berulang saat ada pesan rusak.
- **Privacy Token Auto-Renewal**: Mendeteksi dan memperbarui token privasi (`tcToken`) saat berinteraksi dengan kontak bisnis baru untuk menghindari galat penolakan pesan (HTTP 463).

---

## Manajemen Grup & Saluran

### Operasi Grup

```typescript
// 1. Membuat Grup Baru
const group = await sock.groupCreate('Grup Diskusi Pengembang', [
    '6281234567890@s.whatsapp.net',
    '6289876543210@s.whatsapp.net'
])
console.log(`Grup dibuat: ${group.id}`)

// 2. Memperbarui Partisipan (Tambah, Keluarkan, Naikkan Admin, Turunkan Admin)
await sock.groupParticipantsUpdate(group.id, ['6281234567890@s.whatsapp.net'], 'promote') // Menjadi Admin
await sock.groupParticipantsUpdate(group.id, ['6289876543210@s.whatsapp.net'], 'remove')  // Dikeluarkan

// 3. Mengubah Setelan Izin Grup (Hanya admin yang dapat mengirim pesan)
await sock.groupSettingUpdate(group.id, 'announcement')

// 4. Mengambil Tautan Undangan Grup
const inviteCode = await sock.groupInviteCode(group.id)
console.log(`Tautan Undangan: https://chat.whatsapp.com/${inviteCode}`)
```

### Operasi Saluran (Newsletter)

```typescript
// 1. Membuat Saluran Baru
const channel = await sock.newsletterCreate('Kanal Pembaruan Resmi', 'Saluran informasi seputar rilis software.')
console.log(`Saluran berhasil dibuat: ${channel.id}`)

// 2. Mengambil Metadata Saluran
const metadata = await sock.newsletterMetadata('jid', channel.id)
console.log(`Nama: ${metadata.name}, Pelanggan: ${metadata.subscribers}`)

// 3. Mengikuti / Berhenti Mengikuti Saluran
await sock.newsletterFollow(channel.id)
await sock.newsletterUnfollow(channel.id)

// 4. Membisukan Notifikasi Saluran
await sock.newsletterMute(channel.id)
```

---

## Referensi Konfigurasi (SocketConfig)

Daftar opsi konfigurasi soket utama saat memanggil `makeWASocket(config)`:

| Opsi | Tipe | Nilai Default | Penjelasan |
| :--- | :--- | :--- | :--- |
| `auth` | `AuthenticationState` | **Wajib** | Objek kredensial dan keys yang dikembalikan dari `useMultiFileAuthState`. |
| `version` | `WAVersion` | `[2, 3000, ...]` | Versi protokol WhatsApp Web yang disimulasikan. Dapatkan via `fetchLatestBaileysVersion()`. |
| `logger` | `Logger` | `pino` | Instance logger Pino untuk debugging internal soket. |
| `aiChat` | `boolean` | `true` | Mengaktifkan penyisipan format stanza Meta AI (`biz_bot: '1'`) pada pesan obrolan privat. |
| `aiBotName` | `string` | `undefined` | Nama tampilan kustom untuk forwarder Meta AI pada obrolan. |
| `bypassViewOnce` | `boolean` | `false` | Secara otomatis memproses pesan view-once seperti media biasa. |
| `syncFullHistory` | `boolean` | `false` | Menentukan apakah soket harus menyinkronkan seluruh riwayat obrolan lawas saat login. |
| `markOnlineOnConnect` | `boolean` | `true` | Mengirim pembaruan kehadiran online otomatis begitu koneksi soket terbentuk. |
| `generateHighQualityLinkPreview`| `boolean`| `false` | Menghasilkan gambar thumbnail pratinjau tautan beresolusi tinggi. |
| `connectTimeoutMs` | `number` | `20000` | Waktu tunggu batas maksimal koneksi WebSocket sebelum dianggap timeout. |
| `keepAliveIntervalMs` | `number` | `30000` | Interval ping/pong heartbeat untuk menjaga koneksi soket tetap aktif. |
| `getMessage` | `Function` | `undefined` | Fungsi handler pencarian pesan lawas berdasarkan key; penting untuk fungsi retry dekripsi. |

---

## Lisensi & Disclaimer

- Pustaka ini dilisensikan di bawah **[MIT License](LICENSE)**.
- **Pernyataan Penafian**: Proyek ini tidak berafiliasi, didukung, disponsori, atau disetujui secara resmi oleh WhatsApp Inc., Meta Platforms, Inc., atau entitas terafiliasi lainnya. Nama, merek, dan logo WhatsApp adalah merek dagang terdaftar milik pemiliknya masing-masing. Gunakan pustaka ini secara etis dan patuhi Ketentuan Layanan WhatsApp.
