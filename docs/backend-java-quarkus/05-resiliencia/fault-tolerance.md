---
id: fault-tolerance
title: "Resiliencia y Tolerancia a Fallos"
description: "Protección de microservicios con @Timeout, @Retry, @CircuitBreaker y @Fallback de MicroProfile Fault Tolerance"
sidebar_position: 1
---

# Endpoints Resilientes en Security

## 1. Objetivo de la Sesión
Introducir el concepto de **Resiliencia (Tolerancia a Fallos)** en la comunicación entre microservicios, específicamente protegiendo a `cja-msa-sc-security` contra inestabilidades del microservicio `cja-msa-sc-audit`.

## 2. Dependencia Principal
```kotlin
implementation("io.quarkus:quarkus-smallrye-fault-tolerance")
```

## 3. ¿Por qué la Resiliencia es Indispensable?

> *"No se trata de **si** un sistema va a fallar, sino de **cuándo** lo hará y **cómo** te vas a recuperar."*

En arquitecturas distribuidas, **la red no es confiable, la latencia no es cero y los servidores no son inmortales**. La resiliencia es el escudo que garantiza que un componente débil o caído (ej. `audit`) **jamás** provoque un efecto dominó que arrastre a la muerte a los componentes sanos que lo consumen (ej. `security`).

### Diagrama del Caso de Uso

```mermaid
sequenceDiagram
    participant Frontend
    participant Security
    participant Audit

    Frontend->>Security: POST /login (Intentar iniciar sesión)
    Note over Security: Autorizado (Ej. Redis / Keycloak)
    Security-->>Frontend: HTTP 200 OK + JWT (Respuesta ¡Veloz!)

    Note over Security, Audit: Proceso en Background (AOP)
    Security->>Audit: POST /audit (Enviar bitácora)

    alt Audit está SANO
        Audit-->>Security: HTTP 201 Created
        Note over Security: Tarea finalizada con éxito.
    else Audit está CAÍDO / LENTO
        Audit--xSecurity: Timeout / Error 503
        Note over Security: ⚡ Actuamos de inmediato.
        Security->>Security: Se guarda log de Fallback (System.out / Local File)
        Note over Security: Resiliencia Triunfante. El usuario NUNCA notó la falla.
    end
```

---

## 4. `@Timeout` — Límite de Tiempo de Espera

**Fija un límite estricto** al tiempo que una parte del sistema está dispuesta a esperar por una respuesta. Si ese límite se alcanza, la invocación se considera fallida inmediatamente, liberando los hilos bloqueados.

```mermaid
sequenceDiagram
    participant Security
    participant Audit

    Note over Security, Audit: Con @Timeout(1000)
    Security->>Audit: POST /audit
    Note right of Audit: (1 seg transcurrido)
    Note over Security: ⚡ Corta la conexión (Lanza TimeoutException)
    Security-->>Cliente: Continúa su proceso rápidamente
```

**Escenario Real:** Pasarela de Pagos Lenta — Si un banco no responde en 3 segundos, abortar y mostrar "Intente nuevamente", sin saturar los servidores.

```java
@Timeout(value = 1000) // 1 segundo = 1000 ms
public void logEvent(...) {
    auditRestClient.sendAuditLog(auditData);
}
```

---

## 5. `@Retry` — Reintento Automático

Permite que una operación fallida se intente de nuevo automáticamente antes de aceptar la derrota. Útil para **Fallos Transitorios (Transient Failures)**: errores que ocurren por un micro-segundo.

```mermaid
sequenceDiagram
    participant Security
    participant Audit

    Security->>Audit: POST /audit (Intento 1)
    Audit--xSecurity: Falla (ej. Network Drop 503)
    Note over Security: Espera 200ms (@Retry)
    Security->>Audit: POST /audit (Intento 2)
    Audit--xSecurity: Falla (ej. Network Drop 503)
    Note over Security: Espera 200ms (@Retry)
    Security->>Audit: POST /audit (Intento 3)
    Audit-->>Security: 200 OK ✅ Se salvó el Request!
```

**Escenario Real:** Pods de Kubernetes reiniciando — Con `@Retry(maxRetries = 3, delay = 500)`, el sistema detecta la falla, espera, y el pod ya arrancó para el segundo intento.

```java
@Retry(maxRetries = 2, delay = 200) // Máximo 2 reintentos extra, esperando 200ms entre ellos
public void logEvent(...) { ... }
```

---

## 6. `@CircuitBreaker` — Interruptor de Circuito

Un **Interruptor Térmico** de software. Si las peticiones hacia otro servicio están fallando sistemáticamente, "corta la corriente" para evitar ahogar al otro servicio.

**3 estados:**
- **Cerrado (Closed):** Todo está sano, las peticiones fluyen con normalidad.
- **Abierto (Open):** Si X cantidad de errores ocurren, "Salta" el taco. Las peticiones ni siquiera viajan por red.
- **Semi-Abierto (Half-Open):** Al pasar cierto tiempo (`delay`), se lanza 1 petición de prueba. Si es exitosa, se CIERRA el circuito.

