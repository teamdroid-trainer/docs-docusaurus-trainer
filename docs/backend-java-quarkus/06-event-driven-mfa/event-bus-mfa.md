---
id: event-bus-mfa
title: "Event Bus y MFA"
description: "Arquitectura orientada a eventos (EDA) con Quarkus Event Bus para un flujo MFA completo con orquestación reactiva."
sidebar_position: 2
---

# Event Bus y MFA con Arquitectura Orientada a Eventos

El microservicio `cja-msa-sc-security` incorpora un flujo **MFA (Multi-Factor Authentication)** basado en eventos internos con el **Quarkus Event Bus**. El objetivo no es solo agregar endpoints, sino demostrar cómo desacoplar un proceso compuesto en pasos pequeños que colaboran mediante mensajes.

---

## 1. Radiografía Visual: La Orquestación por Etapas

El flujo MFA se divide en dos operaciones (Start y Verify), cada una compuesta por una cadena de eventos encadenados a través del Event Bus:

```mermaid
flowchart TD
    A[Credenciales recibidas] --> B[credentials.validate]
    B --> C[policy.evaluate]
    C --> D[otp.generate]
    D --> E[challenge.generate]
    E --> F[Cliente recibe challengeId]
    F --> G[challenge.load]
    G --> H[otp.verify]
    H --> I[login.complete]
    I --> J[Cliente recibe token final]
```

:::info Nueva dependencia en sesión 6
```kotlin title="build.gradle.kts"
implementation("io.quarkus:quarkus-vertx")
```
:::

---

## 2. ¿Por qué Eventos?

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="eda" label="Llamadas vs Eventos">

**Flujo tradicional (Acoplado):**
```mermaid
flowchart LR
    A[Resource] --> B[Service A]
    B --> C[Service B]
    C --> D[Service C]
```
Cada paso conoce al siguiente. Cambiar uno puede romper la cadena.

**Flujo orientado a eventos (Desacoplado):**
```mermaid
flowchart LR
    A[Resource] --> EB[(Event Bus)]
    EB --> B[credentials.validate]
    EB --> C[policy.evaluate]
    EB --> D[otp.generate]
    EB --> E[challenge.generate]
```
El emisor conoce una **dirección**, no una implementación concreta. Cada paso evoluciona de forma independiente.

:::tip Las tres ideas clave del EDA
1. Un sistema fuertemente acoplado funciona hasta que el cambio llega. Un sistema orientado a eventos está pensado para el cambio.
2. Donde antes había dependencias directas, ahora hay una **conversación entre componentes**.
3. El verdadero valor de los eventos no es la asincronía; es el **desacoplamiento semántico**.
:::

</TabItem>
<TabItem value="patterns" label="Request/Reply vs Pub/Sub">

**Request/Reply** — El emisor espera una respuesta:
```mermaid
sequenceDiagram
    participant R as Resource
    participant EB as Event Bus
    participant C as Consumer
    R->>EB: request(address, payload)
    EB->>C: mensaje
    C-->>EB: respuesta
    EB-->>R: reply
```

**Publish/Subscribe** — El emisor difunde sin esperar respuesta (ideal para auditoría, notificaciones):
```mermaid
sequenceDiagram
    participant P as Productor
    participant EB as Event Bus
    participant A as Subscriptor A
    participant B as Subscriptor B
    P->>EB: publish(evento)
    EB-->>A: copia del evento
    EB-->>B: copia del evento
```

En esta sesión se utiliza **Request/Reply** para encadenar el flujo MFA con `eventBus.request(...)`.

</TabItem>
<TabItem value="concepts" label="Conceptos Quarkus">

Quarkus expone el Event Bus de Vert.x con una API sencilla:

| Concepto | Rol |
|:---|:---|
| `EventBus.request(address, payload)` | Envía mensaje y espera respuesta |
| `@ConsumeEvent("address")` | Registra un consumer para esa dirección |
| `@ConsumeEvent(blocking = true)` | Ejecuta el consumer en worker thread (para I/O) |
| `Uni<T>` | Modela la respuesta asincrónica |

