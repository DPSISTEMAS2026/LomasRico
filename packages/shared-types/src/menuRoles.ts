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
    { id: 'bebidas', name: 'Bebestibles', match: (c) => /bebida|limonad|cervez|jugo|gaseos|bebest|monster|agua/i.test(c) },
];

export function webMenuSectionId(category?: string | null, name?: string | null): string | null {
    if (name && /salsa/i.test(name)) return 'acompanar';
    const value = category || '';
    if (!value) return null;
    return WEB_MENU_SECTIONS.find((section) => section.match(value))?.id || null;
}

export function webSectionKey(category?: string | null, name?: string | null): string {
    return webMenuSectionId(category, name) || `other-${category || 'otros'}`;
}

export function groupProductsByWebSection<T extends { category?: string | null; name?: string | null; sortOrder?: number }>(
    products: T[],
) {
    const sections = WEB_MENU_SECTIONS.map((section) => ({
        id: section.id,
        name: section.name,
        products: [] as T[],
    }));
    const leftovers = new Map<string, { id: string; name: string; products: T[] }>();

    for (const product of products) {
        const sectionId = webMenuSectionId(product.category, product.name);
        if (sectionId) {
            sections.find((section) => section.id === sectionId)?.products.push(product);
            continue;
        }
        const key = product.category || 'otros';
        if (!leftovers.has(key)) leftovers.set(key, { id: `other-${key}`, name: key, products: [] });
        leftovers.get(key)!.products.push(product);
    }

    return [
        ...sections.filter((section) => section.products.length > 0),
        ...[...leftovers.values()].filter((section) => section.products.length > 0),
    ];
}

export function displayCategoryName(category?: string | null) {
    if (/bebida/i.test(category || '')) return 'Bebestibles';
    return category || '';
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

export function cleanModifierLabel(label?: string | null): string {
    if (!label) return '';
    return String(label)
        .replace(/mer-?cat\s*:\s*/gi, '')
        .replace(/\bmer-?cat\b/gi, '')
        .replace(/^[:\s\-]+/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function isDishCoreModifier(groupName?: string, displayName?: string) {
    const label = `${groupName || ''} ${displayName || ''}`.toLowerCase();
    // Delivery upsells: no se preguntan en salón / QR. Todo lo demás es pregunta del plato.
    if (/extras?\s*lomasrico|extras?\s+lo\s*m[aá]s\s*rico|limonada\s+lomasrico|upsell/.test(label)) {
        return false;
    }
    return true;
}

const SIZE_RE = /(\d+(?:[.,]\d+)?)\s*(cc|ml|l|lt|litro)s?\b/i;

type DrinkModifierOption = {
    id: string;
    name: string;
    priceAdjustment?: number;
    isDefault?: boolean;
    [key: string]: unknown;
};

type DrinkModifierGroup = {
    groupId: string;
    groupName?: string;
    displayName?: string;
    type?: string;
    isRequired?: boolean;
    minSelections?: number;
    maxSelections?: number;
    options?: DrinkModifierOption[];
    [key: string]: unknown;
};

function groupLabel(group: DrinkModifierGroup) {
    return `${group.groupName || ''} ${group.displayName || ''}`.toLowerCase();
}

function parseSize(label?: string | null) {
    const match = String(label || '').match(SIZE_RE);
    if (!match) return null;
    const n = Number(match[1].replace(',', '.'));
    let u = match[2].toLowerCase();
    if (u === 'lt' || u === 'litro' || u === 'l') u = 'l';
    const cc = u === 'l' ? n * 1000 : n;
    return { n, u, cc };
}

export function stripDrinkSize(label?: string | null) {
    return cleanModifierLabel(label)
        .replace(SIZE_RE, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function isDrinkCatalogItem(category?: string | null, name?: string | null) {
    if (categoryRole(category) === 'DRINK') return true;
    return DRINK.test(`${category || ''} ${name || ''}`.toLowerCase());
}

function isMerCatDrinkChoiceGroup(group: DrinkModifierGroup) {
    const label = groupLabel(group);
    return /\bopciones?\b/.test(label) || /\bvariedades\b/.test(label);
}

function isDrinkSizeUpsell(group: DrinkModifierGroup) {
    const label = groupLabel(group);
    if (/opciones\s*cc|tama[ñn]o|formato/.test(label)) return true;
    const options = group.options || [];
    return options.length > 0 && options.every((opt) => {
        const size = parseSize(opt.name);
        return !!size && Number(opt.priceAdjustment || 0) >= 500;
    });
}

function isDummyDrinkGroup(productName: string, group: DrinkModifierGroup) {
    const options = group.options || [];
    if (options.length !== 1) return false;
    const optionName = stripDrinkSize(options[0].name).toLowerCase();
    const base = stripDrinkSize(productName).toLowerCase();
    return !optionName || optionName === base || optionName.includes(base) || base.includes(optionName) || /normal/.test(optionName);
}

export function normalizeDrinkModifiers<T extends DrinkModifierGroup>(
    product: { name?: string; category?: string | null; modifiers?: T[] | null },
): T[] {
    const groups = (product.modifiers || []) as T[];
    if (!isDrinkCatalogItem(product.category, product.name)) return groups;

    const productSize = parseSize(product.name);
    const usable = groups.filter((group) => {
        if (isDummyDrinkGroup(product.name || '', group)) return false;
        if (isDrinkSizeUpsell(group)) return false;
        if (!isDishCoreModifier(group.groupName, group.displayName)) return false;
        return true;
    });

    const choice = usable.find((group) => isMerCatDrinkChoiceGroup(group));
    const flavor = usable.find((group) => /sabor/.test(groupLabel(group)));
    const source = choice || flavor;
    if (!source) return [];

    const options = (source.options || [])
        .filter((opt) => {
            const optionSize = parseSize(opt.name);
            if (productSize && optionSize && optionSize.cc !== productSize.cc) return false;
            return true;
        })
        .map((opt) => ({
            ...opt,
            name: (stripDrinkSize(opt.name) || cleanModifierLabel(opt.name)).replace(/^limonada\s+/i, ''),
            priceAdjustment: Number(opt.priceAdjustment || 0) >= 500 ? 0 : Number(opt.priceAdjustment || 0),
        }));

    if (options.length === 0) return [];
    if (options.length === 1 && isDummyDrinkGroup(product.name || '', { ...source, options })) return [];

    return [{
        ...source,
        type: 'SINGLE_SELECT',
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
        groupName: 'Sabor',
        displayName: flavor ? cleanModifierLabel(flavor.displayName || flavor.groupName) || 'Sabor' : 'Sabor',
        options,
    }];
}

export function drinkTicketName(productName: string, flavor?: string | null) {
    if (!flavor) return productName;
    const size = String(productName || '').match(/(\d+(?:[.,]\d+)?\s*(?:cc|ml|l|lt|litro)s?)/i)?.[1] || '';
    let base = flavor;
    if (/limonad/i.test(productName) && !/limonad/i.test(flavor)) base = `Limonada ${flavor}`;
    return [base, size].filter(Boolean).join(' ');
}
