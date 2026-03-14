---
id: especificacion-tecnica
title: "Desarrollo del tema"
description: "Base técnica del microservicio de seguridad: Hexagonal Architecture, Quarkus, Lombok y MapStruct"
sidebar_position: 6
---

# Desarrollo del tema

---

## 1. Propósito de la Sesión

Esta sesión establece la **base técnica** para la creación de un microservicio de seguridad. El objetivo es entender cómo se estructura un microservicio profesional con Quarkus siguiendo **Hexagonal / Clean Architecture**, sin implementar lógica de negocio compleja todavía.

**Qué aprenderás en esta sesión:**
- Cómo organizar capas en una arquitectura hexagonal
- Cómo configurar un proyecto Quarkus desde cero con Gradle Kotlin DSL
- Cómo diseñar endpoints REST bien estructurados
- Cómo separar responsabilidades entre dominio, aplicación e infraestructura
- Cómo usar Lombok y MapStruct para escribir código más limpio

---

## 2. Stack Tecnológico

| Herramienta        | Versión       | Rol                                      |
|--------------------|---------------|------------------------------------------|
| **Java**           | 25 (EA)       | Lenguaje principal                       |
| **Quarkus**        | 3.32.2        | Framework de microservicios              |
| **Gradle**         | 8.x           | Build tool (Kotlin DSL)                  |
| **Lombok**         | 1.18.36       | Reducción de boilerplate Java            |
| **MapStruct**      | 1.6.3         | Mapeo entre capas (DTO ↔ Dominio)        |
| **Jackson**        | (via Quarkus) | Serialización/deserialización JSON       |
| **SmallRye Health**| (via Quarkus) | Health checks para Kubernetes            |
| **RESTEasy**       | (via Quarkus) | Implementación JAX-RS para endpoints REST|

### Prerrequisitos del entorno

```bash
# Verificar versiones instaladas
java -version      # Debe ser Java 25 EA o Java 21 LTS
gradle -version    # Debe ser 8.x
```

> **Nota:** Si no tienes Java 25, puedes usar Java 21 LTS cambiando `VERSION_25` → `VERSION_21` en `build.gradle.kts` y eliminando `--enable-preview`.

---

## 3. Estructura de Carpetas

```
cja-msa-sc-security/
├── build.gradle.kts                    # Build script con todas las dependencias
├── settings.gradle.kts                 # Nombre del proyecto Gradle
├── gradle.properties                   # Versiones de Quarkus (BOM)
├── gradlew / gradlew.bat               # Gradle Wrapper (no requiere Gradle instalado)
└── src/
    └── main/
        ├── java/cja/msa/sc/security/
        │   ├── domain/                         # Núcleo del dominio
        │   │   ├── model/
        │   │   │   ├── User.java               # Entidad principal
        │   │   │   └── enums/
        │   │   │       ├── UserRole.java       # Enum de roles
        │   │   │       └── UserStatus.java     # Enum de estados
        │   │   └── exception/
        │   │       └── UserNotFoundException.java
        │   │
        │   ├── application/                    # Capa de aplicación
        │   │   ├── port/
        │   │   │   ├── in/                     # Lo que la aplicación OFRECE
        │   │   │   │   └── UserQueryUseCase.java
        │   │   │   └── out/                    # Lo que la aplicación NECESITA
        │   │   │       └── UserRepository.java
        │   │   └── service/
        │   │       └── UserQueryService.java   # Implementa UserQueryUseCase
        │   │
        │   ├── infrastructure/                 # Capa de Infraestructura
        │   │   └── adapters/
        │   │       ├── in/
        │   │       │   └── rest/               # Adaptadores de Entrada (Endpoint API)
        │   │       │       ├── dto/
        │   │       │       │   ├── request/
        │   │       │       │   │   └── CreateUserDto.java
        │   │       │       │   └── response/
        │   │       │       │       └── UserResponseDto.java
        │   │       │       ├── mapper/
        │   │       │       │   └── UserRestMapper.java
        │   │       │       ├── exception/
        │   │       │       │   └── GlobalExceptionMapper.java
        │   │       │       ├── HealthResource.java
        │   │       │       └── UserResource.java
        │   │       └── out/
        │   │           └── persistence/        # Adaptadores de Salida (Base de Datos)
        │   │               └── InMemoryUserRepository.java
        │
        └── resources/
            └── application.properties          # Configuración de Quarkus
```

---

## 4. Arquitectura Hexagonal (Ports & Adapters)

### Concepto Central

La arquitectura hexagonal (también llamada **Ports & Adapters**) separa el núcleo de la aplicación del mundo exterior mediante **puertos** (interfaces) y **adaptadores** (implementaciones concretas).

