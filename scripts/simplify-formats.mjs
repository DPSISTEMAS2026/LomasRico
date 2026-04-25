import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    console.log('\n🔧 SIMPLIFYING CEVICHE PRODUCTS AND FORMATS\n');

    const products = await prisma.sellingProduct.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true, price: true, description: true, imageUrl: true }
    });

    const ceviches = products.filter(p => p.category.includes('CEVICHE') || p.category === 'LO MÁS RICO');
    
    // Group by base name
    const groups = {};
    for (const c of ceviches) {
        // Regex to extract base name "Ceviche LOMASRico" from "Ceviche LOMASRICO (350G)"
        const match = c.name.match(/^(.*?)(?:\s*\(?(?:350g|500g|750g|1Kg|1 Litro)\)?)*$/i);
        let baseName = match ? match[1].trim() : c.name;
        
        // Ignore "AGRANDA" options or other non-size variants
        if (!groups[baseName]) groups[baseName] = [];
        groups[baseName].push(c);
    }

    for (const [baseName, items] of Object.entries(groups)) {
        if (items.length <= 1) continue; // No dedup needed

        console.log(`\n📦 Processing: ${baseName}`);
        
        // Sort items by price to find the lowest (usually 350g)
        items.sort((a,b) => a.price - b.price);
        
        // The lowest price item becomes the MAIN active product
        const mainItem = items[0];
        const variantsToDeactivate = items.slice(1);

        // 1. Rename the main product to the base name
        await prisma.sellingProduct.update({
            where: { id: mainItem.id },
            data: { name: baseName }
        });
        console.log(`  ✅ Renamed ${mainItem.name} -> ${baseName}`);

        // 2. Deactivate the others
        for (const variant of variantsToDeactivate) {
            await prisma.sellingProduct.update({
                where: { id: variant.id },
                data: { isActive: false }
            });
            console.log(`  ✅ Deactivated duplicate: ${variant.name}`);
        }

        // 3. Remove old Formato/Agranda modifiers from the main product
        const oldModifiers = await prisma.productModifier.findMany({
            where: { 
                sellingProductId: mainItem.id,
                modifierGroup: {
                    OR: [
                        { name: { contains: 'Formato' } },
                        { name: { contains: 'AGRANDA' } }
                    ]
                }
            }
        });
        for (const om of oldModifiers) {
            await prisma.productModifier.delete({ where: { id: om.id } });
        }

        // 4. Create a specific Formato ModifierGroup for this product
        const formatGroupName = `Formato - ${baseName}`;
        
        // Check if group already exists to avoid duplicates
        let newGroup = await prisma.modifierGroup.findFirst({
            where: { name: formatGroupName }
        });

        if (!newGroup) {
            newGroup = await prisma.modifierGroup.create({
                data: {
                    name: formatGroupName,
                    displayName: 'Formato o Tamaño',
                    type: 'SINGLE_SELECT',
                    minSelections: 1,
                    maxSelections: 1,
                    sortOrder: 0, // MUST BE FIRST!
                    isGlobal: false,
                    showOnWeb: true,
                    showOnPos: true
                }
            });
        }

        // 5. Create options for the Formato group based on the items' prices
        // Delete old options if rewriting
        await prisma.modifierOption.deleteMany({ where: { modifierGroupId: newGroup.id } });

        const mainPrice = Number(mainItem.price);
        let optionOrder = 0;
        
        for (const item of items) {
            const sizeMatch = item.name.match(/(350g|500g|750g|1Kg|1 Litro)/i);
            const sizeName = sizeMatch ? sizeMatch[1].toUpperCase() : 'Regular';
            
            const itemPrice = Number(item.price);
            const priceDiff = itemPrice - mainPrice;

            await prisma.modifierOption.create({
                data: {
                    modifierGroupId: newGroup.id,
                    name: sizeName,
                    priceAdjustment: priceDiff,
                    isDefault: priceDiff === 0,
                    isActive: true,
                    sortOrder: optionOrder++
                }
            });
        }
        console.log(`  ✅ Created Formato modifier group with ${items.length} options (sortOrder: 0)`);

        // 6. Attach this newly created modifier group to the main product!
        const existingLink = await prisma.productModifier.findFirst({
            where: { sellingProductId: mainItem.id, modifierGroupId: newGroup.id }
        });
        if (!existingLink) {
            await prisma.productModifier.create({
                data: {
                    sellingProductId: mainItem.id,
                    modifierGroupId: newGroup.id,
                    sortOrder: 0 // Keep it as first step
                }
            });
        }

        // 7. Re-sort ALL other modifier groups for this product to be > 0
        const otherMods = await prisma.productModifier.findMany({
            where: { 
                sellingProductId: mainItem.id, 
                modifierGroupId: { not: newGroup.id } 
            },
            include: { modifierGroup: true }
        });
        
        for (const mod of otherMods) {
            const desiredSort = mod.modifierGroup.sortOrder;
            // Ensure they are strictly > 0 so Formato is first
            const finalSort = desiredSort === 0 ? 1 : desiredSort;
            
            await prisma.productModifier.update({
                where: { id: mod.id },
                data: { sortOrder: finalSort }
            });
        }
        console.log(`  ✅ Sorted modifying groups to ensure Formato is first`);
    }

    console.log('\n🎉 PRODUCTS DE-DUPLICATED AND FORMATS SIMPLIFIED\n');
}

main().finally(() => prisma.$disconnect());
