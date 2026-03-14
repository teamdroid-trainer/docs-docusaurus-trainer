---
id: java
title: "Java"
description: "Características, poderes y la evolución de las versiones más relevantes: 8, 11, 17, 21 y 25."
sidebar_position: 1
---

# Java: Poderes, Uso y Evolución

Java es uno de los lenguajes de programación más utilizados y probados en el mundo empresarial. Su lema **"Escribe una vez, ejecuta en cualquier lugar"** (WORA) lo convirtió en el rey del backend a nivel mundial.

## Superpoderes de Java

- **Estabilidad y Retrocompatibilidad:** El código escrito hace 20 años sigue ejecutándose en las máquinas virtuales modernas.
- **Rendimiento cercano al metal (C/C++):** Gracias al compilador JIT (Just-In-Time) y optimizaciones en caliente, Java es extremadamente rápido para cargas de trabajo prolongadas (servidores).
- **Ecosistema Inmenso:** Posee la colección de librerías de código abierto más grande del mundo (Maven Central) para resolver prácticamente cualquier problema.
- **Gestión automática de memoria (Garbage Collector):** Evita la mayoría de los errores de fugas de memoria típicos de lenguajes de bajo nivel.
- **Multihilo de clase mundial:** Con el nuevo "Project Loom" (Virtual Threads), Java puede manejar millones de hilos de ejecución de manera concurrente con un costo mínimo de memoria.

## ¿Dónde se usa más?

Java domina en:
1. **Sistemas Financieros (Fintech y Bancos):** Por su seguridad, rigidez tipada y estabilidad.
2. **Backend Empresarial:** Microservicios, APIs robustas y arquitecturas distribuidas de alta carga.
3. **Big Data:** Herramientas como Hadoop, Apache Spark y Kafka están escritas en Java o basados en la JVM (Scala).
4. **Android:** Fue el lenguaje nativo original para Android (y sigue siendo ampliamente soportado junto a Kotlin).

---

## Evolución y Diferencias entre Versiones

Desde Java 9, la cadencia de lanzamiento cambió a una nueva versión cada 6 meses, con versiones **LTS (Long-Term Support)** enfocadas en empresas.

### Java 8 (2014) - La Gran Revolución
- **El salto a lo funcional:** Introdujo **Lambdas** (`() -> {}`) y la API **Streams** para procesamiento de datos declarativo.
- **Optional:** Para lidiar con el infame `NullPointerException`.
- *Uso:* Aún hoy, muchos sistemas "legacy" siguen corriendo en Java 8.

### Java 11 (2018) - La primera LTS moderna
- **var:** Inferencia de tipos en variables locales (`var name = "Juan";`).
- **HTTP Client moderno:** API reactiva y estándar para hacer llamadas HTTP/2.
- **Nuevos métodos para Strings** como `isBlank()`, `lines()`.

### Java 17 (2021) - El estándar actual del mercado
- **Records:** Clases inmutables para transportar datos (Data Transfer Objects) eliminando el *boilerplate* (como Lombok parcialmente).
- **Text Blocks:** Strings multilínea usando `"""` (adiós a concatenar con `+`).
- **Pattern Matching (básico):** Simplificación del operador `instanceof`.
- **Sealed Classes:** Clases que restringen quién puede heredar de ellas.

### Java 21 (2023) - La Nueva Revolución LTS
- **Virtual Threads (Project Loom):** Hilos extremadamente ligeros. Permite tener *millones* de hilos en vez de miles, revolucionando servidores web (Quarkus y Tomcat escalan de manera absurda sin programación reactiva compleja).
- **Pattern Matching para Switch:** Los switches ahora pueden evaluar tipos de objetos, no solo valores primitivos, y desestructurar *Records*.
- **Sequenced Collections:** Interfaces claras para colecciones con un orden definido (`getFirst()`, `getLast()`).

### Java 25 (EA - Acceso Temprano / LTS Futura)
- **Mejoras en Pattern Matching:** Aún más expresivo.
- **Valhalla (Avance):** Tipos de valor para acercar el rendimiento de memoria al de lenguajes como C++ (evitando punteros innecesarios a objetos pequeños).
- **Foreign Function & Memory API (Panama):** Reemplazo de JNI para conectar Java con código C/C++ de manera nativa, segura y mil veces más rápida.

> **En este curso:** Al trabajar con Quarkus moderno, las empresas apuntan directamente a **Java 21**, aprovechando los *Virtual Threads* para el máximo rendimiento.
