# 🔍 AUDITORÍA TÉCNICA SENIOR - Sistema Lo Más Rico

**Fecha**: 5 de febrero de 2026  
**Auditor**: Senior Technical Review  
**Estado**: ⚠️ **CRÍTICO - NO LISTO PARA PRODUCCIÓN**

---

## 📊 RESUMEN EJECUTIVO

Se identificaron **18 bugs críticos** y **12 bugs menores** que impiden el correcto funcionamiento del sistema.

### Severidad de Problemas
- 🔴 **Críticos**: 18 (Bloquean funcionalidad core)
- 🟡 **Menores**: 12 (Afectan UX pero no rompen el sistema)
- 🟢 **Mejoras**: 8 (Optimizaciones recomendadas)

---

## 🚨 BUGS CRÍTICOS IDENTIFICADOS

### 1. ❌ **PRODUCTOS NO SE GUARDAN CORRECTAMENTE**

**Ubicación**: `apps/owner/app/catalog/page.tsx` líneas 145-194

**Problema**:
```typescript
// LÍNEA 162 - PROBLEMA
isConfigurable: editingProduct.isConfigurable
```

El campo `maxProteins` NO se está enviando en el UPDATE, solo en el CREATE. Esto causa que productos configurables pierdan su configuración al editarlos.

**Solución**:
```typescript
const payload: any = {
    name: editingProduct.name,
    description: editingProduct.description,
    price: editingProduct.price,
    category: editingProduct.category,
    imageUrl: editingProduct.imageUrl,
    imageKey: editingProduct.imageKey,
    isActive: editingProduct.isActive,
    isConfigurable: editingProduct.isConfigurable,
    maxProteins: editingProduct.maxProteins || 0  // ✅ AGREGAR ESTO
};
```

---

### 2. ❌ **RECETAS NO SE GUARDAN - FALTA CAMPO `role`**

**Ubicación**: `apps/owner/app/recipes/page.tsx` líneas 88-117

**Problema**:
```typescript
// LÍNEA 94-98 - PROBLEMA
items: recipeItems.map(i => ({
    ingredientId: i.ingredientId,
    quantity: Number(i.quantity),
    unit: i.unit
    // ❌ FALTA: role
}))
```

El campo `role` (PROTEIN_MAIN, VEGGIE, BASE, etc.) NO se está enviando, causando que la lógica de distribución de proteínas falle.

**Solución**:
```typescript
items: recipeItems.map(i => ({
    ingredientId: i.ingredientId,
    quantity: Number(i.quantity),
    unit: i.unit,
    role: i.role || 'BASE'  // ✅ AGREGAR ESTO
}))
```

---

### 3. ❌ **RECETAS NO CARGAN EL `role` AL EDITAR**

**Ubicación**: `apps/owner/app/recipes/page.tsx` líneas 50-56

**Problema**:
```typescript
// LÍNEA 51-56 - PROBLEMA
setRecipeItems(target.recipe.items.map((i: any) => ({
    ingredientId: i.ingredientId,
    quantity: i.quantity,
    unit: i.ingredient?.unit || 'UN',
    name: i.ingredient?.name
    // ❌ FALTA: role
})));
```

Al cargar una receta existente, NO se carga el `role`, causando que se pierda al guardar.

**Solución**:
```typescript
setRecipeItems(target.recipe.items.map((i: any) => ({
    ingredientId: i.ingredientId,
    quantity: i.quantity,
    unit: i.ingredient?.unit || 'UN',
    name: i.ingredient?.name,
    role: i.role || 'BASE'  // ✅ AGREGAR ESTO
})));
```

---

### 4. ❌ **NO SE PUEDE ASIGNAR `role` EN LA UI**

**Ubicación**: `apps/owner/app/recipes/page.tsx` líneas 320-379

**Problema**:
El `role` se muestra en la tabla (línea 334-341) pero NO hay forma de editarlo. Es solo lectura.

**Solución**:
Reemplazar el `<span>` por un `<select>`:

