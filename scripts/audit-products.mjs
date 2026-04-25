// Quick audit script to inspect product → modifier mapping
const res = await fetch('http://localhost:3001/products/active');
const products = await res.json();

console.log(`\n=== TOTAL ACTIVE PRODUCTS: ${products.length} ===\n`);

const ceviches = products.filter(p => p.category && (
    p.category.includes('CEVICHE') || p.category.includes('PROMOS') || 
    p.category.includes('RICO') || p.category === 'GOHAN' || p.category === 'BOWLS' || 
    p.category === 'CRUDOS' || p.category === 'ROLLS PREMIUM' || p.category === 'HAND ROLLS'
));

console.log(`Configurable products (${ceviches.length}):\n`);

ceviches.forEach(p => {
    const mods = (p.modifiers || []).filter(m => m.options && m.options.length > 0);
    const variants = p.variants || [];
    const hasContent = mods.length > 0 || variants.length > 0 || p.isConfigurable || p.maxProteins > 0;
    
    console.log(`${hasContent ? '✅' : '⚠️'} [${p.category}] ${p.name}`);
    console.log(`   price: $${p.price} | configurable: ${p.isConfigurable} | maxProteins: ${p.maxProteins}`);
    if (variants.length > 0) console.log(`   variants: ${variants.map(v => v.name + '($' + v.price + ')').join(', ')}`);
    if (mods.length > 0) console.log(`   modifiers: ${mods.map(m => m.displayName + ' [' + m.type + ', ' + m.options.length + ' opts, min:' + m.minSelections + ', max:' + m.maxSelections + ']').join(' → ')}`);
    if (!hasContent) console.log(`   ⚠️  NO MODIFIERS / NO VARIANTS / NOT CONFIGURABLE`);
    console.log('');
});

// Also list all modifier groups
const groupsRes = await fetch('http://localhost:3001/modifiers/groups');
const groups = await groupsRes.json();
console.log(`\n=== ALL MODIFIER GROUPS (${groups.length}) ===\n`);
groups.forEach(g => {
    console.log(`[${g.assignedProductsCount || 0} products] ${g.name} (${g.type}, ${g.options.length} opts, min:${g.minSelections}, max:${g.maxSelections})`);
});
