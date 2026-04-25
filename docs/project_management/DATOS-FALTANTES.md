# 📋 PRODUCTOS Y DATOS FALTANTES

## ✅ Estado Actual de la Base de Datos

### Productos Existentes: 36
- ✅ Ceviches LoMASRico (5 tamaños)
- ✅ Ceviches Peruanos (4 tamaños)
- ✅ Ceviches Sin Verduras (4 tamaños)
- ✅ Empanadas (5 tipos)
- ✅ Hand Rolls (1 tipo)
- ✅ Promos (10 tipos)
- ✅ Bebidas (3 tipos: Coca Cola, Limonada Clásica, Limonada Menta)
- ✅ Papas/Fritos (1 tipo)

### Inventario Existente: 30 items
- ✅ Proteínas: Salmón, Reineta, Atún, Camarón
- ✅ Verduras: Cebolla Morada, Cilantro, Choclo Peruano, Pimentón, Palta, Ají Limo
- ✅ Bases: Leche de Tigre Tradicional, Leche de Tigre Peruana, Base Ceviche Tradicional, Base Ceviche Peruano
- ✅ Abarrotes: Papas Fritas, Queso, Masa Empanada, Pan de Ajo, Sopaipillas, Crema Ácida
- ✅ Salsas: Salsa Ají Casera, Salsa Tártara, Salsa Rosada, Salsa Soya
- ✅ Bebidas (insumos): Coca Cola, Coca Cola Zero, Limón Soda, Monster, Agua Mineral, Kem Piña

### Recetas Existentes: 12
- ✅ 2 Bases de Ceviche (Tradicional 4kg, Peruano 4kg)
- ✅ 10 Recetas de productos configurables (Ceviches LoMASRico y Peruanos)

---

## ❌ PRODUCTOS FALTANTES (Agregar desde Owner Panel)

### BEBIDAS (5 productos)
1. **Coca Cola Zero 591cc** - $1,600
   - Imagen: `Coca Cola Zero 591cc.png`
   - Categoría: BEBIDAS

2. **Limón Soda 350cc** - $1,200
   - Imagen: `Limon Soda 350cc.png`
   - Categoría: BEBIDAS

3. **Monster 475cc** - $2,500
   - Imagen: `Monster 475cc.png`
   - Categoría: BEBIDAS

4. **Agua Mineral Puyehue** - $1,200
   - Imagen: `Agua mineral Puyehue.png`
   - Categoría: BEBIDAS

5. **Kem Piña 350cc** - $1,400
   - Imagen: `Kem_Pina_350cc.jpeg`
   - Categoría: BEBIDAS

### EXTRAS / ACOMPAÑAMIENTOS (4 productos)
6. **Pancitos con Ajo** - $2,500
   - Descripción: "6 unidades con mantequilla de ajo"
   - Imagen: `Pancitos con Ajo.jpg`
   - Categoría: EXTRAS

7. **Sopaipillas 10 uni** - $3,000
   - Descripción: "Tradicionales chilenas"
   - Imagen: `Sopaipillas 10 uni.jpg`
   - Categoría: EXTRAS

8. **Papas a la Crema** - $4,000
   - Descripción: "Con salsa de la casa"
   - Imagen: `Papas a la Crema.jpg`
   - Categoría: PAPAS / FRITOS

9. **Leche de Tigre** - $2,000
   - Descripción: "Shot 200cc para acompañar"
   - Imagen: `Leche de Tigre.jpg`
   - Categoría: EXTRAS

### HAND ROLLS (1 producto)
10. **Handroll de Pollo** - $3,500
    - Descripción: "Pollo teriyaki con palta"
    - Imagen: `Handroll de Pollo.jpg`
    - Categoría: HAND ROLLS

### EMPANADAS (1 producto)
11. **Mix Empanadas** - $14,000
    - Descripción: "6 empanadas variadas"
    - Imagen: `Mix Empanadas.jpg`
    - Categoría: EMPANADAS

---

## 📝 CÓMO AGREGAR PRODUCTOS DESDE EL PANEL OWNER

### Opción 1: Desde el Catálogo (Recomendado)
1. Ir a `https://pro-lomasrico-owner.onrender.com/catalog`
2. Hacer clic en **"+ Nuevo Producto"** (si existe el botón)
3. Completar los datos del producto
4. Seleccionar imagen desde la galería de Supabase
5. Guardar

### Opción 2: Crear manualmente en la base de datos
Si no existe el botón de crear, necesitamos agregar el endpoint POST a la API.

---

## 🔧 RECETAS QUE FALTAN CONFIGURAR

Todos los productos que NO son configurables deberían tener recetas para:
- Calcular costos automáticamente
- Descontar inventario al vender

### Productos sin receta que deberían tenerla:
- Empanadas (todas)
- Hand Rolls (todos)
- Papas/Fritos (todos)
- Extras (todos)
- Promos (todas)

---

## 🎯 PRÓXIMOS PASOS

1. **Verificar si existe botón "Nuevo Producto"** en `/catalog`
2. **Si NO existe**: Agregar endpoint POST en la API
3. **Agregar los 11 productos faltantes** manualmente
4. **Configurar recetas** para productos no configurables
5. **Actualizar costos** en el inventario (actualmente todos están en $0)

---

**Última actualización**: 31 de enero de 2026
