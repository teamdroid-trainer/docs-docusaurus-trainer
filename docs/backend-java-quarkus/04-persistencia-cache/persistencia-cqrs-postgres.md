---
id: persistencia-cqrs-postgres
title: "CQRS con PostgreSQL Reactivo"
description: "Patrón CQRS con Hibernate Reactive Panache para comandos y Vert.x PgPool para consultas en PostgreSQL"
sidebar_position: 1
---

# Persistencia con CQRS en Quarkus Reactivo

Esta sesión se centra en la adopción del patrón de arquitectura **CQRS (Command Query Responsibility Segregation)** para manipular el almacenamiento y recuperación de datos en nuestro microservicio de auditoría usando **Quarkus Hibernate Reactive Panache** y **PostgreSQL**.

---

## 1. ¿Qué es CQRS?

CQRS es un patrón arquitectónico que postula que la estructura de datos utilizada para **leer** información (Queries) debe estar separada de la estructura utilizada para **modificar** información (Commands / Escrituras).

### Flujo Tradicional vs CQRS

```mermaid
graph LR
    subgraph Tradicional ["Arquitectura Tradicional"]
        API_T["API REST"]
        SERV_T["Service Layer"]
        REPO_T["Repository (CRUD)"]
        DB_T[(Base de Datos - Lectura y Escritura)]

        API_T --> SERV_T
        SERV_T --> REPO_T
        REPO_T -->|Read & Write| DB_T
    end

    subgraph Cqrs ["CQRS (Nuestra Implementación)"]
        API_C["API REST"]

        API_C -->|Command| SERV_W["Command Service"]
        API_C -->|Query| SERV_R["Query Service"]

        SERV_W --> REPO_W["Command Repository"]
        SERV_R --> REPO_R["Query Repository"]

        REPO_W -->|Write Insert/Update| DB_M[(Primary DB - Escritura)]
        REPO_R -->|Read Select| DB_S[(Replica DB - Lectura)]
    end
```

### Ventajas de CQRS

1. **Escalamiento Independiente**: Operaciones de lectura (muy frecuentes) se ejecutan en nodos de réplica, mientras las escrituras apuntan al nodo maestro.
2. **Modelos Optimizados**: Puedes diseñar tu modelo de persistencia riguroso para la escritura y usar lecturas veloces directas para consultas.
3. **Seguridad Diferenciada**: En esta sesión, dividimos los roles de base de datos (`primary_user` vs `repl_user`). La lectura no podrá jamas borrar datos accidentalmente.

---

## 2. Visión Arquitectónica de CQRS en el Proyecto

```mermaid
graph TD
    subgraph InboundAPI ["REST API (Inbound Adapters)"]
        C_API[POST /api/v1/audit-logs]
        Q_API[GET /api/v1/audit-logs]
    end

    subgraph CasosDeUso ["Casos de Uso (Application Service)"]
        CMD_UC[CreateAuditLogUseCase]
        QRY_UC[GetAuditLogsQueryUseCase]
    end

    subgraph PuertosOutbound ["Puertos de Persistencia (Outbound Ports)"]
        CMD_PORT[AuditCommandRepository]
        QRY_PORT[AuditQueryRepository]
    end

    subgraph AdaptadoresOutbound ["Adaptadores de Persistencia (Outbound Adapters)"]
        CMD_ADAPT[AuditCommandRepositoryAdapter]
        QRY_ADAPT[AuditQueryRepositoryAdapter]
    end

    subgraph PostgreSQL ["Base de Datos PostgreSQL"]
        DB_MASTER[(Primary Master DB - Puerto 5433 - Usuario primary_user)]
        DB_REPLICA[(Replica Read-Only DB - Puerto 5434 - Usuario repl_user)]
        DB_MASTER -.->|Replicación Asíncrona| DB_REPLICA
    end

    C_API -->|dto a dominio| CMD_UC
    CMD_UC --> CMD_PORT
    CMD_PORT --> CMD_ADAPT
    CMD_ADAPT -->|INSERT| DB_MASTER

    Q_API -->|parámetros| QRY_UC
    QRY_UC --> QRY_PORT
    QRY_PORT --> QRY_ADAPT
    QRY_ADAPT -->|SELECT| DB_REPLICA

    classDef write fill:#ffebee,stroke:#c62828,stroke-width:2px;
    classDef read fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    class C_API,CMD_UC,CMD_PORT,CMD_ADAPT,DB_MASTER write;
    class Q_API,QRY_UC,QRY_PORT,QRY_ADAPT,DB_REPLICA read;
```

---

## 3. Implementación Práctica en Quarkus

```kotlin
// Manejo de Entidades con Modelo Reactive Panache
implementation("io.quarkus:quarkus-hibernate-reactive-panache")

// Driver reactivo de PostgreSQL basado en Vert.x
implementation("io.quarkus:quarkus-reactive-pg-client")
```

### Configuración del DataSource en `application.properties`

