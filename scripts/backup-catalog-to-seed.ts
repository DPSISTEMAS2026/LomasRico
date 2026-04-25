
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar .env para conectar a Supabase
dotenv.config();

const prisma = new PrismaClient();

async function exportCatalog() {
    console.log('📦 Exportando catálogo actual de Supabase...');

    try {
        const products = await prisma.sellingProduct.findMany({
            orderBy: { name: 'asc' }
        });

        const seedData = products.map(p => ({
            name: p.name,
            category: p.category,
            price: Number(p.price),
            description: p.description,
            imageUrl: p.imageUrl,
            imageKey: p.imageKey,
            isActive: p.isActive,
            isConfigurable: p.isConfigurable,
            maxProteins: p.maxProteins,
            weight: 0 // Default for compatibility
        }));

        const content = `// ESTE ARCHIVO FUE GENERADO AUTOMÁTICAMENTE EL ${new Date().toLocaleString()}
// Contiene las URLs de fotos reales que actualizaste a mano.

export const MOCK_PRODUCTS = ${JSON.stringify(seedData, null, 4)};
`;

        const outputPath = './apps/api/src/products/products.seed.ts';
        fs.writeFileSync(outputPath, content);

        console.log(`✅ ¡Éxito! Se han respaldado ${seedData.length} productos en: apps/api/src/products/products.seed.ts`);
        console.log('🚀 Tus fotos manuales ahora son la base oficial del proyecto.');

    } catch (error) {
        console.error('❌ Error al exportar catálogo:', error);
    } finally {
        await prisma.$disconnect();
    }
}

exportCatalog();
