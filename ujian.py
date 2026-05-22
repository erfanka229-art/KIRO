"""
AUTO ANSWER UJIAN GUNADARMA
Menggunakan Playwright (Python) + Groq AI

=== CARA PAKAI ===

1. Install dependensi:
   pip install -r requirements.txt

2. Set API Key Groq:
   - Edit baris GROQ_API_KEY di bawah, ATAU
   - Windows : set GROQ_API_KEY=gsk_xxx
   - Linux   : export GROQ_API_KEY=gsk_xxx

3. Jalankan script:
   python ujian.py

4. Browser Chrome ASLI akan terbuka (bukan Chromium Playwright)
   → Website tidak bisa mendeteksi automation

5. Login manual di browser, pilih mata kuliah
6. Setelah soal pertama tampil → tekan ENTER di terminal
7. Script otomatis jawab semua soal!

=== KENAPA PAKAI CHROME ASLI? ===
Gunadarma mendeteksi Playwright/Chromium via CDP fingerprint.
Script ini memakai Chrome yang sudah terinstall di komputer Anda
dengan cara yang sama persis seperti user biasa membuka browser.
"""

import asyncio
import os
import re
import sys
import subprocess
import platform
import time
import httpx
from playwright.async_api import async_playwright, Page

# ─────────────────────────────────────────────
#  KONFIGURASI - EDIT DI SINI
# ─────────────────────────────────────────────
GROQ_API_KEY   = os.environ.get("GROQ_API_KEY", "MASUKKAN_API_KEY_GROQ_ANDA")
GROQ_MODEL     = "llama-3.3-70b-versatile"
GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions"

UJIAN_URL      = "https://semesterpendek.gunadarma.ac.id/uman_ujian_pilih_mk.aspx"

DELAY_SEBELUM_SIMPAN = 1.5   # detik tunggu setelah pilih jawaban
DELAY_SETELAH_SIMPAN = 2.0   # detik tunggu setelah klik Simpan (halaman refresh)

# Port debugging Chrome - jangan diubah kecuali bentrok dengan aplikasi lain
CHROME_DEBUG_PORT = 9222

# Path Chrome - akan dicari otomatis, atau isi manual jika tidak ditemukan
# Contoh Windows: r"C:\Program Files\Google\Chrome\Application\chrome.exe"
# Contoh Linux  : "/usr/bin/google-chrome"
CHROME_PATH_MANUAL = ""

# ─────────────────────────────────────────────
#  WARNA TERMINAL
# ─────────────────────────────────────────────
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    BLUE   = "\033[94m"
    GRAY   = "\033[90m"

def info(msg):    print(f"{C.CYAN}[INFO]{C.RESET} {msg}")
def ok(msg):      print(f"{C.GREEN}[OK]{C.RESET}   {msg}")
def warn(msg):    print(f"{C.YELLOW}[WARN]{C.RESET} {msg}")
def err(msg):     print(f"{C.RED}[ERR]{C.RESET}  {msg}")
def soal_log(m):  print(f"{C.BLUE}[SOAL]{C.RESET} {m}")
def jawab(msg):   print(f"{C.GREEN}[JWAB]{C.RESET} {C.BOLD}{msg}{C.RESET}")
def debug(msg):   print(f"{C.GRAY}[DBG]{C.RESET}  {msg}")

# ─────────────────────────────────────────────
#  CARI PATH CHROME ASLI DI KOMPUTER
# ─────────────────────────────────────────────
def cari_chrome() -> str:
    """Cari executable Chrome yang terinstall di komputer"""
    if CHROME_PATH_MANUAL:
        if os.path.exists(CHROME_PATH_MANUAL):
            return CHROME_PATH_MANUAL
        warn(f"CHROME_PATH_MANUAL tidak ditemukan: {CHROME_PATH_MANUAL}")

    os_name = platform.system()

    if os_name == "Windows":
        kandidat = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",  # Edge sebagai fallback
        ]
    elif os_name == "Darwin":  # macOS
        kandidat = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
    else:  # Linux
        kandidat = [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            "/snap/bin/chromium",
        ]

    for path in kandidat:
        if os.path.exists(path):
            return path

    return ""

