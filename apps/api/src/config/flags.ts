/** Inventario en pausa salvo INVENTORY_ENFORCEMENT=true */
export function isInventoryEnforced(): boolean {
  return process.env.INVENTORY_ENFORCEMENT === 'true';
}
