/**
 * ============================================
 * DEBUG SELECTOR - Untuk Menganalisis Struktur Halaman Ujian
 * ============================================
 * 
 * Jalankan script ini di Console browser untuk melihat struktur halaman
 * dan menemukan selector yang tepat untuk soal ujian
 */

(function debugPageStructure() {
    console.log('🔍 ============================================');
    console.log('🔍 DEBUG SELECTOR - Analisis Struktur Halaman');
    console.log('🔍 ============================================\n');

    // 1. Tampilkan semua form
    console.log('📋 FORMS:');
    const forms = document.querySelectorAll('form');
    forms.forEach((form, i) => {
        console.log(`   Form ${i + 1}:`, form.id || form.name || form.className || 'no-id');
        console.log('      Action:', form.action);
    });

    // 2. Tampilkan semua tabel
    console.log('\n📋 TABLES:');
    const tables = document.querySelectorAll('table');
    tables.forEach((table, i) => {
        const id = table.id || 'no-id';
        const className = table.className || 'no-class';
        console.log(`   Table ${i + 1}: id="${id}" class="${className}"`);
        console.log(`      Rows: ${table.rows.length}`);
        console.log(`      Preview: ${table.innerText.substring(0, 100)}...`);
    });

    // 3. Tampilkan semua input radio/checkbox
    console.log('\n📋 INPUT (Radio/Checkbox):');
    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    const groupedInputs = {};
    
    inputs.forEach(input => {
        const name = input.name || 'unnamed';
        if (!groupedInputs[name]) {
            groupedInputs[name] = [];
        }
        groupedInputs[name].push(input);
    });

    Object.entries(groupedInputs).forEach(([name, inputList]) => {
        console.log(`   Group "${name}": ${inputList.length} options`);
        inputList.forEach((input, i) => {
            const label = document.querySelector(`label[for="${input.id}"]`)?.innerText || 
                          input.parentElement?.innerText?.substring(0, 50) ||
                          input.value || 'no-label';
            console.log(`      ${String.fromCharCode(65 + i)}. value="${input.value}" id="${input.id}" label="${label}"`);
        });
    });

    // 4. Tampilkan semua div yang mungkin berisi soal
    console.log('\n📋 POTENTIAL QUESTION CONTAINERS:');
    const potentialContainers = document.querySelectorAll([
        'div[id*="soal"]',
        'div[id*="question"]',
        'div[id*="quiz"]',
        'div[class*="soal"]',
        'div[class*="question"]',
        'div[class*="quiz"]',
        'tr[id*="soal"]',
        'tr[id*="question"]',
        'table[id*="soal"]',
        'table[id*="question"]'
    ].join(', '));

    potentialContainers.forEach((container, i) => {
        console.log(`   Container ${i + 1}:`, container.tagName, 
                    `id="${container.id}"`, `class="${container.className}"`);
        console.log(`      Text preview: ${container.innerText.substring(0, 150)}...`);
    });

    // 5. Tampilkan struktur DOM yang mungkin berisi soal
    console.log('\n📋 ALL TEXT CONTENT (first 2000 chars):');
    console.log(document.body.innerText.substring(0, 2000));

    // 6. Generate selector suggestion
    console.log('\n💡 ============================================');
    console.log('💡 SELECTOR SUGGESTION:');
    console.log('💡 ============================================');
    
    if (tables.length > 0) {
        console.log('   → Kemungkinan soal ada dalam <table>');
        console.log('   → Coba: document.querySelectorAll("table tr")');
    }
    
    if (Object.keys(groupedInputs).length > 0) {
        console.log(`   → Ditemukan ${Object.keys(groupedInputs).length} grup soal`);
        console.log('   → Setiap grup memiliki pilihan ganda');
    }

    // 7. Helper function untuk testing
    window.testSelector = function(selector) {
        console.log(`\n🧪 Testing selector: "${selector}"`);
        const elements = document.querySelectorAll(selector);
        console.log(`   Found: ${elements.length} elements`);
        elements.forEach((el, i) => {
            console.log(`\n   Element ${i + 1}:`);
            console.log(`   ${el.innerText.substring(0, 300)}`);
        });
        return elements;
    };

    window.showQuestion = function(index) {
        console.log(`\n📖 Question ${index}:`);
        const radios = document.querySelectorAll(`input[type="radio"][name*="${index}"], input[type="radio"][name="${index}"]`);
        if (radios.length > 0) {
            radios.forEach((radio, i) => {
                const label = radio.parentElement?.innerText || radio.value;
                console.log(`   ${String.fromCharCode(65 + i)}. ${label}`);
            });
        }
    };

    console.log('\n📌 TIPS:');
    console.log('   - Jalankan testSelector("selector-anda") untuk test selector');
    console.log('   - Jalankan showQuestion(1) untuk melihat soal nomor 1');
    console.log('   - Inspect element di browser untuk selector lebih detail');

})();
