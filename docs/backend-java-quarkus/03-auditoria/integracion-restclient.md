---
id: integracion-restclient
title: "Integración Security → Audit vía RestClient"
description: "Comunicación síncrona entre microservicios con MicroProfile RestClient y patrón AOP para auditoría"
sidebar_position: 2
---

# Sesión 3 — Integración Security → Audit vía RestClient

## 1. Objetivo de la Sesión

Implementar la comunicación síncrona vía **MicroProfile RestClient** desde el microservicio `cja-msa-sc-security` hacia el microservicio `cja-msa-sc-audit` para registrar eventos de auditoría (login exitoso, login fallido, logout, acceso denegado). El objetivo es diseñar una integración limpia, didáctica, desacoplada y fácil de evolucionar.

## 2. Alcance Implementado

- **Integración vía RestClient**: Configuración de un cliente REST declarativo para invocar el endpoint de auditoría.
- **Envío de Auditoría**: Integración en los casos de uso de negocio relevantes (login, logout, validación de roles).
- **Centralización**: Creación de un componente `AuditService` de infraestructura para evitar duplicación de código.
- **Programación Orientada a Aspectos (AOP)**: Implementación de una anotación `@Auditable` y un interceptor CDI para aislar la lógica transversal de auditoría de la lógica de negocio.

## 3. Dependencias Utilizadas

```kotlin
// MicroProfile REST Client con Jackson (Para consumir APIs externas)
implementation("io.quarkus:quarkus-rest-client-jackson")
```

## 4. DTOs y Contratos Utilizados

Se define el **`AuditLogRequestDto`** que representa el body esperado por el servicio `cja-msa-sc-audit`:

```java
@Data
@Builder
public class AuditLogRequestDto {
    private String functionality;
    private String username;
    private String eventType;
    private String requestPayload;
    private String responsePayload;
    private String eventResult;
    private String detail;
    private String originService;
}
```

## 5. Configuración del Cliente REST

```java
@RegisterRestClient(configKey = "audit-api")
@Path("/api/v1/audit-logs")
public interface AuditRestClient {

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    void sendAuditLog(AuditLogRequestDto request);
}
```

Configuración en `application.properties`:
```properties
quarkus.rest-client.audit-api.url=http://localhost:8081
```

## 6. Servicio de Auditoría Centralizado

Para estructurar la llamada sin llenar de DTOs la lógica de negocio, se crea un componente que abstraiga la creación de eventos:

```java
@ApplicationScoped
public class AuditService {

    @RestClient
    AuditRestClient auditRestClient;

    @ConfigProperty(name = "quarkus.application.name", defaultValue = "cja-msa-sc-security")
    String applicationName;

    public void logEvent(String username, String functionality, String eventType,
                         String result, String detail, String requestPayload, String responsePayload) {
        try {
            AuditLogRequestDto auditData = AuditLogRequestDto.builder()
                .functionality(functionality)
                .username(username)
                .eventType(eventType)
                .requestPayload(requestPayload)
                .responsePayload(responsePayload)
                .eventResult(result)
                .detail(detail)
                .originService(applicationName)
                .build();

            auditRestClient.sendAuditLog(auditData);
        } catch(Exception e) {
            // "Fire and forget" básico. No bloqueamos al usuario si la auditoría falla.
            System.err.println("Failed to send audit log in Security MSA: " + e.getMessage());
        }
    }
}
```

## 7. AOP / Interceptores — La Anotación `@Auditable`

Para mantener los controladores REST completamente limpios de la lógica de auditoría (que es transversal), creamos un **Interceptor CDI**:

**La Anotación:**
```java
@InterceptorBinding
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {
    @jakarta.enterprise.util.Nonbinding
    String functionality() default "SECURITY";

    @jakarta.enterprise.util.Nonbinding
    String eventType() default "GENERIC_EVENT";
}
```

> **¿Por qué usamos `@Nonbinding`?**
> En CDI, cuando un Interceptor está asociado a una anotación con atributos, el contenedor busca una coincidencia **exacta** de todos los valores definidos. Al marcar los atributos con `@Nonbinding`, le indicamos a Quarkus que intercepte **todos** los métodos decorados con `@Auditable`, ignorando el valor específico pasado a cada atributo.

**Uso en el Resource:**
```java
@POST
@Path("/login")
@Auditable(functionality = "SECURITY_LOGIN", eventType = "LOGIN_ATTEMPT")
public Response login(LoginRequestDto loginRequest) {
    // Si la autenticación pasa se dispara LOGIN_SUCCESS interceptado.
    // Si lanza una Exception, el interceptor captura ERROR / EVENT_DENIED
    return Response.ok(authService.login(loginRequest)).build();
}
```

## 8. Limitaciones Intencionales de esta Sesión

- **Resiliencia Básica:** No se agregaron Circuit Breakers, Fallbacks o colas de mensajería. La llamada es síncrona estilo "fire and forget".
- **Gestión de Errores Compleja:** En un entorno bancario real, si la auditoría falla, podría encolarse localmente para reintentos. Esto se omite para mantener la sesión didáctica.

## 9. Estructura del Proyecto (Archivos modificados y nuevos)

```text
cja-msa-sc-security/
├── build.gradle.kts                                [Se verificó quarkus-rest-client-jackson]
└── src/
    └── main/
        ├── java/cja/msa/sc/security/
        │   └── infrastructure/
        │       ├── adapters/
        │       │   ├── in/rest/
        │       │   │   ├── AuthResource.java       [MODIFICADO: Mapeos @Auditable]
        │       │   │   └── UserResource.java       [MODIFICADO: Mapeos @Auditable]
        │       │   └── out/rest/audit/             [NUEVO DIRECTORIO]
        │       │       ├── AuditRestClient.java    [NUEVO: Contrato MicroProfile RestClient]
        │       │       ├── AuditService.java       [NUEVO: Servicio unificador y Fire-And-Forget]
        │       │       └── dto/
        │       │           └── AuditLogRequestDto.java [NUEVO]
        │       └── aop/                            [NUEVO DIRECTORIO]
        │           ├── Auditable.java              [NUEVO: Anotación con @Nonbinding]
        │           └── AuditInterceptor.java       [NUEVO: Extractor de payloads y usuario]
        └── resources/
            └── application.properties              [MODIFICADO: URL audit-api y puerto 8082]
```

## 10. Próximos Pasos Sugeridos

1. **Asincronismo:** Migrar REST Client a un modelo reactivo (`@RestClient` devolviendo `Uni<Void>`).
2. **Identidad del Usuario:** Extraer el `username` mediante el contexto de seguridad de Quarkus (`SecurityIdentity`).
3. **Resiliencia Avanzada:** Implementar Fault Tolerance con `@Retry` y `@Fallback` (ver Sesión 5).
