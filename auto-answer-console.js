/**
 * ============================================
 * AUTO ANSWER UJIAN GUNADARMA - FLOATING UI
 * Menggunakan Groq API (LLaMA 3)
 * ============================================
 * Paste di Console browser → Floating panel muncul di layar
 * Ganti API_KEY dengan API key Groq Anda
 * Dapatkan di: https://console.groq.com/keys
 */

(function () {

  // ==================== KONFIGURASI ====================
  const API_KEY = 'MASUKKAN_API_KEY_GROQ_ANDA'; // <-- GANTI INI
  const MODEL   = 'llama-3.3-70b-versatile';
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  // ==================== BUAT FLOATING UI ====================
  // Hapus panel lama kalau sudah ada
  const existing = document.getElementById('groq-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'groq-panel';
  panel.innerHTML = `
    <div id="groq-header">
      🤖 Auto Answer Groq
      <span id="groq-close" title="Tutup">✕</span>
      <span id="groq-minimize" title="Minimize">—</span>
    </div>
    <div id="groq-body">
      <div id="groq-status">⏳ Siap...</div>
      <div id="groq-soal"></div>
      <div id="groq-pilihan"></div>
      <div id="groq-answer"></div>
      <div id="groq-buttons">
        <button id="groq-btn-run">▶ Jawab Sekarang</button>
        <button id="groq-btn-auto">🔄 Mode Auto</button>
      </div>
      <div id="groq-log"></div>
    </div>
  `;

  // Style panel
  Object.assign(panel.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '340px',
    zIndex: '999999',
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    borderRadius: '10px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
    background: '#1e1e2e',
    color: '#cdd6f4',
    userSelect: 'none',
    overflow: 'hidden',
    border: '1px solid #45475a',
  });

  // Style header
  const header = panel.querySelector('#groq-header');
  Object.assign(header.style, {
    background: 'linear-gradient(90deg,#89b4fa,#cba6f7)',
    color: '#1e1e2e',
    padding: '8px 12px',
    fontWeight: 'bold',
    cursor: 'move',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  const closeBtn = panel.querySelector('#groq-close');
  const minBtn   = panel.querySelector('#groq-minimize');
  Object.assign(closeBtn.style, { marginLeft:'auto', cursor:'pointer', fontSize:'16px' });
  Object.assign(minBtn.style,   { cursor:'pointer', fontSize:'16px' });

  // Style body
  const body = panel.querySelector('#groq-body');
  Object.assign(body.style, {
    padding: '10px',
    maxHeight: '420px',
    overflowY: 'auto',
  });

  // Style status
  const statusEl   = panel.querySelector('#groq-status');
  const soalEl     = panel.querySelector('#groq-soal');
  const pilihanEl  = panel.querySelector('#groq-pilihan');
  const answerEl   = panel.querySelector('#groq-answer');
  const logEl      = panel.querySelector('#groq-log');

  Object.assign(statusEl.style,  { marginBottom:'6px', fontWeight:'bold', color:'#a6e3a1' });
  Object.assign(soalEl.style,    { marginBottom:'6px', color:'#f9e2af', fontSize:'12px', lineHeight:'1.4' });
  Object.assign(pilihanEl.style, { marginBottom:'6px', color:'#cdd6f4', fontSize:'12px' });
  Object.assign(answerEl.style,  { marginBottom:'6px', color:'#a6e3a1', fontWeight:'bold', fontSize:'14px' });
  Object.assign(logEl.style,     { fontSize:'11px', color:'#6c7086', marginTop:'6px', borderTop:'1px solid #313244', paddingTop:'6px', maxHeight:'100px', overflowY:'auto' });

  // Style tombol
  const btnRun  = panel.querySelector('#groq-btn-run');
  const btnAuto = panel.querySelector('#groq-btn-auto');
  const btnBox  = panel.querySelector('#groq-buttons');
  Object.assign(btnBox.style,  { display:'flex', gap:'6px', marginBottom:'8px' });
  [btnRun, btnAuto].forEach(b => {
    Object.assign(b.style, {
      flex:'1', padding:'7px', borderRadius:'6px', border:'none',
      cursor:'pointer', fontWeight:'bold', fontSize:'12px',
    });
  });
  Object.assign(btnRun.style,  { background:'#89b4fa', color:'#1e1e2e' });
  Object.assign(btnAuto.style, { background:'#313244', color:'#cdd6f4' });

  document.body.appendChild(panel);

  // ==================== DRAG PANEL ====================
  let dragging = false, ox = 0, oy = 0;
  header.addEventListener('mousedown', e => {
    dragging = true;
    ox = e.clientX - panel.offsetLeft;
    oy = e.clientY - panel.offsetTop;
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    panel.style.left = (e.clientX - ox) + 'px';
    panel.style.top  = (e.clientY - oy) + 'px';
    panel.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => dragging = false);

  // ==================== MINIMIZE & CLOSE ====================
  let minimized = false;
  minBtn.addEventListener('click', () => {
    minimized = !minimized;
    body.style.display = minimized ? 'none' : 'block';
    minBtn.textContent = minimized ? '□' : '—';
  });
  closeBtn.addEventListener('click', () => panel.remove());

  // ==================== HELPER LOG ====================
  function log(msg) {
    const line = document.createElement('div');
    line.textContent = new Date().toLocaleTimeString() + ' ' + msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    console.log('[AutoAnswer]', msg);
  }

  function setStatus(msg, color = '#a6e3a1') {
    statusEl.textContent = msg;
    statusEl.style.color = color;
  }

  // ==================== BACA SOAL DARI DOM ====================
  function getSoal() {
    // Baca semua teks di halaman, cari kalimat soal
    const allEls = document.querySelectorAll('td, p, div, span, label');
    for (const el of allEls) {
      // Hanya ambil teks langsung (bukan container besar)
      const own = Array.from(el.childNodes)
        .filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim())
        .join(' ')
        .trim();
      if (own.length > 25 && own.length < 500 &&
          !/simpan|waktu|pilihlah|pass|tidak menjawab|ujian/i.test(own)) {
        return own;
      }
    }
    // Fallback: baca innerText body, ambil baris soal
    const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.length > 30 && line.length < 400 &&
          !/simpan|waktu|pilihlah|pass|tidak menjawab/i.test(line)) {
        return line;
      }
    }
    return null;
  }

  function getPilihan() {
    const radios = document.querySelectorAll('input[type="radio"]');
    const pilihan = [];
    radios.forEach((radio, i) => {
      let text = '';
      // Cari label[for]
      if (radio.id) {
        const lbl = document.querySelector(`label[for="${radio.id}"]`);
        if (lbl) text = lbl.innerText.trim();
      }
      // nextSibling text node
      if (!text) {
        let s = radio.nextSibling;
        while (s) {
          const t = (s.textContent || s.innerText || '').trim();
          if (t.length > 1) { text = t; break; }
          s = s.nextSibling;
        }
      }
      // parent innerText minus soal
      if (!text) {
        const p = radio.parentElement;
        if (p) text = p.innerText.replace(/\s+/g,' ').trim().slice(0,150);
      }
      // Skip "Pass / Tidak menjawab"
      if (/pass|tidak menjawab/i.test(text)) {
        pilihan.push({ radio, text: text || `Pilihan ${i+1}`, skip: true });
      } else {
        pilihan.push({ radio, text: text || `Pilihan ${i+1}`, skip: false });
      }
    });
    return pilihan;
  }

  function getTombolSimpan() {
    const all = document.querySelectorAll('input[type="button"],button,input[type="submit"],a');
    for (const el of all) {
      const t = (el.value || el.innerText || el.textContent || '').toLowerCase();
      if (/simpan|berikutnya|next/i.test(t)) return el;
    }
    return null;
  }

  // ==================== GROQ API ====================
  async function tanyaGroq(soal, pilihan) {
    const key = API_KEY !== 'MASUKKAN_API_KEY_GROQ_ANDA'
      ? API_KEY
      : sessionStorage.getItem('groq_key');

    if (!key) {
      alert('❌ API Key kosong!\nMasukkan dulu: sessionStorage.setItem("groq_key","API_KEY_ANDA")');
      return null;
    }

    const pilihanValid = pilihan.filter(p => !p.skip);
    const pilihanText = pilihanValid.map((p, i) =>
      `${String.fromCharCode(65+i)}. ${p.text}`
    ).join('\n');

    const prompt =
`Jawab soal ujian pilihan ganda ini. Balas HANYA dengan format: JAWABAN: [HURUF]

SOAL: ${soal}

PILIHAN:
${pilihanText}`;

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Kamu menjawab soal pilihan ganda. Balas HANYA: JAWABAN: [HURUF]' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 20,
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error?.message || res.statusText);
    }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  }

  function extractHuruf(text) {
    const m = (text || '').match(/JAWABAN\s*:\s*([A-E])/i)
           || (text || '').match(/\b([A-E])\b/i);
    return m ? m[1].toUpperCase() : null;
  }

  // ==================== LOGIC UTAMA ====================
  async function jawabSoal(autoSubmit = false) {
    setStatus('🔍 Membaca soal...', '#89b4fa');
    soalEl.textContent = '';
    pilihanEl.innerHTML = '';
    answerEl.textContent = '';

    const soal    = getSoal();
    const pilihan = getPilihan();
    const tombol  = getTombolSimpan();

    if (!soal) {
      setStatus('❌ Soal tidak ditemukan', '#f38ba8');
      log('Soal tidak terdeteksi di DOM');
      return;
    }

    soalEl.textContent = '❓ ' + soal;
    log('Soal: ' + soal.slice(0,60) + '...');

    const pilihanValid = pilihan.filter(p => !p.skip);
    pilihanEl.innerHTML = pilihanValid.map((p,i) =>
      `<div>• ${String.fromCharCode(65+i)}. ${p.text.slice(0,60)}</div>`
    ).join('');

    if (pilihanValid.length === 0) {
      setStatus('❌ Pilihan tidak ditemukan', '#f38ba8');
      return;
    }

    setStatus('🤖 Tanya AI...', '#f9e2af');
    log('Mengirim ke Groq...');

    let aiRes;
    try {
      aiRes = await tanyaGroq(soal, pilihan);
    } catch(e) {
      setStatus('❌ Error: ' + e.message, '#f38ba8');
      log('Error: ' + e.message);
      return;
    }

    log('AI: ' + aiRes);
    const huruf = extractHuruf(aiRes);

    if (!huruf) {
      setStatus('⚠️ AI tidak bisa tentukan jawaban', '#fab387');
      return;
    }

    const idx = huruf.charCodeAt(0) - 65;
    const terpilih = pilihanValid[idx];

    if (!terpilih) {
      setStatus('⚠️ Index jawaban invalid', '#fab387');
      return;
    }

    answerEl.textContent = `✅ Jawaban: ${huruf}. ${terpilih.text.slice(0,60)}`;
    setStatus('✅ Memilih ' + huruf, '#a6e3a1');

    // Klik radio
    terpilih.radio.click();
    terpilih.radio.checked = true;
    terpilih.radio.dispatchEvent(new Event('change', { bubbles: true }));
    log('Pilih: ' + huruf + '. ' + terpilih.text.slice(0,40));

    // Auto submit
    if (autoSubmit && tombol) {
      setStatus('💾 Menyimpan...', '#89b4fa');
      await new Promise(r => setTimeout(r, 1200));
      log('Klik tombol Simpan');
      tombol.click();
    } else if (autoSubmit && !tombol) {
      setStatus('⚠️ Tombol Simpan tidak ditemukan!', '#fab387');
    }
  }

  // ==================== TOMBOL ====================
  let autoMode = false;
  btnRun.addEventListener('click', () => jawabSoal(false));

  btnAuto.addEventListener('click', () => {
    autoMode = !autoMode;
    if (autoMode) {
      btnAuto.textContent = '⏹ Stop Auto';
      btnAuto.style.background = '#f38ba8';
      btnAuto.style.color = '#1e1e2e';
      setStatus('🔄 Mode Auto aktif', '#a6e3a1');
      log('Mode Auto ON - jawab + simpan otomatis');
      jawabSoal(true);
    } else {
      btnAuto.textContent = '🔄 Mode Auto';
      btnAuto.style.background = '#313244';
      btnAuto.style.color = '#cdd6f4';
      setStatus('⏸ Auto dihentikan', '#fab387');
      log('Mode Auto OFF');
    }
  });

  // ==================== CEK API KEY ====================
  if (API_KEY === 'MASUKKAN_API_KEY_GROQ_ANDA') {
    const saved = sessionStorage.getItem('groq_key');
    if (!saved) {
      setStatus('⚠️ Masukkan API Key dulu!', '#f38ba8');
      soalEl.innerHTML = `<span style="color:#f38ba8">Jalankan di console:<br><b>sessionStorage.setItem('groq_key','API_KEY_ANDA')</b><br>lalu klik ▶ Jawab</span>`;
    } else {
      setStatus('✅ API Key dari storage', '#a6e3a1');
      log('Menggunakan API key dari sessionStorage');
    }
  } else {
    sessionStorage.setItem('groq_key', API_KEY);
    setStatus('✅ Siap! Klik ▶ Jawab', '#a6e3a1');
    log('Panel aktif. API key terkonfigurasi.');
  }

  console.log('%c✅ Auto Answer Panel aktif!', 'color:green;font-size:14px;font-weight:bold');
  console.log('Panel mengambang ada di kanan atas layar.');

})();