```mermaid
flowchart TD
    %% Estilos Globales
    classDef external fill:transparent,stroke:#888,stroke-dasharray: 5 5;
    classDef entrypoint fill:#43a04733,stroke:#43a047,stroke-width:2px;
    classDef application fill:#1e88e533,stroke:#1e88e5,stroke-width:2px;
    classDef domain fill:#8e24aa33,stroke:#8e24aa,stroke-width:2px;
    classDef infra fill:#fb8c0033,stroke:#fb8c00,stroke-width:2px;

    %% Mundo Exterior
    subgraph External[Mundo Exterior]
        ClientREST([Cliente REST / Web])
    end
    class External external

    %% Entrypoints (Adaptadores de Entrada)
    subgraph InboundAdapters[ENTRYPOINTS - Adaptadores de Entrada]
        API["UserResource<br>HealthResource"]
        ExceptionHandler["GlobalExceptionMapper"]
    end
    class InboundAdapters entrypoint

    %% Hexágono Central
    subgraph Hexagon[HEXÁGONO - Núcleo de la Aplicación]
        direction TB

        %% Capa de Aplicación
        subgraph Application[APPLICATION]
            direction TB
            subgraph Ports[Puertos de Aplicación]
                direction LR
                InPort{"UserQueryUseCase<br>(In Port)"}
                OutPort{"UserRepository<br>(Out Port)"}
            end
            UIS["UserQueryService"]
        end
        class Application application

        %% Capa de Dominio (El corazón)
        subgraph Domain[DOMAIN - Modelos]
            direction LR
            Models[("Entidades & Enums<br>User, UserRole, UserStatus")]
        end
        class Domain domain
    end

    %% Infraestructura (Adaptadores de Salida)
    subgraph OutboundAdapters[INFRASTRUCTURE - Adaptadores de Salida]
        MemMock["InMemoryUserRepository<br>[Sesión 1]"]
        DbReal["PostgresUserRepository<br>[Sesión 3]"]
    end
    class OutboundAdapters infra

    %% Relaciones / Flujo de información
    ClientREST -- "HTTP GET /users" --> API
    API -. "Llama a" .-> InPort

    InPort ==>|"Implementado por"| UIS
    UIS -. "Usa" .-> Models
    UIS -. "Llama a" .-> OutPort

    OutPort ==>|"Implementado por"| MemMock
    OutPort ==>|"Implementará después"| DbReal

    %% Definir flujos invisibles para ordenar
    API ~~~ ExceptionHandler
    MemMock ~~~ DbReal
```

### Regla de Dependencias

> **Las dependencias solo fluyen HACIA el dominio, nunca desde él.**

- `domain/` → no importa nada de otras capas
- `application/` → solo importa `domain/`
- `infrastructure/` → importa `domain/` (para implementar los puertos de salida)
- `entrypoints/` → importa `application/` y `domain/`

---

## 5. Descripción de las Capas

### Domain — El Núcleo

**Qué hay:** Entidades, Value Objects, Enums, Excepciones de dominio.

**Regla de oro:** Esta capa NO importa ningún framework. Si ves `import jakarta.*` o `import io.quarkus.*` dentro de `domain/`, algo está mal. El dominio es puro y sin puertos.

**Archivos clave:**
- `User.java` — Entidad principal. Modela la identidad de un usuario.

### Application — Orquestación

**Qué hay:** Casos de uso (Puertos In), Casos de persistencia (Puertos Out), Servicios de aplicación que implementan esos puertos de entrada.

**Regla de oro:** Orquesta, no implementa lógica de negocio compleja. Llama al dominio y a los puertos de salida, y expone operaciones al exterior a través de puertos de entrada.

**Archivos clave:**
- `UserQueryUseCase.java` — Puerto de entrada: define QUÉ puede hacer el servicio.
- `UserRepository.java` — Puerto de salida: define QUÉ necesita del exterior.
- `UserQueryService.java` — Implementa `UserQueryUseCase`. Consulta usuarios usando el `UserRepository`.

### Infrastructure — Adaptadores

**Qué hay:** Implementaciones de repositorios, clientes HTTP externos, adaptadores de mensajería, Recursos REST JAX-RS, manejadores de excepciones, DTOs y Mappers vinculados a estos frameworks.

**Patrón:** Convierten solicitudes externas hacia puertos de entrada, o implementan puertos de salida llamando a sistemas externos.

**Archivos clave:**
- `InMemoryUserRepository.java` — Implementación mock del puerto `UserRepository`.
- `HealthResource.java` y `UserResource.java` — Exponen endpoints de la API.
- `UserRestMapper.java` — MapStruct: Convierte el dominio hacia DTOs para la respuesta HTTP.
- `CreateUserDto.java`, `UserResponseDto.java` y `GlobalExceptionMapper.java` — Componentes ligados al protocolo REST.

