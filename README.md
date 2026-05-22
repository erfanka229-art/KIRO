# Auto Answer Ujian dengan Groq AI

Script untuk menjawab soal ujian secara otomatis menggunakan AI (Groq API dengan model LLaMA 3).

## 📁 File

| File | Keterangan |
|------|------------|
| `auto-answer-console.js` | Script utama auto-answer |
| `debug-selector.js` | Script untuk debug dan analisis struktur halaman |

## 🚀 Cara Penggunaan

### 1. Dapatkan API Key Groq

1. Kunjungi: https://console.groq.com/keys
2. Login atau buat akun
3. Buat API Key baru
4. Copy API Key

### 2. Konfigurasi Script

1. Buka file `auto-answer-console.js`
2. Ganti `YOUR_GROQ_API_KEY_HERE` dengan API Key Anda:

```javascript
const CONFIG = {
    API_KEY: 'gsk_xxxxxxxxxxxxxx', // API Key Groq Anda
    // ...
};
```

### 3. Jalankan Script

#### Langkah-langkah:
1. Buka halaman ujian di browser
2. Buka Developer Tools:
   - Chrome/Edge: Tekan `F12` atau `Ctrl+Shift+I`
   - Firefox: Tekan `F12`
3. Pilih tab **Console**
4. Copy seluruh isi `auto-answer-console.js`
5. Paste ke Console dan tekan **Enter**

### 4. Debug Jika Tidak Berhasil

Jika script tidak dapat menemukan soal:

1. Jalankan `debug-selector.js` di Console
2. Perhatikan output untuk memahami struktur halaman
3. Sesuaikan selector di `auto-answer-console.js`

## ⚙️ Konfigurasi

| Parameter | Default | Keterangan |
|-----------|---------|------------|
| `API_KEY` | - | API Key Groq Anda |
| `MODEL` | `llama-3.3-70b-versatile` | Model AI yang digunakan |
| `DELAY_BETWEEN_QUESTIONS` | 2000 | Delay antar soal (ms) |
| `TEMPERATURE` | 0.3 | Kreativitas AI (rendah = lebih konsisten) |

### Model Tersedia di Groq:
- `llama-3.3-70b-versatile` - Terbaik untuk jawaban akurat
- `llama-3.1-8b-instant` - Lebih cepat
- `mixtral-8x7b-32768` - Alternatif bagus

## ⚠️ Penting

1. **Periksa Jawaban**: Selalu periksa jawaban sebelum submit
2. **Rate Limit**: Groq memiliki batas request per menit
3. **Bukan Jaminan**: AI bisa salah, gunakan sebagai bantuan
4. **Risiko**: Gunakan dengan bijak dan bertanggung jawab

## 🔧 Troubleshooting

### Error: "API Key belum dikonfigurasi"
- Pastikan sudah mengganti `YOUR_GROQ_API_KEY_HERE`

### Error: "Tidak dapat menemukan soal"
- Jalankan `debug-selector.js`
- Sesuaikan selector dengan struktur halaman ujian Anda

### Error: "API Error: ..."
- Cek koneksi internet
- Pastikan API Key valid
- Cek rate limit di dashboard Groq

## 📝 Menyesuaikan Selector

Jika struktur halaman ujian berbeda, edit fungsi `parseQuestions()`:

```javascript
// Contoh: Jika soal ada di dalam <div class="question-item">
const questionElements = document.querySelectorAll('.question-item');

// Contoh: Jika soal ada di <table> dengan id tertentu
const questionElements = document.querySelectorAll('table#soalUjian tr');

// Contoh: Jika pilihan ada di <label>
const labels = elem.querySelectorAll('label');
```

## 🔗 Link

- Groq Console: https://console.groq.com/
- Groq Docs: https://console.groq.com/docs

---
**Dibuat dengan ❤️ menggunakan Kiro AI**
