# 🧪 GUÍA DE TESTING - DÍAS 1 Y 2

**Fecha**: 5 de febrero de 2026  
**Objetivo**: Validar que los 8 bugs corregidos funcionen correctamente

---

## 📋 PREPARACIÓN

### 1. Levantar el Entorno Local

```bash
# Terminal 1: API Backend
cd d:\PRODUCCION-LO-MAS-RICO-V3
npm run dev:api

# Terminal 2: Owner Panel
npm run dev:owner

# Terminal 3: Kitchen
npm run dev:kitchen

# Terminal 4: POS (opcional)
npm run dev:pos
```

**Verificar que estén corriendo**:
- ✅ API: http://localhost:3001
- ✅ Owner: http://localhost:3000
- ✅ Kitchen: http://localhost:3003
- ✅ POS: http://localhost:3002

---

## 🧪 TEST 1: PRODUCTOS CON maxProteins (Bug #1)

### Objetivo
Verificar que `maxProteins` se guarde correctamente en CREATE y UPDATE.

### Pasos

1. **Abrir Owner Panel**: http://localhost:3000
2. **Ir a "Gestión de Menú"** (Catalog)
3. **Crear Producto Nuevo**:
   - Click en "Agregar Producto"
   - Nombre: `Ceviche LoMASRico 350g`
   - Precio: `7990`
   - Categoría: `CEVICHE LOMASRICO`
   - Descripción: `Ceviche armable con hasta 3 proteínas`
   - Activar toggle "Lógica de Personalización" ✅
   - **Verificar que aparezca el campo "Máximo de Proteínas Seleccionables"**
   - Configurar: `3` proteínas
   - Click "Aplicar Cambios"

4. **Verificar Guardado**:
   - Recargar la página
   - Buscar el producto creado
   - Click en el botón de editar (ícono de cámara)
   - **✅ VERIFICAR**: El campo "Máximo de Proteínas" debe mostrar `3`

5. **Editar Producto**:
   - Cambiar precio a `8990`
   - Click "Aplicar Cambios"
   - Recargar página
   - Editar de nuevo
   - **✅ VERIFICAR**: `maxProteins` sigue siendo `3` (no se perdió)

### ✅ Criterio de Éxito
- [ ] El campo de maxProteins aparece cuando isConfigurable=true
- [ ] maxProteins se guarda en CREATE
- [ ] maxProteins se mantiene en UPDATE
- [ ] El valor se persiste después de recargar

---

## 🧪 TEST 2: RECETAS CON role (Bugs #2, #3, #4)

### Objetivo
Verificar que el campo `role` se cargue, guarde y sea editable.

### Pasos

1. **Abrir Owner Panel**: http://localhost:3000
2. **Ir a "Recetas Maestras"**
3. **Seleccionar el producto creado**: `Ceviche LoMASRico 350g`

4. **Configurar Receta**:
   - **Peso Total Objetivo**: `0.350` kg
   - **Max Proteínas**: `3`
   
5. **Agregar Ingredientes**:
   - Buscar "Salmón"
   - Click para agregar
   - **✅ VERIFICAR**: Aparece un SELECT para editar el role
   - Cambiar role a: `PROTEIN_MAIN`
   - Cantidad: `120`
   - Unidad: `G`
   
   - Buscar "Pulpo"
   - Agregar
   - Role: `PROTEIN_SPECIAL`
   - Cantidad: `80`
   - Unidad: `G`
   
   - Buscar "Cebolla"
   - Agregar
   - Role: `VEGGIE`
   - Cantidad: `50`
   - Unidad: `G`
   
   - Buscar "Base Ceviche"
   - Agregar
   - Role: `BASE`
   - Cantidad: `100`
   - Unidad: `ML`

6. **Guardar Receta**:
   - Click "Guardar Receta Maestra"
   - Esperar confirmación "Receta Guardada!"
   - Cerrar modal

7. **Verificar Persistencia**:
   - Click de nuevo en el producto
   - **✅ VERIFICAR**: Todos los ingredientes aparecen
   - **✅ VERIFICAR**: Los roles se mantienen (PROTEIN_MAIN, PROTEIN_SPECIAL, VEGGIE, BASE)
   - **✅ VERIFICAR**: baseWeight es `0.350`

8. **Editar Role**:
   - Cambiar role de Salmón a `PROTEIN_SPECIAL`
   - Guardar
   - Recargar
   - **✅ VERIFICAR**: El cambio se guardó

### ✅ Criterio de Éxito
- [ ] El campo role es editable (SELECT dropdown)
- [ ] Los roles se guardan correctamente
- [ ] Los roles se cargan al editar
- [ ] baseWeight se guarda y carga correctamente
- [ ] Los colores del SELECT cambian según el role

---

## 🧪 TEST 3: PEDIDOS A COCINA (Bug #6)

### Objetivo
Verificar que todos los pedidos entren a cocina, sin importar el status.

### Pasos

1. **Abrir POS**: http://localhost:3002
2. **Abrir Kitchen en otra pestaña**: http://localhost:3003

