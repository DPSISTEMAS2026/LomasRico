/**
 * Script para migrar todas las imágenes de public/assets/ a Supabase Storage
 * Ejecutar: node scripts/migrate-assets-to-supabase.js
 */

require('dotenv').config({ path: './apps/owner/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Permitir pasar las variables como argumentos: node script.js <URL> <KEY>
const supabaseUrl = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Uso: node scripts/migrate-assets-to-supabase.js <SUPABASE_URL> <SUPABASE_ANON_KEY>');
    console.error('   O configura las variables en apps/owner/.env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ASSETS_DIR = path.join(__dirname, '../apps/owner/public/assets');
const BUCKET_NAME = 'assets';

async function migrateAssets() {
    console.log('🚀 Iniciando migración de assets a Supabase...\n');
    console.log(`📦 Usando bucket: "${BUCKET_NAME}"\n`);

    // Leer archivos de assets
    const files = fs.readdirSync(ASSETS_DIR).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    });

    console.log(`📁 Encontrados ${files.length} archivos de imagen\n`);

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
        const filePath = path.join(ASSETS_DIR, file);
        const fileBuffer = fs.readFileSync(filePath);

        // Verificar si ya existe
        const { data: existing } = await supabase.storage
            .from(BUCKET_NAME)
            .list('', { search: file });

        if (existing && existing.length > 0) {
            console.log(`⏭️  Saltando "${file}" (ya existe)`);
            skipped++;
            continue;
        }

        // Subir archivo
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(file, fileBuffer, {
                contentType: `image/${path.extname(file).slice(1)}`,
                upsert: false
            });

        if (uploadError) {
            console.error(`❌ Error al subir "${file}":`, uploadError.message);
            failed++;
        } else {
            console.log(`✅ Subido "${file}"`);
            uploaded++;
        }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Subidos: ${uploaded}`);
    console.log(`   ⏭️  Saltados: ${skipped}`);
    console.log(`   ❌ Fallidos: ${failed}`);
    console.log('\n🎉 Migración completada');
}

migrateAssets().catch(console.error);
