/**
 * Turno operativo de caja: ventas WEB / apps / etc. van siempre a un cajero (role CASHIER).
 * Turnos permanentes de OWNER/ADMIN son solo para ventas hechas desde el panel de gestión.
 */
export async function findOpenCashierShift(tx: {
  cashShift: { findFirst: (args: unknown) => Promise<{ id: string; cashierId: string } | null> };
}) {
  return tx.cashShift.findFirst({
    where: {
      status: 'OPEN',
      cashier: { role: 'CASHIER' },
    },
    orderBy: { openingTime: 'desc' },
    select: { id: true, cashierId: true },
  });
}
