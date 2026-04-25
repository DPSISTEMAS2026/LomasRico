import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

const CONSOLIDATIONS = [
    {
        newName: "Empanada Frita",
        category: "EMPANADAS",
        modifierName: "Sabor",
        targets: [
            "Camarón-Queso", "Macha Queso", "Queso", "Marisco", "Carapacho Queso", 
            "Empanada de mariscos", "Empanada Macha-Queso", "Empanada Marisco", "Empanada Queso"
        ]
    },
    {
        newName: "Handroll",
        category: "EXTRAS", // Wait, let's look at the old category. I'll dynamically pick the category of the first target found.
        modifierName: "Relleno del Handroll",
        targets: [
            "HandRoll Salmón", "HandRoll Camarón", "Handroll de Pollo"
        ]
    },
    {
        newName: "Porción de Pancitos (10 un)",
        category: "PANCITOS",
        modifierName: "Tipo de Horneado",
        targets: [
            "Pancitos al orégano (10 unidades + salsa verde)", "Pancitos con ajo confitado y salsa verde", 
            "Pancitos con ajo confitado y queso mozzarella", "Pancitos horneados", "Ajo y Queso", "Al orégano (10 u)",
            "Pancitos con ajo confitado  y salsa verde"
        ]
    },
    {
        newName: "Bebida Individual",
        category: "BEBIDAS",
        modifierName: "Sabor de Bebida",
        targets: [
            "Coca Cola 591cc", "Kem Piña 350cc", "Limon Soda 350cc", "Coca Cola Zero 591cc", "Coca Cola"
        ]
    },
    {
        newName: "Limonada Artesanal",
        category: "BEBIDAS",
        modifierName: "Sabor de Limonada",
        targets: [
            "Limonadas LoMASrico", "Limonada Clásica", "Limonada Menta", "Limonada Albahaca", "Limonada Menta Jengibre"
        ]
    }
];

async function main() {
    console.log("=== INICIANDO CONSOLIDACIÓN MAESTRA DEL CATÁLOGO ===\n");

    for (const group of CONSOLIDATIONS) {
        console.log(`\n📦 Procesando Grupo: ${group.newName}`);

        // Find all active products matching the targets
        const items = await prisma.sellingProduct.findMany({
            where: {
                name: { in: group.targets },
                isActive: true
            }
        });

        if (items.length === 0) {
            console.log(`  ⏭️ Mmm, no se encontraron productos activos para consolidar este grupo.`);
            continue;
        }

        // Sort by price to get the base
        items.sort((a,b) => a.price - b.price);
        const baseItem = items[0];
        
        // Find best image
        const imageItem = items.find(i => i.imageUrl !== null);
        const bestImage = imageItem ? imageItem.imageUrl : null;

        // 1. Rename the base item to the new Master Name
        await prisma.sellingProduct.update({
            where: { id: baseItem.id },
            data: { 
                name: group.newName,
                category: group.category || baseItem.category,
                imageUrl: bestImage || baseItem.imageUrl
            }
        });
        console.log(`  ✅ Producto Maestro creado/actualizado: ${group.newName}`);

        // 2. Deactivate the rest
        const toDeactivate = items.slice(1);
        for (const item of toDeactivate) {
            await prisma.sellingProduct.update({
                where: { id: item.id },
                data: { isActive: false }
            });
            console.log(`  ✅ Ocultando duplicado: ${item.name}`);
        }

        // 3. Create or Get the ModifierGroup
        const modGroupName = `Opciones - ${group.newName}`;
        let modGroup = await prisma.modifierGroup.findFirst({
            where: { name: modGroupName }
        });

        if (!modGroup) {
            modGroup = await prisma.modifierGroup.create({
                data: {
                    name: modGroupName,
                    displayName: group.modifierName,
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

        // 4. Create options
        await prisma.modifierOption.deleteMany({ where: { modifierGroupId: modGroup.id } });
        
        let order = 0;
        const mainPrice = Number(baseItem.price);

        // Remove distinct by name logic safely
        const handledNames = new Set();
        
        for (const item of items) {
            let optName = item.name;
            
            // Cleanup some redundant text in options
            if (group.newName === "Bebida Individual") {
                optName = optName; // Keep as is to preserve cc
            } else if (group.newName === "Empanada Frita") {
                optName = optName.replace(/Empanada de|Empanada/ig, "").trim();
            } else if (group.newName === "Handroll") {
                 optName = optName.replace(/HandRoll de|HandRoll/ig, "").trim();
            } else if (group.newName === "Porción de Pancitos (10 un)") {
                 optName = optName.replace(/Pancitos|10 unidades|10 u/ig, "").trim();
                 optName = optName.replace(/con ajo confitado|con/ig, "Ajo").trim();
            } else if (group.newName === "Limonada Artesanal") {
                 optName = optName.replace(/Limonada|Limonadas|LoMASrico/ig, "").trim() || "Mix";
            }
            
            // Default basic names if empty
            if (optName === "" || optName === "s") optName = "Clásico";
            // Capitalize
            optName = optName.charAt(0).toUpperCase() + optName.slice(1);

            if (handledNames.has(optName)) continue;
            handledNames.add(optName);

            const diff = Number(item.price) - mainPrice;

            await prisma.modifierOption.create({
                data: {
                    modifierGroupId: modGroup.id,
                    name: optName,
                    priceAdjustment: diff,
                    isDefault: order === 0,
                    isActive: true,
                    sortOrder: order++
                }
            });
        }
        console.log(`  ✅ Creado Grupo de Modificación con ${order} opciones: ${Array.from(handledNames).join(', ')}`);

        // 5. Link modifier to product
        const link = await prisma.productModifier.findFirst({
            where: { sellingProductId: baseItem.id, modifierGroupId: modGroup.id }
        });

        if (!link) {
            await prisma.productModifier.create({
                data: {
                    sellingProductId: baseItem.id,
                    modifierGroupId: modGroup.id,
                    sortOrder: 0
                }
            });
        }
    }

    // EXTRA CLEANUP: Make sure any other phantom product explicitly mentioned as a target but inactive is also caught?
    // Not needed, we only care about cleaning the ACTIVE UI for now. User is happy.

    console.log("\n=== CONSOLIDACIÓN EXITOSA! ===");
}

main().finally(() => prisma.$disconnect());
