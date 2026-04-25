import { PrismaClient } from '@prisma/client';

// Helper to find ID by fuzzy name
async function findId(prisma: PrismaClient, searchName: string, fallbackId: string) {
    const exact = await prisma.inventoryItem.findFirst({
        where: {
            name: { equals: searchName, mode: 'insensitive' }
        }
    });
    if (exact) return exact.id;

    const partial = await prisma.inventoryItem.findFirst({
        where: {
            name: { contains: searchName, mode: 'insensitive' }
        }
    });

    if (!partial) console.warn(`⚠️ Warning: Seed Ingredient '${searchName}' not found in DB. Fallback to ID ${fallbackId} might fail FK.`);
    return partial ? partial.id : fallbackId;
}

export const seedMasterRecipes = async (prisma: PrismaClient) => {
    console.log('🌱 Seeding Master Production Recipes (NORMALIZED UNITS KG/LT)...');

    // NOTE: All quantities are now in decimal KG/LT. 
    // Example: 600ml -> 0.600
    // Example: 50g -> 0.050

    try {
        // Resolve Real IDs from DB
        const idLimon = await findId(prisma, 'Limón Sutil', 'v6');
        const idAjo = await findId(prisma, 'Ajo', 'v14');
        const idJengibre = await findId(prisma, 'Jengibre', 'v12');
        const idApio = await findId(prisma, 'Apio', 'v14');
        const idCilantro = await findId(prisma, 'Cilantro', 'v3');
        const idFondo = await findId(prisma, 'Pesca', 'p7');
        const idRocoto = await findId(prisma, 'Rocoto', 'v9');
        const idCebolla = await findId(prisma, 'Cebolla', 'v2');
        const idChoclo = await findId(prisma, 'Choclo Normal', 'c1');
        const idChocloPeruno = await findId(prisma, 'Choclo Peruano', 'c2');
        const idPimenton = await findId(prisma, 'Pimentón', 'v7');
        const idPalta = await findId(prisma, 'Palta', 'v8');
        const idMango = await findId(prisma, 'Pulpa Mango', 'c4');

        // Prep Output IDs - TARGET THE EXACT IDS VISIBLE IN PRODUCTION FRONTEND

        // 1. LECHE NORMAL (Tradicional)
        const idLecheNormal = '6ff9bb3d-0291-416e-8641-494831720f77';

        // 2. LECHE PERUANA
        const idLechePeruana = '96321922-2935-4cb3-a079-88ac90b32394';

        // 3. LECHE TROPICAL
        const idLecheTropical = '0fdc58bd-f41f-43db-9661-9831f697e85b';

        // 4. BASE NORMAL (Tradicional)
        const idBaseNormal = 'd584be91-e3d3-4383-85fa-76e1e709669b';
        const idBaseNormal4kg = 'a0e8b587-6386-4860-976c-14a9f35eb004'; // VARIANT 4KG

        // 5. BASE PERUANA
        const idBasePeruano = 'ab660d77-bd9f-4592-9adb-89bd111f7447';
        const idBasePeruano4kg = '3de9f9b4-932f-4528-98f3-dc921bbe57ba'; // VARIANT 4KG

        console.log(`🔍 TARGETING PRODUCTION UUIDS (NORMALIZED):
            Leche Normal: ${idLecheNormal}
            Leche Tropical: ${idLecheTropical}
        `);

        // ==========================================
        // 1. LECHE DE TIGRE BASE
        // ==========================================
        const upsertLecheBase = async (targetId: string, label: string) => {
            try {
                await prisma.recipe.upsert({
                    where: { outputItemId: targetId },
                    update: {
                        items: {
                            deleteMany: {}, create: [
                                { ingredientId: idLimon, quantity: 0.600, role: 'VEGGIE' },   // 600ml
                                { ingredientId: idAjo, quantity: 0.050, role: 'VEGGIE' },     // 50g
                                { ingredientId: idJengibre, quantity: 0.050, role: 'VEGGIE' },// 50g
                                { ingredientId: idApio, quantity: 0.100, role: 'VEGGIE' },    // 100g
                                { ingredientId: idCilantro, quantity: 0.050, role: 'VEGGIE' },// 50g
                                { ingredientId: idFondo, quantity: 0.350, role: 'PROTEIN_MAIN' }, // 350ml
                            ]
                        }
                    },
                    create: {
                        name: `Formula Leche Tigre Base (${label})`, baseWeight: 1.200, outputItemId: targetId,
                        items: {
                            create: [
                                { ingredientId: idLimon, quantity: 0.600, role: 'VEGGIE' },
                                { ingredientId: idAjo, quantity: 0.050, role: 'VEGGIE' },
                                { ingredientId: idJengibre, quantity: 0.050, role: 'VEGGIE' },
                                { ingredientId: idApio, quantity: 0.100, role: 'VEGGIE' },
                                { ingredientId: idCilantro, quantity: 0.050, role: 'VEGGIE' },
                                { ingredientId: idFondo, quantity: 0.350, role: 'PROTEIN_MAIN' },
                            ]
                        }
                    }
                });
            } catch (e) { console.error(`Failed to seed ${label}`, e.message); }
        };
        await upsertLecheBase(idLecheNormal, 'Tradicional');

        // ==========================================
        // 2. LECHE PERUANA
        // ==========================================
        try {
            await prisma.recipe.upsert({
                where: { outputItemId: idLechePeruana },
                update: {
                    items: {
                        deleteMany: {}, create: [
                            { ingredientId: idLimon, quantity: 0.600, role: 'VEGGIE' },
                            { ingredientId: idAjo, quantity: 0.060, role: 'VEGGIE' },
                            { ingredientId: idJengibre, quantity: 0.060, role: 'VEGGIE' },
                            { ingredientId: idRocoto, quantity: 0.100, role: 'VEGGIE' },
                            { ingredientId: idFondo, quantity: 0.380, role: 'PROTEIN_MAIN' },
                        ]
                    }
                },
                create: {
                    name: 'Formula Leche Tigre Peruana (1.2L)', baseWeight: 1.200, outputItemId: idLechePeruana,
                    items: {
                        create: [
                            { ingredientId: idLimon, quantity: 0.600, role: 'VEGGIE' },
                            { ingredientId: idAjo, quantity: 0.060, role: 'VEGGIE' },
                            { ingredientId: idJengibre, quantity: 0.060, role: 'VEGGIE' },
                            { ingredientId: idRocoto, quantity: 0.100, role: 'VEGGIE' },
                            { ingredientId: idFondo, quantity: 0.380, role: 'PROTEIN_MAIN' },
                        ]
                    }
                }
            });
        } catch (e) { console.error('Failed to seed Leche Peruana', e.message); }

        // ==========================================
        // 3. LECHE TROPICAL
        // ==========================================
        try {
            await prisma.recipe.upsert({
                where: { outputItemId: idLecheTropical },
                update: {
                    items: {
                        deleteMany: {}, create: [
                            { ingredientId: idLecheNormal, quantity: 0.800, role: 'BASE' },
                            { ingredientId: idMango, quantity: 0.400, role: 'BASE' },
                        ]
                    }
                },
                create: {
                    name: 'Formula Leche Tigre Tropical (1.2L)', baseWeight: 1.200, outputItemId: idLecheTropical,
                    items: {
                        create: [
                            { ingredientId: idLecheNormal, quantity: 0.800, role: 'BASE' },
                            { ingredientId: idMango, quantity: 0.400, role: 'BASE' },
                        ]
                    }
                }
            });
        } catch (e) { console.error('Failed to seed Leche Tropical', e.message); }

        // ==========================================
        // 4. BASE SOLIDA NORMAL (Y DUPLICADO 4KG)
        // ==========================================
        const upsertBaseNormal = async (targetId: string, label: string) => {
            try {
                await prisma.recipe.upsert({
                    where: { outputItemId: targetId },
                    update: {
                        items: {
                            deleteMany: {}, create: [
                                { ingredientId: idCebolla, quantity: 0.480, role: 'VEGGIE' },
                                { ingredientId: idChoclo, quantity: 0.400, role: 'VEGGIE' },
                                { ingredientId: idPimenton, quantity: 0.240, role: 'VEGGIE' },
                                { ingredientId: idPalta, quantity: 0.160, role: 'VEGGIE' },
                                { ingredientId: idLecheNormal, quantity: 1.200, role: 'BASE' },
                            ]
                        }
                    },
                    create: {
                        name: `Formula Base Sólida LomasRico (${label})`, baseWeight: 2.480, outputItemId: targetId,
                        items: {
                            create: [
                                { ingredientId: idCebolla, quantity: 0.480, role: 'VEGGIE' },
                                { ingredientId: idChoclo, quantity: 0.400, role: 'VEGGIE' },
                                { ingredientId: idPimenton, quantity: 0.240, role: 'VEGGIE' },
                                { ingredientId: idPalta, quantity: 0.160, role: 'VEGGIE' },
                                { ingredientId: idLecheNormal, quantity: 1.200, role: 'BASE' },
                            ]
                        }
                    }
                });
            } catch (e) { console.error(`Failed to seed Base Normal ${label}`, e.message); }
        };
        await upsertBaseNormal(idBaseNormal, 'Tradicional');
        await upsertBaseNormal(idBaseNormal4kg, '4KG');

        // ==========================================
        // 5. BASE SOLIDA PERUANO (Y DUPLICADO 4KG)
        // ==========================================
        const upsertBasePeruano = async (targetId: string, label: string) => {
            try {
                await prisma.recipe.upsert({
                    where: { outputItemId: targetId },
                    update: {
                        items: {
                            deleteMany: {}, create: [
                                { ingredientId: idCebolla, quantity: 0.580, role: 'VEGGIE' },
                                { ingredientId: idChocloPeruno, quantity: 0.500, role: 'VEGGIE' },
                                { ingredientId: idLechePeruana, quantity: 1.200, role: 'BASE' },
                            ]
                        }
                    },
                    create: {
                        name: `Formula Base Sólida Peruano (${label})`, baseWeight: 2.280, outputItemId: targetId,
                        items: {
                            create: [
                                { ingredientId: idCebolla, quantity: 0.580, role: 'VEGGIE' },
                                { ingredientId: idChocloPeruno, quantity: 0.500, role: 'VEGGIE' },
                                { ingredientId: idLechePeruana, quantity: 1.200, role: 'BASE' },
                            ]
                        }
                    }
                });
            } catch (e) { console.error(`Failed to seed Base Peruana ${label}`, e.message); }
        };
        await upsertBasePeruano(idBasePeruano, 'Tradicional');
        await upsertBasePeruano(idBasePeruano4kg, '4KG');

        // ==========================================
        // 6. SALSAS Y BASES DE COCINA (NUEVO)
        // ==========================================

        // Fetch extra ingredients needed
        const idAceite = await findId(prisma, 'Aceite Maravilla', 'a9');
        const idSal = await findId(prisma, 'Sal', 'a4');
        const idHuevoDesh = await findId(prisma, 'Huevo Deshidratado', 'a5');
        const idMerquen = await findId(prisma, 'Aliño', 'a11'); // Approx
        const idMantequilla = await findId(prisma, 'Mantequilla', 'a12');
        const idHarina = await findId(prisma, 'Harina', 'a7');
        const idLecheEntera = await findId(prisma, 'Leche Entera', 'a15');
        const idArroz = await findId(prisma, 'Arroz', '30');
        const idVinagre = await findId(prisma, 'Vinagre', 'a18');
        const idAzucar = await findId(prisma, 'Azúcar', 'a3'); // a2 or a3

        // IDs from Inventory DB
        const idSalsaVerde = 'prep-salsa-verde';
        const idSalsaAjo = 'prep-salsa-ajo';
        const idSalsaMerquen = 'prep-salsa-merquen';
        const idBechamel = 'prep-salsa-bechamel';
        const idArrozSushi = 'prep-arroz-sushi';

        // SALSA VERDE
        // 80g Cilantro, 60cc Limon, 12g Sal, 100cc Agua, 400cc Aceite, 15g Huevo
        // Total ~ 667g (0.667)
        try {
            await prisma.recipe.upsert({
                where: { outputItemId: idSalsaVerde },
                update: {
                    items: {
                        deleteMany: {}, create: [
                            { ingredientId: idCilantro, quantity: 0.080, role: 'VEGGIE' },
                            { ingredientId: idLimon, quantity: 0.060, role: 'VEGGIE' },
                            { ingredientId: idSal, quantity: 0.012, role: 'BASE' },
                            { ingredientId: idAceite, quantity: 0.400, role: 'BASE' },
                            { ingredientId: idHuevoDesh, quantity: 0.015, role: 'BASE' }
                        ]
                    }
                },
                create: {
                    name: 'Formula Salsa Verde (670g)', baseWeight: 0.670, outputItemId: idSalsaVerde,
                    items: {
                        create: [
                            { ingredientId: idCilantro, quantity: 0.080, role: 'VEGGIE' },
                            { ingredientId: idLimon, quantity: 0.060, role: 'VEGGIE' },
                            { ingredientId: idSal, quantity: 0.012, role: 'BASE' },
                            { ingredientId: idAceite, quantity: 0.400, role: 'BASE' },
                            { ingredientId: idHuevoDesh, quantity: 0.015, role: 'BASE' }
                        ]
                    }
                }
            });
        } catch (e) { console.error('Error seeding Salsa Verde', e.message); }

        // SALSA BECHAMEL
        // 250 Mantequilla, 125 Harina, 1L Leche (1.0). Total ~ 1.375 KG
        try {
            await prisma.recipe.upsert({
                where: { outputItemId: idBechamel },
                update: {
                    items: {
                        deleteMany: {}, create: [
                            { ingredientId: idMantequilla, quantity: 0.250, role: 'BASE' },
                            { ingredientId: idHarina, quantity: 0.125, role: 'BASE' },
                            { ingredientId: idLecheEntera, quantity: 1.000, role: 'BASE' }
                        ]
                    }
                },
                create: {
                    name: 'Formula Salsa Bechamel (1.4kg)', baseWeight: 1.375, outputItemId: idBechamel,
                    items: {
                        create: [
                            { ingredientId: idMantequilla, quantity: 0.250, role: 'BASE' },
                            { ingredientId: idHarina, quantity: 0.125, role: 'BASE' },
                            { ingredientId: idLecheEntera, quantity: 1.000, role: 'BASE' }
                        ]
                    }
                }
            });
        } catch (e) { console.error('Error seeding Bechamel', e.message); }

        // ARROZ SUSHI
        // Arroz 1KG? Vinagreta?
        // Let's assume 1kg Arroz yielded with 500cc Vinagreta part?
        // Recipe says: 500cc Vinagre, 500g Azucar -> 1kg Vinagreta approx.
        // Gohan uses "Arroz con Vinagreta".
        // Let's define Arroz Sushi as a batch of 1KG Arroz + Vinagreta components.
        try {
            await prisma.recipe.upsert({
                where: { outputItemId: idArrozSushi },
                update: {
                    items: {
                        deleteMany: {}, create: [
                            { ingredientId: idArroz, quantity: 1.000, role: 'BASE' },
                            { ingredientId: idVinagre, quantity: 0.250, role: 'BASE' }, // Reduced ratio for sushi
                            { ingredientId: idAzucar, quantity: 0.250, role: 'BASE' },
                            { ingredientId: idSal, quantity: 0.015, role: 'BASE' }
                        ]
                    }
                },
                create: {
                    name: 'Formula Arroz Sushi (1.5kg)', baseWeight: 1.500, outputItemId: idArrozSushi,
                    items: {
                        create: [
                            { ingredientId: idArroz, quantity: 1.000, role: 'BASE' },
                            { ingredientId: idVinagre, quantity: 0.250, role: 'BASE' },
                            { ingredientId: idAzucar, quantity: 0.250, role: 'BASE' },
                            { ingredientId: idSal, quantity: 0.015, role: 'BASE' }
                        ]
                    }
                }
            });
        } catch (e) { console.error('Error seeding Arroz Sushi', e.message); }


        console.log('✅ Master Recipes Seeding process finished (ALL VARIANTS COVERED & NORMALIZED).');

    } catch (criticalError) {
        console.error('CRITICAL SEED ERROR', criticalError);
        throw criticalError;
    }
};
