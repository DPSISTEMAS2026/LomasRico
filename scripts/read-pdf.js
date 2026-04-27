const fs = require('fs');
const { getDocument } = require('pdfjs-dist/legacy/build/pdf.mjs');

async function main() {
  const files = [
    'docs/references/RECETAS   LOMASRICO.pdf',
    'docs/references/Fichas De Productos – Lo Más Rico.pdf'
  ];
  
  let output = '';
  
  for (const file of files) {
    output += `\n${'='.repeat(60)}\nFILE: ${file}\n${'='.repeat(60)}\n`;
    
    const data = new Uint8Array(fs.readFileSync(file));
    const doc = await getDocument({ data, useSystemFonts: true }).promise;
    
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      output += `\n--- Page ${i} ---\n${text}\n`;
    }
  }
  
  fs.writeFileSync('scripts/recetas-pdf.txt', output, 'utf8');
  console.log('OK, chars:', output.length);
}

main().catch(e => console.error('Error:', e.message));