```properties
# Estrategia de creación de esquema de base de datos
quarkus.hibernate-orm.database.generation=drop-and-create

# 1. ESCRITURA: Database Writer (Primary)
quarkus.datasource.db-kind=postgresql
quarkus.datasource.reactive.url=${DB_REACTIVE_URL:postgresql://localhost:5433/db_sc_audit}
quarkus.datasource.username=${DB_PRIMARY_USER:primary_user}
quarkus.datasource.password=${DB_PRIMARY_PASSWORD:primary_password}

# 2. LECTURA: Database Reader (Replica)
quarkus.datasource.read.db-kind=postgresql
quarkus.datasource.read.reactive.url=${DB_READ_REACTIVE_URL:postgresql://localhost:5434/db_sc_audit}
quarkus.datasource.read.username=${DB_REPL_USER:repl_user}
quarkus.datasource.read.password=${DB_REPL_PASSWORD:repl_password}
```

> **Decisión Didáctica**: `drop-and-create` es ideal para desarrollo. En producción se debería usar `validate` junto a Flyway o Liquibase.

---

## 4. Separación del Código (Command vs Query)

```mermaid
classDiagram
    class AuditLogService {
        +createAuditLog(AuditLog) Uni~AuditLog~
        +getAuditLogs(...) Uni~List~AuditLog~~
        +streamAllAuditLogs() Multi~AuditLog~
    }

    class AuditCommandRepository {
        <<interface>>
        +save(AuditLog) Uni~AuditLog~
    }

    class AuditQueryRepository {
        <<interface>>
        +findByCriteria(...) Uni~List~AuditLog~~
        +streamAllAuditLogs() Multi~AuditLog~
    }

    class AuditCommandRepositoryAdapter {
        -AuditLogPersistenceMapper mapper
        +save(AuditLog) Uni~AuditLog~
    }

    class AuditQueryRepositoryAdapter {
        -PgPool readClient
        +findByCriteria(...) Uni~List~AuditLog~~
        +streamAllAuditLogs() Multi~AuditLog~
    }

    AuditLogService --> AuditCommandRepository : usa para escribir
    AuditLogService --> AuditQueryRepository : usa para leer
    AuditCommandRepositoryAdapter ..|> AuditCommandRepository : implementa
    AuditQueryRepositoryAdapter ..|> AuditQueryRepository : implementa
```

### Sección Command: `AuditCommandRepositoryAdapter`
En el lado de las escrituras, utilizamos **Hibernate Reactive Panache** (`PanacheRepositoryBase`) para insertar objetos `AuditLogEntity`.
- Garantiza transaccionalidad, mapeos relacionales y validación del modelo.
- Transforma nuestro dominio `AuditLog` a una `AuditLogEntity` antes de interactuar con DB.

### Sección Query: `AuditQueryRepositoryAdapter`
En el lado de las lecturas: **Vert.x PgPool Client** nativo invocando SQL puro.

```java
@ApplicationScoped
public class AuditQueryRepositoryAdapter implements AuditQueryRepository {

    // Se inyecta explícitamente el DataSource secundario (Replica)
    @Inject
    @ReactiveDataSource("read")
    PgPool readClient;

    @Override
    public Uni<List<AuditLog>> findByCriteria(...) {
        // Ejecución de SQL Dinámico raw.
        // Se evita overhead de Reflexión o ORM para maximizar la velocidad de lectura.
    }
}
```

---

## 5. Estadísticas de Rendimiento e Impacto

| Métrica | Ganancia |
|---|---|
| **Incremento de Throughput en Lectura** | +40% a +60% TPS usando Vert.x PgPool vs ORM |
| **Reducción de Latencia de Lectura** | ~30% a 50% menos tiempo de respuesta |
| **Reducción de Bloqueos (Deadlocks)** | +95% reducción al desviar SELECTs a la réplica |
| **Eficiencia de Infraestructura** | ~40% ahorro en costos cloud (réplicas baratas para lectura) |

### Desventajas (Trade-Offs)
- **Consistencia Eventual (Replication Lag):** Demora de ~10ms a 500ms entre escritura y disponibilidad en réplica.
- **Complejidad de Código:** +50% más código (2 interfaces, 2 adaptadores, 2 DataSources).
- **Costo de Infraestructura Base:** +100% hardware mínimo (2 contenedores PostgreSQL).

---

## 6. Evolución Futura de CQRS

```mermaid
graph LR
    subgraph Actual ["Etapa Actual (Soft-CQRS)"]
        APP["App (Command/Query Separados)"] -->|Write| DB1[(Primary DB)]
        APP -->|Read| DB2[(Replica DB)]
        DB1 -.->|Sync Binario| DB2
    end

    subgraph Futura ["Etapa Futura (CQRS + Event Sourcing)"]
        APP2["App Command"] -->|Write Event| KAFKA{{Apache Kafka - Event Broker}}
        KAFKA -.->|Consumo Asincrono| APP3["App Query Proyector"]
        APP3 -->|Update Materialized View| ES[(ElasticSearch MongoDB Lectura Rapida)]
        APP_CLIENT["Clientes / Frontend"] -->|Search| APP3
    end
```