# ─────────────────────────────────────────────
#  GROQ API
# ─────────────────────────────────────────────
async def tanya_groq(teks_soal: str, pilihan: list[str]) -> str | None:
    """Kirim soal ke Groq AI, kembalikan huruf jawaban (A/B/C/D/E)"""
    if not GROQ_API_KEY or GROQ_API_KEY == "MASUKKAN_API_KEY_GROQ_ANDA":
        err("API Key Groq belum diisi!")
        err("Edit ujian.py → isi GROQ_API_KEY, atau jalankan:")
        err("  export GROQ_API_KEY='gsk_xxx'  (Linux/Mac)")
        err("  set GROQ_API_KEY=gsk_xxx        (Windows)")
        return None

    # Format pilihan jawaban
    pilihan_valid = [p for p in pilihan if not re.search(r'pass|tidak menjawab', p, re.I)]
    pilihan_text  = "\n".join(
        f"{chr(65+i)}. {p}" for i, p in enumerate(pilihan_valid)
    )

    prompt = (
        f"Jawab soal ujian pilihan ganda berikut. "
        f"Balas HANYA dengan format: JAWABAN: [HURUF]\n\n"
        f"SOAL: {teks_soal}\n\n"
        f"PILIHAN:\n{pilihan_text}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Kamu menjawab soal ujian pilihan ganda. "
                                       "Balas HANYA dengan: JAWABAN: [HURUF]",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 20,
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            debug(f"Groq raw: {content}")
            return content
    except httpx.HTTPStatusError as e:
        err(f"Groq API error {e.response.status_code}: {e.response.text[:200]}")
        return None
    except Exception as e:
        err(f"Groq error: {e}")
        return None


def ekstrak_huruf(ai_response: str) -> str | None:
    """Ekstrak huruf jawaban dari respons AI"""
    if not ai_response:
        return None
    m = re.search(r'JAWABAN\s*:\s*([A-E])', ai_response, re.I)
    if m:
        return m.group(1).upper()
    # fallback: huruf tunggal di awal
    m = re.search(r'\b([A-E])\b', ai_response, re.I)
    if m:
        return m.group(1).upper()
    return None

# ─────────────────────────────────────────────
#  BACA SOAL DARI HALAMAN
# ─────────────────────────────────────────────
async def baca_soal(page: Page) -> str | None:
    """Baca teks soal dari DOM halaman ujian Gunadarma"""

    # Tunggu halaman load
    await page.wait_for_load_state("domcontentloaded")

    # Coba selector spesifik dulu (ASP.NET biasanya punya id mengandung 'soal'/'Label')
    spesifik = [
        "[id*='oal']", "[id*='Soal']", "[id*='question']",
        "[id*='Question']", "[id*='soalLabel']", "[id*='lblSoal']",
    ]
    for sel in spesifik:
        try:
            el = page.locator(sel).first
            count = await el.count()
            if count > 0:
                txt = (await el.inner_text()).strip()
                if len(txt) > 15 and not re.search(r'pilihlah|waktu', txt, re.I):
                    return txt
        except Exception:
            pass

    # Fallback: evaluasi JS untuk cari text node panjang
    soal_text = await page.evaluate("""
        () => {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null
            );
            let node;
            const skip = /simpan|waktu ujian|pilihlah|pass\\s*\\/|tidak menjawab|copyright|gunadarma university|logout|selamat datang/i;
            while ((node = walker.nextNode())) {
                const t = node.textContent.trim();
                if (t.length > 25 && t.length < 500 && !skip.test(t)) {
                    // Pastikan bukan dari script/style
                    const tag = node.parentElement?.tagName?.toLowerCase();
                    if (tag && !['script','style','noscript'].includes(tag)) {
                        return t;
                    }
                }
            }
            return null;
        }
    """)
    return soal_text


async def baca_pilihan(page: Page) -> list[dict]:
    """
    Baca semua pilihan jawaban (radio button) dari halaman
    Return: list of { text, value, element_id, name }
    """
    pilihan = await page.evaluate("""
        () => {
            const radios = [...document.querySelectorAll('input[type="radio"]')];
            return radios.map((r, i) => {
                let text = '';

                // Cari label[for=id]
                if (r.id) {
                    const lbl = document.querySelector(`label[for="${r.id}"]`);
                    if (lbl) text = lbl.innerText.trim();
                }
                // nextSibling
                if (!text) {
                    let s = r.nextSibling;
                    while (s) {
                        const t = (s.textContent || '').trim();
                        if (t.length > 1) { text = t; break; }
                        s = s.nextSibling;
                    }
                }
                // parent
                if (!text && r.parentElement) {
                    text = r.parentElement.innerText.replace(/\\s+/g,' ').trim().slice(0,150);
                }
                return {
                    index: i,
                    text: text || `Pilihan ${i+1}`,
                    value: r.value,
                    id: r.id,
                    name: r.name,
                    skip: /pass\\/tidak menjawab/i.test(text)
                };
            });
        }
    """)
    return pilihan


# ─────────────────────────────────────────────
#  KLIK TOMBOL SIMPAN (ASP.NET WebForms aware)
# ─────────────────────────────────────────────
async def klik_simpan(page: Page) -> bool:
    """
    Klik tombol 'Simpan dan pindah ke Soal Berikutnya'
    Mendukung ASP.NET __doPostBack
    """

    # Cara 1: Klik elemen yang mengandung teks simpan/berikutnya
    locators = [
        "text=Simpan dan pindah",
        "text=Simpan",
        "text=Berikutnya",
        "input[value*='Simpan']",
        "input[value*='simpan']",
        "input[value*='Berikutnya']",
        "a:has-text('Simpan')",
        "button:has-text('Simpan')",
    ]
    for loc_str in locators:
        try:
            loc = page.locator(loc_str).first
            if await loc.count() > 0 and await loc.is_visible():
                info(f"Klik via locator: {loc_str}")
                await loc.click()
                return True
        except Exception:
            pass

    # Cara 2: Cari via JavaScript - elemen dengan onclick __doPostBack + teks simpan
    result = await page.evaluate("""
        () => {
            const all = [...document.querySelectorAll('[onclick], input[type="button"], input[type="submit"], button, a')];
            for (const el of all) {
                const txt = (el.value || el.innerText || el.textContent || '').toLowerCase();
                const oc  = (el.getAttribute('onclick') || '');
                if (/simpan|berikutnya|next/.test(txt) || /simpan|berikutnya/.test(oc)) {
                    // Coba doPostBack dulu
                    const m = oc.match(/__doPostBack\\s*\\(\\s*['"]([^'"]+)['"]\\s*,\\s*['"]([^'"]*)['"]\\s*\\)/);
                    if (m && typeof __doPostBack === 'function') {
                        __doPostBack(m[1], m[2]);
                        return 'doPostBack:' + m[1];
                    }
                    el.click();
                    return 'click:' + (el.tagName + ' ' + txt).slice(0,40);
                }
            }
            return null;
        }
    """)

    if result:
        info(f"Klik via JS: {result}")
        return True

    # Cara 3: Submit form langsung
    submitted = await page.evaluate("""
        () => {
            const form = document.querySelector('form');
            if (form) {
                const t = form.querySelector('[name="__EVENTTARGET"]');
                const a = form.querySelector('[name="__EVENTARGUMENT"]');
                if (t) t.value = '';
                if (a) a.value = '';
                form.submit();
                return true;
            }
            return false;
        }
    """)
    if submitted:
        warn("Klik Simpan via form.submit() (last resort)")
        return True

    err("Tidak bisa klik tombol Simpan!")
    return False


# ─────────────────────────────────────────────
#  PROSES SATU SOAL
# ─────────────────────────────────────────────
async def proses_soal(page: Page, nomor: int) -> bool:
    """
    Proses satu soal: baca → tanya AI → pilih jawaban → klik Simpan
    Return True jika berhasil klik Simpan
    """
    print(f"\n{'─'*55}")
    print(f"{C.BOLD}  SOAL #{nomor}{C.RESET}")
    print(f"{'─'*55}")

    # 1. Baca soal
    teks = await baca_soal(page)
    if not teks:
        warn("Soal tidak terdeteksi di halaman ini (mungkin bukan halaman soal)")
        return False
    soal_log(teks[:200] + ("..." if len(teks) > 200 else ""))

    # 2. Baca pilihan
    pilihan_raw = await baca_pilihan(page)
    pilihan_valid = [p for p in pilihan_raw if not p.get("skip")]

    if not pilihan_valid:
        warn("Pilihan jawaban tidak ditemukan!")
        return False

    print(f"\n  Pilihan:")
    for i, p in enumerate(pilihan_valid):
        print(f"  {C.GRAY}{chr(65+i)}. {p['text'][:70]}{C.RESET}")

    # 3. Tanya Groq AI
    info("Mengirim ke Groq AI...")
    ai_resp = await tanya_groq(teks, [p["text"] for p in pilihan_valid])
    if not ai_resp:
        err("Tidak mendapat respons dari AI")
        return False

    huruf = ekstrak_huruf(ai_resp)
    if not huruf:
        warn(f"Tidak bisa ekstrak huruf dari: {ai_resp}")
        return False

    idx = ord(huruf) - ord("A")
    if idx >= len(pilihan_valid):
        warn(f"Index {idx} di luar range ({len(pilihan_valid)} pilihan)")
        return False

    terpilih = pilihan_valid[idx]
    jawab(f"Jawaban AI: {huruf}. {terpilih['text'][:70]}")

    # 4. Klik radio button
    try:
        # Klik via id atau value
        if terpilih.get("id"):
            await page.click(f"#{terpilih['id']}")
        elif terpilih.get("name") and terpilih.get("value"):
            await page.click(
                f"input[type='radio'][name='{terpilih['name']}'][value='{terpilih['value']}']"
            )
        else:
            # Fallback: klik radio ke-index via JS
            await page.evaluate(f"""
                () => {{
                    const radios = [...document.querySelectorAll('input[type="radio"]')]
                        .filter(r => !/pass|tidak menjawab/i.test(
                            r.parentElement?.innerText || ''
                        ));
                    if (radios[{idx}]) {{
                        radios[{idx}].checked = true;
                        radios[{idx}].click();
                        radios[{idx}].dispatchEvent(new Event('change', {{bubbles: true}}));
                    }}
                }}
            """)
        ok(f"Radio button dipilih: {huruf}")
    except Exception as e:
        err(f"Gagal klik radio: {e}")
        return False

    # 5. Tunggu sebentar lalu klik Simpan
    await asyncio.sleep(DELAY_SEBELUM_SIMPAN)
    info("Klik tombol Simpan...")
    success = await klik_simpan(page)

    if success:
        # Tunggu halaman refresh/load soal berikutnya
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=10_000)
            await asyncio.sleep(DELAY_SETELAH_SIMPAN)
            ok("Soal tersimpan, pindah ke soal berikutnya...")
        except Exception:
            await asyncio.sleep(DELAY_SETELAH_SIMPAN)

    return success


