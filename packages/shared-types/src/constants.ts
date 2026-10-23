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

/** Local actual: General Cruz 92, Concepción (punto central de despacho). */
export const LOCATION = {
    address: 'General Cruz 92, Concepción, Chile',
    city: 'Concepción',
    comuna: 'Concepción',
    lat: -36.8211,
    lng: -73.0603,
    /** Máximo de despacho (último tramo). */
    maxDeliveryRadiusKm: 12,
} as const;

// ─── Shipping (tarifas por distancia desde LOCATION) ────────

/** Tramos inclusivos en el tope: d <= maxKm. */
/** freeFrom: subtotal del carrito desde el cual ese tramo es gratis. */
export const SHIPPING_BANDS = [
    { maxKm: 3.5, cost: 2000, freeFrom: 20000, label: 'Despacho 0–3,5 km' },
    { maxKm: 7.5, cost: 3500, freeFrom: 30000, label: 'Despacho 3,5–7,5 km' },
    { maxKm: 9.5, cost: 4000, freeFrom: 40000, label: 'Despacho 7,5–9,5 km' },
    { maxKm: 12, cost: 5500, freeFrom: 48000, label: 'Despacho 9,5–12 km' },
] as const;

export const SHIPPING = {
    bands: SHIPPING_BANDS,
    maxDistanceKm: 12,
    concepcionCost: 2000,
    outsideCost: 5500,
    baseCost: 2000,
    perKmCost: 0,
    baseDistanceKm: 0,
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
