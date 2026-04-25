
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createOwner() {
    const email = 'oscar@lomasrico.cl'; // Email por defecto para el dueño
    const password = 'Maxi2026';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('👤 Creando/Actualizando usuario dueño: Oscar...');

    try {
        const user = await (prisma as any).user.upsert({
            where: { email },
            update: {
                name: 'Oscar',
                password: hashedPassword,
                role: 'ADMIN', // Rol con acceso total
                isVerified: true
            },
            create: {
                email,
                name: 'Oscar',
                password: hashedPassword,
                role: 'ADMIN',
                isVerified: true
            }
        });

        console.log('✅ Usuario Dueño listo:');
        console.log(`   - Nombre: ${user.name}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Password: ${password}`);
        console.log(`   - Rol: ${user.role}`);

    } catch (error) {
        console.error('❌ Error al crear el dueño:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createOwner();
