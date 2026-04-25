
import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function run() {
    console.log('Asignando modificadores a productos...');

    const products = await prisma.sellingProduct.findMany({
        where: {
            OR: [
                { category: 'CEVICHE LOMASRICO' },
                { category: 'CEVICHE PERUANO' },
                { category: 'CEVICHE SIN VERDE' },
                { name: { contains: 'Ceviche', mode: 'insensitive' } }
            ]
        }
    });

    const groups = await prisma.modifierGroup.findMany();
    
    // Buscar los grupos específicos por nombre (el 'name' interno que pusimos en el script anterior)
    const formato = groups.find(g => g.name === 'Formato');
    const proteinas = groups.find(g => g.name === 'Elige hasta 3 proteínas!');
    const salsas = groups.find(g => g.name === 'Salsas');
    const extras = groups.find(g => g.name === 'Extras LoMasRico');
    const quita = groups.find(g => g.name === 'QUITA las verduras que quieras!');
    
    // Grupos de Agrandar para incluirlos en el modal si es necesario (el usuario dijo que en Extras)
    // Pero el resumen2 muestra grupos SEPARADOS para agranar.
    const agranda350 = groups.find(g => g.name === 'AGRANDA TU CEVICHE A 350g');
    const agranda500 = groups.find(g => g.name === 'AGRANDA TU CEVICHE A 500g');
    const agranda750 = groups.find(g => g.name === 'AGRANDA TU CEVICHE A 750g');

    if (!formato || !proteinas || !salsas || !extras || !quita) {
        console.error('Faltan grupos básicos. Abortando.');
        return;
    }

    const assignmentData = [
        { group: formato, order: 0 },
        { group: proteinas, order: 1 },
        { group: salsas, order: 2 },
        { group: extras, order: 3 },
        { group: quita, order: 4 },
        { group: agranda350, order: 5 },
        { group: agranda500, order: 6 },
        { group: agranda750, order: 7 }
    ];

    for (const p of products) {
        console.log(`Configurando producto: ${p.name}`);
        
        // Limpiar asignaciones previas para evitar duplicados en este re-run
        await prisma.productModifier.deleteMany({ where: { sellingProductId: p.id } });

        for (const entry of assignmentData) {
            if (!entry.group) continue;
            await prisma.productModifier.create({
                data: {
                    sellingProductId: p.id,
                    modifierGroupId: entry.group.id,
                    sortOrder: entry.order,
                    isRequired: entry.group.minSelections > 0
                }
            });
        }
    }
    
    console.log('✓ Asignaciones completadas para ' + products.length + ' productos.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
