
import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

const MODIFIERS_DATA = [
    {
        name: "Formato",
        displayName: "Formato",
        type: "MULTI_SELECT",
        minSelections: 1,
        maxSelections: 5,
        options: [
            { name: "250gr", priceAdjustment: 5900, isDefault: true },
            { name: "350gr", priceAdjustment: 8900 },
            { name: "500gr", priceAdjustment: 11900 },
            { name: "750gr", priceAdjustment: 16900 },
            { name: "1kg", priceAdjustment: 20900 }
        ]
    },
    {
        name: "proteinas Ceviche Tropical",
        displayName: "proteinas Ceviche Tropical",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "Salmón Mango", priceAdjustment: 0 },
            { name: "Camarón Mango", priceAdjustment: 0 },
            { name: "Atún Mango", priceAdjustment: 0 }
        ]
    },
    {
        name: "opciones mega promo",
        displayName: "opciones mega promo",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "Queso", priceAdjustment: 0 },
            { name: "Carapacho Queso", priceAdjustment: 0 },
            { name: "Camarón Queso", priceAdjustment: 0 },
            { name: "Macha Queso", priceAdjustment: 0 },
            { name: "Marisco", priceAdjustment: 0 }
        ]
    },
    {
        name: "Elige hasta 3 proteínas!",
        displayName: "Elige hasta 3 proteínas!",
        type: "MULTI_SELECT",
        minSelections: 1,
        maxSelections: 3,
        options: [
            { name: "Salmón", priceAdjustment: 0 },
            { name: "Reineta", priceAdjustment: 0 },
            { name: "Camarón", priceAdjustment: 0 },
            { name: "Atún", priceAdjustment: 0 },
            { name: "machas", priceAdjustment: 0 }
        ]
    },
    {
        name: "Extras LoMasRico",
        displayName: "Extras LoMasRico",
        type: "MULTI_SELECT",
        minSelections: 0,
        maxSelections: 10,
        options: [
            { name: "Sopaipillas (3 un) + salsa", priceAdjustment: 1900 },
            { name: "pan con ajo confitado y queso mozzarella", priceAdjustment: 2500 },
            { name: "Pan con ajo confitado", priceAdjustment: 1900 },
            { name: "Pancitos Horneados a La Oliva Orégano 10 unidades + Salsa Verde", priceAdjustment: 1500 },
            { name: "Salsa Merquén ahumado", priceAdjustment: 600 },
            { name: "Salsa verde", priceAdjustment: 600 },
            { name: "Salsa ajo confitado", priceAdjustment: 600 }
        ]
    },
    {
        name: "Limonada LoMASrico",
        displayName: "Limonada LoMASrico",
        type: "MULTI_SELECT",
        minSelections: 0,
        maxSelections: 10,
        options: [
            { name: "Limonada Jengibre", priceAdjustment: 1900 },
            { name: "Limonada Mango", priceAdjustment: 1900 },
            { name: "Limonada Frambuesa", priceAdjustment: 1900 }
        ]
    },
    {
        name: "promo express",
        displayName: "promo express",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "Papas fritas", priceAdjustment: 0 },
            { name: "Empanada de queso", priceAdjustment: 0 }
        ]
    },
    {
        name: "Salsas",
        displayName: "Salsas",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "Salsa Merquén ahumado", priceAdjustment: 0 },
            { name: "salsa de ajo", priceAdjustment: 0 },
            { name: "Salsa verde", priceAdjustment: 0 },
            { name: "Jugo de Limón natural", priceAdjustment: 0 },
            { name: "leche de tigre", priceAdjustment: 0 }
        ]
    },
    {
        name: "AGRANDA TU CEVICHE A 500g",
        displayName: "AGRANDA TU CEVICHE A 500g",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 1,
        options: [
            { name: "AGRANDA TU CEVICHE A 500g", priceAdjustment: 0 }
        ]
    },
    {
        name: "AGRANDA TU CEVICHE A 350g",
        displayName: "AGRANDA TU CEVICHE A 350g",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 1,
        options: [
            { name: "AGRANDA TU CEVICHE A 350g", priceAdjustment: 1900 }
        ]
    },
    {
        name: "AGRANDA TU CEVICHE A 750g",
        displayName: "AGRANDA TU CEVICHE A 750g",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 1,
        options: [
            { name: "AGRANDA TU CEVICHE A 750g", priceAdjustment: 1900 }
        ]
    },
    {
        name: "Opciones empanadas camarón",
        displayName: "Opciones empanadas camarón",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 5,
        options: [
            { name: "Unidad", priceAdjustment: 2690 },
            { name: "1/2 Docena", priceAdjustment: 14900 }
        ]
    },
    {
        name: "opciones macha queso",
        displayName: "opciones macha queso",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 1,
        options: [
            { name: "Unidad", priceAdjustment: 2690 },
            { name: "1/2 docena", priceAdjustment: 14900 }
        ]
    },
    {
        name: "Opciones emp queso",
        displayName: "Opciones emp queso",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 5,
        options: [
            { name: "Unidad", priceAdjustment: 1800 },
            { name: "1/2 docena", priceAdjustment: 9900 }
        ]
    },
    {
        name: "opciones empanadas de marisco",
        displayName: "opciones empanadas de marisco",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 1,
        options: [
            { name: "Unidad", priceAdjustment: 2690 },
            { name: "1/2 docena", priceAdjustment: 14900 }
        ]
    },
    {
        name: "Opciones empanadas de karapacho",
        displayName: "Opciones empanadas de karapacho",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 5,
        options: [
            { name: "Unidad", priceAdjustment: 2690 },
            { name: "1/2 docena", priceAdjustment: 14900 }
        ]
    },
    {
        name: "QUITA las verduras que quieras!",
        displayName: "QUITA las verduras que quieras!",
        type: "MULTI_SELECT",
        minSelections: 1,
        maxSelections: 4,
        options: [
            { name: "SIN Choclo", priceAdjustment: 600 },
            { name: "SIN Palta", priceAdjustment: 600 },
            { name: "SIN Cebolla", priceAdjustment: 600 },
            { name: "SIN Pimentón", priceAdjustment: 600 }
        ]
    },
    {
        name: "opciones BOWL regular y premium",
        displayName: "opciones BOWL regular y premium",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 1,
        options: [
            { name: "Regular", priceAdjustment: 6500 },
            { name: "Premium (doble proteína)", priceAdjustment: 7500 }
        ]
    },
    {
        name: "Opciones camarones apandos",
        displayName: "Opciones camarones apandos",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "Porción (9)", priceAdjustment: 4500 },
            { name: "Porción XL (18)", priceAdjustment: 8500 }
        ]
    },
    {
        name: "Opciones PAPAS FRITAS",
        displayName: "Opciones PAPAS FRITAS",
        type: "SINGLE_SELECT",
        minSelections: 0,
        maxSelections: 1,
        options: [
            { name: "Individual", priceAdjustment: 2900 },
            { name: "Mediana", priceAdjustment: 4900 },
            { name: "Familiar", priceAdjustment: 9500 }
        ]
    },
    {
        name: "Elige tu GOHAN",
        displayName: "Elige tu GOHAN",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "Gohan de Salmón", priceAdjustment: 0 },
            { name: "Gohan de Camarón", priceAdjustment: 0 },
            { name: "Gohan de Camarón apanado", priceAdjustment: 0 },
            { name: "Gohan de Atún", priceAdjustment: 0 },
            { name: "Gohan de pollo teriyaki", priceAdjustment: 0 }
        ]
    },
    {
        name: "Salsas GOHAN",
        displayName: "Salsas GOHAN",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "leche de tigre", priceAdjustment: 0 },
            { name: "Teriyaki", priceAdjustment: 0 },
            { name: "Soya", priceAdjustment: 0 }
        ]
    },
    {
        name: "Hand Roll de Salmón",
        displayName: "Hand Roll de Salmón",
        type: "MULTI_SELECT",
        minSelections: 1,
        maxSelections: 10,
        options: [
            { name: "Unidad", priceAdjustment: 4900 },
            { name: "Dos x", priceAdjustment: 9000 }
        ]
    },
    {
        name: "Hand Roll de Camarón",
        displayName: "Hand Roll de Camarón",
        type: "MULTI_SELECT",
        minSelections: 1,
        maxSelections: 10,
        options: [
            { name: "Dos X", priceAdjustment: 9000 },
            { name: "Unidad", priceAdjustment: 4900 }
        ]
    },
    {
        name: "Opciones Crudo de Salmón",
        displayName: "Opciones Crudo de Salmón",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "250g (2 Per)", priceAdjustment: 10900 },
            { name: "500g (4per)", priceAdjustment: 18900 }
        ]
    },
    {
        name: "Opciones Crudo de Atún",
        displayName: "Opciones Crudo de Atún",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "250g (2 per)", priceAdjustment: 10900 },
            { name: "500g(4per)", priceAdjustment: 20900 }
        ]
    },
    {
        name: "Handroll de Pollo",
        displayName: "Handroll de Pollo",
        type: "MULTI_SELECT",
        minSelections: 1,
        maxSelections: 10,
        options: [
            { name: "Unidad", priceAdjustment: 4500 },
            { name: "DOS X", priceAdjustment: 8000 }
        ]
    },
    {
        name: "opciones monster",
        displayName: "opciones monster",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 10,
        options: [
            { name: "Monster normal", priceAdjustment: 0 }
        ]
    },
    {
        name: "Opciones CC",
        displayName: "Opciones CC",
        type: "SINGLE_SELECT",
        minSelections: 1,
        maxSelections: 1,
        options: [
            { name: "500cc", priceAdjustment: 5900 },
            { name: "1 Litro", priceAdjustment: 10400 }
        ]
    },
    {
        name: "TOPPING PAPAS",
        displayName: "TOPPING PAPAS",
        type: "MULTI_SELECT",
        minSelections: 1,
        maxSelections: 4,
        options: [
            { name: "Camarones", priceAdjustment: 1490 },
            { name: "Camarones apanados", priceAdjustment: 2490 },
            { name: "Choclo", priceAdjustment: 590 },
            { name: "Champiñones", priceAdjustment: 590 }
        ]
    }
];

async function run() {
    console.log('Restaurando modificadores...');
    for (const groupData of MODIFIERS_DATA) {
        const group = await prisma.modifierGroup.create({
            data: {
                name: groupData.name,
                displayName: groupData.displayName,
                type: groupData.type as any,
                minSelections: groupData.minSelections,
                maxSelections: groupData.maxSelections,
                sortOrder: 0,
                options: {
                    create: groupData.options.map((opt, i) => ({
                        name: opt.name,
                        priceAdjustment: opt.priceAdjustment,
                        isDefault: (opt as any).isDefault || false,
                        sortOrder: i
                    }))
                }
            }
        });
        console.log(`✓ Grupo creado: ${group.displayName}`);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
