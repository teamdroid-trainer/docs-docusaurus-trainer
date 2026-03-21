# Sesión 07: Introducción a Kafka como Adaptador de Salida (Producer)

En esta sesión se introduce el uso de Apache Kafka para la publicación de eventos de auditoría de seguridad de forma asíncrona y desacoplada, utilizando **SmallRye Reactive Messaging** en Quarkus y aplicando el patrón Port & Adapters (Clean Architecture).

---

## 1. Concepto: Dead Letter Queue (DLQ)

Aunque en el lado del *Productor (Security Service)* la publicación de un mensaje en Kafka representa un escenario "Fire-and-forget", es importante prepararnos conceptualmente para fallos.

**Dead Letter Queue (DLQ)** es un tópico especializado administrado principalmente por el **Consumidor** (en este caso será el Audit Service en futuras sesiones). Sirve como un buzón de almacenamiento para los **mensajes envenenados** (mensajes mal formados, con errores de negocio irreparables) para que no bloqueen indefinidamente nuestra cola principal.

### Reflexión de DLQ en el Productor
Si Kafka no está disponible, el Productor puede intentar reintentos a través del cliente Kafka subyacente (`retries=MAX`), pero si todos fallan, el evento suele desecharse o guardarse en logs. En nuestro adaptador, dejamos constancia (vía Log) de que si este evento falla al enviarse o si el consumidor detecta que es inválido, terminará derivando a `audit-events-dlq`.

---

## 2. Arquitectura: API REST vs Kafka

Hemos introducido una interfaz de Dominio/Aplicación llamada `AuditPublisher`. Esto permite que el caso de uso (`AuditInterceptor`) no sepa si su evento viaja por HTTP o por un Bróker de mensajería.

1. **`ApiAuditPublisher`**: Sigue utilizando el cliente REST original. Está protegido con las políticas de tolerancia a fallos (`@Retry`, `@Timeout`).
2. **`KafkaAuditPublisher`**: Utiliza un canal reactivo ligado a Kafka. La velocidad aumenta al ser un encolado nativo, pero sacrifica la garantía inmediata (Síncrona) de que el receptor guardó el dato con éxito.

### Inyección Dinámica y Compatibilidad con GraalVM

Para que `@LookupIfProperty` funcione correctamente y no arroje `AmbiguousResolutionException` al compilar la aplicación, el `AuditInterceptor` inyecta la interfaz a través de `Instance<AuditPublisher>`. Esto retrasa la resolución del bean elegido hasta el tiempo de ejecución (runtime).

> **Ventaja GraalVM:** Esta estrategia es 100% compatible con compilación nativa (Native Image). Ambos adaptadores se compilan en el binario, permitiendo usar un único ejecutable que cambia su comportamiento en runtime mediante variables de entorno como `audit.mode=kafka` o `audit.mode=api` (un Feature Flag real en binario nativo).

### Diagrama General

```mermaid
flowchart LR
    Client[Cliente REST] --> Resource[UserResource/MfaResource]
    
    subgraph AOP [Interceptor]
        Interceptor[AuditInterceptor]
    end
    
    Resource -. "@Auditable" .-> Interceptor
    
    subgraph Dominio / Core
        Model[AuditEvent]
        Port[AuditPublisher]
    end
    
    Interceptor -->|crea| Model
    Interceptor -->|publish| Port

    subgraph Kafka [Infrastructure: Kafka Adapter]
        KafkaAdapter[KafkaAuditPublisher]
        KafkaAdapter --> |"audit-out"| Broker[(Kafka Broker)]
    end
    
    subgraph API [Infrastructure: REST Adapter]
        RestAdapter[ApiAuditPublisher]
        RestAdapter --> |HTTP Request| AuditClient[AuditRestClient]
        AuditClient --> SC_AUDIT[[Microservicio cja-msa-sc-audit]]
    end
    
    Port <|-- KafkaAdapter
    Port <|-- RestAdapter
```

> **NOTA:** La inyección de uno u otro adaptador se controla mediante el property `audit.mode=api` ó `audit.mode=kafka`.

---

## 3. Estructura de Proyecto Actualizada

