/**
 * Business constants for Lo Más Rico.
 * 
 * Centralized configuration to avoid magic strings and numbers
 * scattered across the codebase. Change values here, not in
 * individual services.
 */

// ─── Location ──────────────────────────────────────────────

export const BUSINESS = {
    name: 'Lo Más Rico',
    tagline: 'Premium Cevichería',
    domain: 'lomasrico.cl',
    defaultEmail: 'cliente@lomasrico.cl',
    supportEmail: 'soporte@lomasrico.cl',
} as const;

export const LOCATION = {
    address: 'Obispo Hipólito Salas 1205, Concepción',
    city: 'Concepción',
    comuna: 'Concepción',
    lat: -36.8270,
    lng: -73.0503,
    /** Maximum delivery radius in kilometers */
    maxDeliveryRadiusKm: 8,
} as const;

// ─── Shipping ──────────────────────────────────────────────

export const SHIPPING = {
    /** Base delivery cost in CLP */
    baseCost: 2000,
    /** Cost per km beyond base distance */
    perKmCost: 500,
    /** Base distance included in baseCost (km) */
    baseDistanceKm: 3,
    /** Free delivery threshold in CLP */
    freeDeliveryThreshold: 25000,
} as const;

// ─── Loyalty ───────────────────────────────────────────────

export const LOYALTY = {
    /** Points earned per CLP spent */
    pointsPerCLP: 0.01,
    /** Minimum points for redemption */
    minRedemption: 500,
    /** CLP value per point when redeeming */
    redemptionValue: 1,
} as const;

// ─── Theme Colors ──────────────────────────────────────────

export const THEME = {
    primary: '#f2642e',
    primaryDark: '#d5531f',
    dark: '#0f172a',   // slate-900
    light: '#f8fafc',  // slate-50
} as const;
