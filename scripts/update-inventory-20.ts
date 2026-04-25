
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function updateInventory() {
    console.log('📦 Actualizando inventario a 20 unidades/kg para todos los insumos...');

    try {
        // @ts-ignore
        const result = await (prisma as any).inventoryItem.updateMany({
            data: {
                currentStock: 20
            }
        });

        console.log(`✅ Inventario actualizado. ${result.count} insumos ahora tienen 20 unidades de stock.`);

    } catch (error) {
        console.error('❌ Error al actualizar inventario:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateInventory();
