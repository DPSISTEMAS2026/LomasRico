# 🍽️ Lo Más Rico - Sistema de Gestión de Restaurante

Sistema completo de gestión para restaurante con POS, Cocina, Panel de Administración y Web App.

---

## 📚 Documentación

### 🚀 Inicio Rápido
- **[HANDOVER-GUIDE.md](HANDOVER-GUIDE.md)** - **DOCUMENTO MAESTRO DE ENTREGA Y PUESTA EN MARCHA (LEER PRIMERO)**
- **[docs/deployment/START-HERE.md](docs/deployment/START-HERE.md)** - Guía rápida de inicio
- **[docs/development/LOCAL-DEV-GUIDE.md](docs/development/LOCAL-DEV-GUIDE.md)** - Configuración de entorno local

### 🏗️ Arquitectura
- **[docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)** - Diagramas y arquitectura del sistema
- **[architecture-docs/](architecture-docs/)** - Documentos lógicos de la arquitectura de la aplicación

### 🚢 Despliegue
- **[docs/deployment/DEPLOYMENT-GUIDE.md](docs/deployment/DEPLOYMENT-GUIDE.md)** - Guía completa de migración a producción
- **[docs/deployment/MIGRATION-CHECKLIST.md](docs/deployment/MIGRATION-CHECKLIST.md)** - Checklist paso a paso
- **[docs/deployment/ENV_VARIABLES.md](docs/deployment/ENV_VARIABLES.md)** - Variables de entorno
- **[docs/deployment/PRODUCCION.md](docs/deployment/PRODUCCION.md)** - Información de producción actual

### 📖 Guías Operativas
- **[docs/MANUAL-OPERATIVO.md](docs/MANUAL-OPERATIVO.md)** - Manual de uso y administración para operadores de restaurante
- **[docs/guides/INSTRUCCIONES_CREDENCIALES.md](docs/guides/INSTRUCCIONES_CREDENCIALES.md)** - Configuración de credenciales de API
- **[docs/DATOS-FALTANTES.md](docs/DATOS-FALTANTES.md)** - Listado de productos y recetas pendientes por configurar

---

## 🏃 Ejecutar en Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp docs/development/.env.local.example .env.local
# Editar .env.local con tus valores

# 3. Configurar base de datos
cd packages/database
npx prisma generate
npx prisma db push
cd ../..

# 4. Ejecutar todo
npm run dev
```

**URLs Locales:**
- API: http://localhost:3001
- Owner Panel: http://localhost:3000
- POS: http://localhost:3002
- Kitchen: http://localhost:3003
- Web App: http://localhost:3004
- Admin: http://localhost:3005

---

## 📊 Estado del Proyecto

### ✅ Sistema Estable y Operativo
- El sistema se entrega con **todos los bugs críticos identificados en auditoría resueltos** (18/18 corregidos).
- **POS y KDS (Cocina)** están sincronizados y 100% operativos.
- **Lógica de recetas e inventario** se calcula correctamente y descuenta ingredientes en base a reglas de roles de ingredientes.
- La **Web de clientes** está integrada con MercadoPago para transacciones reales y PedidosYa para envíos automáticos.
- El **historial de chat de WhatsApp** ha sido purgado en base de datos para iniciar desde cero en producción.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: Supabase Storage
- **Deployment**: Vercel (Frontend) + Render (Backend)

---

## 📞 Soporte

Para más información, consulta la documentación en la carpeta `docs/`.
