# 📘 GUÍA DE ENTREGA Y PUESTA EN MARCHA — Lo Más Rico V3

Este documento constituye la guía maestra de entrega del sistema **Lo Más Rico V3** para la nueva empresa de desarrollo que asumirá el mantenimiento, soporte y evolución del software.

---

## 📌 1. Estructura del Monorepo

El sistema está construido como un monorepo utilizando **npm workspaces** y **TypeScript**.

```
📁 LomasRico-1 (Raíz)
├── 📁 apps
│   ├── 📁 api          # Backend NestJS (API REST y GraphQL)
│   ├── 📁 web          # Frontend Cliente Next.js 14 (E-commerce lomasrico.cl)
│   └── 📁 panels       # Panels unificados Next.js 14 (Owner, POS, Cocina KDS)
├── 📁 packages
│   ├── 📁 database     # Schema Prisma ORM y Cliente persistencia
│   └── 📁 shared-types # Definiciones y tipos TypeScript compartidos
├── 📁 docs             # Manuales operativos y guías de configuración
├── 📁 scripts          # Scripts de despliegue, respaldo y mantenimiento
└── package.json        # Configuración de workspaces y dependencias globales
```

---

## 🚦 2. Estado de Módulos Entregados

Todos los módulos core del sistema han sido auditados, corregidos y se entregan **100% operativos y validados para producción**:

| Módulo | Estado | Descripción Funcional |
| :--- | :---: | :--- |
| **API (Backend)** | **PRODUCCIÓN** | Procesamiento de peticiones, lógica de recetas y conexión con base de datos. NestJS + Prisma. |
| **POS (Caja)** | **PRODUCCIÓN** | Panel táctil para cajeros. Permite apertura y cierre de turnos de caja, arqueo de dinero, registro de egresos/ingresos e impresión de boletas. |
| **KDS (Cocina)** | **PRODUCCIÓN** | Pantalla interactiva que recibe pedidos del POS y Web en tiempo real, agrupando preparaciones y mostrando exclusión de ingredientes o combinaciones de proteínas de forma clara. |
| **Inventario** | **PRODUCCIÓN** | Descuento automático de insumos en base a la receta resuelta de cada producto vendido. Control de mermas y alertas de stock mínimo. |
| **E-commerce (Web)** | **PRODUCCIÓN** | Portal de clientes Next.js con constructor dinámico de ceviches, validación de stock antes de pagar, geolocalización de despacho y pasarela de pago integrada. |
| **MercadoPago** | **PRODUCCIÓN** | Integración del Checkout Pro. Los pagos aprobados marcan automáticamente la venta como pagada y la envían a la cocina. |
| **PedidosYa Envíos** | **PRODUCCIÓN** | Cotización y generación de guías de despacho con motoristas en tiempo real mediante API de PedidosYa. |
| **Uber Eats Bridge** | **MANTENIMIENTO** | Script en background (`scripts/uber-bridge.js`) que sondea la API de Uber Eats e ingresa las órdenes directamente al KDS de la cocina. Requiere cookies activas de merchant. |
| **WhatsApp Bot / Inbox** | **PREPARADO** | Base de datos limpia de chats de prueba. Permite la derivación de clientes a agentes humanos y la visualización del chat en tiempo real dentro del panel de administración. |

---

## 🛠️ 3. Puesta en Marcha Local

### Prerrequisitos
- **Node.js** >= 18.x
- **PostgreSQL** (local o en nube)

### Paso 1: Instalar dependencias
Ejecutar en la raíz del proyecto para instalar todas las dependencias del monorepo:
```bash
npm install
```

### Paso 2: Variables de entorno
Crear un archivo `.env` en la raíz (se adjunta plantilla básica de desarrollo):
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/lomasrico"
JWT_SECRET="desarrollo_secret_key"
PORT=3001
```
Y en `apps/web/` crear `.env.local` con las claves públicas necesarias para el cliente de Google Maps.

### Paso 3: Configurar Base de Datos
Generar el cliente Prisma y empujar el esquema actual a la base de datos de desarrollo:
```bash
# Navegar al paquete de base de datos
cd packages/database
npx prisma generate
npx prisma db push

# (Opcional) Cargar base de datos inicial de catálogo
node seed-catalog.js
```

### Paso 4: Levantar en modo Desarrollo
Volver a la raíz del monorepo y arrancar todas las aplicaciones simultáneamente:
```bash
cd ../..
npm run dev
```

**Direcciones de acceso local:**
- **Admin & POS (Panels)**: [http://localhost:3000](http://localhost:3000)
- **API Backend**: [http://localhost:3001](http://localhost:3001)
- **E-commerce Cliente (Web)**: [http://localhost:3004](http://localhost:3004)

---

## 🌐 4. Arquitectura de Producción y Despliegue

La infraestructura del sistema está diseñada para desacoplar el tráfico web del procesamiento de base de datos:

1. **Frontend (Web y Panels) → Vercel**
   - Rápido despliegue continuo integrado con ramas de Git.
   - Excelente soporte nativo para Next.js 14 y distribución global por CDN.
2. **Backend (API) → Render**
   - Alojado en servicios web de Render con escalamiento de memoria configurado (`scripts/fix-memory-node.js`).
3. **Persistencia (Database & Storage) → Supabase**
   - PostgreSQL de alto rendimiento.
   - Bucket de almacenamiento (`Supabase Storage`) para almacenar imágenes y videos promocionales de catálogo.

---

## 🔐 5. Seguridad y Sanitización Realizada

Para garantizar la seguridad de la información del cliente, se han realizado los siguientes procesos de limpieza antes de la entrega:

1. **Sanitización de Cookies y Claves**:
   - Se ha removido la cookie de sesión activa de Uber Eats en [scripts/update-cookie.js](file:///e:/PRODUCCION-LO-MAS-RICO-V3/LomasRico-1/scripts/update-cookie.js), reemplazándola con un marcador de posición.
   - Se han ocultado las llaves API de producción reales de MercadoPago y PedidosYa en la documentación de [docs/CREDENCIALES-OSCAR.md](file:///e:/PRODUCCION-LO-MAS-RICO-V3/LomasRico-1/docs/CREDENCIALES-OSCAR.md).
2. **Limpieza del Historial de WhatsApp**:
   - Se diseñó y ejecutó el script [scripts/cleanup-whatsapp-history.js](file:///e:/PRODUCCION-LO-MAS-RICO-V3/LomasRico-1/scripts/cleanup-whatsapp-history.js), el cual purgó de forma definitiva todas las conversaciones de prueba, mensajes de chat, notas de agente y eventos de soporte de la base de datos de producción/desarrollo, permitiendo al nuevo equipo comenzar con un entorno limpio.

---

## 📂 6. Directorio de Scripts Operativos

En la carpeta `scripts/` se entregan herramientas de mantenimiento automatizadas:

* **`scripts/startup/`**: Script batch y PowerShell para arranque local rápido.
* **`scripts/cleanup-whatsapp-history.js`**: Limpieza periódica de chats e historial de WhatsApp.
* **`scripts/backup-render-db.ps1`**: Respaldo automático de la base de datos PostgreSQL de producción.
* **`scripts/restore-to-supabase.ps1`**: Migración y carga del respaldo a la base de datos en Supabase.
* **`scripts/uber-bridge.js`**: Monitor en tiempo real para inyectar pedidos de Uber Eats al POS.

---

Para más detalles operativos sobre flujos de recetas, compras de clientes y conciliaciones de cajas, consultar el [Manual Operativo](file:///e:/PRODUCCION-LO-MAS-RICO-V3/LomasRico-1/docs/MANUAL-OPERATIVO.md).