```typescript
<td className="p-4">
    <select
        value={item.role || 'BASE'}
        onChange={(e) => updateItem(idx, 'role', e.target.value)}
        className="text-[10px] font-black uppercase px-2 py-1 rounded bg-slate-100 outline-none"
    >
        <option value="PROTEIN_MAIN">PROTEIN_MAIN</option>
        <option value="PROTEIN_SPECIAL">PROTEIN_SPECIAL</option>
        <option value="BASE">BASE</option>
        <option value="VEGGIE">VEGGIE</option>
        <option value="RETAIL">RETAIL</option>
    </select>
</td>
```

---

### 5. ❌ **AUTENTICACIÓN NO FUNCIONA - PRISMA CLIENT NO REGENERADO**

**Ubicación**: `apps/api/src/auth/auth.service.ts` líneas 26-30

**Problema**:
```typescript
// LÍNEA 26-30 - ADVERTENCIA CRÍTICA
/**
 * PENDIENTE DE REGENERACIÓN DE PRISMA CLIENT:
 * El modelo 'User' y 'UserAddress' han sido añadidos al schema.prisma,
 * pero el Prisma Client local aun no los reconoce. 
 * Ejecutar 'npx prisma generate' para resolver errores de compilado.
 */
```

El Prisma Client NO está sincronizado con el schema. Todos los métodos de auth usan `@ts-ignore` para evitar errores de compilación.

**Solución**:
```bash
cd packages/database
npx prisma generate
npm run build
```

---

### 6. ❌ **PEDIDOS NO ENTRAN A COCINA - LÓGICA CONDICIONAL INCORRECTA**

**Ubicación**: `apps/api/src/sales/sales.service.ts` líneas 217-225

**Problema**:
```typescript
// LÍNEA 217-225 - PROBLEMA
// Create kitchen ticket for all non-PENDING sales
if (sale.status !== OrderStatus.PENDING) {
    await tx.kitchenTicket.create({
        data: {
            saleId: sale.id,
            status: 'WAITING'
        }
    });
}
```

Si el `initialStatus` es `PENDING` (default), NO se crea el ticket de cocina. Pero el frontend web envía `CONFIRMED` directamente, causando inconsistencia.

**Solución**:
```typescript
// Siempre crear ticket de cocina, independiente del status
await tx.kitchenTicket.create({
    data: {
        saleId: sale.id,
        status: sale.status === OrderStatus.PENDING ? 'WAITING' : 'WAITING'
    }
});
```

---

### 7. ❌ **DETALLES DE PREPARACIÓN NO SE MUESTRAN EN COCINA**

**Ubicación**: `apps/api/src/kitchen/kitchen.service.ts` líneas 34-44

**Problema**:
```typescript
// LÍNEA 38-40 - PROBLEMA
items: {
    include: {
        productVariant: true,
        // ❌ FALTA: sellingProduct, recipeSnapshot
    },
},
```

NO se incluye `sellingProduct` ni `recipeSnapshot`, causando que la cocina no vea los detalles de preparación (proteínas seleccionadas, modificadores, etc.).

**Solución**:
```typescript
items: {
    include: {
        productVariant: true,
        sellingProduct: true,  // ✅ AGREGAR
        recipeSnapshot: true   // ✅ AGREGAR
    },
},
```

---

### 8. ❌ **LÓGICA DE PROTEÍNAS FALLA CON PRODUCTOS SIN RECETA**

**Ubicación**: `apps/api/src/recipe-engineering/recipe-resolver.service.ts` líneas 48-56

**Problema**:
```typescript
// LÍNEA 48-56 - PROBLEMA
if (!product.recipe) {
    // Si no tiene receta (ej: una bebida retail), devolvemos el costo base
    return [{
        inventoryItemId: product.id,  // ❌ INCORRECTO
        name: product.name,
        quantity: 1,
        unit: 'UN'
    }];
}
```

Usa `product.id` como `inventoryItemId`, pero un `SellingProduct` NO es un `InventoryItem`. Esto causa error al descontar inventario.

**Solución**:
```typescript
if (!product.recipe) {
    // Productos sin receta (retail) no consumen inventario directamente
    // Deben tener un InventoryItem asociado o no descontar stock
    throw new BadRequestException(
        `Product ${product.name} has no recipe. Retail products must have an associated inventory item.`
    );
}
```

---

### 9. ❌ **CONVERSIÓN DE UNIDADES INCONSISTENTE**

