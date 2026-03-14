---
id: graalvm
title: "GraalVM"
description: "GraalVM frente a JVM tradicional: compilación nativa en Quarkus."
sidebar_position: 4
---

# GraalVM: La Máquina Virtual Políglota de Alto Rendimiento

**GraalVM** es un ecosistema del JDK modular que añade un potente compilador "Ahead-Of-Time" (AOT). Fue desarrollado originariamente por Oracle.

Tradicionalmente, el código Java (`.java`) se compila a un intermediario llamado *Bytecode* (`.class` empaquetado típicamente en `.jar`). Cuando ejecutas `java -jar mi_app.jar`, entra en juego la **JVM (Java Virtual Machine)** tradicional. 

Mientras el programa corre en la JVM, un componente llamado **JIT (Just-In-Time Compiler)** toma ese Bytecode e intenta deducir los patrones en tiempo real para ir compilándolo a código máquina optimizado de tu CPU de fondo.

## ¿Por qué el JVM JIT es un problema en Kubernetes?

1. El JIT **consume mucha RAM y CPU al arrancar**. Un microservicio puede subir a 600MB de RAM durante los primeros segundos nomás para calentar sus rutas (escaneo).
2. Tarda demasiados segundos en estabilizarse a la máxima velocidad, obligando a Kubernetes a establecer pausas asfixiantes o configurar métricas "liveness" laxas.
3. Si lo pasamos a un entorno Serverless con pago por milisegundo (como *AWS Lambda*), cargar la JVM para una llamada es terriblemente ineficiente (Cold Starts).

---

## La Solución: GraalVM y compilación AOT

GraalVM Native Image utiliza un mecanismo llamado **Ahead-of-Time (AOT)** (Compilación anticipada), descartando el mecanismo JIT.

Toma todo nuestro código del proyecto, además de las dependencias e incluso las partes necesarias del propio JDK, y lo compila brutalmente de antemano. El resultado de construir con la imagen nativa de GraalVM no es un archivo `.jar` que requiere ser puesto encima de un servidor con una instalación de `java` existente, sino un **BINARIO EJECUTABLE COMPILADO EN CÓDIGO MÁQUINA CERRADO E INDEPENDIENTE** (igual que si estuvieramos compilando en C, Go, o Rust).

### Diferencias Clave: JVM Tradicional vs GraalVM Native Image

| Característica         | Java Virtual Machine (JIT)        | GraalVM Native Image (AOT)       |
|:-----------------------|:-----------------------------------|:-----------------------------------|
| **Formato Físico**     | Archivos `.jar` / `.war`          | Ejecutable binario nativo (ej: `.exe` en Windows o binario Linux) |
| **Dependencia**        | Requiere instalación de JDK/JRE    | **NO REQUIERE** Java instalado en la máquina o contenedor Docker |
| **Tiempo de Compilación** | Segundos (Construye `bytecode`)  | **LENTO**: Varios minutos (Consume toda tu CPU y RAM disponible) |
| **Tiempo de Arranque** | Segundo a Minutos (Cold start)    | **Milisegundos**                 |
| **Metadatas Dinámicos** | Totalmente permitido (Reflexión)   | Parcialmente prohibido (GraalVM corta todo contexto dinámico/muerto, debiendo declararlo a mano) |

---

## ¿Cómo se integra GraalVM con Quarkus?

Para crear una imagen Nativa manualmente en Spring Boot hace unos años era una tarea destructiva, frustrante y plagada de fallos de Reflexión (ReflectionExceptions).

Como **Quarkus** evalúa todo durante la fase inicial de "Build Time" del desarrollador, Quarkus extrae el árbol completo de reflexión, proxys dinámicos y dependencias usadas, inyectándolo como un mapa para GraalVM.
Esto hace que hoy Quarkus pueda ejecutar aplicaciones Java altamente complejas de forma nativa como si nada hubiese pasado, logrando ser un puente transparente.

### El Superpoder en Términos Numéricos
- Mover del mundo JVM a código Nativo GraalVM con Quarkus baja el tiempo de arranque de **700ms a 15ms**.
- Reduce brutalmente la RAM en inactividad (IDLE state) de **130 MB a menos de 20 MB**.
- Las imágenes de Docker del contenedor resultante logran encogerse de 250 MB (`from openkjdk:17`) a apenas unos escasos **30-45 MB** absolutos usando plantillas Linux Alpine o Micro.
