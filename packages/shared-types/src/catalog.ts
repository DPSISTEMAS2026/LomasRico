import { Product } from './index';

export const REAL_PRODUCT_CATALOG: Product[] = [
    // --- CEVICHE LOMASRICO (BASE TRADICIONAL) ---
    {
        id: 'lmr-250',
        name: 'Ceviche LoMASRico 250g',
        description: 'Elige hasta 3 proteínas. Base Tradicional.',
        price: 5900,
        category: 'CEVICHE LOMASRICO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Ceviche LoMASRico.jpg'
    },
    {
        id: 'lmr-350',
        name: 'Ceviche LoMASRico 350g',
        description: 'Elige hasta 3 proteínas. Base Tradicional.',
        price: 8900,
        category: 'CEVICHE LOMASRICO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Ceviche LoMASRico.jpg'
    },
    {
        id: 'lmr-500',
        name: 'Ceviche LoMASRico 500g',
        description: 'Elige hasta 3 proteínas. Base Tradicional.',
        price: 11900,
        category: 'CEVICHE LOMASRICO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Ceviche LoMASRico 500g.jpg'
    },
    {
        id: 'lmr-750',
        name: 'Ceviche LoMASRico 750g',
        description: 'Elige hasta 3 proteínas. Base Tradicional.',
        price: 16900,
        category: 'CEVICHE LOMASRICO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Ceviche LoMASRico 750g.jpg'
    },
    {
        id: 'lmr-1kg',
        name: 'Ceviche LoMASRico 1KG',
        description: 'Elige hasta 3 proteínas. Base Tradicional.',
        price: 20900,
        category: 'CEVICHE LOMASRICO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Ceviche LoMASRico 1KG.jpg'
    },

    // --- CEVICHE PERUANO (BASE PERUANA) ---
    {
        id: 'peruano-350',
        name: 'Ceviche Peruano 350g',
        description: 'Base Peruana (Rocoto/Apio). Proteínas a elección.',
        price: 10900,
        category: 'CEVICHE PERUANO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Peruano 350g.jpg'
    },
    {
        id: 'peruano-500',
        name: 'Ceviche Peruano 500g',
        description: 'Base Peruana (Rocoto/Apio). Proteínas a elección.',
        price: 13400,
        category: 'CEVICHE PERUANO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Ceviche Peruano 500g.jpeg'
    },
    {
        id: 'peruano-750',
        name: 'Ceviche Peruano 750g',
        description: 'Base Peruana (Rocoto/Apio). Proteínas a elección.',
        price: 18900,
        category: 'CEVICHE PERUANO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Peruano 750g.jpg'
    },
    {
        id: 'peruano-1kg',
        name: 'Ceviche Peruano 1KG',
        description: 'Base Peruana (Rocoto/Apio). Proteínas a elección.',
        price: 22900,
        category: 'CEVICHE PERUANO',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/Peruano 1KG.png'
    },

    // --- PROMOS ---
    {
        id: 'promo-1',
        name: 'PROMO 1',
        description: 'Ceviche 250g + Papas + Camarones + Aros',
        price: 14900,
        category: 'PROMOS',
        allowsModifiers: true, // Hereda lógica del ceviche 250
        maxProteins: 3,
        imageUrl: '/assets/PROMO 1.png'
    },
    {
        id: 'promo-2',
        name: 'PROMO 2',
        description: 'Ceviche 350g + 2 Empanadas Queso + Papas',
        price: 12900,
        category: 'PROMOS',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/PROMO 2.png'
    },
    {
        id: 'promo-3',
        name: 'PROMO 3',
        description: 'Ceviche 500g + Papas Medianas + 10 Aros',
        price: 16400,
        category: 'PROMOS',
        allowsModifiers: true,
        maxProteins: 3,
        imageUrl: '/assets/PROMO 3.png'
    },
    {
        id: 'promo-miedo',
        name: 'De Miedo!',
        description: '750g Salmón (Fijo) + 4 Empanadas + Pancitos',
        price: 24900,
        category: 'PROMOS',
        allowsModifiers: true, // Ahora permite elegir proteínas para reemplazar el Salmón por defecto
        imageUrl: '/assets/De Miedo.png'
    },
    {
        id: 'promo-mega',
        name: 'MEGA PROMO!',
        description: '1KG Salmón (Fijo) + 6 Empanadas + Pancitos + Salsa',
        price: 25900,
        category: 'PROMOS',
        allowsModifiers: true, // Ahora permite elegir proteínas
        imageUrl: '/assets/MEGA PROMO.png'
    },
    {
        id: 'promo-express',
        name: 'Promo Express',
        description: 'Ceviche 250g Salmón + Acomp + Bebida',
        price: 7990,
        category: 'PROMOS',
        allowsModifiers: true, // Permite elegir la proteína del ceviche express
        imageUrl: '/assets/Promo Express.png'
    },

    // --- EMPANADAS ---
    {
        id: 'emp-queso',
        name: 'Empanada Queso',
        description: 'Frita, solo queso',
        price: 2000,
        category: 'EMPANADAS',
        allowsModifiers: false,
        imageUrl: '/assets/Empanada Queso.jpg'
    },
    {
        id: 'emp-camaron',
        name: 'Empanada Camarón-Queso',
        description: 'Frita, camarón y queso',
        price: 2500,
        category: 'EMPANADAS',
        allowsModifiers: false,
        imageUrl: '/assets/Empanada Camarón Queso.jpg'
    },
    {
        id: 'emp-macha',
        name: 'Empanada Macha-Queso',
        description: 'Frita, macha y queso',
        price: 2800,
        category: 'EMPANADAS',
        allowsModifiers: false,
        imageUrl: '/assets/Empanada Macha Queso.jpg'
    },

    // --- ACOMPAÑAMIENTOS / EXTRAS ---
    {
        id: 'extra-papas',
        name: 'Papas Fritas',
        price: 2900,
        category: 'EXTRAS',
        allowsModifiers: false,
        imageUrl: '/assets/Papas Fritas LoMASRico.png'
    },
    {
        id: 'extra-aros',
        name: 'Aros de Cebolla (10 un)',
        price: 2900,
        category: 'EXTRAS',
        allowsModifiers: false,
        imageUrl: '/assets/Apanados LoMASRico.png' // Reutilizando imagen apanados por ahora
    },
    {
        id: 'extra-camarones',
        name: 'Camarones Apanados (10 un)',
        price: 4900,
        category: 'EXTRAS',
        allowsModifiers: false,
        imageUrl: '/assets/Apanados LoMASRico.png'
    },
    {
        id: 'extra-pancitos-ajo',
        name: 'Pancitos con Ajo',
        price: 1500,
        category: 'EXTRAS',
        allowsModifiers: false,
        imageUrl: '/assets/Pancitos con Ajo.jpg'
    },
    {
        id: 'extra-pancitos-oregano',
        name: 'Pancitos Orégano',
        price: 1500,
        category: 'EXTRAS',
        allowsModifiers: false,
        imageUrl: '/assets/Pancitos con Ajo.jpg' // Reutilizando
    },

    // --- BEBIDAS ---
    {
        id: 'beb-coca-591',
        name: 'Coca Cola 591cc',
        price: 1600,
        category: 'BEBIDAS',
        allowsModifiers: false,
        imageUrl: '/assets/Coca Cola 591cc.jpg'
    },
    {
        id: 'beb-limonada',
        name: 'Limonada Clásica',
        price: 3000,
        category: 'BEBIDAS',
        allowsModifiers: false,
        imageUrl: '/assets/Limonada Clásica.jpg'
    }
];

export const PROTEINS = [
    { id: 'salmon', name: 'Salmón' },
    { id: 'reineta', name: 'Reineta' },
    { id: 'atun', name: 'Atún' },
    { id: 'pulpo', name: 'Pulpo' },
    { id: 'macha', name: 'Macha' },
    { id: 'camaron', name: 'Camarón' }
];

export const VEGGIES = [
    { id: 'cebolla', name: 'Cebolla Morada' },
    { id: 'cilantro', name: 'Cilantro' },
    { id: 'choclo', name: 'Choclo Peruano' },
    { id: 'aji-limo', name: 'Ají Limo' },
    { id: 'camote', name: 'Camote' }
];
