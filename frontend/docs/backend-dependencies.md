# Dependencias y brechas del backend

Este documento recoge lo que el frontend necesita del backend y todavía no existe o no es fiable. El backend **no se modificó**; cada punto incluye una propuesta.

Verificado contra el código de `backend/apps/*` (controladores, DTOs, gateway), no contra el README.

| # | Brecha | Impacto en el frontend | Propuesta |
|---|--------|------------------------|-----------|
| 1 | OpenAPI solo en auth-service, y el gateway no expone `/api/docs-json`. | Solo los tipos de auth se generan (`npm run api:types` contra `:3001`). Los tipos de productos, inventario, ventas y reportes están escritos a mano en `modules/*/types`. | Anotar los DTOs de dominio con `@ApiProperty` y publicar un documento agregado desde el gateway. |
| 2 | `firstName`/`lastName` usan `@ApiProperty({ nullable: true })` sin `type`. | El generador los tipa como `Record<string, never>`; `modules/auth/types` los corrige con `Omit`. | Añadir `type: String`. |
| 3 | Refresh token devuelto en el body, sin cookie httpOnly. | El refresh vive en `sessionStorage` (decisión acordada): una pestaña nueva exige login y el token es legible por JS si hubiera XSS. | Cookie `httpOnly; Secure; SameSite=Strict` en `/api/auth/refresh` y CORS con `credentials: true`. |
| 4 | Refresh de un solo uso con detección de reutilización. | Una pestaña duplicada (que copia `sessionStorage`) revocaría todas las sesiones; se mitiga con `BroadcastChannel` (`shared/api/tabSession.ts`). | Resuelto en cliente; con la cookie del punto 3 desaparece el problema. |
| 5 | Sin cambio de plan self-service ni estado de suscripción o facturación (solo `isActive` y `planCode`). | El dashboard muestra plan y límites en solo lectura. | Endpoint de suscripción si se requiere autoservicio. |
| 6 | Sin `DELETE` de productos ni de categorías; sin `GET /categories/:id`. | Solo activar/desactivar. La edición de categoría usa la fila del listado. | Mantener el borrado lógico (es correcto para historial de ventas); añadir `GET` por id si hace falta. |
| 7 | Sin estadísticas agregadas de plataforma. | El panel de plataforma calcula totales desde `total` de la lista paginada de negocios. | `GET /platform/stats`. |
| 8 | `GET /users` y `GET /roles` sin paginación. | Afectará a la Etapa E (listas completas en cliente). | Paginación `{items,total,page,pageSize}` como en productos. |
| 9 | `GET /inventory/stock` no incluye el nombre del producto. | La Etapa E tendrá que unir stock y productos en cliente. | Incluir `productName`/`sku` en la respuesta. |
| 10 | Permiso `reports.manage` definido sin endpoint que lo use. | No se usa en el frontend. | Documentar o retirar. |
| 11 | La moneda no forma parte del contrato. | `formatMoney` asume `es-MX` y `$`. | Añadir `currency` al negocio. |

## Avisos de dependencias del frontend

- `npm audit` reporta `braces` a través de `@vue/eslint-config-typescript`. Es una dependencia solo de desarrollo, no llega al bundle.
