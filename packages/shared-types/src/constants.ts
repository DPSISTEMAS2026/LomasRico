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
    address: 'Cruz 92, Concepción, Chile',
    city: 'Concepción',
    comuna: 'Concepción',
    lat: -36.8211,
    lng: -73.0603,
    /** Soft max for absurd addresses (km). Zone pricing decides cost inside this. */
    maxDeliveryRadiusKm: 45,
} as const;

// ─── Shipping ──────────────────────────────────────────────

export const SHIPPING = {
    /** Despacho dentro de la comuna Concepción (CLP) */
    concepcionCost: 2500,
    /** Despacho fuera de Concepción (CLP) */
    outsideCost: 4000,
    /** Envío gratis en Concepción desde este subtotal (CLP) */
    freeInConcepcionFrom: 20000,
    /** Envío gratis a cualquier destino desde este subtotal (CLP) */
    freeAnywhereFrom: 25000,
    /** @deprecated use freeAnywhereFrom */
    freeDeliveryThreshold: 25000,
    baseCost: 2500,
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
