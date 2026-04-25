# 🛠️ PLAN DE IMPLEMENTACIÓN - Corrección de Bugs Críticos

**Fecha**: 5 de febrero de 2026  
**Objetivo**: Resolver los 18 bugs críticos identificados en la auditoría  
**Tiempo Estimado**: 7-10 días

---

## 📋 ORDEN DE EJECUCIÓN

### DÍA 1: REGENERAR PRISMA Y ARREGLAR GUARDADO DE DATOS

#### ✅ TAREA 1.1: Regenerar Prisma Client (Bug #5)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 10 minutos

```bash
cd packages/database
npx prisma generate
npm run build
cd ../..
npm install
```

**Validación**:
- [ ] No hay errores de TypeScript en `auth.service.ts`
- [ ] Se pueden importar tipos de `@lomasrico/database`

---

#### ✅ TAREA 1.2: Arreglar Guardado de Productos (Bug #1, #11)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 30 minutos

**Archivo**: `apps/owner/app/catalog/page.tsx`

**Cambios**:
1. Línea 154-169: Agregar `maxProteins` al payload de UPDATE
2. Línea 228: Agregar campo para editar `maxProteins` en la UI

**Archivo**: `apps/api/src/products/products.service.ts`

**Cambios**:
1. Línea 239-250: Incluir `maxProteins` en el update

**Validación**:
- [ ] Crear producto con `isConfigurable=true` y `maxProteins=3`
- [ ] Editar el producto y cambiar precio
- [ ] Verificar que `maxProteins` siga siendo 3

---

#### ✅ TAREA 1.3: Arreglar Guardado de Recetas (Bug #2, #3, #4)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 1 hora

**Archivo**: `apps/owner/app/recipes/page.tsx`

**Cambios**:
1. Línea 51-56: Agregar `role` al cargar receta existente
2. Línea 65-73: Agregar `role` al agregar nuevo ingrediente
3. Línea 94-98: Agregar `role` al payload de guardado
4. Línea 334-341: Reemplazar `<span>` por `<select>` para editar role
5. Agregar estado para `baseWeight` y capturarlo en el payload

**Validación**:
- [ ] Crear receta para "Ceviche LoMASRico 350g"
- [ ] Agregar Salmón con role PROTEIN_MAIN
- [ ] Agregar Pulpo con role PROTEIN_SPECIAL
- [ ] Agregar Cebolla con role VEGGIE
- [ ] Guardar y recargar
- [ ] Verificar que los roles se mantengan

---

### DÍA 2: ARREGLAR FLUJO DE PEDIDOS Y COCINA

#### ✅ TAREA 2.1: Arreglar Creación de Kitchen Tickets (Bug #6)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 20 minutos

**Archivo**: `apps/api/src/sales/sales.service.ts`

**Cambios**:
1. Línea 217-225: Siempre crear ticket, independiente del status

**Validación**:
- [ ] Crear venta desde POS
- [ ] Verificar que aparezca en cocina inmediatamente

---

#### ✅ TAREA 2.2: Arreglar Detalles en Cocina (Bug #7)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 30 minutos

**Archivo**: `apps/api/src/kitchen/kitchen.service.ts`

**Cambios**:
1. Línea 38-40: Agregar `sellingProduct` y `recipeSnapshot` al include

**Validación**:
- [ ] Crear venta con ceviche configurable
- [ ] Seleccionar 3 proteínas
- [ ] Verificar que en cocina se vean las proteínas seleccionadas

---

### DÍA 3: ARREGLAR LÓGICA DE PROTEÍNAS

#### ✅ TAREA 3.1: Arreglar Productos Sin Receta (Bug #8)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 30 minutos

**Archivo**: `apps/api/src/recipe-engineering/recipe-resolver.service.ts`

**Cambios**:
1. Línea 48-56: Lanzar error claro en lugar de retornar ID inválido

**Validación**:
- [ ] Intentar vender "Coca Cola 591cc" (sin receta)
- [ ] Verificar que muestre error claro

---

#### ✅ TAREA 3.2: Arreglar Identificación de Proteínas Especiales (Bug #16)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 30 minutos

**Archivo**: `apps/api/src/recipe-engineering/recipe-resolver.service.ts`

**Cambios**:
1. Línea 143-145: Usar `role` en lugar de nombre hardcodeado

**Validación**:
- [ ] Crear venta con 3 proteínas (2 MAIN + 1 SPECIAL)
- [ ] Verificar que la distribución sea 140g/140g/80g

---

### DÍA 4: VALIDACIONES Y ROBUSTEZ

#### ✅ TAREA 4.1: Validar Stock Antes de Venta (Bug #14)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 1 hora

**Archivo**: `apps/api/src/sales/sales.service.ts`

**Cambios**:
1. Línea 200-214: Agregar validación de stock antes de descontar

**Validación**:
- [ ] Configurar Salmón con stock de 1kg
- [ ] Intentar vender 2 ceviches de 500g (requiere 1.2kg)
- [ ] Verificar que muestre error de stock insuficiente

---

#### ✅ TAREA 4.2: Generar Códigos Únicos (Bug #15)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 30 minutos

**Archivo**: `apps/api/src/sales/sales.service.ts`

**Cambios**:
1. Línea 176: Generar código secuencial en lugar de random

**Validación**:
- [ ] Crear 10 ventas
- [ ] Verificar que los códigos sean #0001, #0002, ..., #0010

