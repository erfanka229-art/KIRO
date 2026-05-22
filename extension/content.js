/**
 * AUTO ANSWER UJIAN GUNADARMA
 * Content Script - Auto inject saat halaman load
 * Floating panel selalu muncul walau halaman refresh
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ==================== BUAT FLOATING PANEL ====================
function createPanel() {
  const existing = document.getElementById('gd-auto-panel');
  if (existing) return; // sudah ada, skip

  const panel = document.createElement('div');
  panel.id = 'gd-auto-panel';
  panel.innerHTML = `
    <div id="gd-header">
      <span>🤖 Auto Answer</span>
      <div style="display:flex;gap:6px;align-items:center">
        <span id="gd-min" title="Minimize">—</span>
        <span id="gd-close" title="Tutup">✕</span>
      </div>
    </div>
    <div id="gd-body">
      <div id="gd-status">⏳ Memuat...</div>
      <div id="gd-soal"></div>
      <div id="gd-pilihan"></div>
      <div id="gd-answer"></div>
      <div id="gd-btns">
        <button id="gd-btn-run">▶ Jawab</button>
        <button id="gd-btn-auto">🔄 Auto</button>
      </div>
      <div id="gd-log"></div>
    </div>
  `;

  // ===== INJECT CSS =====
  const style = document.createElement('style');
  style.textContent = `
    #gd-auto-panel {
      position: fixed !important;
      top: 18px !important;
      right: 18px !important;
      width: 320px !important;
      z-index: 2147483647 !important;
      font-family: 'Segoe UI', Arial, sans-serif !important;
      font-size: 13px !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
      background: #1e1e2e !important;
      color: #cdd6f4 !important;
      border: 1.5px solid #45475a !important;
      overflow: hidden !important;
      user-select: none !important;
    }
    #gd-header {
      background: linear-gradient(90deg,#89b4fa,#cba6f7) !important;
      color: #1e1e2e !important;
      padding: 9px 12px !important;
      font-weight: bold !important;
      cursor: move !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 13px !important;
    }
    #gd-min, #gd-close {
      cursor: pointer !important;
      font-size: 15px !important;
      padding: 0 3px !important;
    }
    #gd-min:hover, #gd-close:hover { opacity: 0.7 !important; }
    #gd-body {
      padding: 10px 12px !important;
      max-height: 400px !important;
      overflow-y: auto !important;
    }
    #gd-status {
      font-weight: bold !important;
      margin-bottom: 7px !important;
      font-size: 13px !important;
      color: #a6e3a1 !important;
    }
    #gd-soal {
      color: #f9e2af !important;
      font-size: 12px !important;
      line-height: 1.5 !important;
      margin-bottom: 7px !important;
      background: #181825 !important;
      border-radius: 6px !important;
      padding: 6px 8px !important;
      max-height: 80px !important;
      overflow-y: auto !important;
    }
    #gd-pilihan {
      font-size: 12px !important;
      color: #cdd6f4 !important;
      margin-bottom: 7px !important;
    }
    #gd-pilihan div {
      padding: 2px 0 !important;
      border-bottom: 1px solid #313244 !important;
    }
    #gd-answer {
      font-size: 14px !important;
      font-weight: bold !important;
      color: #a6e3a1 !important;
      margin-bottom: 8px !important;
      background: #1e3a2e !important;
      border-radius: 6px !important;
      padding: 6px 8px !important;
      min-height: 24px !important;
    }
    #gd-btns {
      display: flex !important;
      gap: 7px !important;
      margin-bottom: 8px !important;
    }
    #gd-btn-run, #gd-btn-auto {
      flex: 1 !important;
      padding: 7px !important;
      border-radius: 7px !important;
      border: none !important;
      cursor: pointer !important;
      font-weight: bold !important;
      font-size: 12px !important;
      transition: opacity 0.2s !important;
    }
    #gd-btn-run { background: #89b4fa !important; color: #1e1e2e !important; }
    #gd-btn-auto { background: #313244 !important; color: #cdd6f4 !important; }
    #gd-btn-run:hover, #gd-btn-auto:hover { opacity: 0.85 !important; }
    #gd-log {
      font-size: 11px !important;
      color: #585b70 !important;
      border-top: 1px solid #313244 !important;
      padding-top: 6px !important;
      max-height: 80px !important;
      overflow-y: auto !important;
    }
    #gd-log div { padding: 1px 0 !important; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  // ===== DRAG =====
  const header = document.getElementById('gd-header');
  let drag = false, ox = 0, oy = 0;
  header.addEventListener('mousedown', e => {
    drag = true;
    ox = e.clientX - panel.offsetLeft;
    oy = e.clientY - panel.offsetTop;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!drag) return;
    panel.style.left = (e.clientX - ox) + 'px';
    panel.style.top  = (e.clientY - oy) + 'px';
    panel.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => drag = false);

  // ===== MINIMIZE =====
  let minimized = false;
  document.getElementById('gd-min').addEventListener('click', () => {
    minimized = !minimized;
    document.getElementById('gd-body').style.display = minimized ? 'none' : 'block';
    document.getElementById('gd-min').textContent = minimized ? '□' : '—';
  });

  // ===== CLOSE =====
  document.getElementById('gd-close').addEventListener('click', () => {
    panel.remove();
    autoMode = false;
  });

  // ===== TOMBOL =====
  document.getElementById('gd-btn-run').addEventListener('click', () => jawabSoal(false));
  document.getElementById('gd-btn-auto').addEventListener('click', toggleAuto);
}

// ==================== HELPER UI ====================
function setStatus(msg, color = '#a6e3a1') {
  const el = document.getElementById('gd-status');
  if (el) { el.textContent = msg; el.style.color = color; }
}

function log(msg) {
  const el = document.getElementById('gd-log');
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = new Date().toLocaleTimeString('id-ID') + ' ' + msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ==================== BACA DOM ====================
function getSoal() {
  // Ambil semua text node langsung (bukan container besar)
  const candidates = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  let node;
  while ((node = walker.nextNode())) {
    const t = node.textContent.trim();
    if (
      t.length > 25 && t.length < 500 &&
      !/simpan|waktu|pilihlah|pass|tidak menjawab|copyright|gunadarma|logout|selamat/i.test(t)
    ) {
      candidates.push(t);
    }
  }
  return candidates[0] || null;
}

function getPilihan() {
  const radios = [...document.querySelectorAll('input[type="radio"]')];
  return radios.map((radio, i) => {
    let text = '';

    // label[for=id]
    if (radio.id) {
      const lbl = document.querySelector(`label[for="${radio.id}"]`);
      if (lbl) text = lbl.innerText.trim();
    }
    // nextSibling text node
    if (!text) {
      let s = radio.nextSibling;
      while (s) {
        const t = (s.textContent || '').trim();
        if (t.length > 1) { text = t; break; }
        s = s.nextSibling;
      }
    }
    // parent innerText
    if (!text && radio.parentElement) {
      text = radio.parentElement.innerText.replace(/\s+/g, ' ').trim().slice(0, 120);
    }

    const skip = /pass|tidak menjawab/i.test(text);
    return { radio, text: text || `Pilihan ${i+1}`, skip };
  });
}

function getTombolSimpan() {
  const els = [...document.querySelectorAll('input[type="button"],button,input[type="submit"],a')];
  return els.find(el =>
    /simpan|berikutnya|next/i.test(el.value || el.innerText || el.textContent || '')
  ) || null;
}

// ==================== GROQ API ====================
async function getApiKey() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['groq_api_key'], res => {
      resolve(res.groq_api_key || '');
    });
  });
}

async function tanyaGroq(soal, pilihan) {
  const key = await getApiKey();
  if (!key) {
    setStatus('❌ API Key belum diset!', '#f38ba8');
    log('Buka popup extension untuk set API Key');
    return null;
  }

  const valid = pilihan.filter(p => !p.skip);
  const pilihanText = valid.map((p, i) =>
    `${String.fromCharCode(65 + i)}. ${p.text}`
  ).join('\n');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Kamu menjawab soal ujian pilihan ganda. Balas HANYA dengan: JAWABAN: [HURUF]'
        },
        {
          role: 'user',
          content: `SOAL: ${soal}\n\nPILIHAN:\n${pilihanText}\n\nBalas HANYA: JAWABAN: [HURUF]`
        }
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
         || (text || '').match(/\b([A-E])\b/);
  return m ? m[1].toUpperCase() : null;
}

// ==================== JAWAB SOAL ====================
async function jawabSoal(autoSubmit = false) {
  setStatus('🔍 Membaca soal...', '#89b4fa');
  document.getElementById('gd-soal').textContent = '';
  document.getElementById('gd-pilihan').innerHTML = '';
  document.getElementById('gd-answer').textContent = '';

  const soal    = getSoal();
  const pilihan = getPilihan();
  const tombol  = getTombolSimpan();

  if (!soal) {
    setStatus('❌ Soal tidak ditemukan', '#f38ba8');
    log('Soal tidak terdeteksi');
    return;
  }

  document.getElementById('gd-soal').textContent = soal;
  log('Soal: ' + soal.slice(0, 50) + '...');

  const valid = pilihan.filter(p => !p.skip);
  document.getElementById('gd-pilihan').innerHTML =
    valid.map((p, i) =>
      `<div>${String.fromCharCode(65+i)}. ${p.text.slice(0, 55)}</div>`
    ).join('');

  if (valid.length === 0) {
    setStatus('❌ Pilihan tidak ditemukan', '#f38ba8');
    return;
  }

  setStatus('🤖 Tanya AI...', '#f9e2af');

  let aiRes;
  try {
    aiRes = await tanyaGroq(soal, pilihan);
  } catch (e) {
    setStatus('❌ ' + e.message, '#f38ba8');
    log('Error: ' + e.message);
    return;
  }

  if (!aiRes) return;

  log('AI: ' + aiRes);
  const huruf = extractHuruf(aiRes);

  if (!huruf) {
    setStatus('⚠️ Jawaban tidak terbaca', '#fab387');
    return;
  }

  const idx = huruf.charCodeAt(0) - 65;
  const terpilih = valid[idx];

  if (!terpilih) {
    setStatus('⚠️ Index tidak valid', '#fab387');
    return;
  }

  document.getElementById('gd-answer').textContent =
    `✅ Jawaban: ${huruf}. ${terpilih.text.slice(0, 55)}`;
  setStatus('✅ Terpilih: ' + huruf, '#a6e3a1');
  log('Pilih: ' + huruf + '. ' + terpilih.text.slice(0, 40));

  // Klik radio button
  terpilih.radio.click();
  terpilih.radio.checked = true;
  terpilih.radio.dispatchEvent(new Event('change', { bubbles: true }));

  // Auto klik simpan
  if (autoSubmit && tombol) {
    setStatus('💾 Simpan...', '#89b4fa');
    await new Promise(r => setTimeout(r, 1000));
    log('Klik Simpan → soal berikutnya');
    tombol.click();
  } else if (autoSubmit && !tombol) {
    setStatus('⚠️ Tombol Simpan tidak ada', '#fab387');
  }
}

// ==================== MODE AUTO ====================
let autoMode = false;

function toggleAuto() {
  autoMode = !autoMode;
  const btn = document.getElementById('gd-btn-auto');
  if (!btn) return;
  if (autoMode) {
    btn.textContent = '⏹ Stop';
    btn.style.background = '#f38ba8';
    btn.style.color = '#1e1e2e';
    setStatus('🔄 Mode Auto ON', '#a6e3a1');
    log('Auto mode aktif');
    jawabSoal(true);
  } else {
    btn.textContent = '🔄 Auto';
    btn.style.background = '#313244';
    btn.style.color = '#cdd6f4';
    setStatus('⏸ Auto dihentikan', '#fab387');
    log('Auto mode OFF');
  }
}

// ==================== INIT ====================
// Jalankan panel setiap halaman load (walau refresh)
createPanel();

// Cek apakah ada API key, update status
chrome.storage.sync.get(['groq_api_key'], res => {
  if (res.groq_api_key) {
    setStatus('✅ Siap! Klik ▶ Jawab', '#a6e3a1');
    log('Extension aktif. API key tersedia.');
    // Jika mode auto sedang aktif (disimpan di storage), langsung jawab
    chrome.storage.sync.get(['auto_mode'], r => {
      if (r.auto_mode) {
        autoMode = true;
        const btn = document.getElementById('gd-btn-auto');
        if (btn) {
          btn.textContent = '⏹ Stop';
          btn.style.background = '#f38ba8';
          btn.style.color = '#1e1e2e';
        }
        setStatus('🔄 Auto ON - Menjawab...', '#a6e3a1');
        setTimeout(() => jawabSoal(true), 800); // Tunggu DOM siap
      }
    });
  } else {
    setStatus('⚠️ Set API Key dulu!', '#f38ba8');
    log('Klik ikon extension di toolbar untuk set API Key');
  }
});