---

## 6. Librerías Utilizadas

### Quarkus (Framework Principal)
Quarkus es un framework de Java diseñado para microservicios cloud-native. A diferencia de Spring Boot, Quarkus está optimizado para:
- **Tiempo de arranque ultra-rápido** (decenas de ms vs segundos)
- **Huella de memoria reducida** (ideal para contenedores)
- **GraalVM Native Image** (compilar a binario nativo sin JVM)

### Lombok
Lombok genera código Java estándar en tiempo de compilación mediante annotations.
```java
// Sin Lombok: 50+ líneas de boilerplate
// Con Lombok:
@Getter @Builder @NoArgsConstructor @AllArgsConstructor
public class User { ... }
```
**Annotations usadas:**
- `@Getter` → genera todos los getters
- `@Builder` → patrón builder fluido
- `@NoArgsConstructor` / `@AllArgsConstructor` → constructores

### MapStruct
MapStruct genera implementaciones de mappers entre objetos en tiempo de compilación.
```java
// MapStruct genera automáticamente esta implementación:
@Mapper(componentModel = "cdi")
public interface UserMapper {
    UserResponseDto toResponseDto(User user);
}
```
**Ventajas sobre reflexión (ModelMapper):**
- 10-100x más rápido (código generado, no reflexión)
- Errores detectados en compilación
- Compatible con Lombok (requiere `lombok-mapstruct-binding`)

### SmallRye Health
Implementa el estándar MicroProfile Health para Kubernetes:
- `GET /q/health` — Estado general
- `GET /q/health/live` — Liveness probe
- `GET /q/health/ready` — Readiness probe

---

## 7. Endpoints Implementados

| Método | Ruta                    | Descripción                              | Respuesta exitosa |
|--------|-------------------------|------------------------------------------|-------------------|
| `GET`  | `/health`               | Estado del microservicio                 | 200 OK            |
| `GET`  | `/api/v1/users`         | Lista todos los usuarios (mock)          | 200 OK            |
| `GET`  | `/api/v1/users/{id}`    | Obtiene un usuario por ID                | 200 OK / 404      |
| `POST` | `/api/v1/users`         | Crea un usuario nuevo (sin validación)   | 201 Created       |

---

## 8. Instrucciones para Ejecutar el Proyecto

### Levantar en modo desarrollo (recomendado)
```bash
# Windows PowerShell (desde la raíz del proyecto)
.\gradlew.bat quarkusDev

# Linux / macOS
./gradlew quarkusDev
```

Quarkus Dev Mode incluye:
- **Live Reload**: los cambios en código se aplican al instante sin reiniciar
- **Dev UI**: interfaz web en `http://localhost:8080/q/dev`
- **Swagger UI**: documentación de la API en `http://localhost:8080/swagger-ui`

### Compilar (sin ejecutar)
```bash
.\gradlew.bat build
```

---

## 9. Cómo Probar los Endpoints

### Usando cURL

```bash
# Health Check
curl -X GET http://localhost:8080/health

# Listar Usuarios
curl -X GET http://localhost:8080/api/v1/users

# Obtener Usuario por ID
curl -X GET http://localhost:8080/api/v1/users/usr-001

# Crear un Usuario
curl -X POST http://localhost:8080/api/v1/users \
     -H "Content-Type: application/json" \
     -d '{"username":"nuevoUsuario","email":"nuevo@test.com","password":"mypassword123","fullName":"Nuevo Estudiante"}'
```

---

## 10. Decisiones Técnicas

### ¿Por qué Quarkus sobre Spring Boot?
- Arranque en < 500ms vs 3-5s de Spring Boot
- Consumo de memoria 40-60% menor
- Compatible con GraalVM Native Image para despliegues ultra-ligeros
- Diseñado desde el inicio para Kubernetes y cloud-native

### ¿Por qué Hexagonal Architecture?
- **Testabilidad:** el dominio se puede probar sin levantar HTTP ni base de datos
- **Evolución:** cambiar de in-memory a PostgreSQL no toca el dominio ni la aplicación
- **Claridad:** cada capa tiene una única responsabilidad bien definida
- **Fintech:** facilita el cumplimiento regulatorio (trazabilidad, auditoría por capas)

### ¿Por qué MapStruct sobre ModelMapper?
- MapStruct genera código en compilación → detección temprana de errores
- 10-100x más rápido en tiempo de ejecución (sin reflexión)
- Explícito: solo mapea lo que defines, más seguro en contextos fintech

---