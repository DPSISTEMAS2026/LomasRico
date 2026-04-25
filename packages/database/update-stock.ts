import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env desde la raíz
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando actualización de inventario...');

    try {
        const result = await prisma.inventoryItem.updateMany({
            data: {
                currentStock: 20
            }
        });

        console.log(`✅ ¡Éxito! Se actualizaron ${result.count} ítems de inventario a 20 unidades.`);
    } catch (error) {
        console.error('❌ Error al actualizar el inventario:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
