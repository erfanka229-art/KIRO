const apiKeyInput  = document.getElementById('api-key');
const autoCheck    = document.getElementById('auto-mode');
const statusBar    = document.getElementById('status-bar');
const toast        = document.getElementById('toast');
const toggleEye    = document.getElementById('toggle-eye');

// ===== LOAD SETTING =====
chrome.storage.sync.get(['groq_api_key', 'auto_mode'], res => {
  if (res.groq_api_key) {
    apiKeyInput.value = res.groq_api_key;
    statusBar.textContent = '✅ API Key tersimpan';
    statusBar.style.color = '#a6e3a1';
  } else {
    statusBar.textContent = '⚠️ API Key belum diset';
    statusBar.style.color = '#f38ba8';
  }
  autoCheck.checked = !!res.auto_mode;
});

// ===== TOGGLE SHOW/HIDE KEY =====
let showKey = false;
toggleEye.addEventListener('click', () => {
  showKey = !showKey;
  apiKeyInput.type = showKey ? 'text' : 'password';
  toggleEye.textContent = showKey ? '🙈' : '👁';
});

// ===== SIMPAN =====
document.getElementById('btn-save').addEventListener('click', () => {
  const key  = apiKeyInput.value.trim();
  const auto = autoCheck.checked;

  if (!key) {
    statusBar.textContent = '❌ API Key tidak boleh kosong!';
    statusBar.style.color = '#f38ba8';
    return;
  }
  if (!key.startsWith('gsk_')) {
    statusBar.textContent = '⚠️ API Key harus dimulai dengan gsk_';
    statusBar.style.color = '#fab387';
    return;
  }

  chrome.storage.sync.set({ groq_api_key: key, auto_mode: auto }, () => {
    statusBar.textContent = '✅ Setting tersimpan!';
    statusBar.style.color = '#a6e3a1';
    showToast('✅ Tersimpan!');
  });
});

// ===== TEST API KEY =====
document.getElementById('btn-test').addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    statusBar.textContent = '❌ Masukkan API Key dulu';
    statusBar.style.color = '#f38ba8';
    return;
  }

  statusBar.textContent = '🧪 Testing...';
  statusBar.style.color = '#89b4fa';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Balas dengan: OK' }],
        max_tokens: 5
      })
    });

    if (res.ok) {
      statusBar.textContent = '✅ API Key valid & berfungsi!';
      statusBar.style.color = '#a6e3a1';
      showToast('✅ API Key OK!');
    } else {
      const e = await res.json().catch(() => ({}));
      statusBar.textContent = '❌ ' + (e.error?.message || 'API Key tidak valid');
      statusBar.style.color = '#f38ba8';
    }
  } catch (err) {
    statusBar.textContent = '❌ Error: ' + err.message;
    statusBar.style.color = '#f38ba8';
  }
});

// ===== HAPUS =====
document.getElementById('btn-clear').addEventListener('click', () => {
  chrome.storage.sync.remove(['groq_api_key', 'auto_mode'], () => {
    apiKeyInput.value = '';
    autoCheck.checked = false;
    statusBar.textContent = '🗑 API Key dihapus';
    statusBar.style.color = '#fab387';
    showToast('🗑 Dihapus');
  });
});

// ===== TOAST =====
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2000);
}
