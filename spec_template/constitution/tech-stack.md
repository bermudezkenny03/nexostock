# NexoStock — Tecnologías y convenciones

| Dato | Descripción |
| --- | --- |
| Proyecto | NexoStock: sistema de gestión de inventario y ventas. |
| Versión de este documento | 1.0 — propuesta inicial para revisión del equipo. |
| Alcance | Tecnologías, responsabilidades de los componentes y convenciones del MVP. |
| Documento relacionado | [Misión y alcance](mission.md). |

## 1. Propósito y estado de las decisiones

Documentar la base tecnológica descrita para NexoStock y proponer reglas comunes para su desarrollo. Las tecnologías principales proceden de la descripción inicial del proyecto; las convenciones incluidas aquí deberán ser revisadas por el equipo.

Este artefacto describe la solución prevista. No certifica que los servicios, las configuraciones o las pruebas ya estén implementados. Las versiones exactas de las dependencias y los comandos de ejecución siguen pendientes de definición.

## 2. Tecnologías previstas

### Frontend

| Tecnología | Uso previsto en NexoStock |
| --- | --- |
| Vue.js | Construir las vistas y los componentes de la interfaz web. |
| TypeScript | Definir tipos para los datos y las operaciones de la aplicación. |
| Vue Router | Organizar la navegación entre las vistas. |
| Pinia | Gestionar el estado compartido de la interfaz. |
| Axios | Realizar solicitudes a las API del backend. |

### Backend

| Tecnología o mecanismo | Uso previsto en NexoStock |
| --- | --- |
| NestJS | Desarrollar el API Gateway y los servicios del backend. |
| Node.js | Entorno de ejecución del backend desarrollado con NestJS. |
| TypeScript | Lenguaje principal del backend. |
| API REST | Exponer las operaciones que consume el frontend. |
| JWT | Utilizar tokens en el mecanismo de autenticación previsto. |

