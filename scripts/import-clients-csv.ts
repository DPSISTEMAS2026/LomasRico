import { PrismaClient } from '@lomasrico/database';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function importClients() {
    const filePath = path.join(process.cwd(), 'reporte_clientes (1).csv');
    console.log(`📂 Iniciando importación de clientes (con password 1234 FORZADO) desde: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error('❌ El archivo CSV no existe en la ruta especificada.');
        process.exit(1);
    }

    // UPDATE SCHEMA MANUALLY (Pooler compatible)
    console.log('🛠 Verificando esquema...');
    try {
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loyaltyPoints" integer DEFAULT 0`);
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pointsEarned" integer DEFAULT 0`);
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pointsUsed" integer DEFAULT 0`);
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerTag" text`);
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "historicalOrders" integer DEFAULT 0`);
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "historicalSpent" Decimal DEFAULT 0`);
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastOrderDays" integer`);
        console.log('✅ Esquema sincronizado.');
    } catch (schemaErr: any) {
        console.warn('⚠️ Nota sobre el esquema:', schemaErr.message);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    // Detectar headers
    const headers = lines[0].split(',').map(h => h.trim());

    // Hash genérico para "1234"
    const genericPassword = await bcrypt.hash('1234', 10);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(',').map(v => v.trim());
        const data: any = {};
        headers.forEach((h, idx) => {
            data[h] = values[idx];
        });

        if (!data.Correo || data.Correo.indexOf('@') === -1) continue;

        try {
            const email = data.Correo.toLowerCase().trim();

            const clientProfile = {
                name: data.Nombre || 'Sin Nombre',
                phone: data['Teléfono'] || null,
                role: 'CUSTOMER' as any,
                isVerified: true, // Auto-verificados para que entren directo

                // Puntos y Lealtad
                loyaltyPoints: parseInt(data['Puntos Vigentes']) || 0,
                pointsEarned: parseInt(data['Puntos Ganados']) || 0,
                pointsUsed: parseInt(data['Puntos Usados']) || 0,

                // Perfil y Analítica
                customerTag: data['Tipo de Cliente'] || 'Nuevo',
                historicalOrders: parseInt(data['Cantidad de Órdenes']) || 0,
                historicalSpent: parseFloat(data['Total Gastado']) || 0,
                lastOrderDays: data['Días Última Orden'] ? parseInt(data['Días Última Orden']) : null,
            };

            const existing = await (prisma as any).user.findUnique({ where: { email } });

            if (existing) {
                await (prisma as any).user.update({
                    where: { email },
                    data: {
                        ...clientProfile,
                        password: genericPassword // Forzamos la clave 1234 para asegurar acceso hoy
                    }
                });
            } else {
                await (prisma as any).user.create({
                    data: {
                        email,
                        password: genericPassword,
                        ...clientProfile
                    }
                });
            }

            if (i % 50 === 0) console.log(`🔄 Procesados ${i}...`);
            successCount++;
        } catch (err: any) {
            console.error(`❌ Error importando ${data.Correo}: ${err.message}`);
            errorCount++;
        }
    }

    console.log(`\n✨ RE-IMPORTACIÓN COMPLETADA ✨`);
    console.log(`✅ Registros exitosos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`🔑 Clave 1234 habilitada para TODOS los correos del CSV.`);

    await prisma.$disconnect();
}

importClients();
