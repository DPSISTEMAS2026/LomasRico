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

export function sizeGrams(label?: string | null) {
    const value = String(label || '');
    const kg = value.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
    if (kg) return Number(kg[1].replace(',', '.')) * 1000;
    const g = value.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
    if (g) return Number(g[1].replace(',', '.'));
    return null;
}

export function findSizeModifierGroup<T extends { role?: string | null; groupName?: string; displayName?: string }>(
    groups: T[] | null | undefined,
) {
    return (groups || []).find((group) => resolveModifierRole(group.groupName, group.displayName, group.role) === 'SIZE') || null;
}

export function sortSizeOptions<T extends { name: string; sortOrder?: number }>(options: T[] | null | undefined) {
    return [...(options || [])].sort((a, b) => {
        const gramsA = sizeGrams(a.name);
        const gramsB = sizeGrams(b.name);
        if (gramsA != null && gramsB != null && gramsA !== gramsB) return gramsA - gramsB;
        return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    });
}

export function sizeUpgradePairs<T extends { id: string; name: string; priceAdjustment?: number; sortOrder?: number }>(
    group: { options?: T[] } | null | undefined,
) {
    const options = sortSizeOptions(group?.options);
    const pairs: { current: T; next: T; extra: number }[] = [];
    for (let i = 0; i < options.length - 1; i++) {
        const current = options[i];
        const next = options[i + 1];
        pairs.push({
            current,
            next,
            extra: Number(next.priceAdjustment || 0) - Number(current.priceAdjustment || 0),
        });
    }
    return pairs;
}

