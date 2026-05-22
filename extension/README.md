# 🤖 Auto Answer Ujian Gunadarma - Chrome Extension

Extension ini otomatis menjawab soal ujian di semesterpendek.gunadarma.ac.id menggunakan Groq AI.
Panel mengambang tetap ada walau halaman refresh.

---

## 📦 Cara Install Extension

### Langkah 1 - Download
1. Download / clone repo ini
2. Masuk ke folder `extension/`

> **Catatan:** File `icon.png` dibutuhkan. Karena repo ini menggunakan `icon.svg`,
> Anda bisa rename menjadi `icon.png` atau buat file PNG 128x128 dengan nama `icon.png`.
> Atau gunakan file PNG apapun dan rename jadi `icon.png`.

### Langkah 2 - Install di Chrome
1. Buka Chrome → ketik di address bar: `chrome://extensions/`
2. Aktifkan **Developer mode** (pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `extension/` ini
5. Extension terpasang! ✅

### Langkah 3 - Set API Key
1. Klik ikon 🤖 di toolbar Chrome
2. Masukkan **Groq API Key** Anda
   - Dapatkan gratis di: https://console.groq.com/keys
3. Centang **Auto Mode** jika ingin otomatis jawab + simpan
4. Klik **Simpan Setting**
5. Klik **Test API Key** untuk verifikasi

---

## 🚀 Cara Pakai

1. Buka halaman ujian: https://semesterpendek.gunadarma.ac.id
2. Login dan mulai ujian
3. Panel mengambang 🤖 otomatis muncul di kanan atas
4. Klik **▶ Jawab** untuk jawab soal saat ini
5. Atau aktifkan **🔄 Auto** untuk otomatis jawab + simpan + pindah soal

---

## ✨ Fitur

- ✅ Panel mengambang - **tidak hilang walau halaman refresh**
- ✅ Bisa di-drag ke mana saja
- ✅ Mode Manual: jawab tapi kamu yang klik Simpan
- ✅ Mode Auto: jawab + klik Simpan otomatis
- ✅ API Key tersimpan permanen di browser storage
- ✅ Tidak perlu paste script ulang setiap soal

---

## ⚠️ Catatan

- Pastikan koneksi internet aktif (untuk Groq API)
- AI bisa salah - cek jawaban sebelum soal berikutnya
- Groq gratis hingga batas tertentu per hari
