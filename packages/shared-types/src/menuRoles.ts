export type MenuRole = 'MAIN' | 'SIDE' | 'DRINK';

const DRINK = /bebida|limonad|cervez|jugo|gaseos|bebest|monster|agua/;
const SIDE = /empanad|papa|frito|extra|agregad|pancito|acompañ/;
const MAIN = /ceviche|bowl|crudo|roll|handroll|gohan|promo/;

export function categoryRole(category?: string | null): MenuRole {
    const value = (category || '').toLowerCase();
    if (DRINK.test(value)) return 'DRINK';
    if (SIDE.test(value)) return 'SIDE';
    if (MAIN.test(value)) return 'MAIN';
    return 'MAIN';
}

export const MENU_ROLE_LABEL: Record<MenuRole, string> = {
    MAIN: 'Platos principales',
    SIDE: 'Acompañantes',
    DRINK: 'Bebestibles',
};

export type WebMenuSection = {
    id: string;
    name: string;
    match: (category: string) => boolean;
};

export const WEB_MENU_SECTIONS: WebMenuSection[] = [
    { id: 'promos', name: 'Promos disponibles', match: (c) => /promo/i.test(c) && !/roll/i.test(c) },
    { id: 'ceviches', name: 'Ceviches', match: (c) => /ceviche|crudo/i.test(c) },
    { id: 'rolls', name: 'Rolls', match: (c) => /roll/i.test(c) },
    { id: 'bowls-gohan', name: 'Bowls y gohans', match: (c) => /bowl|gohan/i.test(c) },
    { id: 'empanadas', name: 'Empanadas', match: (c) => /empanad/i.test(c) },
    { id: 'acompanar', name: 'Para acompañar', match: (c) => /papa|frito|extra|agregad|pancito|acompa[ñn]|apanad/i.test(c) && !/empanad/i.test(c) },
    { id: 'bebidas', name: 'Bebidas', match: (c) => /bebida|limonad|cervez|jugo|gaseos|bebest|monster|agua/i.test(c) },
];

export function webMenuSectionId(category?: string | null, name?: string | null): string | null {
    if (name && /salsa/i.test(name)) return 'acompanar';
    const value = category || '';
    if (!value) return null;
    return WEB_MENU_SECTIONS.find((section) => section.match(value))?.id || null;
}

const SHOWCASE_SECTIONS = new Set(['promos', 'ceviches', 'rolls', 'bowls-gohan']);

export function isShowcasePlate(category?: string | null, name?: string | null) {
    const section = webMenuSectionId(category, name);
    if (section === 'bebidas' || section === 'empanadas' || section === 'acompanar') return false;
    if (section && SHOWCASE_SECTIONS.has(section)) return true;
    const label = `${category || ''} ${name || ''}`.toLowerCase();
    if (/bebida|limonad|cervez|jugo|gaseos|bebest|monster|agua|coca|sprite|fanta|kem|empanad|papa|frito|extra|salsa|pancito/.test(label)) {
        return false;
    }
    return /ceviche|crudo|roll|bowl|gohan|promo|handroll/.test(label);
}

const ENLARGE_SECTIONS = new Set(['ceviches', 'rolls', 'bowls-gohan']);

export function canEnlargeBySize(category?: string | null, name?: string | null) {
    const section = webMenuSectionId(category, name);
    if (section && !ENLARGE_SECTIONS.has(section)) return false;
    if (section && ENLARGE_SECTIONS.has(section)) return true;
    const label = `${category || ''} ${name || ''}`.toLowerCase();
    if (/empanad|bebida|limonad|cervez|jugo|gaseos|bebest|monster|agua|papa|frito|extra|salsa|pancito|promo/.test(label)) {
        return false;
    }
    return /ceviche|crudo|roll|bowl|gohan/.test(label);
}

export function isDishCoreModifier(groupName?: string, displayName?: string) {
    const label = `${groupName || ''} ${displayName || ''}`.toLowerCase();
    // Delivery upsells: no se preguntan en salón / QR. Todo lo demás es pregunta del plato.
    if (/extras?\s*lomasrico|extras?\s+lo\s*m[aá]s\s*rico|limonada\s+lomasrico|upsell/.test(label)) {
        return false;
    }
    return true;
}
