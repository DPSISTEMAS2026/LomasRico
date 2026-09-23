/**
 * Módulos en pausa (cotización salón). El código sigue; no se muestran.
 * Reactivar: quitar el id de PAUSED_MODULES.
 */
export const PAUSED_MODULES = [
  'inventory',
  'recipes',
  'whatsapp',
  'banners',
] as const;

export const SHOW_POS_DELIVERY = false;

export function isModulePaused(moduleId: string): boolean {
  return (PAUSED_MODULES as readonly string[]).includes(moduleId);
}
