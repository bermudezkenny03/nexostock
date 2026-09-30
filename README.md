
# NexoStock

### Sistema de gestión de inventario y ventas

**"Conectamos tu inventario con el crecimiento de tu negocio."**

---

## Descripción del proyecto

**NexoStock** es una plataforma web de gestión de inventario y ventas diseñada para pequeños y medianos negocios, cuyo propósito es facilitar la administración de productos, el control de existencias y el registro de operaciones comerciales desde un único sistema.

El proyecto se desarrollará como un **MVP (Producto Mínimo Viable)** en el marco de un diplomado, con el objetivo de ofrecer una solución funcional que permita a los negocios optimizar sus procesos de inventario, reducir errores de registro y disponer de información organizada para la toma de decisiones.

La plataforma utilizará una arquitectura de microservicios, con **NestJS** para el backend y **Vue.js** para el frontend, permitiendo separar las responsabilidades del sistema y facilitar su mantenimiento y evolución.

---

## Problema que busca resolver

Muchos pequeños y medianos negocios gestionan sus productos y ventas mediante cuadernos, hojas de cálculo o procesos manuales.

Estas prácticas pueden generar dificultades como:

- Desconocimiento de las existencias reales de los productos.
- Errores en el registro de entradas y salidas de mercancía.
- Pérdida de información relacionada con las ventas.
- Dificultad para identificar productos con bajo inventario.
- Falta de reportes que permitan analizar el comportamiento de las ventas.
- Pérdida de tiempo en tareas administrativas.

NexoStock busca solucionar estas dificultades mediante una plataforma centralizada que permita administrar el inventario y las ventas de manera organizada, eficiente y accesible.

---

## Objetivo general

Desarrollar una plataforma web de gestión de inventario y ventas que permita a pequeños y medianos negocios administrar sus productos, controlar sus existencias y registrar sus operaciones comerciales de manera organizada y eficiente.

## Objetivos específicos

- Implementar un módulo de gestión de productos y categorías.
- Desarrollar un sistema de control de entradas, salidas y existencias.
- Registrar ventas y actualizar automáticamente el inventario.
- Implementar alertas para productos con niveles bajos de existencias.
- Generar reportes básicos de ventas e inventario.
- Implementar un sistema de autenticación y gestión de roles.
- Diseñar una arquitectura de microservicios que facilite el mantenimiento y la escalabilidad del sistema.

---

## Público objetivo

NexoStock está dirigido principalmente a:

- Propietarios de pequeños y medianos negocios.
- Tiendas de barrio y comercios minoristas.
- Papelerías y establecimientos comerciales.
- Administradores de inventario.
- Empleados encargados de registrar productos y ventas.

---

## Funcionalidades del MVP

El MVP incluirá las siguientes funcionalidades principales:

### 1. Gestión de usuarios y autenticación

- Inicio y cierre de sesión.
- Registro y administración de usuarios.
- Gestión de roles y permisos básicos.
- Protección de las funcionalidades según el rol del usuario.

### 2. Gestión de productos

- Crear, consultar, editar y desactivar productos.
- Registrar nombre, descripción, categoría, precio y cantidad disponible.
- Organizar los productos por categorías.
- Consultar el catálogo de productos.

### 3. Gestión de inventario

- Registrar entradas de productos.
- Registrar salidas de productos.
- Consultar las existencias actuales.
- Mantener un historial de movimientos de inventario.
- Configurar niveles mínimos de existencias.
- Generar alertas de bajo inventario.
- Evitar movimientos que generen existencias negativas.

### 4. Gestión de ventas

- Registrar ventas de productos.
- Seleccionar productos y cantidades.
- Calcular automáticamente el total de cada venta.
- Descontar las unidades vendidas del inventario.
- Consultar el historial de ventas.
- Evitar ventas que superen las existencias disponibles.

### 5. Reportes y estadísticas

- Consultar el estado general del inventario.
- Identificar productos con bajo nivel de existencias.
- Visualizar reportes básicos de ventas.
- Consultar los productos con mayor movimiento.
- Mostrar indicadores generales del negocio.

---

## Tecnologías

### Frontend

| Tecnología | Descripción |
|---|---|
| Vue.js | Desarrollo de la interfaz de usuario. |
| TypeScript | Tipado estático en el frontend. |
| Vue Router | Navegación entre vistas. |
| Pinia | Gestión del estado de la aplicación. |
| Axios | Comunicación con las API del backend. |

### Backend

| Tecnología | Descripción |
|---|---|
| NestJS | Desarrollo de los microservicios. |
| TypeScript | Lenguaje principal del backend. |
| API REST | Comunicación entre el frontend y los servicios. |
| JWT | Autenticación mediante tokens. |

### Base de datos e infraestructura

| Tecnología | Descripción |
|---|---|
| PostgreSQL | Sistema de gestión de bases de datos relacional. |
| Docker | Contenerización de los servicios. |
| Docker Compose | Orquestación local de los contenedores. |
| Git | Control de versiones. |
| GitHub | Repositorio y colaboración del equipo. |

---

## Arquitectura de microservicios

NexoStock utilizará una arquitectura de microservicios en la que cada servicio tendrá una responsabilidad específica dentro del sistema.

