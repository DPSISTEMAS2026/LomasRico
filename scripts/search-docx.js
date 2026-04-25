
const fs = require('fs');
const xmlPath = 'd:\\PRODUCCION-LO-MAS-RICO-V3\\temp_gramajes\\word\\document.xml';
const content = fs.readFileSync(xmlPath, 'utf8');

// Split by tags to make it readable line-by-line (approx)
const lines = content.replace(/>/g, '>\n').split('\n');

const keywords = ['Base 4 kilos', 'Peruano', 'Tropical', 'Leche de tigre', 'pimentón', 'cebolla', 'choclo', 'palta'];

console.log("--- SEARCHING ---");
lines.forEach((line, idx) => {
    // Only look at lines with text content (inside w:t)
    if (line.includes('<w:t') && !line.includes('<w:t/>')) {
        const text = line.replace(/<[^>]+>/g, '').trim();
        if (!text) return;

        // Context: Print surrounding text lines
        // Check if interesting
        const hit = keywords.some(k => text.toLowerCase().includes(k.toLowerCase()));
        if (hit) {
            console.log(`[L${idx}] Found: ${text}`);
            // Print neighbors
            for (let i = 1; i <= 5; i++) {
                if (lines[idx + i]) {
                    const nextText = lines[idx + i].replace(/<[^>]+>/g, '').trim();
                    if (nextText) console.log(`    + ${nextText}`);
                }
            }
        }
    }
});
