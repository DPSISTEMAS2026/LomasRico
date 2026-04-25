# 🚀 INICIO RÁPIDO - Testing Local

**Última actualización**: 5 de febrero de 2026

---

## ⚡ Pasos Rápidos (5 minutos)

### 1️⃣ Levantar Base de Datos

```powershell
# Iniciar PostgreSQL con Docker
npm run db:up

# Esperar 10 segundos a que inicie
```

**Verificar que esté corriendo**:
```powershell
docker ps
# Deberías ver: lomasrico_db_local
```

---

### 2️⃣ Configurar Base de Datos

```powershell
# Generar Prisma Client (si no está generado)
cd packages/database
npx prisma generate

# Crear las tablas
npx prisma db push

# Volver a la raíz
cd ../..
```

---

### 3️⃣ Abrir 4 Terminales

**Terminal 1 - API Backend** (Puerto 3001):
```powershell
npm run dev:api
```

**Terminal 2 - Owner Panel** (Puerto 3000):
```powershell
npm run dev:owner
```

**Terminal 3 - Kitchen** (Puerto 3003):
```powershell
npm run dev:kitchen
```

**Terminal 4 - POS** (Puerto 3002) - Opcional:
```powershell
npm run dev:pos
```

---

### 4️⃣ Verificar que Todo Funcione

Abre tu navegador en:

- ✅ **API**: http://localhost:3001 (debería mostrar algo o error 404, no error de conexión)
- ✅ **Owner Panel**: http://localhost:3000
- ✅ **Kitchen**: http://localhost:3003
- ✅ **POS**: http://localhost:3002

---

## 🧪 Empezar Testing

Una vez que todo esté corriendo, sigue la guía:

📖 **`docs/audit/TESTING-GUIDE.md`**

---

## 🛑 Detener Todo

```powershell
# Detener las apps (Ctrl+C en cada terminal)

# Detener la base de datos
npm run db:stop
```

---

## ⚠️ Troubleshooting

### Error: "Puerto 5432 ya está en uso"

Ya tienes PostgreSQL corriendo localmente. Opciones:

**Opción A**: Usar tu PostgreSQL local
```bash
# En .env, cambiar a:
DATABASE_URL="postgresql://postgres:tu-password@localhost:5432/lomasrico_dev?schema=public"

# Crear la base de datos
psql -U postgres -c "CREATE DATABASE lomasrico_dev;"

# Aplicar schema
cd packages/database
npx prisma db push
```

**Opción B**: Detener PostgreSQL local y usar Docker
```powershell
# Windows: Services > PostgreSQL > Stop
# O cambiar el puerto de Docker en docker-compose.yml
```

### Error: "Cannot find module '@lomasrico/database'"

```powershell
cd packages/database
npx prisma generate
npm run build
cd ../..
npm install
```

### Error: "Connection refused" en la API

Verificar que el `.env` existe y tiene la DATABASE_URL correcta:
```powershell
cat .env
```

### Error: "Module not found" en Owner/Kitchen/POS

```powershell
# Reinstalar dependencias
npm install
```

---

## 📊 Puertos Usados

| Aplicación | Puerto | URL |
|------------|--------|-----|
| API Backend | 3001 | http://localhost:3001 |
| Owner Panel | 3000 | http://localhost:3000 |
| POS | 3002 | http://localhost:3002 |
| Kitchen | 3003 | http://localhost:3003 |
| Web App | 3004 | http://localhost:3004 |
| Admin | 3005 | http://localhost:3005 |
| PostgreSQL | 5432 | localhost:5432 |

---

## 💡 Tips

1. **Usa Prisma Studio** para ver la base de datos:
   ```powershell
   npm run studio
   ```
   Abre: http://localhost:5555

2. **Ver logs de la API** en la Terminal 1

3. **Limpiar caché** del navegador con Ctrl+Shift+R

4. **Reiniciar la API** si cambias código del backend (Ctrl+C y volver a ejecutar)

---

## ✅ Checklist Pre-Testing

- [ ] Docker Desktop está corriendo
- [ ] Base de datos levantada (`npm run db:up`)
- [ ] Prisma Client generado
- [ ] Schema aplicado (`npx prisma db push`)
- [ ] API corriendo en http://localhost:3001
- [ ] Owner Panel corriendo en http://localhost:3000
- [ ] Kitchen corriendo en http://localhost:3003

---

**¡Listo para testing! 🧪**

Siguiente paso: `docs/audit/TESTING-GUIDE.md`