```text
src/main/java/cja/msa/sc/security/
 ├── application/
 │    └── port/out/
 │         └── AuditPublisher.java         <-- [NUEVO] Puerto para invertir dependencias.
 ├── domain/model/
 │    └── AuditEvent.java                  <-- [NUEVO] Representación base del evento.
 ├── infrastructure/
 │    ├── adapters/out/
 │    │    ├── rest/audit/
 │    │    │    ├── ApiAuditPublisher.java <-- [REFAC] Antigua AuditService.
 │    │    │    └── AuditRestClient.java
 │    │    └── kafka/
 │    │         ├── mapper/
 │    │         │    └── KafkaAuditMapper.java   <-- [NUEVO] Clone y enriquecimiento.
 │    │         └── KafkaAuditPublisher.java <-- [NUEVO] Adaptador de Kafka.
 │    └── aop/
 │         ├── AuditInterceptor.java       <-- [REFAC] Ahora inyecta AuditPublisher.
 │         └── Auditable.java
```

---

## 4. Dependencias Añadidas

Se incorpora al archivo `build.gradle.kts`:

```kotlin
// ── Kafka (Reactive Messaging) ───────────────────────────
implementation("io.quarkus:quarkus-smallrye-reactive-messaging-kafka")
```

---

## 5. Configuración del Productor en `application.properties`

Hemos modificado el archivo properties para agregar un "feature flag" y vincular el canal `audit-out` al tópico de Kafka que se expone localmente (puerto `9092`).

```properties
# Selector (Feature Flag): 'api' o 'kafka'
audit.mode=kafka

# --- KAFKA PRODUCER (audit-out) ---
mp.messaging.outgoing.audit-out.connector=smallrye-kafka
mp.messaging.outgoing.audit-out.topic=audit-events
mp.messaging.outgoing.audit-out.value.serializer=io.quarkus.kafka.client.serialization.ObjectMapperSerializer

# --- KAFKA PRODUCER (audit-dlq-out) ---
mp.messaging.outgoing.audit-dlq-out.connector=smallrye-kafka
mp.messaging.outgoing.audit-dlq-out.topic=audit-events-dlq
mp.messaging.outgoing.audit-dlq-out.value.serializer=io.quarkus.kafka.client.serialization.ObjectMapperSerializer
mp.messaging.outgoing.audit-dlq-out.retries=3

# --- RESILIENCIA (Retries del Productor) ---
# Kafka maneja los reintentos nativamente sin bloquear el hilo
mp.messaging.outgoing.audit-out.retries=3
# Tiempo de espera entre cada intento
mp.messaging.outgoing.audit-out.retry-backoff-ms=1000
# El broker solo confirmará éxito cuando todas las réplicas lo hayan guardado
mp.messaging.outgoing.audit-out.acks=all
```

# --- KAFKA CONNECTION ---
# Evita que Quarkus Dev Services levante un contenedor Testcontainer aleatorio
kafka.bootstrap.servers=${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
```

> **Omitiendo Quarkus Dev Services:** Al especificar explícitamente `kafka.bootstrap.servers`, Quarkus se conecta a la red definida (por ejemplo, el nodo de tu docker-compose en el puerto local 9092) en lugar de arrancar su propio clúster de pruebas efímero (Testcontainers).
> 
> **Nota de Codificación (OpenAPI):** Al activar Kafka, SmallRye OpenAPI documentará la integración inyectando AsyncAPI. Si el archivo `application.properties` posee tildes corruptas (ej. bytes inválidos tras editarse en terminal equivocada), la agregación de dependencias de AsyncAPI forzará una regeneración total del documento, incrustando bytes corruptos (0x83) en el YAML y causando que Jackson falle irremediablemente al arrancar la aplicación (`JacksonYAMLParseException`).

> **Ejemplo Didáctico de Reintentos:** Si detienes temporalmente el contenedor de Kafka (`docker stop kafka`), al disparar un evento verás que la aplicación **no arroja error inmediatamente**. El cliente de Kafka internamente intentará reconectarse y re-enviar el evento hasta 3 veces (pausando 1 segundo entre intentos) antes de rendirse y mandarlo a la función de fallo del `whenComplete` o arrojar la excepción local.


---

## 6. Código del Productor y Mapper

Para mantener la inmutabilidad y la limpieza del adaptador, utilizamos **MapStruct** para crear un intermediario (`KafkaAuditMapper`) encargado de clonar el `AuditEvent` que produce el interceptor, añadiéndole la procedencia (el nombre de nuestra aplicación) antes de inyectarlo a Kafka.

### 6.1. KafkaAuditMapper.java
```java
package cja.msa.sc.security.infrastructure.adapters.out.kafka.mapper;

import cja.msa.sc.security.domain.model.AuditEvent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.CDI)
public interface KafkaAuditMapper {

