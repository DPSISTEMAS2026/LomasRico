const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const p = new PrismaClient();

(async () => {
  // Read Excel
  const wb = XLSX.readFile('docs/references/INVENTARIO LOMASRICO.xlsx');
  
  // Parse VerdurasProteinas sheet
  const sheet = wb.Sheets['VerdurasProteinas'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Parse Hoja 3 (mermas)
  const mermaSheet = wb.Sheets['Hoja 3'];
  const mermaData = XLSX.utils.sheet_to_json(mermaSheet, { header: 1, defval: '' });

  // Build merma map
  const mermaMap = new Map();
  for (const row of mermaData) {
    // Verduras (col B=name, col C=rend)
    if (row[1] && row[2] && typeof row[2] === 'number') {
      mermaMap.set(row[1].toString().toLowerCase().trim(), row[2]);
    }
    if (row[1] && typeof row[2] === 'string' && row[2].includes('g')) {
      // Salsas simples con rendimiento en gramos
      mermaMap.set(row[1].toString().toLowerCase().trim(), row[2]);
    }
    // Proteinas (col F=name, col G=rend)
    if (row[5] && row[6] && (typeof row[6] === 'number' || typeof row[6] === 'string')) {
      mermaMap.set(row[5].toString().toLowerCase().trim(), row[6]);
    }
  }

  // Build Excel price reference
  const excelItems = [];
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    // Verduras (cols 0-3)
    if (row[0] && row[2]) {
      excelItems.push({ name: row[0].toString().trim(), unit: row[1]?.toString() || '', price: Number(row[2]) || 0, provider: row[3]?.toString() || '', section: 'VERDURA' });
    }
    // Proteinas (cols 7-10)
    if (row[7] && row[9]) {
      excelItems.push({ name: row[7].toString().trim(), unit: row[8]?.toString() || '', price: Number(row[9]) || 0, provider: row[10]?.toString() || '', section: 'PROTEINA' });
    }
    // Abarrotes (cols 14-17)
    if (row[14] && row[16]) {
      excelItems.push({ name: row[14].toString().trim(), unit: row[15]?.toString() || '', price: Number(row[16]) || 0, provider: row[17]?.toString() || '', section: 'ABARROTE' });
    }
  }

  // Get DB inventory
  const dbItems = await p.inventoryItem.findMany({
    select: { id: true, name: true, role: true, unit: true, currentStock: true, costPerUnit: true, type: true }
  });

  // Normalize for matching
  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  console.log('\n=== COMPARACIÓN EXCEL vs DB ===\n');
  console.log('EXCEL'.padEnd(25), 'UNID'.padEnd(8), 'PRECIO'.padStart(8), 'PROV'.padEnd(12), '| DB NAME'.padEnd(30), 'DB COST'.padStart(8), 'MERMA'.padStart(8), 'MATCH');
  console.log('-'.repeat(130));

  const unmatchedExcel = [];
  
  for (const item of excelItems) {
    const normalized = normalize(item.name);
    
    // Find matching DB item
    let dbMatch = dbItems.find(db => {
      const dbNorm = normalize(db.name);
      return dbNorm === normalized 
        || dbNorm.includes(normalized) 
        || normalized.includes(dbNorm.split(' ')[0]);
    });

    const merma = mermaMap.get(item.name.toLowerCase().trim());
    const mermaStr = merma ? (typeof merma === 'number' ? `${(merma*100).toFixed(0)}%` : merma) : '-';
    
    if (dbMatch) {
      const dbCost = Number(dbMatch.costPerUnit);
      const priceMatch = dbCost === item.price ? '✅' : (dbCost === 0 ? '⚠️ $0' : `❌ $${dbCost}`);
      console.log(
        item.name.padEnd(25),
        item.unit.padEnd(8),
        ('$' + item.price.toLocaleString()).padStart(8),
        item.provider.padEnd(12),
        ('| ' + dbMatch.name).padEnd(30),
        ('$' + dbCost.toLocaleString()).padStart(8),
        mermaStr.padStart(8),
        priceMatch
      );
    } else {
      unmatchedExcel.push(item);
      console.log(
        item.name.padEnd(25),
        item.unit.padEnd(8),
        ('$' + item.price.toLocaleString()).padStart(8),
        item.provider.padEnd(12),
        '| ❌ NO EXISTE EN DB'.padEnd(30),
        ''.padStart(8),
        mermaStr.padStart(8),
        '🔴 FALTA'
      );
    }
  }

  // Items in DB but not in Excel
  console.log('\n\n=== ITEMS EN DB SIN REFERENCIA EN EXCEL ===\n');
  const matchedDbIds = new Set();
  for (const item of excelItems) {
    const normalized = normalize(item.name);
    const dbMatch = dbItems.find(db => {
      const dbNorm = normalize(db.name);
      return dbNorm === normalized || dbNorm.includes(normalized) || normalized.includes(dbNorm.split(' ')[0]);
    });
    if (dbMatch) matchedDbIds.add(dbMatch.id);
  }

  for (const db of dbItems) {
    if (!matchedDbIds.has(db.id)) {
      console.log(`  ${db.role?.padEnd(18) || 'N/A'.padEnd(18)} ${db.name.padEnd(30)} $${Number(db.costPerUnit).toLocaleString().padStart(8)} ${db.unit}`);
    }
  }

  // Merma summary
  console.log('\n\n=== MERMAS/RENDIMIENTO (Hoja 3) ===\n');
  for (const [name, value] of mermaMap) {
    if (typeof value === 'number') {
      const effectiveCostMultiplier = (1 / value).toFixed(2);
      console.log(`  ${name.padEnd(20)} rinde ${(value*100).toFixed(0)}% → merma ${((1-value)*100).toFixed(0)}% → multiplicador costo: x${effectiveCostMultiplier}`);
    } else {
      console.log(`  ${name.padEnd(20)} rinde ${value}`);
    }
  }

  await p.$disconnect();
})();