# ─────────────────────────────────────────────
#  CEK APAKAH MASIH ADA SOAL
# ─────────────────────────────────────────────
async def ada_soal(page: Page) -> bool:
    """Cek apakah halaman saat ini adalah halaman soal ujian"""
    url = page.url.lower()
    # Jika URL berubah jauh dari ujian, berarti sudah selesai
    if "uman_ujian" not in url and "ujian" not in url:
        return False

    # Cek apakah ada radio button (tanda ada soal)
    count = await page.locator("input[type='radio']").count()
    return count > 0


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────
async def main():
    print(f"""
{C.BOLD}{C.CYAN}╔══════════════════════════════════════════════════╗
║   AUTO ANSWER UJIAN GUNADARMA × GROQ AI         ║
║   Playwright Python - Chrome Asli Mode           ║
╚══════════════════════════════════════════════════╝{C.RESET}
""")

    # Validasi API key
    if GROQ_API_KEY == "MASUKKAN_API_KEY_GROQ_ANDA":
        err("API Key belum diisi!")
        err("Edit ujian.py → isi GROQ_API_KEY")
        err("Atau jalankan: set GROQ_API_KEY=gsk_xxx  (Windows)")
        err("              export GROQ_API_KEY=gsk_xxx (Linux/Mac)")
        sys.exit(1)

    info(f"Model : {GROQ_MODEL}")
    info(f"URL   : {UJIAN_URL}")
    info(f"Port  : {CHROME_DEBUG_PORT}")
    print()

    # Cari Chrome
    chrome_path = cari_chrome()
    if not chrome_path:
        err("Google Chrome tidak ditemukan di komputer!")
        err("Install Chrome dari: https://www.google.com/chrome/")
        err("Atau isi CHROME_PATH_MANUAL di script dengan path Chrome Anda")
        sys.exit(1)
    info(f"Chrome: {chrome_path}")

    # Buat folder profil sementara agar tidak konflik dengan Chrome yang sudah buka
    profil_dir = os.path.join(os.path.dirname(__file__), "chrome_profil_ujian")
    os.makedirs(profil_dir, exist_ok=True)
    info(f"Profil : {profil_dir}")
    print()

    # Jalankan Chrome ASLI dengan remote debugging (bukan Playwright Chromium!)
    chrome_args = [
        chrome_path,
        f"--remote-debugging-port={CHROME_DEBUG_PORT}",
        f"--user-data-dir={profil_dir}",
        "--no-first-run",
        "--no-default-browser-check",
        "--start-maximized",
        UJIAN_URL,
    ]

    info("Membuka Chrome asli...")
    chrome_proc = subprocess.Popen(
        chrome_args,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Tunggu Chrome siap
    info("Menunggu Chrome siap...")
    time.sleep(3)

    # Playwright connect ke Chrome yang sudah buka (bukan launch baru)
    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp(
                f"http://localhost:{CHROME_DEBUG_PORT}"
            )
        except Exception as e:
            err(f"Tidak bisa connect ke Chrome: {e}")
            err("Pastikan Chrome sudah terbuka dan port tidak diblokir firewall")
            chrome_proc.kill()
            sys.exit(1)

        ok("Terhubung ke Chrome!")

        # Ambil halaman yang sudah terbuka
        contexts = browser.contexts
        if not contexts:
            err("Tidak ada context browser!")
            chrome_proc.kill()
            sys.exit(1)

        context = contexts[0]
        pages   = context.pages
        page    = pages[0] if pages else await context.new_page()

        # Navigasi ke halaman ujian kalau belum di sana
        if UJIAN_URL not in page.url:
            await page.goto(UJIAN_URL, wait_until="domcontentloaded", timeout=30_000)

        print(f"""
{C.YELLOW}╔══════════════════════════════════════════════════╗
║  AKSI ANDA DIPERLUKAN:                           ║
║                                                  ║
║  1. Login di Chrome yang terbuka                 ║
║  2. Pilih mata kuliah ujian                      ║
║  3. Tunggu soal PERTAMA tampil                   ║
║  4. Kembali ke terminal ini                      ║
║  5. Tekan ENTER untuk mulai auto-answer          ║
╚══════════════════════════════════════════════════╝{C.RESET}
""")
        input("  ⏎  Tekan ENTER setelah soal pertama tampil... ")
        print()

        # Refresh referensi page (mungkin sudah pindah halaman saat login)
        pages = context.pages
        page  = pages[0] if pages else page

        # Loop jawab soal
        nomor   = 1
        max_soal = 200

        while nomor <= max_soal:
            # Refresh referensi page setiap iterasi (karena page bisa berganti)
            pages = context.pages
            if not pages:
                ok("Browser ditutup. Selesai.")
                break
            page = pages[0]

            if not await ada_soal(page):
                ok("Tidak ada soal lagi. Ujian selesai!")
                break

            berhasil = await proses_soal(page, nomor)

            if not berhasil:
                print()
                warn("Gagal memproses soal ini.")
                pilihan_user = input(
                    "  [r] Retry  [s] Skip (klik Simpan manual dulu)  [q] Quit → "
                ).strip().lower()

                if pilihan_user == "q":
                    info("Dihentikan oleh user.")
                    break
                elif pilihan_user == "s":
                    warn("Silakan klik Simpan manual di browser!")
                    input("  ⏎  Tekan ENTER setelah Anda klik Simpan... ")
                else:
                    info("Retry soal ini...")
                    continue

            nomor += 1
        else:
            warn(f"Batas {max_soal} soal tercapai.")

        print(f"""
{C.GREEN}╔══════════════════════════════════════════════════╗
║  ✅ SELESAI!                                     ║
║  Total soal diproses: {nomor-1:<3}                       ║
║                                                  ║
║  Browser masih terbuka - silakan cek hasilnya    ║
╚══════════════════════════════════════════════════╝{C.RESET}
""")
        input("  ⏎  Tekan ENTER untuk tutup browser... ")

        await browser.close()
        chrome_proc.terminate()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{C.YELLOW}Dihentikan (Ctrl+C){C.RESET}")