---

#### ✅ TAREA 4.3: Validar Modifiers (Bug #13)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 45 minutos

**Archivo**: `apps/api/src/recipe-engineering/recipe-resolver.service.ts`

**Cambios**:
1. Línea 119-122: Agregar validación de proteínas seleccionadas

**Validación**:
- [ ] Intentar crear venta con proteína inexistente
- [ ] Verificar que muestre error claro

---

### DÍA 5: ESTANDARIZACIÓN Y CONVERSIONES

#### ✅ TAREA 5.1: Estandarizar Unidades (Bug #9)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 1 hora

**Archivo**: `apps/owner/app/recipes/page.tsx`

**Cambios**:
1. Línea 359: Cambiar opciones de unidades a ['KG', 'G', 'LT', 'ML', 'UN']

**Archivo**: `apps/api/src/recipes/recipes.service.ts`

**Cambios**:
1. Línea 76-86: Actualizar lógica de conversión

**Validación**:
- [ ] Crear receta con 500G de salmón
- [ ] Verificar que se guarde como 0.5 KG

---

#### ✅ TAREA 5.2: Implementar baseWeight (Bug #10)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 45 minutos

**Archivo**: `apps/owner/app/recipes/page.tsx`

**Cambios**:
1. Agregar estado `baseWeight`
2. Agregar input en la UI
3. Enviar en el payload

**Validación**:
- [ ] Crear receta con baseWeight=0.350
- [ ] Verificar que se guarde correctamente

---

### DÍA 6: ENDPOINTS Y ESTANDARIZACIÓN

#### ✅ TAREA 6.1: Crear Endpoint de Recetas (Bug #17)
**Prioridad**: 🟡 MEDIA  
**Tiempo**: 30 minutos

**Archivo**: `apps/api/src/recipes/recipes.controller.ts`

**Cambios**:
1. Agregar endpoint `GET /recipes/by-product/:productId`

**Validación**:
- [ ] Llamar al endpoint con un productId válido
- [ ] Verificar que retorne la receta completa

---

#### ✅ TAREA 6.2: Estandarizar sellingProductId (Bug #12)
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 1 hora

**Archivo**: Frontend web (apps/web)

**Cambios**:
1. Actualizar todos los lugares donde se crea una venta
2. Usar `sellingProductId` en lugar de `productVariantId`

**Validación**:
- [ ] Crear venta desde web
- [ ] Verificar que se procese correctamente

---

### DÍA 7: DTOS Y VALIDACIONES

#### ✅ TAREA 7.1: Crear DTOs (Bug #18)
**Prioridad**: 🟡 MEDIA  
**Tiempo**: 2 horas

**Archivos**: Crear nuevos DTOs en cada módulo

**Cambios**:
1. `create-product.dto.ts`
2. `update-product.dto.ts`
3. `create-recipe.dto.ts`
4. Actualizar controllers para usar DTOs

**Validación**:
- [ ] Intentar crear producto sin nombre
- [ ] Verificar que muestre error de validación

---

### DÍA 8-9: BUGS MENORES Y PULIDO

#### ✅ TAREA 8.1: Arreglar Bugs Menores (#19-30)
**Prioridad**: 🟢 BAJA  
**Tiempo**: 4 horas

**Cambios**:
1. Mejorar fallback de imágenes
2. Agregar loading states
3. Mejorar manejo de errores
4. Agregar índices en DB
5. Implementar rate limiting básico

---

### DÍA 10: TESTING COMPLETO

#### ✅ TAREA 10.1: Testing Manual
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 4 horas

**Checklist**:
- [ ] Testing de productos (crear, editar, activar/desactivar)
- [ ] Testing de recetas (crear, editar, calcular costos)
- [ ] Testing de ventas (simple, configurable, con stock insuficiente)
- [ ] Testing de cocina (ver pedidos, cambiar estados)
- [ ] Testing de autenticación (registro, login, JWT)

---

## 🎯 MÉTRICAS DE ÉXITO

### Antes de la Corrección
- ❌ Productos no se guardan correctamente
- ❌ Recetas pierden el `role` al editar
- ❌ Pedidos no aparecen en cocina
- ❌ Stock puede quedar negativo
- ❌ Códigos de venta duplicados

### Después de la Corrección
- ✅ Productos se guardan con todos los campos
- ✅ Recetas mantienen `role` y `baseWeight`
- ✅ Pedidos aparecen en cocina con detalles
- ✅ Stock se valida antes de venta
- ✅ Códigos de venta únicos y secuenciales

---

## 📊 PROGRESO

```
DÍA 1:  [░░░░░░░░░░] 0%
DÍA 2:  [░░░░░░░░░░] 0%
DÍA 3:  [░░░░░░░░░░] 0%
DÍA 4:  [░░░░░░░░░░] 0%
DÍA 5:  [░░░░░░░░░░] 0%
DÍA 6:  [░░░░░░░░░░] 0%
DÍA 7:  [░░░░░░░░░░] 0%
DÍA 8:  [░░░░░░░░░░] 0%
DÍA 9:  [░░░░░░░░░░] 0%
DÍA 10: [░░░░░░░░░░] 0%

TOTAL:  [░░░░░░░░░░] 0%
```

---

**SIGUIENTE PASO**: Empezar con DÍA 1, TAREA 1.1 - Regenerar Prisma Client