NestJS permite desarrollar aplicaciones de servidor sobre Node.js con soporte para TypeScript. La organización concreta de los servicios se definirá en el proyecto. Véase la [documentación oficial de NestJS](https://docs.nestjs.com/).

### Persistencia, infraestructura y colaboración

| Tecnología | Uso previsto en NexoStock |
| --- | --- |
| PostgreSQL | Persistir usuarios, productos, movimientos y ventas. |
| Docker | Empaquetar los componentes en contenedores. |
| Docker Compose | Definir y ejecutar el conjunto de contenedores en el entorno local. |
| Git | Mantener el historial de cambios del proyecto. |
| GitHub | Alojar el repositorio y apoyar la colaboración del equipo. |

## 3. Arquitectura y responsabilidades

El frontend se comunicará con el **API Gateway**, que será el punto de entrada hacia los servicios. El backend se organizará por responsabilidades de negocio:

| Componente | Responsabilidad prevista |
| --- | --- |
| `api-gateway` | Recibir solicitudes del frontend, dirigirlas al servicio correspondiente y aplicar controles comunes de acceso y validación. |
| `auth-service` | Autenticar usuarios, gestionar credenciales y roles y emitir o validar tokens según el diseño acordado. |
| `products-service` | Administrar productos, categorías, descripciones, precios y estado de los productos. |
| `inventory-service` | Administrar existencias, movimientos, niveles mínimos y disponibilidad. |
| `sales-service` | Registrar ventas y sus detalles, calcular totales y coordinar la actualización del inventario. |
| `reports-service` | Consultar información para elaborar reportes de ventas, inventario e indicadores. |

El protocolo de comunicación interna entre servicios deberá concretarse durante el diseño técnico. No se presupone la incorporación de un intermediario de mensajes ni de otra tecnología que no esté definida en el proyecto.

## 4. Organización de los datos

La propuesta inicial permite compartir una instancia de PostgreSQL durante el MVP, manteniendo límites claros entre los datos de cada dominio.

Como convención propuesta, cada servicio será responsable de modificar los datos que administra. En particular:

- Productos administrará los datos descriptivos y comerciales del catálogo.
- Inventario será la fuente de referencia para las cantidades disponibles y sus movimientos.
- Ventas administrará las ventas y coordinará sus efectos sobre el inventario.
- Reportes consultará la información necesaria sin modificar las operaciones de negocio.

La separación podrá realizarse mediante esquemas por dominio, con permisos acordes con esa organización. PostgreSQL permite organizar objetos en esquemas, pero estos no constituyen por sí solos una barrera de acceso: el acceso depende también de los privilegios asignados. Véase la [documentación oficial sobre esquemas](https://www.postgresql.org/docs/current/ddl-schemas.html).

La independencia completa de las bases de datos se evaluará para futuras versiones. El ORM o mecanismo de acceso a datos aún no está definido.

## 5. Consistencia de ventas e inventario

La coordinación entre ventas e inventario deberá satisfacer estos requisitos propuestos:

1. Verificar que los productos y las cantidades de una venta sean válidos.
2. Calcular los totales en el backend con los precios aplicables a la operación.
3. Impedir que solicitudes simultáneas o repetidas produzcan inventario negativo o descuentos duplicados.
4. Relacionar cada venta con su movimiento de inventario.
5. Definir cómo recuperar una operación si falla una parte del proceso, evitando presentarla como completada cuando sus efectos aún no son consistentes.

El mecanismo de coordinación, los estados de la venta y el tratamiento de reintentos deberán detallarse en la especificación de ventas antes de su implementación. Usar la misma instancia de PostgreSQL no garantiza, por sí solo, la atomicidad entre operaciones de servicios distintos.

## 6. Organización propuesta del repositorio

Las siguientes rutas corresponden a la organización prevista. En esta entrega documental se incluyen únicamente los dos artefactos de la constitución del proyecto.

| Ruta relativa | Contenido esperado |
| --- | --- |
| `spec/constitution/mission.md` | Propósito, usuarios, objetivos y alcance del MVP. |
| `spec/constitution/tech-stack.md` | Tecnologías y convenciones del proyecto. |
| `spec/constitution/roadmap.md` | Orden de desarrollo de las funcionalidades; artefacto posterior. |
| `spec/features/` | Especificaciones, planes y listas de tareas por funcionalidad; documentación posterior. |
| `frontend/` | Aplicación web con Vue.js. |
| `backend/api-gateway/` | Punto de entrada del backend. |
| `backend/auth-service/` | Servicio de autenticación y usuarios. |
| `backend/products-service/` | Servicio de productos y categorías. |
| `backend/inventory-service/` | Servicio de inventario. |
| `backend/sales-service/` | Servicio de ventas. |
| `backend/reports-service/` | Servicio de reportes. |
| `docker-compose.yml` | Configuración de ejecución local con contenedores. |
| `.env.example` | Nombres y ejemplos no sensibles de variables de entorno. |
| `.gitignore` | Exclusiones del control de versiones. |
| `README.md` | Presentación, requisitos e instrucciones de ejecución del proyecto. |

## 7. Convenciones de desarrollo propuestas

### Código y documentación

- Utilizar TypeScript en frontend y backend.
- Emplear nombres de carpetas en inglés y `kebab-case`, como `inventory-service`.
- Mantener los documentos funcionales y las explicaciones de entrega en español.
- Separar presentación, comunicación con API y lógica del frontend.
- Separar recepción de solicitudes, reglas de negocio y persistencia en el backend.
- Documentar los cambios de alcance antes de incorporarlos al desarrollo.

### API y validaciones

- Validar en el backend los datos recibidos y los permisos para cada operación.
- Definir contratos de solicitud, respuesta y error por funcionalidad.
- Devolver mensajes comprensibles sin incluir contraseñas, tokens u otros datos sensibles.
- Mantener un criterio común para representar fechas, cantidades y valores monetarios; precisión, moneda y redondeo deberán acordarse durante el diseño de datos.
- Evitar que los cálculos o permisos dependan únicamente de las validaciones del navegador.

### Configuración y acceso

- Configurar conexiones y secretos mediante variables de entorno.
- Mantener contraseñas, tokens y archivos `.env` con valores reales fuera del repositorio.
- Registrar en `.env.example` únicamente nombres de variables y valores de ejemplo no sensibles.
- Definir el almacenamiento de contraseñas mediante hash, la vigencia de los tokens y el comportamiento del cierre de sesión antes de completar autenticación.
- Registrar las versiones utilizadas y conservar los archivos de bloqueo de dependencias correspondientes al gestor elegido.

### Control de cambios

- Realizar cambios con un propósito identificable y mensajes de commit descriptivos.
- Revisar el contenido antes de incorporarlo a la rama principal.
- Actualizar la documentación cuando cambien contratos, decisiones técnicas o instrucciones de ejecución.

## 8. Verificación prevista

Las comprobaciones deberán centrarse en los criterios de aceptación de cada funcionalidad. Para el MVP se priorizarán:

- Acceso y permisos por rol.
- Gestión de productos y categorías.
- Registro de movimientos y prevención de existencias negativas.
- Registro de ventas, cálculo de totales y actualización del inventario.
- Solicitudes repetidas y ventas simultáneas sobre las mismas existencias.
- Correspondencia entre reportes y operaciones registradas.

Las herramientas de pruebas y los comandos definitivos se documentarán cuando se configure el proyecto. Esta lista expresa verificaciones pendientes, no pruebas realizadas.

## 9. Decisiones pendientes

| Decisión | Aspecto que debe concretarse |
| --- | --- |
| Versiones y gestor de paquetes | Versiones de Node.js, frameworks, PostgreSQL y herramientas del proyecto. |
| Acceso a datos | ORM o cliente, modelo de datos y migraciones. |
| Autenticación | Roles, permisos, protección de credenciales y ciclo de vida de los tokens. |
| Integración | Protocolo interno, contratos, fallos, reintentos y coordinación entre ventas e inventario. |
| Despliegue | Entorno de publicación y configuración necesaria para la demostración. |
| Ejecución local | Puertos, variables, servicios y comandos verificables de instalación e inicio. |

Las decisiones aprobadas deberán incorporarse a este documento y a las especificaciones de las funcionalidades afectadas.
