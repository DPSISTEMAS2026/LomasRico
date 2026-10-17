import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
export const IS_INTEGRATION = 'isIntegration';

/** Personal del local. Es el acceso por defecto de cualquier ruta sin decorador. */
export const STAFF_ROLES = ['OWNER', 'ADMIN', 'CASHIER', 'KITCHEN', 'WAITER'];
/** Login PIN: personal + repartidor (DRIVER no entra a caja/cocina por defecto). */
export const PIN_ROLES = [...STAFF_ROLES, 'DRIVER'];
export const MANAGER_ROLES = ['OWNER', 'ADMIN'];
export const CASH_ROLES = ['OWNER', 'ADMIN', 'CASHIER'];
export const FLOOR_ROLES = ['OWNER', 'ADMIN', 'CASHIER', 'WAITER'];
export const KITCHEN_ROLES = ['OWNER', 'ADMIN', 'CASHIER', 'KITCHEN', 'WAITER'];
export const DRIVER_ROLES = ['OWNER', 'ADMIN', 'DRIVER'];
export const ANY_USER_ROLES = [...STAFF_ROLES, 'CUSTOMER', 'DRIVER'];

/** Ruta abierta sin sesión. Si llega un token válido igual se adjunta `req.user`. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Ruta para integraciones externas (n8n, extensiones): exige el header `x-integration-key`. */
export const Integration = () => SetMetadata(IS_INTEGRATION, true);