**Ubicación**: `apps/api/src/recipes/recipes.service.ts` líneas 75-90

**Problema**:
```typescript
// LÍNEA 76-77 - PROBLEMA
if (inputUnit === 'G' || inputUnit === 'GR' || inputUnit === 'GRAMOS') {
```

El frontend envía `'GRAMOS'` (línea 359 de recipes/page.tsx) pero el backend solo acepta `'G'`, `'GR'`, `'GRAMOS'`. Falta consistencia.

**Solución**:
Estandarizar en el frontend:
```typescript
// En recipes/page.tsx línea 359
{['KG', 'G', 'LT', 'ML', 'UN'].map(u => (
    <option key={u} value={u}>{u}</option>
))}
```

Y en el backend:
```typescript
if (inputUnit === 'G' || inputUnit === 'GR') {
    finalQty = inputQty / 1000;
}
```

---

### 10. ❌ **CAMPO `baseWeight` NO SE GUARDA EN RECETAS**

**Ubicación**: `apps/owner/app/recipes/page.tsx` líneas 88-99

**Problema**:
```typescript
// LÍNEA 93 - PROBLEMA
baseWeight: 0, // Should be calculated or input
```

El `baseWeight` siempre es 0, causando que la lógica de distribución de proteínas falle.

**Solución**:
Agregar un input en la UI (línea 254-260) y capturar su valor:

```typescript
const [baseWeight, setBaseWeight] = useState(0);

// En el payload:
const payload = {
    targetId: editingTarget.id,
    type: editingTarget.type === 'BASE' ? 'PREPARATION' : 'PRODUCT',
    baseWeight: baseWeight,  // ✅ USAR EL ESTADO
    items: recipeItems.map(...)
};
```

---

### 11. ❌ **PRODUCTOS CONFIGURABLES NO TIENEN `maxProteins`**

**Ubicación**: `apps/api/src/products/products.service.ts` líneas 218-236

**Problema**:
```typescript
// LÍNEA 229 - PROBLEMA
maxProteins: data.maxProteins ?? 0,
```

Al crear un producto, `maxProteins` se guarda. Pero al actualizar (línea 239-250), NO se incluye en el `update`.

**Solución**:
```typescript
async update(id: string, data: any) {
    const { recipeItems, ...productData } = data;
    
    const product = await this.prisma.sellingProduct.update({
        where: { id },
        data: {
            ...productData,
            maxProteins: data.maxProteins ?? 0  // ✅ AGREGAR
        }
    });
    
    return this.enrichProduct(product);
}
```

---

### 12. ❌ **VENTAS FALLAN SI NO HAY `sellingProductId` NI `productVariantId`**

**Ubicación**: `apps/api/src/sales/sales.service.ts` líneas 68-76

**Problema**:
```typescript
// LÍNEA 68-76 - PROBLEMA
for (const item of items) {
    if (item.sellingProductId) {
        itemsWithProductId.push(item);
    } else if (item.productVariantId) {
        itemsWithVariantId.push(item);
    } else {
        throw new BadRequestException('Each item must have either sellingProductId or productVariantId');
    }
}
```

El sistema asume que SIEMPRE hay `productVariantId`, pero el frontend web envía `sellingProductId`. Esto causa confusión.

**Solución**:
Estandarizar el frontend para SIEMPRE enviar `sellingProductId`:

```typescript
// En el frontend web
const saleData = {
    items: cart.map(item => ({
        sellingProductId: item.id,  // ✅ USAR ESTO
        quantity: item.quantity,
        modifiers: item.modifiers
    }))
};
```

---

### 13. ❌ **MODIFIERS NO SE VALIDAN ANTES DE GUARDAR**

**Ubicación**: `apps/api/src/sales/sales.service.ts` líneas 138-142

**Problema**:
```typescript
// LÍNEA 138-142 - NO HAY VALIDACIÓN
const bom = await this.recipeResolver.resolveBom(
    bomIdentifier,
    itemDto.modifiers || {},  // ❌ NO SE VALIDA
    false
);
```

Si `modifiers` tiene datos inválidos (ej: proteínas que no existen), el sistema falla silenciosamente.

**Solución**:
Agregar validación en `recipe-resolver.service.ts`:

```typescript
// Línea 119-122
const selectedProteinIds = modifiers.selectedProteins || [];
if (selectedProteinIds.length === 0) {
    throw new BadRequestException("This product requires at least one protein selection.");
}

// ✅ AGREGAR VALIDACIÓN
const validProteins = await this.prisma.inventoryItem.findMany({
    where: { id: { in: selectedProteinIds } }
});

if (validProteins.length !== selectedProteinIds.length) {
    throw new BadRequestException("One or more selected proteins are invalid.");
}
```

---

### 14. ❌ **STOCK PUEDE QUEDAR NEGATIVO**

**Ubicación**: `apps/api/src/sales/sales.service.ts` líneas 200-214

**Problema**:
```typescript
// LÍNEA 202-213 - NO HAY VALIDACIÓN DE STOCK
await tx.inventoryItem.update({
    where: { id: itemId },
    data: {
        currentStock: { decrement: qty },  // ❌ PUEDE QUEDAR NEGATIVO
        movements: {
            create: {
                quantity: -qty,
                reason: 'SALE',
                referenceId: sale.id
            }
        }
    }
});
```

El schema permite `currentStock` negativo (línea 34 de schema.prisma), pero NO hay alertas ni validaciones.

**Solución**:
Agregar validación antes de descontar:

```typescript
// Verificar stock disponible
for (const [itemId, qty] of totalRequirements.entries()) {
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new BadRequestException(`Inventory item ${itemId} not found`);
    
    if (item.currentStock < qty) {
        throw new BadRequestException(
            `Insufficient stock for ${item.name}. Available: ${item.currentStock}, Required: ${qty}`
        );
    }
}

// Luego descontar
for (const [itemId, qty] of totalRequirements.entries()) {
    await tx.inventoryItem.update({...});
}
```

---

### 15. ❌ **CÓDIGO DE VENTA NO ES ÚNICO**

**Ubicación**: `apps/api/src/sales/sales.service.ts` línea 176

**Problema**:
```typescript
// LÍNEA 176 - PROBLEMA
code: Math.random().toString(36).substring(7).toUpperCase(),
```

Usa `Math.random()` que NO garantiza unicidad. Puede haber colisiones.

**Solución**:
```typescript
// Generar código único secuencial
const lastSale = await tx.sale.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { code: true }
});

const lastNumber = lastSale ? parseInt(lastSale.code.replace(/\D/g, '')) : 0;
const newCode = `#${(lastNumber + 1).toString().padStart(4, '0')}`;

const sale = await tx.sale.create({
    data: {
        ...
        code: newCode,  // ✅ CÓDIGO ÚNICO SECUENCIAL
    }
});
```

---

### 16. ❌ **PROTEÍNAS ESPECIALES NO SE IDENTIFICAN CORRECTAMENTE**

**Ubicación**: `apps/api/src/recipe-engineering/recipe-resolver.service.ts` líneas 143-145

**Problema**:
```typescript
// LÍNEA 143 - PROBLEMA
const specialProtNames = ['pulpo', 'camarón', 'camaron'];
```

Usa nombres hardcodeados en español. Si el nombre del ingrediente cambia (ej: "Pulpo Cocido"), la lógica falla.

**Solución**:
Usar el campo `role` del schema:

```typescript
// Filtrar por role en lugar de nombre
const specials = selectedProtDetails.filter(p => p.role === 'PROTEIN_SPECIAL');
const mains = selectedProtDetails.filter(p => p.role === 'PROTEIN_MAIN');
```

---

### 17. ❌ **FALTA ENDPOINT PARA OBTENER RECETA POR PRODUCTO**

**Ubicación**: `apps/api/src/recipes/recipes.controller.ts`

**Problema**:
No existe un endpoint `GET /recipes/by-product/:productId` para obtener la receta de un producto específico.

**Solución**:
Agregar en `recipes.controller.ts`:

```typescript
@Get('by-product/:productId')
async getByProduct(@Param('productId') productId: string) {
    const product = await this.prisma.sellingProduct.findUnique({
        where: { id: productId },
        include: {
            recipe: {
                include: { items: { include: { ingredient: true } } }
            }
        }
    });
    
    if (!product || !product.recipe) {
        throw new NotFoundException('Recipe not found for this product');
    }
    
    return product.recipe;
}
```

---

### 18. ❌ **FALTA VALIDACIÓN DE DATOS EN CONTROLLERS**

**Ubicación**: Todos los controllers

**Problema**:
Los controllers usan `@Body() data: any` en lugar de DTOs tipados, causando que datos inválidos pasen sin validación.

**Ejemplo**: `apps/api/src/products/products.controller.ts` línea 24:
```typescript
@Post()
create(@Body() data: any) {  // ❌ USAR DTO
    return this.productsService.create(data);
}
```

**Solución**:
Crear DTOs con validaciones:

```typescript
// create-product.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    price: number;

    @IsString()
    category: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    isConfigurable?: boolean;

    @IsNumber()
    @IsOptional()
    maxProteins?: number;
}