```mermaid
flowchart TD
    Inicio(( )) --> CLOSED

    subgraph Sano [Operación Normal]
        CLOSED["Estado: CERRADO 🟩<br>El tráfico fluye hacia Audit"]
        CLOSED -- Éxitos continuos --> CLOSED
    end

    CLOSED -- "Falla el 40% de 10 peticiones<br>(Umbral superado)" --> OPEN

    subgraph Caida [Servicio Caído]
        OPEN["Estado: ABIERTO 🟥<br>El 'breaker' saltó"]
        OPEN -- Nuevas peticiones --> Rechazo["Se rechazan y van al<br>@Fallback de inmediato"]
    end

    OPEN -- "Pasa el tiempo de<br>espera delay=5000ms" --> HALF_OPEN

    subgraph Prueba [Modo de Recuperación]
        HALF_OPEN["Estado: SEMI-ABIERTO 🟨<br>Deja pasar UNA petición de prueba"]
        HALF_OPEN -. "La prueba falla" .-> OPEN
        HALF_OPEN -. "La prueba es exitosa" .-> CLOSED
    end

    style CLOSED fill:#d4edda,stroke:#28a745,stroke-width:2px
    style OPEN fill:#f8d7da,stroke:#dc3545,stroke-width:2px
    style HALF_OPEN fill:#fff3cd,stroke:#ffc107,stroke-width:2px
```

```java
// 1. Evalúa las últimas 10 llamadas
// 2. Si 4 o más fallan (failureRatio = 0.4) → ABRE el circuito por 5000ms
@CircuitBreaker(requestVolumeThreshold = 10, failureRatio = 0.4, delay = 5000)
public void logEvent(...) { ... }
```

---

## 7. `@Fallback` — Plan B / Graceful Degradation

El patrón de **Mitigación** definitiva. ¿Qué debe hacer tu backend si todas las opciones anteriores fallan? Un `@Fallback` proporciona un camino algorítmico secundario que atrapa el error y provee datos cacheados o un reporte silenciado.

```mermaid
flowchart LR
    Invoca[Llamada API] --> Req{¿API Sano?}
    Req -- Sí --> Win("Respuesta normal")
    Req -- "Falla/Circuit Abierto" --> FB["🔥 Método @Fallback"]
    FB --> FB_Data("Retorna respuesta alternativa o log local")
    Win --> Cliente
    FB_Data --> Cliente
```

```java
@Timeout(1000)
@Retry(maxRetries = 2, delay = 200)
@CircuitBreaker(requestVolumeThreshold = 10, failureRatio = 0.4, delay = 5000)
@Fallback(fallbackMethod = "logEventFallback")
public void logEvent(...) { ... }

// El Throwable t permite identificar QUÉ política disparó el fallback
public void logEventFallback(..., Throwable t) {
    if (t instanceof TimeoutException) {
        log.warn("🚨 @Timeout detonado");
    } else if (t instanceof CircuitBreakerOpenException) {
        log.warn("🚨 @CircuitBreaker Abierto");
    } else {
        log.warn("🚨 Excepción de @Retry agotado o fallo general");
    }
}
```

---

## 8. Flujo Completo con Resiliencia Activa

```mermaid
sequenceDiagram
    autonumber
    participant Cliente as Frontend / App
    box lightblue cja-msa-sc-security
        participant Auth as AuthService
        participant AOP as AuditInterceptor
        participant AuditSvc as AuditService
    end
    participant AuditMSA as cja-msa-sc-audit

    Cliente->>Auth: 1. POST /api/v1/auth/login
    Note over Auth: Verifica Redis Toggle / Keycloak
    Auth-->>Cliente: 2. HTTP 200 OK (JWT)

    Note over AOP, AuditMSA: Proceso asíncrono y Desacoplado
    AOP->>AuditSvc: 3. Intercepta y llama a logEvent()

    rect rgb(255, 240, 240)
        Note over AuditSvc, AuditMSA: Resiliencia Activa
        AuditSvc->>AuditMSA: Llama a POST /audit (Intento 1)
        AuditMSA--xAuditSvc: Falla Timeout (>1000ms)

        AuditSvc->>AuditMSA: @Retry: Intento 2 (Espera 200ms)
        AuditMSA--xAuditSvc: Falla (HTTP 500)

        AuditSvc->>AuditMSA: @Retry: Intento 3
        AuditMSA--xAuditSvc: Falla (HTTP 500)
    end

    Note over AuditSvc: Se agotan los reintentos (o se abre el @CircuitBreaker)
    AuditSvc->>AuditSvc: 4. Ejecuta @Fallback = logEventFallback()
    Note over AuditSvc: SLF4J log: "⚠️ [FALLBACK] Evidencia técnica guardada"
```

## 9. Configuración Necesaria

```properties
# application.properties
# Feature toggle para Redis (puede desactivarse sin apagar el servicio)
security.login.redis.enabled=false
```

## 10. Estructura Actualizada del Proyecto

```text
cja-msa-sc-security/
├── build.gradle.kts (Added quarkus-smallrye-fault-tolerance)
└── src/main/java/cja/msa/sc/security/
    ├── application/
    │   └── service/
    │       └── AuthService.java (Modificado: flag de Redis isRedisEnabled)
    └── infrastructure/
        └── adapters/
            └── out/rest/audit/
                └── AuditService.java (Modificado: @Retry, @Timeout, @CircuitBreaker, @Fallback)
```