</TabItem>
</Tabs>

---

## 3. El Contexto Central: `MfaEventContext`

Este objeto **viaja de un evento al siguiente**, acumulando el estado del flujo completo:

```java title="MfaEventContext.java"
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MfaEventContext {
    private String username;          // Entrada del flujo /start
    private String password;          // Entrada del flujo /start
    private String challengeId;       // Identificador del reto MFA
    private String otpCode;           // OTP generado internamente
    private String otpCodeReceived;   // OTP enviado por el cliente en /verify
    private TokenResponseDto token;   // Token JWT de Keycloak (pre-autenticado)
    private MfaStatus status;         // Estado funcional del proceso
    @Builder.Default
    private boolean mfaRequired = true;
}
```

---

## 4. Los Dos Flujos MFA

<Tabs>
<TabItem value="start" label="POST /mfa/start">

Recibe credenciales, valida al usuario, decide si requiere MFA, genera OTP y crea el challenge.

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant R as MfaResource
    participant EB as Event Bus
    participant V as credentials.validate
    participant P as policy.evaluate
    participant O as otp.generate
    participant G as challenge.generate
    participant S as challengeStore

    C->>R: POST /mfa/start {username, password}
    R->>EB: request(credentials.validate, ctx)
    EB->>V: ctx
    V->>V: authenticate via Keycloak
    V-->>EB: ctx + token
    EB->>P: ctx
    P-->>EB: ctx + mfaRequired
    EB->>O: ctx
    O-->>EB: ctx + otpCode
    EB->>G: ctx
    G->>S: guardar ctx por challengeId
    G-->>EB: ctx + challengeId
    EB-->>R: ctx final
    R-->>C: 200 {challengeId, PENDING_MFA}
```

**Descripción de cada evento:**

| Evento | Tipo | Responsabilidad |
|:---|:---|:---|
| `credentials.validate` | **Bloqueante** | Autentica contra Keycloak, guarda token en contexto |
| `policy.evaluate` | No bloqueante | Decide si el usuario necesita MFA |
| `otp.generate` | No bloqueante | Genera OTP de 6 dígitos si `mfaRequired=true` |
| `challenge.generate` | No bloqueante | Crea challengeId y persiste contexto en memoria |

:::caution Consumer Bloqueante
`credentials.validate` usa `@ConsumeEvent(blocking = true)` porque invoca una llamada externa a Keycloak. Sin `blocking = true`, **bloquearía el Netty Event Loop** y degradaría el rendimiento del servidor.
:::

</TabItem>
<TabItem value="verify" label="POST /mfa/verify">

Recibe el `challengeId` y el OTP, carga el contexto, valida el código y retorna el token final.

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant R as MfaResource
    participant EB as Event Bus
    participant L as challenge.load
    participant V as otp.verify
    participant F as login.complete
    participant S as challengeStore

    C->>R: POST /mfa/verify {challengeId, otpCode}
    R->>EB: request(challenge.load, ctx)
    EB->>L: ctx
    L->>S: leer contexto por challengeId
    L-->>EB: ctx recuperado + otpCodeReceived
    EB->>V: ctx
    V-->>EB: ctx validado (AUTHENTICATED)
    EB->>F: ctx
    F->>S: eliminar challengeId
    F-->>EB: TokenResponseDto
    EB-->>R: token
    R-->>C: 200 {access_token, expires_in}
```

**Descripción de cada evento:**

| Evento | Tipo | Responsabilidad |
|:---|:---|:---|
| `challenge.load` | **Bloqueante** | Recupera contexto de challengeStore, copia otpCodeReceived |
| `otp.verify` | No bloqueante | Compara OTP generado vs OTP recibido |
| `login.complete` | No bloqueante | Retorna token, elimina challenge para evitar reutilización |

