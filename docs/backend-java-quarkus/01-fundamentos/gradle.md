---
id: gradle
title: "Gradle"
description: "Gestores de dependencias en Java, diferencias, ventajas y estructura de archivos con Gradle Kotlin DSL."
sidebar_position: 3
---

# Gradle: El Sistema de Construcción Moderno

**Gradle** es una herramienta de automatización de compilación de código abierto orientada a la flexibilidad y el rendimiento. A diferencia de sus predecesores que usaban el rígido (y verboso) XML, Gradle usa lenguajes expresivos o DSL (Domain Specific Language) basados en Groovy o, más comúnmente en proyectos nuevos, **Kotlin**.

## Beneficios y Por qué resalta 

1. **Rendimiento superior:** Gradle utiliza *Build Cache* y comprobaciones de "up-to-date". Solo recompila y ejecuta las tareas estrictamente necesarias (incremental build/test), ahorrando muchísimo tiempo.
2. **Expresividad:** Escribir un script en Kotlin (`build.gradle.kts`) en lugar de en XML puro, permite que tu archivo de "build" sea código real: puedes tener variables, condicionales `if-else`, ciclos for y usar el autocompletado nativo del IDE.
3. **Daemón de Gradle:** Gradle se queda corriendo en el sistema como un proceso fantasma (daemon), lo que acelera masivamente los *builds* subsecuentes porque evita el tiempo de inicio de la JVM.

---

## La Historia: Ant ➔ Maven ➔ Gradle

### Apache Ant (Early 2000s)
- **Concepto:** Basado puramente en tareas imperativas usando XML. Tú le decías a Ant: *copia esto, ahora compila esto, ahora empaqueta esto*.
- **Problema:** No tenía gestión de dependencias (tenías que bajar los `.jar` a mano y guardarlos en una carpeta `lib/` bajo control de versiones). Scripts extremadamente largos y difíciles de mantener.

### Apache Maven (2004)
- **Concepto:** Revolucionó el ecosistema al introducir **Convención sobre Configuración** (estructura estándar `src/main/java`) y el **Repositorio Central** (gestión automática de dependencias). Usa archivos `pom.xml`.
- **Problema:** El formato XML es estúpido y rígido (no es un lenguaje de programación real). Extender Maven para tareas personalizadas es muy complejo (hay que escribir plugins completos en Java).

### Gradle (Aparición 2008 / Dominio Actual)
Combina lo mejor de dos mundos: la estructura y convenciones de gestión de dependencias estables de Maven, con la tremenda flexibilidad e imperatividad de Ant, pero usando un potente lenguaje de scripting (Groovy/Kotlin) en lugar de XML.

### Beneficios en Términos Numéricos
- En repositorios de gran tamaño, las compilaciones incrementales de **Gradle son de 2 a 10 veces más rápidas que Maven**.
- Google eligió a Gradle como el sistema oficial y exclusivo de build para **Android**.
- Reducción del tamaño del código de Build: Un archivo `pom.xml` en Maven de 200 asfixiantes líneas de texto XML puede traducirse a 30 expresivas líneas en Gradle Kotlin.

---

## Cómo se ve una plantilla de configuración

### MAVEN (`pom.xml` - XML Verboso)
```xml
<dependencies>
    <dependency>
        <groupId>io.quarkus</groupId>
        <artifactId>quarkus-resteasy</artifactId>
        <version>3.9.2</version>
    </dependency>
</dependencies>
```

### GRADLE (`build.gradle.kts` - Kotlin Conciso)
```kotlin
dependencies {
    implementation("io.quarkus:quarkus-resteasy:3.9.2")
}
```

---

## Archivos clave en un proyecto Gradle

Cuando inicializas un proyecto Gradle, verás una serie de archivos. Esto es para qué sirven:

- **`build.gradle` o `build.gradle.kts`**: 
  El cerebro del proyecto. Aquí se definen los repositorios remotos que importaremos, los plugins (ej. plugin de Quarkus o Spring), y el listado entero de dependencias (librerías) que nuestra app utilizará.
  
- **`settings.gradle` o `settings.gradle.kts`**: 
  Fija el nombre real (root name) del proyecto y es vital para configuraciones **Multi-Proyecto** (ejemplo, un monorepo administrando 5 microservicios simultáneamente).

- **`gradle.properties`**: 
  Archivo opcional para definir variables de entorno/configuración que serán consumidas por la build (p.ej.: `quarkusPlatformGroupId=io.quarkus.platform`, variables de caché).

- **`gradlew` (Bash) / `gradlew.bat` (Windows)**:
  El **Gradle Wrapper**. Es un script mágico ejecutable. Garantiza que cualquier miembro del equipo (o servidor CI/CD en la nube) pueda compilar el proyecto **sin tener Gradle instalado localmente**. El wrapper descargará automáticamente la versión de Gradle correcta que exige el proyecto y luego ejecutará el comando. Nunca corras comandos como `gradle build`, corre siempre `./gradlew build`.

- Carpeta **`.gradle/`**:
  Carpeta oculta temporal donde Gradle almacena el caché local de las descargas e historial de builds para la build incremental local. No debe subirse a Git.
