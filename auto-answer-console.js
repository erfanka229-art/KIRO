/**
 * ============================================
 * AUTO ANSWER UJIAN - CONSOLE SCRIPT
 * Menggunakan Groq API (LLaMA 3)
 * ============================================
 * 
 * Cara Penggunaan:
 * 1. Buka halaman ujian di browser
 * 2. Buka Developer Tools (F12) -> Console
 * 3. Copy-paste seluruh script ini ke console
 * 4. Tekan Enter untuk menjalankan
 * 5. Script akan otomatis menjawab soal
 * 
 * PENTING: Ganti API_KEY dengan API key Groq Anda
 * Dapatkan di: https://console.groq.com/keys
 */

(async function AutoAnswerExam() {
    // ==================== KONFIGURASI ====================
    const CONFIG = {
        API_KEY: 'YOUR_GROQ_API_KEY_HERE', // GANTI DENGAN API KEY ANDA
        MODEL: 'llama-3.3-70b-versatile', // Model yang digunakan
        BASE_URL: 'https://api.groq.com/openai/v1/chat/completions',
        DELAY_BETWEEN_QUESTIONS: 2000, // Delay 2 detik antar soal (ms)
        MAX_TOKENS: 1024,
        TEMPERATURE: 0.3, // Rendah untuk jawaban lebih konsisten
    };

    // ==================== HELPER FUNCTIONS ====================
    
    // Fungsi untuk delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Fungsi untuk membersihkan teks
    const cleanText = (text) => {
        return text.replace(/\s+/g, ' ').trim();
    };

    // ==================== PARSER SOAL ====================
    
    /**
     * Parse soal dari halaman ujian
     * Sesuaikan selector berdasarkan struktur halaman ujian Anda
     */
    function parseQuestions() {
        const questions = [];
        
        // === SESUAIKAN SELECTOR BERIKUT DENGAN STRUKTUR HALAMAN UJIAN ANDA ===
        
        // Contoh pola umum untuk ujian online:
        
        // Pola 1: Soal dalam elemen dengan class tertentu
        // const questionElements = document.querySelectorAll('.soal, .question, .quiz-question');
        
        // Pola 2: Soal dalam tabel
        // const questionElements = document.querySelectorAll('table tr td');
        
        // Pola 3: Soal dalam div dengan ID tertentu
        // const questionElements = document.querySelectorAll('[id*="soal"], [id*="question"]');
        
        // Pola 4: Soal dalam elemen berurutan
        const questionElements = document.querySelectorAll('table, .soal-container, .question-container, div[id*="q"]');
        
        questionElements.forEach((elem, index) => {
            const text = cleanText(elem.innerText);
            if (text && text.length > 10) { // Filter elemen dengan konten berarti
                // Cari pilihan jawaban (radio button atau checkbox)
                const options = [];
                const radioButtons = elem.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                const labels = elem.querySelectorAll('label, td, span');
                
                labels.forEach(label => {
                    const optionText = cleanText(label.innerText);
                    if (optionText && optionText.length > 0 && optionText.length < 200) {
                        options.push({
                            element: label,
                            text: optionText,
                            input: label.querySelector('input') || label.previousElementSibling?.querySelector('input')
                        });
                    }
                });
                
                if (text) {
                    questions.push({
                        index: index + 1,
                        element: elem,
                        text: text,
                        options: options
                    });
                }
            }
        });

        console.log(`📖 Ditemukan ${questions.length} soal`);
        return questions;
    }

    /**
     * Versi alternatif: Parse soal secara manual dengan selector spesifik
     * Gunakan fungsi ini jika struktur halaman sudah diketahui
     */
    function parseQuestionsManual() {
        const questions = [];
        
        // ========================================
        // CONTOH KONFIGURASI UNTUK UJIAN ONLINE UMUM
        // ========================================
        
        // Cari semua elemen soal - SESUAIKAN DENGAN STRUKTUR HALAMAN ANDA
        // Contoh selector umum:
        
        // Selector untuk container soal
        const questionContainers = document.querySelectorAll([
            '.soal',
            '.question', 
            '.quiz-question',
            'table[id*="soal"]',
            'div[id*="question"]',
            'tr[class*="soal"]',
            'table tr'
        ].join(', '));
        
        questionContainers.forEach((container, idx) => {
            // Ambil teks soal
            const questionText = cleanText(container.innerText);
            
            // Ambil pilihan jawaban
            const options = [];
            
            // Cari radio button dan label
            const inputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            
            inputs.forEach(input => {
                // Cari label terkait
                let labelText = '';
                
                // Cek label dengan atribut "for"
                if (input.id) {
                    const label = document.querySelector(`label[for="${input.id}"]`);
                    if (label) labelText = cleanText(label.innerText);
                }
                
                // Cek parent atau sibling
                if (!labelText) {
                    const parent = input.parentElement;
                    if (parent) {
                        labelText = cleanText(parent.innerText || parent.textContent);
                        // Jika parent mengandung banyak teks, ambil teks setelah input
                        if (labelText.length > 100) {
                            labelText = cleanText(parent.textContent.split('\n').pop());
                        }
                    }
                }
                
                // Cek sibling berikutnya
                if (!labelText && input.nextSibling) {
                    labelText = cleanText(input.nextSibling.textContent || input.nextSibling.innerText);
                }
                
                options.push({
                    input: input,
                    text: labelText,
                    value: input.value
                });
            });
            
            if (questionText.length > 5) {
                questions.push({
                    index: questions.length + 1,
                    element: container,
                    text: questionText,
                    options: options,
                    inputName: inputs[0]?.name || null
                });
            }
        });
        
        console.log(`📖 Ditemukan ${questions.length} soal`);
        return questions;
    }

    // ==================== GROQ API CALLER ====================
    
    /**
     * Mengirim soal ke Groq API dan mendapatkan jawaban
     */
    async function getAnswerFromGroq(questionText, options = []) {
        // Cek API Key
        if (CONFIG.API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
            console.error('❌ ERROR: Silakan ganti API_KEY dengan API key Groq Anda!');
            console.log('🔗 Dapatkan API key di: https://console.groq.com/keys');
            return null;
        }

        // Format pilihan jawaban
        let optionsText = '';
        if (options.length > 0) {
            optionsText = '\n\nPilihan Jawaban:\n';
            options.forEach((opt, idx) => {
                const letter = String.fromCharCode(65 + idx); // A, B, C, D, E
                optionsText += `${letter}. ${opt.text}\n`;
            });
        }

        const prompt = `Anda adalah seorang ahli akademik yang akan menjawab soal ujian dengan tepat dan singkat.

SOAL:
${questionText}
${optionsText}

INSTRUKSI:
1. Analisis soal dengan teliti
2. Jika soal adalah pilihan ganda, pilih jawaban yang PALING TEPAT
3. Berikan jawaban dalam format berikut:
   - Untuk pilihan ganda: JAWABAN: [HURUF] - [teks pilihan]
   - Untuk essay: JAWABAN: [jawaban lengkap]
4. Jelaskan alasan singkat mengapa jawaban tersebut dipilih

JAWABAN:`;

        try {
            const response = await fetch(CONFIG.BASE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: CONFIG.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'Anda adalah asisten akademik yang memberikan jawaban akurat dan to the point untuk soal ujian.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: CONFIG.MAX_TOKENS,
                    temperature: CONFIG.TEMPERATURE
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error('❌ Error calling Groq API:', error.message);
            return null;
        }
    }

    // ==================== EXTRACT ANSWER ====================
    
    /**
     * Extract pilihan jawaban dari response AI
     */
    function extractAnswerChoice(aiResponse, options) {
        if (!aiResponse) return null;
        
        // Cari pola "JAWABAN: A" atau "JAWABAN: A - ..." atau "jawaban: A"
        const patterns = [
            /JAWABAN:\s*([A-E])\s*[-:.]/i,
            /JAWABAN:\s*([A-E])\s*$/i,
            /JAWABAN:\s*([A-E])/i,
            /jawaban\s*:\s*([A-E])/i,
            /\b([A-E])\.\s*\w/
        ];
        
        for (const pattern of patterns) {
            const match = aiResponse.match(pattern);
            if (match) {
                const letter = match[1].toUpperCase();
                const index = letter.charCodeAt(0) - 65; // A=0, B=1, dst
                if (index >= 0 && index < options.length) {
                    return index;
                }
            }
        }
        
        return null;
    }

    // ==================== SELECT ANSWER ====================
    
    /**
     * Pilih jawaban di halaman
     */
    function selectAnswer(question, optionIndex) {
        if (!question.options[optionIndex]) {
            console.log('⚠️ Index pilihan tidak valid');
            return false;
        }
        
        const option = question.options[optionIndex];
        
        if (option.input) {
            // Klik radio button atau checkbox
            option.input.click();
            option.input.checked = true;
            console.log(`✅ Memilih pilihan ${String.fromCharCode(65 + optionIndex)}: ${option.text.substring(0, 50)}...`);
            return true;
        } else {
            console.log('⚠️ Tidak dapat menemukan input untuk pilihan ini');
            return false;
        }
    }

    // ==================== MAIN EXECUTION ====================
    
    async function run() {
        console.log('🚀 ============================================');
        console.log('🚀 AUTO ANSWER UJIAN - GROQ AI');
        console.log('🚀 ============================================');
        
        // Validasi API Key
        if (CONFIG.API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
            console.error('');
            console.error('❌ ERROR: API Key belum dikonfigurasi!');
            console.error('📝 Silakan edit script dan ganti YOUR_GROQ_API_KEY_HERE');
            console.error('🔗 Dapatkan API key di: https://console.groq.com/keys');
            console.error('');
            return;
        }
        
        console.log('📡 Model:', CONFIG.MODEL);
        console.log('⏱️  Delay:', CONFIG.DELAY_BETWEEN_QUESTIONS, 'ms');
        console.log('');

        // Parse soal
        console.log('🔍 Mencari soal di halaman...');
        let questions = parseQuestions();
        
        // Jika tidak ditemukan, coba parser alternatif
        if (questions.length === 0) {
            console.log('🔄 Mencoba parser alternatif...');
            questions = parseQuestionsManual();
        }
        
        if (questions.length === 0) {
            console.error('❌ Tidak dapat menemukan soal di halaman ini.');
            console.log('💡 Tips:');
            console.log('   1. Pastikan Anda sudah berada di halaman ujian');
            console.log('   2. Coba inspect element untuk melihat struktur soal');
            console.log('   3. Sesuaikan selector di fungsi parseQuestions()');
            return;
        }

        console.log('');
        console.log('📋 Daftar Soal:');
        questions.forEach((q, i) => {
            console.log(`   ${i + 1}. ${q.text.substring(0, 80)}...`);
        });
        console.log('');

        // Proses setiap soal
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            console.log(`\n📝 ========================================`);
            console.log(`📝 SOAL ${i + 1}/${questions.length}`);
            console.log(`📝 ========================================`);
            console.log(`❓ ${question.text.substring(0, 200)}...`);
            
            if (question.options.length > 0) {
                console.log('\n📋 Pilihan:');
                question.options.forEach((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    console.log(`   ${letter}. ${opt.text.substring(0, 60)}...`);
                });
            }

            // Dapatkan jawaban dari AI
            console.log('\n🤖 Memproses dengan AI...');
            const aiResponse = await getAnswerFromGroq(question.text, question.options);
            
            if (aiResponse) {
                console.log('\n💬 Respons AI:');
                console.log(aiResponse);
                
                // Extract dan pilih jawaban
                if (question.options.length > 0) {
                    const answerIndex = extractAnswerChoice(aiResponse, question.options);
                    
                    if (answerIndex !== null) {
                        selectAnswer(question, answerIndex);
                    } else {
                        console.log('⚠️ Tidak dapat menentukan pilihan dari respons AI');
                        console.log('💡 Silakan pilih jawaban secara manual');
                    }
                }
            }

            // Delay sebelum soal berikutnya
            if (i < questions.length - 1) {
                console.log(`\n⏳ Menunggu ${CONFIG.DELAY_BETWEEN_QUESTIONS/1000} detik...`);
                await delay(CONFIG.DELAY_BETWEEN_QUESTIONS);
            }
        }

        console.log('\n\n✅ ============================================');
        console.log('✅ SELESAI! Semua soal telah diproses');
        console.log('✅ ============================================');
        console.log('⚠️  PERINGATAN: Periksa kembali jawaban Anda sebelum submit!');
    }

    // Jalankan
    await run();

})();