</TabItem>
</Tabs>

---

## 5. Manejo de Errores: `ReplyException`

Cuando un consumer lanza una excepción dentro de `@ConsumeEvent`, Vert.x la envuelve en una `ReplyException` antes de propagarla a la capa REST. Por eso `session6-dev` extiende el `GlobalExceptionMapper`:

```mermaid
flowchart LR
    A[Consumer - excepción] --> B[Event Bus]
    B -->|envuelve en ReplyException| C[MfaResource falla]
    C --> D[GlobalExceptionMapper]
    D --> E[HTTP JSON error]
```

```java title="GlobalExceptionMapper.java (extendido)"
if (ex instanceof ReplyException replyEx) {
    // Inspecciona el mensaje del ReplyException
    // Devuelve una respuesta JSON consistente al cliente
}
```

---

## 6. Casos de Uso Reales del EDA

Esta arquitectura aporta mayor valor cuando una operación es una **cadena de verificaciones**, no una sola acción. En el sector financiero esto es especialmente relevante:

<Tabs>
<TabItem value="mfa" label="Autenticación y Riesgo">

```mermaid
flowchart LR
    A[Login recibido] --> B[Validar credenciales]
    B --> C[Evaluar riesgo]
    C -->|Bajo| D[Sesión aprobada]
    C -->|Alto| E[Solicitar OTP]
    E --> F[Verificar OTP]
    F --> G[Sesión aprobada o rechazada]
```

</TabItem>
<TabItem value="transfers" label="Transferencias Bancarias">

```mermaid
flowchart LR
    A[Transferencia recibida] --> B[Validar saldo]
    B --> C[Validar límites]
    C --> D[Evaluar riesgo]
    D --> E{Monto alto?}
    E -->|Sí| F[Solicitar aprobación]
    E -->|No| G[Autorizar]
    F --> G
    G --> H[Registrar y ejecutar]
```

</TabItem>
<TabItem value="notifications" label="Notificaciones Regulatorias">

```mermaid
flowchart LR
    A[Operación confirmada] --> EB[(Evento)]
    EB --> B[SMS]
    EB --> C[Email]
    EB --> D[Push]
    EB --> E[Reporte regulatorio]
```

El mismo evento activa múltiples consumidores de forma independiente. Pub/Sub en acción.

</TabItem>
</Tabs>

---

## 7. Estructura de Archivos

**Nuevos en `session6-dev`:**
```text
cja-msa-sc-security/.../
├── MfaResource.java             <- REST: POST /mfa/start y /mfa/verify
├── MfaEventConsumers.java       <- Orquestador: 7 @ConsumeEvent
├── MfaEventContext.java         <- Contexto compartido entre eventos
├── MfaChallenge.java            <- Pieza de dominio
├── MfaStatus.java               <- Enum de estados
└── dto/ (MfaStartRequestDto, MfaVerifyRequestDto, MfaStartResponseDto...)
```

**Modificados:**
- `build.gradle.kts` — Añadida `quarkus-vertx`
- `GlobalExceptionMapper.java` — Soporte para `ReplyException`

---

## 8. Limitaciones del Ejemplo y Evolución Futura

:::caution Limitaciones intencionales de esta demo
- **Sin persistencia distribuida**: `challengeStore` vive en memoria → no funciona con múltiples réplicas (futuro: **Redis**).
- **Sin expiración real de OTP**: el challenge no expira automáticamente.
- **Sin delivery real**: el OTP se envía por logs, no por SMS/Email.
:::

> **Hoy** mensajes dentro del mismo proceso → **Mañana** esos eventos pueden salir a **Apache Kafka**.
> **Hoy** `challengeStore` en memoria → **Mañana** `challengeStore` en **Redis**.
> **Hoy** orquestación directa → **Mañana** un **Saga / Process Manager**.

La lección clave: el **contrato por mensaje ya existe**. Cambiar el transporte después es mucho más fácil cuando el flujo ya está partido en eventos.
