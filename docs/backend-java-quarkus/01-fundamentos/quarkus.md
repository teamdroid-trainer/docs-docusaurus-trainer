---
id: quarkus
title: "Quarkus"
description: "Por qué usar Quarkus, ventajas sobre Spring Boot y beneficios numéricos (Supersonic Subatomic Java)."
sidebar_position: 2
---

# Quarkus: Supersonic Subatomic Java

**Quarkus** es un framework diseñado por Red Hat para programar aplicaciones Java enfocadas 100% en la era **Cloud-Native, Serverless y Kubernetes.**

Quarkus toma el enorme y probado ecosistema Java (Hibernate, RESTEasy, Kafka, Camel) y lo compila de manera inteligente para que consuma muchísima menos memoria y arranque instantáneamente.

## ¿Por qué usar Quarkus? Sus Poderes

1. **Compilación Nativa (GraalVM):** Puede convertir el código Java en un binario ejecutable específico para el sistema operativo, deshaciéndose por completo de la JVM en el entorno de producción.
2. **Tiempo de Arranque Ultra-Rápido:** Un microservicio puede arrancar en **15 milisegundos**. Ideal para cargas de trabajo "Serverless" (AWS Lambda) que necesitan escalar de 0 a 1000 al instante.
3. **Developer Joy (Live Reloading):** Guarda el archivo en tu IDE y los cambios se aplican instantáneamente, sin necesidad del tedioso proceso de recompilar y reiniciar el servidor.
4. **Reactivo e Imperativo Combinados:** Quarkus te permite escribir código secuencial tradicional y código reactivo/asíncrono puro (con Mutiny) en el mismo proyecto y bajo la misma infraestructura.

## ¿Dónde se usa más?

- **Arquitecturas Serverless (FaaS):** Funciones Cloud debido a que el "Cold Start" (tiempo de arranque en frío) de Java tradicional era inviable. Quarkus resuelve esto.
- **Entornos Kubernetes y Microservicios:** Cuando empaquetas docenas de microservicios, el consumo de memoria importa.
- **Procesamiento de Eventos Rápidos:** Integraciones con Apache Kafka en tiempo real.

---

## Quarkus vs Spring Boot

Spring Boot es el rey indiscutible del backend enterprise, pero Quarkus es la evolución necesaria para la nube. La principal diferencia radica en **CUÁNDO** se hace el trabajo.

*   **Spring Boot (Dynamic Runtime):** Utiliza reflexión masiva, escaneo de classpath, carga dinámica de clases y proxies en **tiempo de ejecución**. Todo esto alenta el arranque inicial y consume gran cantidad de memoria RAM de base (overhead).
*   **Quarkus (Build Time):** Quarkus mueve la mayoría de estos procesos (escaneo, parseo de configs, preparación de frameworks) al **tiempo de compilación**. Cuando la app arranca, ya sabe exactamente todo lo que tiene que hacer. No hay reflexión innecesaria.

### Beneficios en Términos Numéricos

| Métrica | Tradicional Cloud-Native (Spring Boot) | Quarkus (JVM) | Quarkus + GraalVM (Nativo) |
| :--- | :---: | :---: | :---: |
| **Tiempo de Arranque (First Response)** | ~4 a 10 segundos | ~0.7 segundos | **~0.015 segundos (15ms)** |
| **Consumo de Memoria RAM (RSS)** | ~250 MB mínimo | ~130 MB | **~12 a 35 MB** |
| **Densidad de despliegue en K8s** | Baja (1x pod) | Media (2x pods) | **Alta (10x pods)** |

### Ventajas tangibles sobre Spring
1. **Factura en la nube más barata:** Si AWS te cobra por RAM y milisegundos de uso, correr Quarkus nativo con 35MB y 15ms de arranque disminuye tus costos operativos radicalmente en comparación con un jar de Spring Boot que exige 512MB de ram por instancia.
2. **Escalabilidad ágil:** En un pico de tráfico por "Black Friday", Kubernetes necesita instanciar más nodos de tus servicios. Quarkus escala en milisegundos; los usuarios finales nunca sufrirán lentitud por este escalado.
3. **Mismos estándares (APIs):** Quarkus no te obliga a aprender un lenguaje nuevo; soporta muchas de las mismas APIs de Java EE (ahora Jakarta EE) e incluso ofrece *compatibilidad con extensiones Spring* (ej: `@RestController` funciona en Quarkus).