3. **Crear Venta Simple**:
   - Agregar un producto simple (ej: "Coca Cola")
   - Cantidad: 1
   - Click "Finalizar Venta"
   - **✅ VERIFICAR**: En Kitchen aparece el pedido inmediatamente

4. **Crear Venta con Status PENDING** (si es posible desde el código):
   - Modificar temporalmente el código para crear con PENDING
   - O usar Postman/Thunder Client:
   ```json
   POST http://localhost:3001/sales
   {
     "channel": "POS",
     "status": "PENDING",
     "items": [
       {
         "sellingProductId": "id-del-producto",
         "quantity": 1
       }
     ]
   }
   ```
   - **✅ VERIFICAR**: El pedido aparece en Kitchen

### ✅ Criterio de Éxito
- [ ] Pedidos con status CONFIRMED aparecen en cocina
- [ ] Pedidos con status PENDING aparecen en cocina
- [ ] Todos los pedidos generan un KitchenTicket

---

## 🧪 TEST 4: DETALLES EN COCINA (Bug #7)

### Objetivo
Verificar que la cocina vea todos los detalles de preparación.

### Pasos

1. **Crear Venta con Producto Configurable**:
   - Desde POS o Web
   - Seleccionar: `Ceviche LoMASRico 350g`
   - Elegir 3 proteínas: Salmón, Atún, Pulpo
   - Remover ingrediente: Cebolla
   - Finalizar venta

2. **Verificar en Kitchen**:
   - Abrir http://localhost:3003
   - Buscar el pedido
   - **✅ VERIFICAR**: Se ve el nombre del producto
   - **✅ VERIFICAR**: Se ven las 3 proteínas seleccionadas
   - **✅ VERIFICAR**: Se ve "Sin cebolla" o modificadores
   - **✅ VERIFICAR**: Se ve el BoM completo con cantidades

3. **Verificar Datos en Consola**:
   - Abrir DevTools (F12)
   - Ver la respuesta del endpoint `/kitchen/active`
   - **✅ VERIFICAR**: Existe `sale.items[0].sellingProduct`
   - **✅ VERIFICAR**: Existe `sale.items[0].recipeSnapshot`
   - **✅ VERIFICAR**: `recipeSnapshot.resolvedBoM` tiene los ingredientes

### ✅ Criterio de Éxito
- [ ] La cocina ve el nombre del producto
- [ ] La cocina ve las proteínas seleccionadas
- [ ] La cocina ve los modificadores
- [ ] El BoM está completo con cantidades exactas

---

## 🧪 TEST 5: INTEGRACIÓN COMPLETA

### Objetivo
Probar el flujo completo: Crear Producto → Crear Receta → Vender → Ver en Cocina

### Pasos

1. **Owner Panel - Crear Producto**:
   - Nombre: `Ceviche Peruano 500g`
   - Precio: `9990`
   - isConfigurable: `true`
   - maxProteins: `2`

2. **Owner Panel - Crear Receta**:
   - baseWeight: `0.500`
   - Agregar:
     - Salmón (PROTEIN_MAIN): 200g
     - Atún (PROTEIN_MAIN): 200g
     - Base Ceviche (BASE): 100ml

3. **POS - Crear Venta**:
   - Agregar el producto
   - Seleccionar 2 proteínas
   - Finalizar

4. **Kitchen - Verificar**:
   - Ver el pedido
   - Verificar detalles completos

### ✅ Criterio de Éxito
- [ ] Flujo completo funciona sin errores
- [ ] Todos los datos se persisten correctamente
- [ ] La cocina recibe información completa

---

## 📊 CHECKLIST FINAL

### Bugs Corregidos - Validación
- [ ] ✅ Bug #1: maxProteins se guarda en CREATE y UPDATE
- [ ] ✅ Bug #2: role se envía al guardar receta
- [ ] ✅ Bug #3: role se carga al editar receta
- [ ] ✅ Bug #4: role es editable en la UI
- [ ] ✅ Bug #5: Prisma Client funciona (no hay errores de tipos)
- [ ] ✅ Bug #6: Todos los pedidos entran a cocina
- [ ] ✅ Bug #7: Cocina ve detalles completos
- [ ] ✅ Bug #10: baseWeight se guarda y carga

### Errores Encontrados
Si encuentras algún error, anótalo aquí:

```
ERROR 1:
- Descripción:
- Pasos para reproducir:
- Mensaje de error:

ERROR 2:
- Descripción:
- Pasos para reproducir:
- Mensaje de error:
```

---

## 🚀 SIGUIENTE PASO

Si todos los tests pasan:
- ✅ Continuar con DÍA 3 (Bugs #8, #16)

Si hay errores:
- ⚠️ Reportar errores encontrados
- 🔧 Corregir antes de continuar

---

## 💡 TIPS DE TESTING

1. **Usar DevTools**: Abre F12 para ver errores en consola
2. **Ver Network**: Revisa las peticiones HTTP y sus respuestas
3. **Prisma Studio**: Usa `npm run studio` para ver la base de datos
4. **Logs del Backend**: Revisa la terminal donde corre la API
5. **Recargar con Ctrl+Shift+R**: Para limpiar caché del navegador

---

**¡Buena suerte con el testing! 🧪**
