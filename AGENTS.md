# Agente ops — Lo Más Rico

Brief para soporte desde celular (Cursor iOS / [cursor.com/agents](https://cursor.com/agents)) en apertura o servicio.

## URLs producción
| Qué | URL |
|---|---|
| Web tienda | https://lomasrico.cl |
| Panel | https://paneles.lomasrico.cl |
| API | https://api.lomasrico.cl |
| Estado tienda (público) | https://api.lomasrico.cl/store/status |
| Tienda web (dueño) | https://paneles.lomasrico.cl → **Tienda web** |

## Rol
Respuestas cortas en **español chileno**. Destrabar servicio sin romper producción.

## Checklist al despertar / consulta urgente
1. `node scripts/ops-status.mjs` (o `GET https://api.lomasrico.cl/store/status`) — `ordersEnabled`, `open`, horario.
2. Pedidos WEB: `APPROVED` sin ticket de cocina vs `PENDING` (abandonados; ignorar).
3. Turno cajera: solo `APPROVED`; no colgar `PENDING`.
4. Reportá en ≤3 líneas qué está OK y qué hay que hacer.

## Eventualidades frecuentes
| Problema | Qué mirar / hacer |
|---|---|
| Web no deja pedir | Panel **Tienda web** o `PATCH /store/settings` `{ "webOrdersEnabled": true }` (+ `webHours` ej. `"12:30-22:00"`) |
| Cerrar pedidos web | `{ "webOrdersEnabled": false }` |
| Horario del local distinto al default | `webHours` formato `HH:MM-HH:MM` (ej. apertura 12:30 → `"12:30-22:00"`) |
| Pago web no llega a cocina | `paymentStatus=APPROVED` + kitchen ticket; PENDING sin ticket = abandonado |
| TUU máquina local | Débito/crédito POS en turno cajera |
| TUU web | Pasarela online; no confundir con máquina |
| Comanda corta / no corta | POS-5890F 58mm, tear-bar, sin cutter auto |

## Scripts ops (`scripts/ops/`)
Pasan por la API (precios, promos, turno, auditoría). Requieren `OPS_PIN` (dueño/admin) en `scripts/ops/.env`. Sin `--apply` solo muestran.

| Situación | Comando |
|---|---|
| Web pagada ¿llegó a cocina? | `node scripts/ops/web-check.mjs` (`--apply` manda las que falten) |
| Voucher TUU impreso pero sistema dijo rechazado | `node scripts/ops/tuu-check.mjs` → huérfano: `--recover <key> --like <código> --apply` |
| Buscar venta | `node scripts/ops/find-sale.mjs --amount 7000 --tol 1000` / `--text luis` / `--code 41` |
| Reimprimir comanda o cuenta | `node scripts/ops/kitchen-print.mjs 41` (`--account`) — solo en el PC del local |
| Turnos colgados / mesas ocupadas | `node scripts/ops/floor-check.mjs` |
| Abrir/cerrar web, horario | `node scripts/ops/web-store.mjs --off --apply` / `--hours 12:30-22:00 --apply` |

Promos tipo "2 x" son un modificador del plato (ej. Handroll + PROMO 2X = $7.000): para recuperar, copiar platos con `--like` de una venta igual.

## Prohibido sin confirmación explícita
Force-push, borrar ventas, cerrar turnos, cambiar env de producción, migraciones destructivas.

## Prompt listo para pegar (móvil)
```
Modo ops apertura Lo Más Rico. Seguí AGENTS.md.
Chequeá https://api.lomasrico.cl/store/status, WEB PENDING vs APPROVED sin cocina, turno cajera.
Quedate listo para eventualidades (web, TUU, cocina, turnos, impresión 58mm).
Español chileno, corto. No force-push ni borrar ventas.
```
