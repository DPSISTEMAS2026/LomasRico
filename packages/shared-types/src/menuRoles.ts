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

export function isDishCoreModifier(groupName?: string, displayName?: string) {
    const label = `${groupName || ''} ${displayName || ''}`.toLowerCase();
    if (/extra|agregad|empanad|bebid|upsell|acompañ|promo|combo|lo m[aá]s rico/.test(label)) {
        return false;
    }
    return /formato|tama[ñn]o|protein|proteín|verdura|sin verde|base|salsa/.test(label);
}
