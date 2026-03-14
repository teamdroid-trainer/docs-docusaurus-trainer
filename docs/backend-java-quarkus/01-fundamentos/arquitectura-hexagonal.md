---
id: arquitectura-hexagonal
title: "Arquitectura Hexagonal / Clean Architecture"
description: "Desacoplar infraestructura tecnológica de las reglas de negocio del dominio en Quarkus."
sidebar_position: 5
---

# Clean Architecture y Arquitectura Hexagonal (Ports & Adapters)

## ¿Qué Son?
Tanto **Clean Architecture** (Robert C. Martin / Uncle Bob) como **Arquitectura Hexagonal / Ports and Adapters** (Alistair Cockburn) son patrones de diseño de software arquitectónico con el mismo objetivo fundamental: **Proteger nuestra Regla de Negocio (Dominio) de la infraestructura externa y los frameworks técnicos.**

En una arquitectura tradicional (la típica *N-Tier* de Model-View-Controller conectada directamente a la Base de Datos), el "MVC" suele ensuciarse: nuestra Lógica termina mezclándose con el Controlador REST y atándose directamente al repositorio de base de datos SQL. Si pasados los años necesitamos reemplazar PostgreSQL por MongoDB o exponer el servicio como un Kafka Listener en vez de un Endpoint HTTP, tendremos que reescribir todo el backend.

## Principios Centrales (Beneficios)

1. **Testabilidad pura:** Al no depender de Quarkus, RESTEasy, JSON, ni Bases de Datos directamente, el verdadero cerebro de la app (el "Dominio") se puede probar mediante Test Unitarios veloces simulando el comportamiento. 
2. **Independencia del Framework / Bases de Datos / UI:** Ninguna capa nuclear conoce la existencia o la estructura de la base de datos externa ni de la plataforma HTTP.
3. **Mantenibilidad en Finanzas/Banca:** Evita problemas crónicos de validaciones regadas, asegurando que un "TransferenciaNegadaException" siempre provenga del corazón inamovible de la aplicación y nunca desde un endpoint desordenado.

## ¿En qué resalta frente a otras Arquitecturas?
`Otras: (Monolito Tradicional N-Capas vs Hexagonal)`

- En **N-Capas**, la base de todas las dependencias arquitectónicas es **La persistencia en Base de Datos** (Data-driven).
  - `Web -> Application -> Domain -> Database Layer`
- En **Hexagonal / Clean Architecture**, se aplica la **Inversión de Dependencias (Domain-driven)**. Las bases de datos, APIs de terceros, APIs Rest Expresan su dependencia obligatoria *HACIA* el dominio.
  - `UI/Web -> Application -> DOMAIN <- Implementación Database`

---

## Composición - Puertos y Adaptadores (Ports & Adapters)

Para mantener aislado el ecosistema, usamos *Puertos y Adaptadores*:
- **Puerto (Interface) (Port):** Es simplemente una regla impuesta en código (Interfase Java puro).
  - *Puerto de Entrada (In Port o UseCase):* Dice "*Alguien* del exterior me puede dar 2 parámetros y ejecutar mi lógica de dominio".
  - *Puerto de Salida (Out Port):* Dice "Para terminar mi regla matemática, necesito que *alguien* del exterior traiga un registro de algún almacén de datos genérico".
- **Adaptador (Adapter):** Implementa el *Puerto* usando Frameworks tecnológicos específicos.

## Ejemplo de Estructura de nuestro proyecto actual `cja-msa-sc-security`
Esta es la integración visible de nosotros usando Java y las carpetas del microservicio que has construido.

```text
src/main/java/cja/msa/sc/security/...
├── domain/                      # 💜 PURO DOMINIO (Cero Frameworks)
│   ├── model/
│   │   └── User.java            # Una clase Pojo Java 100% limpia sin @Entity Hibernate
│   └── exception/ 
│       └── UserBlockedException.java
├── application/                 # 💙 PUERTOS Y CASOS (Orquestador)
│   ├── port.in/
│   │   └── GetUserUseCase.java  # Interface "Puerto IN" (In Port)
│   ├── port.out/
│   │   └── UserRepository.java  # Interface "Puerto OUT" (Out Port). No hereda de Panache.
│   └── service/
│       └── GetUserService.java  # Implementa GetUserUseCase y llama al UserRepository interno
└── infrastructure/              # 🤎 / 💚 ADAPTADORES (Framework Quarkus/Postgres)
    ├── adapters.in.rest/        # ADAPTADOR ENTRANTE
    │   └── UserResource.java    # Controlador REST (@Path) implementa al In Port
    └── adapters.out.persistence/# ADAPTADOR SALIENTE
        ├── JpaUserRepository.java # Implementa al UserRepository usando Hibernate/PostgresQL
        └── entity/UserEntity.java # Clase @Entity base de datos atada a tablas.
```

### Ejemplos en Código de la Mágia de Desacople

#### 1. El Puerto de Salida en Application (Puro)
```java
// Archivo: application/port/out/UserRepository.java
package cja.msa.sc.security.application.port.out;

import cja.msa.sc.security.domain.model.User;
import java.util.Optional;

// Application le dice al universo externo: 
// "Quien me construya la app de Quarkus, debe proveerme obligatoriamente este método para encontrar un User"
public interface UserRepository {
    Optional<User> findByUsername(String username);
}
```

#### 2. El Servicio en Application (Puro - Orquestado y Testeable)
```java
// Archivo: application/service/GetUserService.java
package cja.msa.sc.security.application.service;

import cja.msa.sc.security.application.port.in.GetUserUseCase;
import cja.msa.sc.security.application.port.out.UserRepository;

@ApplicationScoped 
public class GetUserService implements GetUserUseCase {
    private final UserRepository repository; // Se inyecta la interfaz del puerto
    
    // Contructor Injection permite mappear Mockitos en entornos de pruebas limpias
    public GetUserService(UserRepository repository) {
        this.repository = repository;
    }

    @Override
    public User get(String username) {
        return repository.findByUsername(username)
                 .orElseThrow(() -> new UserNotFoundException(username));
    }
}
```

#### 3. El Adaptador Concreto (Sucio - Framework y DB PostgreSQL)
```java
// Archivo: infrastructure/adapters/out/persistence/JpaUserRepository.java
package cja.msa.sc.security.infrastructure.adapters.out.persistence;

import cja.msa.sc.security.application.port.out.UserRepository;
import cja.msa.sc.security.domain.model.User;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped // Bean de Configuración Quarkus
public class JpaUserRepository implements UserRepository { // <- SATISFACE el Out Port
    
    @Inject // Repositorio Hibernate Panache acoplado a SQL real y a UserEntity
    PanacheUserEntityDao panacheDao; 
    
    @Inject // Dependencia adicional de un Mapper intermedio de Infraestructuctura
    EntityToDomainMapper mapper;

    @Override
    public Optional<User> findByUsername(String username) {
        // Ejecutamos tecnología concreta PostgreSQL
        Optional<UserEntity> entity = panacheDao.find("username", username).firstResultOptional();
        // Convertimos un Entity Sucio @Table mapeado de la BD a un Domain puro
        return entity.map(mapper::toDomain);
    }
}
```

Es así como si queremos transitar la implementación de base de datos a **MongoDB** para ahorrar costos en la nube el día de mañana, lo **único** que se borrará es y re-programará será la clase `JpaUserRepository.java` en favor del driver Mongo de infraestructura, mientras que `GetUserService.java` (reglas de negocio) nunca se enterará de nuestro cambio radical tecnológico salvándonos de meses de esfuerzo y refactorización.
