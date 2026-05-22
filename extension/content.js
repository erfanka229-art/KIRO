/**
 * AUTO ANSWER UJIAN GUNADARMA
 * Content Script - inject otomatis setiap halaman load
 * Panel floating tidak hilang walau halaman refresh
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ===================== BUAT PANEL =====================
function createPanel() {
  if (document.getElementById('gd-auto-panel')) return;

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #gd-auto-panel {
      position: fixed !important;
      top: 18px !important; right: 18px !important;
      width: 310px !important;
      z-index: 2147483647 !important;
      font-family: 'Segoe UI', Arial, sans-serif !important;
      font-size: 13px !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45) !important;
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
    }
    #gd-min, #gd-close { cursor: pointer !important; padding: 0 3px !important; }
    #gd-body { padding: 10px 12px !important; max-height: 420px !important; overflow-y: auto !important; }
    #gd-status { font-weight: bold !important; margin-bottom: 7px !important; color: #a6e3a1 !important; }
    #gd-soal {
      color: #f9e2af !important; font-size: 12px !important; line-height: 1.5 !important;
      margin-bottom: 7px !important; background: #181825 !important;
      border-radius: 6px !important; padding: 6px 8px !important;
      max-height: 80px !important; overflow-y: auto !important;
    }
    #gd-pilihan { font-size: 12px !important; color: #cdd6f4 !important; margin-bottom: 7px !important; }
    #gd-pilihan div { padding: 2px 0 !important; border-bottom: 1px solid #313244 !important; }
    #gd-answer {
      font-size: 13px !important; font-weight: bold !important; color: #a6e3a1 !important;
      margin-bottom: 8px !important; background: #1e3a2e !important;
      border-radius: 6px !important; padding: 6px 8px !important; min-height: 22px !important;
    }
    #gd-btns { display: flex !important; gap: 7px !important; margin-bottom: 6px !important; }
    #gd-btn-run, #gd-btn-auto {
      flex: 1 !important; padding: 7px !important; border-radius: 7px !important;
      border: none !important; cursor: pointer !important; font-weight: bold !important; font-size: 12px !important;
    }
    #gd-btn-run  { background: #89b4fa !important; color: #1e1e2e !important; }
    #gd-btn-auto { background: #313244 !important; color: #cdd6f4 !important; }
    #gd-btn-debug {
      width: 100% !important; padding: 5px !important; border-radius: 7px !important;
      border: none !important; cursor: pointer !important; font-size: 11px !important;
      background: #45475a !important; color: #cdd6f4 !important; margin-bottom: 6px !important;
    }
    #gd-log {
      font-size: 11px !important; color: #585b70 !important;
      border-top: 1px solid #313244 !important; padding-top: 6px !important;
      max-height: 90px !important; overflow-y: auto !important;
    }
    #gd-log div { padding: 1px 0 !important; }
  `;
  document.head.appendChild(style);

  // Buat panel HTML
  const panel = document.createElement('div');
  panel.id = 'gd-auto-panel';
  panel.innerHTML = `
    <div id="gd-header">
      <span>🤖 Auto Answer</span>
      <div style="display:flex;gap:6px">
        <span id="gd-min">—</span>
        <span id="gd-close">✕</span>
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
      <button id="gd-btn-debug">🔎 Debug DOM</button>
      <div id="gd-log"></div>
    </div>
  `;
  document.body.appendChild(panel);

  // DRAG
  const header = document.getElementById('gd-header');
  let drag = false, ox = 0, oy = 0;
  header.addEventListener('mousedown', e => {
    drag = true; ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!drag) return;
    panel.style.left = (e.clientX - ox) + 'px';
    panel.style.top  = (e.clientY - oy) + 'px';
    panel.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => drag = false);

  // MINIMIZE
  let minimized = false;
  document.getElementById('gd-min').addEventListener('click', () => {
    minimized = !minimized;
    document.getElementById('gd-body').style.display = minimized ? 'none' : 'block';
    document.getElementById('gd-min').textContent = minimized ? '□' : '—';
  });

  // CLOSE
  document.getElementById('gd-close').addEventListener('click', () => {
    panel.remove(); autoMode = false;
  });

  // TOMBOL
  document.getElementById('gd-btn-run').addEventListener('click', () => jawabSoal(false));
  document.getElementById('gd-btn-auto').addEventListener('click', toggleAuto);
  document.getElementById('gd-btn-debug').addEventListener('click', debugDOM);
}

// ===================== HELPER UI =====================
function setStatus(msg, color = '#a6e3a1') {
  const el = document.getElementById('gd-status');
  if (el) { el.textContent = msg; el.style.color = color; }
}
function log(msg) {
  const el = document.getElementById('gd-log');
  if (!el) return;
  const d = document.createElement('div');
  d.textContent = new Date().toLocaleTimeString('id-ID') + ' ' + msg;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  console.log('[AutoAnswer]', msg);
}

// ===================== DEBUG DOM =====================
function debugDOM() {
  log('--- DEBUG ---');

  // Cari semua form
  const forms = document.querySelectorAll('form');
  log('Form: ' + forms.length);

  // Cari tombol
  const btns = document.querySelectorAll('input[type="button"],input[type="submit"],button,a');
  btns.forEach(b => {
    const txt = (b.value || b.innerText || b.textContent || '').trim().slice(0, 40);
    const oc  = (b.getAttribute('onclick') || '').slice(0, 60);
    if (txt || oc) log('BTN: ' + b.tagName + ' "' + txt + '" onclick=' + oc);
  });

  // Cari radio
  const radios = document.querySelectorAll('input[type="radio"]');
  log('Radio: ' + radios.length);

  // Cari soal
  const soal = getSoal();
  log('Soal: ' + (soal ? soal.slice(0, 60) : 'TIDAK DITEMUKAN'));

  // Cari __doPostBack
  if (typeof __doPostBack === 'function') {
    log('__doPostBack: ADA');
  } else {
    log('__doPostBack: tidak ada');
  }
}

// ===================== BACA DOM =====================
function getSoal() {
  // Coba selector spesifik ASP.NET Gunadarma
  const selectors = [
    'span[id*="oal"]', 'span[id*="Soal"]', 'span[id*="question"]', 'span[id*="Label"]',
    'td[id*="soal"]', 'td[id*="Soal"]',
    'div[id*="soal"]', 'div[id*="Soal"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const t = el.innerText.trim();
      if (t.length > 10 && !/pilihlah|waktu/i.test(t)) return t;
    }
  }

  // Fallback: TreeWalker - text node panjang
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('#gd-auto-panel')) continue;
    const t = node.textContent.trim();
    if (
      t.length > 25 && t.length < 500 &&
      !/simpan|waktu ujian|pilihlah|pass\s*\/|tidak menjawab|copyright|gunadarma university|logout|selamat datang/i.test(t)
    ) {
      return t;
    }
  }
  return null;
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
    // parent
    if (!text && radio.parentElement) {
      text = radio.parentElement.innerText.replace(/\s+/g, ' ').trim().slice(0, 120);
    }
    const skip = /pass\s*\/\s*tidak menjawab/i.test(text);
    return { radio, text: text || `Pilihan ${i+1}`, skip };
  });
}

// ===================== KLIK SIMPAN (ASP.NET aware) =====================
function getTombolSimpan() {
  const all = [...document.querySelectorAll('input[type="button"],button,input[type="submit"],a,input[type="image"]')];
  return all.find(el =>
    /simpan|berikutnya|next/i.test(el.value || el.innerText || el.textContent || el.title || '')
  ) || null;
}

function klikTombolSimpan(tombol) {
  // Cara 1: cari elemen dengan onclick __doPostBack yang mengandung simpan/next
  const allOnclick = [...document.querySelectorAll('[onclick]')];
  for (const el of allOnclick) {
    const oc  = el.getAttribute('onclick') || '';
    const txt = (el.value || el.innerText || el.textContent || '').toLowerCase();
    if ((txt.includes('simpan') || txt.includes('berikutnya') || txt.includes('next')) && oc.includes('doPostBack')) {
      log('Klik via onclick doPostBack: ' + txt.slice(0,30));
      el.click();
      return true;
    }
  }

  // Cara 2: panggil __doPostBack langsung kalau ada
  if (typeof __doPostBack === 'function') {
    // Cari target dari tombol simpan
    if (tombol) {
      const oc = tombol.getAttribute('onclick') || tombol.getAttribute('href') || '';
      const m = oc.match(/__doPostBack\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/) ;
      if (m) {
        log('__doPostBack(' + m[1] + ')');
        __doPostBack(m[1], m[2]);
        return true;
      }
    }
  }

  // Cara 3: klik tombol biasa
  if (tombol) {
    log('Click tombol: ' + (tombol.value || tombol.innerText || '').slice(0,30));
    tombol.click();
    return true;
  }

  // Cara 4: submit form langsung
  const form = document.querySelector('form');
  if (form) {
    log('form.submit() sebagai last resort');
    // Set hidden field jika ada
    const evTarget = form.querySelector('[name="__EVENTTARGET"]');
    const evArg    = form.querySelector('[name="__EVENTARGUMENT"]');
    if (evTarget) evTarget.value = '';
    if (evArg)    evArg.value    = '';
    form.submit();
    return true;
  }

  log('❌ Tidak bisa klik Simpan!');
  return false;
}

// ===================== GROQ API =====================
async function getApiKey() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['groq_api_key'], res => resolve(res.groq_api_key || ''));
  });
}

async function tanyaGroq(soal, pilihan) {
  const key = await getApiKey();
  if (!key) {
    setStatus('❌ API Key belum diset!', '#f38ba8');
    log('Buka popup extension → set API Key');
    return null;
  }
  const valid = pilihan.filter(p => !p.skip);
  const pilihanText = valid.map((p, i) => `${String.fromCharCode(65+i)}. ${p.text}`).join('\n');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Jawab soal pilihan ganda. Balas HANYA: JAWABAN: [HURUF]' },
        { role: 'user', content: `SOAL: ${soal}\n\nPILIHAN:\n${pilihanText}\n\nBalas HANYA: JAWABAN: [HURUF]` }
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

// ===================== JAWAB SOAL =====================
async function jawabSoal(autoSubmit = false) {
  setStatus('🔍 Membaca soal...', '#89b4fa');
  document.getElementById('gd-soal').textContent    = '';
  document.getElementById('gd-pilihan').innerHTML   = '';
  document.getElementById('gd-answer').textContent  = '';

  const soal   = getSoal();
  const pilihan = getPilihan();

  if (!soal) {
    setStatus('❌ Soal tidak ditemukan', '#f38ba8');
    log('Soal tidak terdeteksi - coba Debug DOM');
    return;
  }
  document.getElementById('gd-soal').textContent = soal;
  log('Soal: ' + soal.slice(0, 50) + '...');

  const valid = pilihan.filter(p => !p.skip);
  document.getElementById('gd-pilihan').innerHTML =
    valid.map((p, i) => `<div>${String.fromCharCode(65+i)}. ${p.text.slice(0, 55)}</div>`).join('');

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
  if (!huruf) { setStatus('⚠️ Jawaban tidak terbaca', '#fab387'); return; }

  const idx = huruf.charCodeAt(0) - 65;
  const terpilih = valid[idx];
  if (!terpilih) { setStatus('⚠️ Index tidak valid', '#fab387'); return; }

  document.getElementById('gd-answer').textContent = `✅ ${huruf}. ${terpilih.text.slice(0, 55)}`;
  setStatus('✅ Terpilih: ' + huruf, '#a6e3a1');
  log('Pilih: ' + huruf + '. ' + terpilih.text.slice(0, 40));

  // Klik radio - berbagai cara untuk ASP.NET
  terpilih.radio.focus();
  terpilih.radio.checked = true;
  terpilih.radio.click();
  terpilih.radio.dispatchEvent(new Event('change', { bubbles: true }));
  terpilih.radio.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

  // Klik tombol Simpan
  if (autoSubmit) {
    setStatus('💾 Simpan...', '#89b4fa');
    await new Promise(r => setTimeout(r, 1200));
    const tombol = getTombolSimpan();
    log('Tombol: ' + (tombol ? (tombol.value || tombol.innerText || tombol.tagName) : 'tidak ada'));
    klikTombolSimpan(tombol);
  }
}

// ===================== MODE AUTO =====================
let autoMode = false;
function toggleAuto() {
  autoMode = !autoMode;
  const btn = document.getElementById('gd-btn-auto');
  if (!btn) return;
  if (autoMode) {
    btn.textContent = '⏹ Stop'; btn.style.background = '#f38ba8'; btn.style.color = '#1e1e2e';
    setStatus('🔄 Auto ON', '#a6e3a1');
    log('Auto mode aktif');
    // Simpan ke storage agar tetap aktif setelah refresh
    chrome.storage.sync.set({ auto_mode: true });
    jawabSoal(true);
  } else {
    btn.textContent = '🔄 Auto'; btn.style.background = '#313244'; btn.style.color = '#cdd6f4';
    setStatus('⏸ Auto OFF', '#fab387');
    log('Auto mode OFF');
    chrome.storage.sync.set({ auto_mode: false });
  }
}

// ===================== INIT =====================
createPanel();

chrome.storage.sync.get(['groq_api_key', 'auto_mode'], res => {
  if (res.groq_api_key) {
    setStatus('✅ Siap! Klik ▶ Jawab', '#a6e3a1');
    log('Extension aktif. API key tersedia.');
    if (res.auto_mode) {
      autoMode = true;
      const btn = document.getElementById('gd-btn-auto');
      if (btn) { btn.textContent = '⏹ Stop'; btn.style.background = '#f38ba8'; btn.style.color = '#1e1e2e'; }
      setStatus('🔄 Auto ON - Menjawab...', '#a6e3a1');
      log('Auto mode aktif dari storage, jawab otomatis...');
      setTimeout(() => jawabSoal(true), 900);
    }
  } else {
    setStatus('⚠️ Set API Key dulu!', '#f38ba8');
    log('Klik ikon 🤖 di toolbar Chrome untuk set API Key');
  }
});
