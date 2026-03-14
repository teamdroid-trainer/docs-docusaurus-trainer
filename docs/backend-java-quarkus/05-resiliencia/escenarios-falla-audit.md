---
id: escenarios-falla-audit
title: "Escenarios de Falla en Audit"
description: "Simulación controlada de fallos en cja-msa-sc-audit para validar las estrategias de resiliencia implementadas en Security"
sidebar_position: 2
---

# Escenarios de Falla en Audit para Probar Resiliencia

## Objetivo de la Sesión

El objetivo de esta sesión no es agregar reglas de negocio ni lógica de dominio, sino dotar a nuestro microservicio `cja-msa-sc-audit` de **comportamientos anómalos pero controlados**.

El propósito principal es **pedagógico**: observar y demostrar cómo reacciona el microservicio `cja-msa-sc-security` ante escenarios de fallo reales o simulados. Esto permite comprobar que las estrategias de resiliencia (`@Timeout`, `@Retry`, `@CircuitBreaker` y `@Fallback`) implementadas en `security` realmente funcionan.

## Alcance Implementado

- **Filtro JAX-RS (`ResilienceTestFilter`):** Intercepta las solicitudes entrantes antes de que lleguen al controlador.
- **Simulación de Retardo:** Atrasa la respuesta deliberadamente.
- **Simulación de Error:** Fuerza a que el endpoint responda con un error HTTP 500.
- **Configuración:** Permite activar o desactivar cada escenario mediante `application.properties`.

> Estas características están **totalmente aisladas de la lógica de negocio**. El dominio (`Domain/Model`) y la aplicación (`Application/Service`) no saben que existen estas simulaciones.

---

## Escenarios de Prueba

### 1. Escenario Temporal: Respuesta Lenta (Timeout Simulation)

Simula que `audit` está tardando mucho en procesar o guardar un registro en la base de datos (por congestión de red, bloqueos en DB o alta carga).

- **¿Qué resiliencia valida en Security?** `@Timeout`, `@Retry`, `@Fallback`.
- **Comportamiento en Audit:** El hilo que procesa la petición se detiene (`Thread.sleep`) la cantidad de milisegundos especificada antes de continuar.

```properties
# Activar demora
audit.resilience.test.delay.enabled=true
audit.resilience.test.delay.ms=3000

# Desactivar demora
audit.resilience.test.delay.enabled=false
```

**Cómo probar:**
1. Habilitar la demora (ej. `delay.ms=3000`) — mayor al `@Timeout` configurado en `security` (1000ms).
2. Ejecutar un Login en `security`.
3. Observar en los logs de `security` cómo falla por timeout y `@Retry` reintenta la llamada.

---

### 2. Escenario Lógico: Respuesta HTTP 500 (Internal Server Error)

Simula que la base de datos de `audit` ha fallado, hay un NullPointerException o cualquier error interno severo.

- **¿Qué resiliencia valida en Security?** `@Retry`, `@CircuitBreaker`, `@Fallback`.
- **Comportamiento en Audit:** Cancela inmediatamente el procesamiento del Request y retorna un HTTP 500. Nunca llega a intentar guardar nada en base de datos.

```properties
# Activar error HTTP 500
audit.resilience.test.error.enabled=true

# Desactivar
audit.resilience.test.error.enabled=false
```

**Cómo probar:**
1. Habilitar el error.
2. Ejecutar múltiples intentos de Login en `security` rápidamente.
3. Tras 4 o 5 llamadas fallidas (según `@CircuitBreaker`), el circuito se ABRE en `security`. Todas las llamadas posteriores retornan fallback sin consultar a `audit` (Fast Fail).

---

### 3. Escenario Físico: Indisponibilidad Total (Servidor Caído)

El escenario más drástico donde `audit` simplemente deja de existir o la ruta de red se ha cortado.

- **¿Qué resiliencia valida en Security?** `@CircuitBreaker`, `@Fallback`.
- **Comportamiento:** El microservicio se cae y el puerto se cierra.

**Cómo probar (Didáctico):**
1. Simplemente detén el proceso Java de `cja-msa-sc-audit` en la terminal (Ctrl+C).
2. En `cja-msa-sc-security`, realiza varias peticiones de Login.
3. Observarás excepciones `ConnectionRefused`. Tras un número de fallos, el `@CircuitBreaker` entrará en acción y el `@Fallback` tomará el control.

---

## Estructura Actualizada del Proyecto (Resumen de Cambios)

```text
cja-msa-sc-audit/
└── src/main/java/cja/msa/sc/audit/
    └── infrastructure/
        └── adapters/
            └── in/
                └── rest/
                    ├── AuditLogResource.java       (Sin cambios)
                    ├── dto/...                     (Sin cambios)
                    ├── mapper/...                  (Sin cambios)
                    └── filter/                     (NUEVO)
                            ResilienceTestFilter.java   (NUEVO)
```

`application.properties` → [MODIFICADO] 3 nuevas propiedades añadidas.

## Especificaciones Técnicas

- **Dependencias Nuevas:** Ninguna. Se utilizan las ya existentes (`jakarta.ws.rs.container.ContainerRequestFilter` y `@ConfigProperty`).
- **Separación de Responsabilidades:** El filtro está en el paquete adaptador entrante (`in.rest.filter`) ya que intercepta peticiones HTTP. El dominio jamás es consciente de esta intercepción.

## Próximos Pasos Sugeridos

- Agregar pruebas unitarias (Unit Testing) con Mocks.
- Incorporar trazabilidad distribuida (OpenTelemetry / Jaeger) para visualizar gráficamente en una interfaz web cómo el retardo afecta el tiempo de respuesta.
- Empaquetamiento en imágenes Docker nativas (GraalVM).