    @Mapping(target = "originService", source = "originService")
    AuditEvent cloneWithOriginService(AuditEvent event, String originService);
}
```

### 6.2. KafkaAuditPublisher.java
Este adaptador delega el enriquecimiento del campo al mapper, y utiliza `@Channel` uniéndolo con las primitivas de SmallRye Messaging.

```java
package cja.msa.sc.security.infrastructure.adapters.out.kafka;

import cja.msa.sc.security.application.port.out.AuditPublisher;
import cja.msa.sc.security.domain.model.AuditEvent;
import cja.msa.sc.security.infrastructure.adapters.out.kafka.mapper.KafkaAuditMapper;
import io.quarkus.arc.lookup.LookupIfProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;

@ApplicationScoped
@LookupIfProperty(name = "audit.mode", stringValue = "kafka")
@Slf4j
public class KafkaAuditPublisher implements AuditPublisher {

    @Inject
    @Channel("audit-out")
    Emitter<AuditEvent> emitter;

    @Inject
    @Channel("audit-dlq-out")
    Emitter<AuditEvent> dlqEmitter;

    @ConfigProperty(name = "quarkus.application.name", defaultValue = "cja-msa-sc-security")
    String applicationName;

    @Inject
    KafkaAuditMapper auditMapper;

    @Override
    public void publish(AuditEvent event) {
        AuditEvent enrichedEvent = auditMapper.cloneWithOriginService(event, applicationName + "-kafka");

        log.info("=================================================================================");
        log.info("[KAFKA PUBLISHER] Preparando envío de evento de auditoría para usuario: {}", enrichedEvent.username());
        
        try {
            emitter.send(enrichedEvent).whenComplete((success, failure) -> {
                if (failure != null) {
                    log.error("[KAFKA PUBLISHER] Error al enviar el evento audit a Kafka. Derivando al DLQ...", failure);
                    sendToDlq(enrichedEvent);
                } else {
                    log.info("[KAFKA PUBLISHER] Evento enviado exitosamente al tópico principal 'audit-events'.");
                }
            });
        } catch (Exception e) {
            log.error("[KAFKA PUBLISHER] Excepción inesperada enviando evento al tópico principal. Derivando al DLQ...", e);
            sendToDlq(enrichedEvent);
        }
        log.info("=================================================================================");
    }

    private void sendToDlq(AuditEvent event) {
        try {
            dlqEmitter.send(event).whenComplete((success, failure) -> {
                if (failure != null) {
                    log.error("[DLQ CRÍTICO] Imposible escribir incluso en el tópico DLQ. Guardando localmente: {}", event, failure);
                } else {
                    log.warn("[DLQ] Evento encolado exitosamente en 'audit-events-dlq' para inspección u operativas futuras.");
                }
            });
        } catch (Exception e) {
             log.error("[DLQ CRÍTICO] Excepción enviando al DLQ: {}", event, e);
        }
    }
}
```

---

## 7. Paso a Paso para probar localmente

1. Configurar la bandera a `audit.mode=kafka` en `application.properties`.
2. Asegurar que el clúster local esté arriba desde el subdirectorio de Kafka:
   ```bash
   cd containers/kafka
   docker compose up -d
   ```
3. Ejecutar el proyecto de seguridad: `./gradlew quarkusDev`.
4. Trigger en la API: lanzar cualquier petición a `POST /api/v1/users/login` o alguna función anotada con `@Auditable`.
5. Comprobar que en consola aparezca:
   `[KAFKA PUBLISHER] Evento enviado exitosamente al tópico 'audit-events'`
6. Entrar a [Kafka UI en el puerto 8091](http://localhost:8091), seleccionar `cluster-local`, tópicos, e inspeccionar que en `audit-events` los datos JSON coincidan.