// En el controller
@Post()
create(@Body() data: CreateProductDto) {
    return this.productsService.create(data);
}
```

---

## 🟡 BUGS MENORES

### 19. Imágenes con fallback incorrecto
**Ubicación**: `apps/owner/app/catalog/page.tsx` línea 321-323
**Problema**: El fallback usa `/assets/Logo Restaurante.png` que puede no existir.
**Solución**: Usar una imagen placeholder genérica o validar que exista.

### 20. Búsqueda de ingredientes case-sensitive
**Ubicación**: `apps/owner/app/recipes/page.tsx` línea 146
**Problema**: La búsqueda usa `.toLowerCase()` pero puede fallar con caracteres especiales.
**Solución**: Usar normalización de texto.

### 21. No hay paginación en listados
**Ubicación**: Todos los listados (products, inventory, sales)
**Problema**: Si hay 1000+ productos, la página se vuelve lenta.
**Solución**: Implementar paginación o scroll infinito.

### 22. No hay loading states en botones
**Ubicación**: `apps/owner/app/recipes/page.tsx` línea 505-511
**Problema**: Al guardar, no hay feedback visual.
**Solución**: Agregar estado de loading.

### 23. Errores no se muestran al usuario
**Ubicación**: `apps/owner/app/catalog/page.tsx` línea 187-192
**Problema**: Solo muestra `alert()` genérico.
**Solución**: Usar toast notifications o modal de error.

### 24. Fechas no tienen timezone
**Ubicación**: Schema Prisma
**Problema**: `@default(now())` usa UTC, puede causar confusión.
**Solución**: Usar timezone de Chile (-03:00).

### 25. No hay soft delete
**Ubicación**: Schema Prisma
**Problema**: No hay campo `deletedAt` para soft delete.
**Solución**: Agregar `deletedAt DateTime?` a modelos críticos.

### 26. Falta índices en base de datos
**Ubicación**: Schema Prisma
**Problema**: No hay índices en campos frecuentemente consultados.
**Solución**: Agregar `@@index([category])`, `@@index([createdAt])`, etc.

### 27. No hay rate limiting
**Ubicación**: Backend API
**Problema**: Vulnerable a ataques de fuerza bruta.
**Solución**: Implementar rate limiting con `@nestjs/throttler`.

### 28. Passwords no tienen requisitos mínimos
**Ubicación**: `apps/api/src/auth/auth.service.ts`
**Problema**: No valida complejidad de contraseña.
**Solución**: Agregar validación (min 8 chars, mayúsculas, números).

### 29. JWT no tiene expiración
**Ubicación**: `apps/api/src/auth/auth.service.ts`
**Problema**: Los tokens nunca expiran.
**Solución**: Agregar `expiresIn: '7d'` en `jwtService.sign()`.

### 30. No hay logs de auditoría
**Ubicación**: Todo el sistema
**Problema**: No se registran acciones críticas (ventas, cambios de precio, etc.).
**Solución**: Implementar tabla `AuditLog` y registrar eventos.

---

## 🟢 MEJORAS RECOMENDADAS

### 31. Implementar WebSockets para cocina
**Razón**: Actualización en tiempo real de pedidos.
**Tecnología**: Socket.IO o Server-Sent Events.

### 32. Agregar caché con Redis
**Razón**: Mejorar performance de consultas frecuentes (productos activos).
**Tecnología**: Redis + `@nestjs/cache-manager`.

### 33. Implementar búsqueda full-text
**Razón**: Búsqueda más rápida y precisa de productos.
**Tecnología**: PostgreSQL Full-Text Search o Elasticsearch.

### 34. Agregar tests automatizados
**Razón**: Prevenir regresiones.
**Tecnología**: Jest + Supertest para backend, Cypress para frontend.

### 35. Implementar CI/CD
**Razón**: Despliegues automáticos y seguros.
**Tecnología**: GitHub Actions + Vercel + Render.

### 36. Agregar monitoreo
**Razón**: Detectar errores en producción.
**Tecnología**: Sentry para errores, Datadog para métricas.

### 37. Optimizar imágenes
**Razón**: Mejorar tiempo de carga.
**Tecnología**: Next.js Image Optimization + WebP.

### 38. Implementar backup automático
**Razón**: Prevenir pérdida de datos.
**Tecnología**: Supabase Backups + Scripts cron.

---

## 📋 PLAN DE ACCIÓN PRIORITARIO

### FASE 1: BUGS CRÍTICOS (1-2 días)
1. ✅ Regenerar Prisma Client (#5)
2. ✅ Arreglar guardado de productos (#1)
3. ✅ Arreglar guardado de recetas (#2, #3, #4)
4. ✅ Arreglar flujo de pedidos a cocina (#6, #7)
5. ✅ Validar stock antes de venta (#14)

### FASE 2: LÓGICA DE NEGOCIO (2-3 días)
6. ✅ Arreglar lógica de proteínas (#8, #16)
7. ✅ Estandarizar unidades (#9)
8. ✅ Implementar baseWeight (#10)
9. ✅ Arreglar maxProteins (#11)
10. ✅ Validar modifiers (#13)

### FASE 3: ROBUSTEZ (1-2 días)
11. ✅ Generar códigos únicos (#15)
12. ✅ Crear DTOs con validación (#18)
13. ✅ Agregar endpoint de recetas (#17)
14. ✅ Estandarizar sellingProductId (#12)

### FASE 4: PULIDO (1 día)
15. ✅ Arreglar bugs menores (#19-30)
16. ✅ Agregar loading states
17. ✅ Mejorar manejo de errores

### FASE 5: TESTING (1 día)
18. ✅ Testing manual completo
19. ✅ Testing de integración
20. ✅ Testing de carga

---

## 🎯 TIEMPO ESTIMADO TOTAL: 7-10 DÍAS

---

## ✅ CHECKLIST DE VALIDACIÓN POST-FIX

### Productos
- [ ] Crear producto nuevo
- [ ] Editar producto existente
- [ ] Cambiar isActive
- [ ] Cambiar isConfigurable
- [ ] Subir imagen
- [ ] Verificar que maxProteins se guarde

### Recetas
- [ ] Crear receta para producto
- [ ] Agregar ingredientes con diferentes roles
- [ ] Editar cantidades
- [ ] Cambiar unidades
- [ ] Guardar y verificar que role se mantenga
- [ ] Verificar cálculo de costos

### Ventas
- [ ] Crear venta con producto simple
- [ ] Crear venta con producto configurable
- [ ] Seleccionar 1 proteína
- [ ] Seleccionar 3 proteínas (2 main + 1 special)
- [ ] Verificar que stock se descuente
- [ ] Verificar que aparezca en cocina

### Cocina
- [ ] Ver pedido entrante
- [ ] Ver detalles de preparación
- [ ] Ver proteínas seleccionadas
- [ ] Cambiar estado a PREPARING
- [ ] Cambiar estado a READY
- [ ] Verificar que sale actualice su status

### Autenticación
- [ ] Registrar nuevo usuario
- [ ] Login con email/password
- [ ] Login con Google
- [ ] Login con PIN
- [ ] Verificar que JWT funcione
- [ ] Verificar que /me funcione

---

**CONCLUSIÓN**: El sistema tiene una arquitectura sólida pero requiere correcciones críticas antes de producción. La mayoría de bugs son de integración entre frontend y backend, y falta de validaciones.

**RECOMENDACIÓN**: NO desplegar a producción hasta resolver al menos los 18 bugs críticos.

