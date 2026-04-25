import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    const mainItem = await prisma.sellingProduct.findFirst({
        where: { name: 'Ceviche LOMASRICO' }
    });

    if (!mainItem) {
        console.log("No main item found");
        return;
    }

    const items = await prisma.sellingProduct.findMany({
        where: { name: { startsWith: 'Ceviche LOMASRICO' } }
    });
    
    // Sort items by price
    items.sort((a,b) => a.price - b.price);

    const formatGroupName = `Formato - Ceviche LOMASRICO`;
    
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
                sortOrder: 0,
                isGlobal: false,
                showOnWeb: true,
                showOnPos: true
            }
        });
    }

    await prisma.modifierOption.deleteMany({ where: { modifierGroupId: newGroup.id } });

    const mainPrice = Number(mainItem.price);
    let optionOrder = 0;
    
    for (const item of items) {
        if (item.name === 'Ceviche LOMASRICO') {
            await prisma.modifierOption.create({
                data: {
                    modifierGroupId: newGroup.id,
                    name: '350G',
                    priceAdjustment: 0,
                    isDefault: true,
                    isActive: true,
                    sortOrder: optionOrder++
                }
            });
            continue;
        }

        const sizeMatch = item.name.match(/(350g|500g|750g|1Kg|1 Litro)/i);
        const sizeName = sizeMatch ? sizeMatch[1].toUpperCase() : 'Regular';
        
        const priceDiff = Number(item.price) - mainPrice;

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

    const existingLink = await prisma.productModifier.findFirst({
        where: { sellingProductId: mainItem.id, modifierGroupId: newGroup.id }
    });
    
    if (!existingLink) {
        await prisma.productModifier.create({
            data: {
                sellingProductId: mainItem.id,
                modifierGroupId: newGroup.id,
                sortOrder: 0
            }
        });
    }

    console.log("Ceviche LOMASRICO fixed manually");
}

main().finally(() => prisma.$disconnect());
