# 001 · Autenticación y acceso por rol

**Estado:** propuesta

## Qué hace

Permite que las personas del negocio inicien y cierren sesión en NexoStock y que cada una solo vea y ejecute lo que le corresponde según su rol. Existen tres roles, derivados de los usuarios definidos en `constitution/mission.md`:

- **Propietario** — consulta indicadores y reportes, y administra los usuarios del negocio.
- **Administrador de inventario** — gestiona productos e inventario y consulta los niveles bajos.
- **Empleado de ventas** — registra ventas y consulta la disponibilidad de productos.

El propietario puede crear usuarios, asignarles un rol y desactivarlos. Quien no haya iniciado sesión no puede acceder a ninguna función del sistema.

## Por qué

Todos los módulos posteriores (productos, inventario, ventas y reportes) manejan información comercial sensible y necesitan saber quién realiza cada acción. Esta feature materializa el principio de **acceso controlado** de la misión y es prerrequisito de las demás, por lo que debe construirse primero.

## Criterios de aceptación

_Cada criterio se comprueba con sí/no. Marcar `[x]` al cumplirse._

### Inicio y cierre de sesión

- [ ] Un usuario activo con credenciales correctas inicia sesión y llega a la pantalla principal.
- [ ] Con credenciales incorrectas no se inicia sesión y se muestra un mensaje comprensible que no revela si falló el usuario o la contraseña.
- [ ] Un usuario sin sesión que intenta abrir cualquier vista protegida es redirigido al inicio de sesión.
- [ ] Al cerrar sesión, el usuario no puede volver a acceder a vistas protegidas sin autenticarse de nuevo.
- [ ] Un usuario desactivado no puede iniciar sesión y recibe un mensaje comprensible.

### Roles y permisos

- [ ] Cada usuario tiene exactamente un rol: propietario, administrador de inventario o empleado de ventas.
- [ ] La interfaz muestra únicamente las opciones de navegación permitidas para el rol del usuario.
- [ ] El backend rechaza toda operación no permitida para el rol del usuario, incluso si la solicitud se envía directamente a la API sin pasar por la interfaz.
- [ ] Una operación rechazada por falta de permisos devuelve un mensaje comprensible y no ejecuta ningún cambio.
- [ ] La matriz de permisos se cumple tal como está definida abajo.

| Acción | Propietario | Admin. de inventario | Empleado de ventas |
| --- | :---: | :---: | :---: |
| Gestionar usuarios y roles | si | no | no |
| Gestionar productos e inventario | si | si | no |
| Consultar disponibilidad de productos | si | si | si |
| Registrar ventas | si | no | si |
| Consultar indicadores y reportes | si | no | no |

### Administración de usuarios

- [ ] El propietario puede crear un usuario indicando nombre, credencial de acceso y rol.
- [ ] El propietario puede cambiar el rol de un usuario y desactivarlo o reactivarlo.
- [ ] No se pueden crear dos usuarios con el mismo identificador de acceso; el sistema informa el motivo.
- [ ] El sistema impide que el negocio se quede sin ningún propietario activo.
- [ ] Un administrador de inventario o un empleado de ventas no pueden acceder a la gestión de usuarios.

### Seguridad y calidad

- [ ] Las contraseñas no se almacenan ni se muestran en texto legible en ninguna pantalla, respuesta ni registro.
- [ ] Los mensajes de error no incluyen contraseñas, tokens ni otros datos sensibles.
- [ ] El formulario de inicio de sesión valida los campos obligatorios y muestra mensajes claros antes de enviar.
- [ ] Las pantallas de inicio de sesión y de gestión de usuarios son utilizables en pantallas de escritorio y de móvil.

## Fuera de alcance

- Recuperación de contraseña por correo o mensaje (backlog).
- Registro público de usuarios: solo el propietario crea cuentas.
- Doble factor de autenticación e inicio de sesión con proveedores externos.
- Permisos personalizados por usuario: solo los tres roles fijos.
- Bitácora detallada de auditoría de acciones (la trazabilidad de ventas e inventario se cubre en sus propias features).
- Administración de varias sucursales (`constitution/mission.md`, "Qué NO es").

## Decisiones pendientes

- Vigencia de la sesión o del token y comportamiento exacto del cierre de sesión.
- Mecanismo de protección de contraseñas (hash) y política mínima de contraseña.
- Cómo se crea el primer propietario al poner el sistema en marcha.
- Si el identificador de acceso es correo electrónico o nombre de usuario.
