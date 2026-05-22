/**
 * ============================================
 * AUTO ANSWER UJIAN GUNADARMA - CONSOLE SCRIPT
 * Menggunakan Groq API (LLaMA 3)
 * ============================================
 *
 * CARA PAKAI:
 * 1. Buka halaman ujian
 * 2. F12 -> Console
 * 3. Paste script ini SEKALI di awal ujian
 * 4. Script akan otomatis berjalan di setiap soal
 *    (karena menggunakan sessionStorage, tetap aktif walau halaman refresh)
 *
 * GANTI API_KEY di bawah sebelum dijalankan!
 * Dapatkan di: https://console.groq.com/keys
 */

(async function GunadarmaAutoAnswer() {

    // ==================== KONFIGURASI ====================
    const API_KEY = 'MASUKKAN_API_KEY_GROQ_ANDA_DISINI'; // <-- GANTI INI
    const MODEL   = 'llama-3.3-70b-versatile';
    const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

    // ==================== CEK API KEY ====================
    if (API_KEY === 'MASUKKAN_API_KEY_GROQ_ANDA_DISINI') {
        alert('❌ Ganti dulu API_KEY di dalam script!\nDapatkan di: https://console.groq.com/keys');
        return;
    }

    // Simpan API key ke sessionStorage supaya tetap ada setelah refresh
    sessionStorage.setItem('groq_api_key', API_KEY);

    const KEY = sessionStorage.getItem('groq_api_key');

    console.log('%c🚀 AUTO ANSWER GUNADARMA AKTIF', 'color:green;font-size:16px;font-weight:bold');

    // ==================== BACA SOAL DARI DOM ====================
    // Halaman Gunadarma: soal ada sebagai teks biasa di halaman
    // Pilihan ada sebagai radio button
    // Tidak perlu copy teks - langsung baca dari DOM

    function getSoal() {
        // Ambil semua teks yang terlihat, cari teks soal
        // Biasanya soal ada di dalam <td> atau <div> setelah "PILIHLAH JAWABAN"
        let soalText = '';

        // Coba berbagai selector untuk teks soal
        const selectors = [
            'td[style*="font"]',
            '.soal',
            'span[style*="color"]',
            'p',
            'td',
            'div'
        ];

        for (const sel of selectors) {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
                const t = el.innerText?.trim();
                // Soal biasanya kalimat panjang, bukan label pendek
                if (t && t.length > 20 && t.length < 500 &&
                    !t.includes('Simpan') && !t.includes('WAKTU') &&
                    !t.includes('PILIHLAH') && !t.includes('Pass')) {
                    soalText = t;
                    break;
                }
            }
            if (soalText) break;
        }

        // Fallback: ambil semua teks visible dari body, filter bagian soal
        if (!soalText) {
            const allText = document.body.innerText;
            const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
                if (line.length > 30 && line.length < 400 &&
                    !line.includes('WAKTU') && !line.includes('Simpan') &&
                    !line.includes('PILIHLAH') && !line.includes('Pass')) {
                    soalText = line;
                    break;
                }
            }
        }

        return soalText;
    }

    function getPilihan() {
        // Ambil semua radio button dan label pilihan
        const radios = document.querySelectorAll('input[type="radio"]');
        const pilihan = [];

        radios.forEach((radio, i) => {
            let labelText = '';

            // Cari label dari atribut for
            if (radio.id) {
                const lbl = document.querySelector(`label[for="${radio.id}"]`);
                if (lbl) labelText = lbl.innerText?.trim();
            }

            // Cari dari parent element
            if (!labelText) {
                let parent = radio.parentElement;
                while (parent && !labelText) {
                    const t = parent.innerText?.replace(/\s+/g, ' ').trim();
                    if (t && t.length > 1 && t.length < 200) {
                        // Hapus teks dari child input
                        labelText = t;
                    }
                    parent = parent.parentElement;
                    if (parent?.tagName === 'TABLE') break;
                }
            }

            // Cari dari nextSibling
            if (!labelText) {
                let sib = radio.nextSibling;
                while (sib) {
                    const t = sib.textContent?.trim();
                    if (t && t.length > 1) { labelText = t; break; }
                    sib = sib.nextSibling;
                }
            }

            // Bersihkan teks dari label lain
            labelText = labelText.replace(/\s+/g, ' ').trim();

            pilihan.push({
                radio,
                text: labelText || `Pilihan ${i + 1}`,
                value: radio.value,
                index: i
            });
        });

        return pilihan;
    }

    function getTombolSimpan() {
        // Cari tombol "Simpan dan pindah ke Soal Berikutnya"
        const buttons = document.querySelectorAll('input[type="button"], button, a, input[type="submit"]');
        for (const btn of buttons) {
            const t = (btn.value || btn.innerText || btn.textContent || '').toLowerCase();
            if (t.includes('simpan') || t.includes('berikutnya') || t.includes('next')) {
                return btn;
            }
        }
        return null;
    }

    // ==================== GROQ API ====================
    async function tanyaGroq(soal, pilihan) {
        const pilihanText = pilihan.map((p, i) =>
            `${String.fromCharCode(65 + i)}. ${p.text}`
        ).join('\n');

        const prompt = `Anda adalah ahli yang menjawab soal ujian. Jawab dengan singkat dan tepat.

SOAL: ${soal}

PILIHAN:
${pilihanText}

Balas HANYA dengan format: JAWABAN: [HURUF]
Contoh: JAWABAN: A`;

        const res = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: 'Jawab soal pilihan ganda. Format: JAWABAN: [HURUF]' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 50,
                temperature: 0.1
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || res.statusText);
        }

        const data = await res.json();
        return data.choices[0].message.content.trim();
    }

    function extractHuruf(aiResponse) {
        const match = aiResponse.match(/JAWABAN\s*:\s*([A-E])/i);
        if (match) return match[1].toUpperCase();
        // Fallback: cari huruf sendirian
        const m2 = aiResponse.match(/^[A-E]$/im);
        if (m2) return m2[0].toUpperCase();
        return null;
    }

    // ==================== MAIN ====================
    async function main() {
        console.log('🔍 Membaca soal dari halaman...');

        const soal = getSoal();
        const pilihan = getPilihan();
        const tombol = getTombolSimpan();

        if (!soal) {
            console.warn('⚠️ Soal tidak terdeteksi. Coba jalankan lagi setelah halaman penuh load.');
            return;
        }

        console.log('❓ SOAL:', soal);
        console.log('📋 PILIHAN:');
        pilihan.forEach((p, i) => {
            console.log(`   ${String.fromCharCode(65 + i)}. ${p.text}`);
        });

        if (pilihan.length === 0) {
            console.warn('⚠️ Pilihan jawaban tidak ditemukan!');
            return;
        }

        // Tanya AI
        console.log('\n🤖 Menghubungi Groq AI...');
        let aiResponse;
        try {
            aiResponse = await tanyaGroq(soal, pilihan);
            console.log('💬 AI menjawab:', aiResponse);
        } catch (e) {
            console.error('❌ Error Groq:', e.message);
            return;
        }

        const huruf = extractHuruf(aiResponse);
        if (!huruf) {
            console.warn('⚠️ Tidak bisa ekstrak jawaban dari:', aiResponse);
            return;
        }

        const idx = huruf.charCodeAt(0) - 65;
        const pilihIni = pilihan[idx];

        if (!pilihIni) {
            console.warn('⚠️ Index jawaban di luar range');
            return;
        }

        console.log(`\n✅ Memilih: ${huruf}. ${pilihIni.text}`);

        // Klik radio button
        pilihIni.radio.click();
        pilihIni.radio.checked = true;

        // Trigger event agar halaman tahu pilihan berubah
        pilihIni.radio.dispatchEvent(new Event('change', { bubbles: true }));
        pilihIni.radio.dispatchEvent(new Event('click', { bubbles: true }));

        // Tunggu sebentar lalu klik simpan
        console.log('⏳ Menunggu 1.5 detik lalu klik Simpan...');
        await new Promise(r => setTimeout(r, 1500));

        if (tombol) {
            console.log('💾 Klik tombol Simpan...');
            tombol.click();
        } else {
            console.warn('⚠️ Tombol Simpan tidak ditemukan, klik manual ya!');
        }
    }

    // Jalankan
    await main();

})();
