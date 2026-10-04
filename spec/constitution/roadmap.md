# Roadmap

_Orden y estado de las features. Es la vista de "qué hay hecho, qué toca ahora y qué viene". Cada entrada apunta a su carpeta en `features/`._

## Hecho ✅

_Features completadas, en orden de implementación._

1. **[001 · Autenticación y acceso por rol](../features/001-nombre-feature/spec.md)** (backend) — login, sesiones con refresh de un solo uso, roles y permisos en `auth-service`. Falta la interfaz.
2. **[003 · Aislamiento por negocio](../features/003-negocio-aislamiento/spec.md)** (auth-service) — multi-negocio con registro self-service, roles por negocio y protección del propietario. Faltan los servicios operativos.

## Siguiente 🔜

_Lo próximo a abordar. Idealmente una sola feature "en curso" a la vez._

3. **[004 · Administración de plataforma](../features/004-administracion-plataforma/spec.md) — fase A** — separa los ámbitos de tienda y plataforma en la base, agrega el claim `accessScope` y corrige el arranque en producción (hoy el registro falla ahí porque el catálogo solo lo crea el seed). Va primero porque cambia el contrato del token que usarán todos los servicios.

## Después (orden previsto) 🗺️

4. **[005 · API Gateway y comunicación interna](../features/005-api-gateway-comunicacion/spec.md) — fases A y B** — RS256, `service-kit`, gateway y servicios sin puertos publicados. Va antes del primer servicio operativo para que nazca sobre el contrato común.
5. **[002 · Catálogo de productos](../features/002-productos-catalogo/spec.md)** — primer servicio operativo. Completar su spec antes de implementarlo.
6. **Inventario** (spec pendiente) — existencias, movimientos, niveles mínimos y alertas.
7. **Ventas** (spec pendiente) — registro de ventas y coordinación con inventario. Activa la fase C de 005 (llamadas internas e idempotencia).
8. **004 · Administración de plataforma — fase B** — listado de negocios, suspensión, recuperación de acceso y auditoría. Puede adelantarse si sobra tiempo; la misión prioriza completar el flujo productos–inventario–ventas.
9. **Reportes** (spec pendiente) — indicadores y reportes básicos de ventas e inventario.

La interfaz de cada feature (Vue) se construye junto con su backend; cada spec incluye sus criterios de interfaz.

## Backlog / ideas 💡

_Sin comprometer ni ordenar del todo. Ideas que respetan la constitución._

- **Aprobación de registros** — los negocios nuevos nacen pendientes hasta que la plataforma los aprueba; 004 deja el estado listo para agregar `PENDING`.
- **Crear negocios desde la plataforma** — alta asistida que reutiliza el enlace de recuperación de 004 como invitación al dueño.
- **Recuperación de contraseña por correo** — sin intervención del equipo; requiere SMTP y reutiliza los enlaces de 004.
- **MFA para administradores de plataforma** — protege la cuenta más sensible del sistema.
- **Tokens de servicio** — para jobs programados que no actúan en nombre de un usuario (005).
- **Caché compartida del estado de negocios** — en el gateway, cuando haya varias réplicas (005).
- **JWKS y rotación con varias claves** — publicar las claves públicas y rotarlas sin cortar sesiones (005).
- **Membresía en varios negocios** — un mismo usuario en varios negocios con selector de negocio activo (003, fase 3).

> Cada feature nueva se crea como `features/NNN-nombre-feature/` con `spec.md`, `plan.md` y `tasks.md` antes de tocar código.
