# Reporte de Salud del Sistema - 2026-02-07

## 1. Contexto General
**Tipo de Proyecto**: Monorepo con Turborepo (implícito por estructura `apps/*` y `packages/*`).
**Gestor de Paquetes**: `npm`.
**Base de Datos**: PostgreSQL con Prisma.

## 2. Análisis de Aplicaciones
La arquitectura está dividida en 6 aplicaciones principales: `api`, `web`, `admin`, `owner`, `pos`, `kitchen`.

### Backend: `apps/api`
- **Framework**: NestJS (Inferido por estructura).
- **Estado**: Estructura modular sólida, alineada con el dominio (Inventory, Sales, Kitchen, Users).
- **Observación Critica**: Presencia de `manual-seed.ts` sugiere falta de scripts robustos de seed en `packages/database`.

### Frontend: `apps/web` (Cliente Web)
- **Framework**: `Next.js 16.1.4` (Versión Canary/RC). **ALERTA: Versión inestable/experimental.**
- **Estilos**: `TailwindCSS v4` (Versión Beta/RC).
- **Estado**: Muy bleeding edge. Puede presentar incompatibilidades con librerías maduras.

### Frontend: `apps/owner` (Panel Dueño)
- **Framework**: `Next.js 15.1.0` (Estable).
- **Estilos**: `TailwindCSS v3.4.1` (Estable).
- **Dependencias**: Uso directo de `@supabase/supabase-js`.
- **Riesgo**: Si la lógica de negocio está en la API, el acceso directo a Supabase podría duplicar reglas o saltarse validaciones.

## 3. Puntos Críticos de Salud

### 🔴 Fragmentación de Versiones (ALTA PRIORIDAD)
Existe una **inconsistencia grave** en las versiones del stack tecnológico entre aplicaciones:
- `apps/web` usa Next.js 16 + Tailwind 4.
- `apps/owner` usa Next.js 15 + Tailwind 3.
- Esto duplica el esfuerzo de mantenimiento, obliga a aprender dos versiones de herramientas y rompe la portabilidad de componentes.

### 🟡 Limpieza del Directorio Raíz
El directorio raíz contiene carpetas temporales que deberían ser archivadas o eliminadas:
- `temp_gramajes/`, `temp_menu/`, `temp_recetas.pdf`.
- **Acción**: Mover a `docs/legacy/` o eliminar si ya fueron procesados.

### 🟢 Base de Datos
El esquema de Prisma (`packages/database/prisma/schema.prisma`) está bien diseñado, cubriendo casos complejos como Recetas, KDS (Kitchen Display System), y Snapshots de recetas en ventas.

## 4. Recomendaciones Inmediatas

1.  **Unificar Stack Frontend**: Downgrade de `apps/web` a Next.js 15.1.0 y Tailwind 3.4.1 para alinear con `owner` y garantizar estabilidad en producción.
2.  **Centralizar UI**: Crear/Reforzar `packages/ui` para compartir componentes (Botones, Inputs, Cards) entre las 5 apps de frontend y evitar reescribir estilos.
3.  **Limpieza**: Ejecutar script de limpieza en raíz.
4.  **Validar API**: Asegurar que `apps/owner` consuma la API NestJS en lugar de ir directo a Supabase (si aplica), para centralizar la lógica de negocio.