El frontend desarrollado con Vue.js se comunicará con el backend a través de un API Gateway, que será el punto de entrada de las solicitudes y se encargará de dirigirlas al servicio correspondiente.

### Microservicios propuestos

#### 1. API Gateway

Responsable de:

- Recibir las solicitudes del frontend.
- Enrutar las solicitudes hacia los microservicios.
- Centralizar el acceso a las API.
- Aplicar controles básicos de acceso y validación.

#### 2. Auth Service

Responsable de:

- Autenticación de usuarios.
- Validación de credenciales.
- Generación y validación de tokens JWT.
- Gestión de roles y permisos.

#### 3. Products Service

Responsable de:

- Crear y administrar productos.
- Gestionar categorías.
- Consultar el catálogo.
- Actualizar la información de los productos.

#### 4. Inventory Service

Responsable de:

- Administrar las existencias.
- Registrar entradas y salidas.
- Mantener el historial de movimientos.
- Controlar los niveles mínimos de inventario.
- Validar la disponibilidad de productos.

#### 5. Sales Service

Responsable de:

- Registrar las ventas.
- Calcular los totales.
- Administrar los detalles de cada venta.
- Coordinar la actualización del inventario.
- Consultar el historial de ventas.

#### 6. Reports Service

Responsable de:

- Consultar información de ventas.
- Generar reportes de inventario.
- Identificar productos con bajo stock.
- Mostrar indicadores básicos del negocio.

### Diagrama general de arquitectura

```text
                    ┌──────────────────────┐
                    │     USUARIO          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   FRONTEND VUE.JS    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     API GATEWAY      │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │ AUTH       │   │ PRODUCTS   │   │ INVENTORY  │
       │ SERVICE    │   │ SERVICE    │   │ SERVICE    │
       └────────────┘   └────────────┘   └────────────┘
                               │                ▲
                               │                │
                               ▼                │
                        ┌────────────┐          │
                        │   SALES    │──────────┘
                        │  SERVICE   │
                        └─────┬──────┘
                              │
                              ▼
                        ┌────────────┐
                        │  REPORTS   │
                        │  SERVICE   │
                        └────────────┘
```

### Gestión de datos

Para el MVP se utilizará PostgreSQL como sistema de base de datos.

Los servicios tendrán responsabilidades de datos claramente definidas. Durante la etapa inicial se podrá compartir una instancia de PostgreSQL, procurando separar los esquemas o las tablas por dominio.

La independencia completa de las bases de datos de cada microservicio podrá considerarse en futuras versiones.

---

## Estructura general del proyecto

```text
nexostock/
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── views/
│   │   ├── router/
│   │   ├── stores/
│   │   ├── services/
│   │   └── App.vue
│   └── package.json
│
├── backend/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── products-service/
│   ├── inventory-service/
│   ├── sales-service/
│   └── reports-service/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Alcance del MVP

El MVP se enfocará en desarrollar las funcionalidades esenciales para demostrar el funcionamiento del sistema:

- Autenticación y roles básicos.
- Gestión de productos y categorías.
- Control de entradas y salidas de inventario.
- Registro de ventas y actualización de existencias.
- Alertas de bajo inventario.
- Reportes básicos de ventas e inventario.

### Funcionalidades fuera del alcance inicial

Las siguientes características podrán desarrollarse en futuras versiones:

- Facturación electrónica.
- Integración con sistemas contables.
- Gestión de múltiples sucursales.
- Aplicaciones móviles nativas.
- Integración con pasarelas de pago.
- Predicción de demanda mediante inteligencia artificial.
- Integración con plataformas externas de comercio electrónico.

---

## Plan de desarrollo

El proyecto tendrá una duración aproximada de **8 semanas**, distribuidas de la siguiente manera:

| Semana | Actividades |
|---|---|
| 1 | Análisis del problema, definición de requisitos y alcance del MVP. |
| 2 | Diseño de arquitectura, base de datos y prototipos de interfaz. |
| 3 | Configuración del entorno y desarrollo de autenticación y productos. |
| 4 | Desarrollo del servicio de inventario y movimientos de stock. |
| 5 | Desarrollo del servicio de ventas e integración con inventario. |
| 6 | Desarrollo del frontend, reportes e integración de los servicios. |
| 7 | Pruebas funcionales, corrección de errores y ajustes. |
| 8 | Despliegue, documentación y presentación final del MVP. |

---

## Resultados esperados

Al finalizar el proyecto, se espera contar con una plataforma web funcional que permita:

- Administrar productos desde una plataforma centralizada.
- Consultar las existencias disponibles.
- Registrar ventas y actualizar automáticamente el inventario.
- Identificar productos con bajo nivel de existencias.
- Consultar reportes básicos de ventas e inventario.
- Facilitar la organización y el control de las operaciones comerciales.

---

## Instalación y ejecución

Los comandos de instalación y ejecución se documentarán cuando se defina la configuración definitiva de los microservicios, las variables de entorno y la base de datos.

---

## Estado del proyecto

**En fase de planificación y desarrollo del MVP.**

---

## Equipo de desarrollo

Proyecto académico desarrollado como parte de un diplomado.

---

## Licencia

Por definir.
