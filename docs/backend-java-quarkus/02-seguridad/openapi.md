---
id: introduccion-openapi
title: "OpenAPI y Swagger"
description: "Qué es OpenAPI, beneficios frente a otras formas de documentar y cómo se ve integrado en Docusaurus."
sidebar_position: 1
---

# OpenAPI (Swagger)

## ¿Qué es OpenAPI?

**OpenAPI Specification (OAS)**, anteriormente conocida como Swagger, es un formato estándar (agnóstico al lenguaje) para describir, producir, consumir y visualizar interfaces RESTful de manera programática. En lugar de escribir un documento manual en Word o una Wiki paralela que siempre queda desactualizada respecto al código real, OpenAPI permite estructurar las rutas de una API en un archivo YAML o JSON tipado de forma estricta.

## Beneficios y ¿Por qué resalta?

Frente a documentar tu API en una Wiki de Confluence o compartir simples colecciones de Postman:

1. **Fuente de la Verdad (Contrato):** Postman es fabuloso para probar, pero pobre para declarar contratos (qué tipos de datos son obligatorios, si un número es flotante o entero, máximo de caracteres). OpenAPI define un "Contrato" estricto entre Frontend y Backend.
2. **Generación automática desde el Código:** En Quarkus (y Spring), el archivo OpenAPI no se hace a mano; se auto-genera leyendo las anotaciones del código Java (`@Path`, `@POST`, `@Schema`). Así, si modificas una clase de Java, la documentación se actualiza sola al compilar. Evita la asincronía de la documentación manual.
3. **Generación de Clientes:** Existen herramientas que toman el `.yaml` de OpenAPI y te programan solas los clientes HTTP (Axios) para Angular, React o Flutter, incluyendo los tipos de TypeScript.
4. **Validación Visual:** Herramientas como Swagger UI o Docusaurus toman el YAML y crean portales dinámicos hermosos en segundos, donde puedes hacer llamadas reales directamente desde la documentación.

## Diferencias Clave

| Característica | Documentación Manual (Wiki) | Colecciones Postman | Especificación OpenAPI |
| :--- | :--- | :--- | :--- |
| **Precisión Técnica** | Baja (Propenso a errores humanos) | Media (Muestra un payload, pero no todos los límites) | **Alta** (Define esquemas fuertes de datos) |
| **Mantenimiento** | Engorroso (Se desactualiza) | Manual (Hay que exportar/importar) | **Automático** (Se genera desde anotaciones del código) |
| **Integración UI** | Texto plano estático | Visor de Postman | Múltiples generadores dinámicos (Swagger UI, Redoc, Docusaurus) |

---

## Ejemplo de Documento OpenAPI

La estructura luce así (típicamente auto-generada):

```yaml
openapi: 3.0.3
info:
  title: Microservicio de Seguridad
  version: 1.0.0
paths:
  /api/v1/auth/login:
    post:
      summary: Iniciar sesión
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
```