export function nextSizeUpgrade<T extends { options?: { id: string; name: string; priceAdjustment?: number; sortOrder?: number }[] }>(
    group: T | null | undefined,
    selectedId?: string | null,
) {
    if (!group || !selectedId) return null;
    const pairs = sizeUpgradePairs(group);
    return pairs.find((pair) => pair.current.id === selectedId) || null;
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

export type ModifierRole = 'SIZE' | 'PROTEIN' | 'SAUCE' | 'FLAVOR' | 'REMOVE' | 'PORTION' | 'UPSELL' | 'OTHER';
export type ModifierChannel = 'web' | 'pos' | 'salon';

/** Agrandar (mismo plato, siguiente tamaño) al cerrar el armado. El garzón elige el formato una sola vez en pantalla. */
export function channelOffersSizeUpgrade(channel: ModifierChannel) {
    return channel === 'web' || channel === 'pos';
}

/** Extras y limonada del plato, al final de cada compra. Solo web (delivery y QR). POS y salón los venden en la grilla. */
export function channelOffersPerItemAddons(channel: ModifierChannel) {
    return channel === 'web';
}

export const MODIFIER_ROLE_LABEL: Record<ModifierRole, string> = {
    SIZE: 'Tamaño',
    PROTEIN: 'Receta',
    SAUCE: 'Salsa del plato',
    FLAVOR: 'Sabor',
    REMOVE: 'Quitar verduras',
    PORTION: 'Cantidad',
    UPSELL: 'Sugerencia',
    OTHER: 'Otra opción',
};

export const PRODUCT_OPTION_ROLES: ModifierRole[] = ['SIZE', 'PROTEIN', 'SAUCE', 'FLAVOR', 'PORTION'];

export function isAgrandarModifier(groupName?: string, displayName?: string) {
    return /agranda tu ceviche/i.test(`${groupName || ''} ${displayName || ''}`);
}

export function resolveModifierRole(groupName?: string, displayName?: string, stored?: string | null): ModifierRole {
    const display = (displayName || '').toLowerCase();
    if (/formato|tama[ñn]o/.test(display) && !/quita/.test(display)) return 'SIZE';
    if (isAgrandarModifier(groupName, displayName)) return 'UPSELL';
    if (stored && stored !== 'OTHER') return stored as ModifierRole;
    return suggestModifierRole(groupName, displayName);
}

export function isProductOptionRole(role?: string | null) {
    if (!role || role === 'OTHER') return true;
    return PRODUCT_OPTION_ROLES.includes(role as ModifierRole);
}

export function isSuggestionRole(role?: string | null, groupName?: string, displayName?: string) {
    if (isAgrandarModifier(groupName, displayName)) return false;
    if (role === 'UPSELL') return true;
    return suggestModifierRole(groupName, displayName) === 'UPSELL';
}

export function isEspecialRole(role?: string | null, groupName?: string, displayName?: string) {
    if (resolveModifierRole(groupName, displayName, role) === 'SIZE') return false;
    if (role === 'REMOVE') return true;
    return suggestModifierRole(groupName, displayName) === 'REMOVE';
}

export function suggestModifierRole(groupName?: string, displayName?: string): ModifierRole {
    const display = (displayName || '').toLowerCase();
    if (/formato|tama[ñn]o/.test(display) && !/quita/.test(display)) return 'SIZE';
    const label = `${groupName || ''} ${displayName || ''}`.toLowerCase();
    if (/extras?\s*lomasrico|extras?\s+lo\s*m[aá]s\s*rico|limonada\s+lomasrico|upsell/.test(label)) {
        return 'UPSELL';
    }
    if (isAgrandarModifier(groupName, displayName)) return 'UPSELL';
    if (/quita|sin verdura/.test(label)) return 'REMOVE';
    if (/salsa/.test(label)) return 'SAUCE';
    if (/protein|proteín|gohan|elige tu roll|topping|relleno|premium|doble prote/.test(label)) return 'PROTEIN';
    if (/sabor|variedades|bebida lata|limonad|monster/.test(label)) return 'FLAVOR';
    if (/formato|tama[ñn]o|opciones cc|\bcc\b|1\s*kg|crudo|full bajon|pisco/.test(label)) return 'SIZE';
    if (/unidad|docena|dos x|hand roll|empanad|aros|papas|camar[oó]n|porci[oó]n/.test(label)) return 'PORTION';
    if (/opciones|elige/.test(label)) return 'PORTION';
    return 'OTHER';
}

export function isDishCoreModifier(groupName?: string, displayName?: string, role?: string | null) {
    if (role === 'UPSELL') return false;
    if (role && role !== 'OTHER') return true;
    const label = `${groupName || ''} ${displayName || ''}`.toLowerCase();
    // Delivery upsells: no se preguntan en salón / QR. Todo lo demás es pregunta del plato.
    if (/extras?\s*lomasrico|extras?\s+lo\s*m[aá]s\s*rico|limonada\s+lomasrico|upsell/.test(label)) {
        return false;
    }
    return true;
}

export function modifierVisibleOnChannel(
    group: {
        role?: string | null;
        showOnWeb?: boolean;
        showOnPos?: boolean;
        showOnSalon?: boolean;
        groupName?: string;
        displayName?: string;
    },
    channel: ModifierChannel,
) {
    if (isAgrandarModifier(group.groupName, group.displayName)) return false;
    if (isSuggestionRole(group.role, group.groupName, group.displayName)) {
        return channelOffersPerItemAddons(channel) && group.showOnWeb !== false;
    }
    if (channel === 'web' && typeof group.showOnWeb === 'boolean') return group.showOnWeb;
    if (channel === 'pos' && typeof group.showOnPos === 'boolean') return group.showOnPos;
    if (channel === 'salon' && typeof group.showOnSalon === 'boolean') return group.showOnSalon;
    return isDishCoreModifier(group.groupName, group.displayName, group.role);
}

export function filterModifiersForChannel<T extends {
    role?: string | null;
    showOnWeb?: boolean;
    showOnPos?: boolean;
    showOnSalon?: boolean;
    groupName?: string;
    displayName?: string;
    sortOrder?: number;
}>(groups: T[] | null | undefined, channel: ModifierChannel): T[] {
    return (groups || [])
        .filter((group) => modifierVisibleOnChannel(group, channel))
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
}

export function filterSuggestionsForChannel<T extends {
    role?: string | null;
    showOnWeb?: boolean;
    groupName?: string;
    displayName?: string;
    sortOrder?: number;
}>(groups: T[] | null | undefined, channel: ModifierChannel): T[] {
    if (!channelOffersPerItemAddons(channel)) return [];
    return (groups || [])
        .filter((group) => isSuggestionRole(group.role, group.groupName, group.displayName) && !isAgrandarModifier(group.groupName, group.displayName))
        .filter((group) => group.showOnWeb !== false)
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
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

export function drinkOptionSizeMismatch(productName?: string | null, optionName?: string | null) {
    const productSize = parseSize(productName);
    const optionSize = parseSize(optionName);
    if (!productSize || !optionSize) return null;
    if (productSize.cc === optionSize.cc) return null;
    return { productCc: Math.round(productSize.cc), optionCc: Math.round(optionSize.cc) };
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
