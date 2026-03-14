---
id: introduccion-keycloak
title: "Keycloak: Identity and Access Management"
description: "Por qué usar Keycloak frente a soluciones propias o Auth0, beneficios y conceptos clave."
sidebar_position: 2
---

# Keycloak (Identity Provider)

## ¿Qué es Keycloak?

**Keycloak** es un producto de software de código abierto (desarrollado por Red Hat) que proporciona Identidad y Gestión de Acceso (IAM / Identity and Access Management) de forma centralizada para aplicaciones modernas, APIs y servicios.

En lugar de que cada microservicio tuyo tenga que crear sus propias tablas de `Usuario` y `Roles` en la base de datos, implementar su propia encriptación bcrypt para contraseñas, y codificar rutinas de "Recuperar contraseña por email", tú delegas el 100% de la responsabilidad de autenticación a Keycloak.

## Beneficios y Diferencias frente a otras soluciones

Existen tres formas típicas de abordar el login en un proyecto:

1. **Gestión Propia Básica (DB Auth):** El programador usa Spring Security o Quarkus Security para leer una tabla `user` y validar passwords.
2. **SaaS en la Nube (Auth0, AWS Cognito):** Soluciones comerciales totalmente gestionadas (Pagas por volumen de usuarios).
3. **Servidor Propio OIDC (Keycloak):** Servidor independiente open-source bajo control total.

### ¿En qué resalta Keycloak?

- **Zero-Code Authentication:** Levantar un Social Login (Botón de "Iniciar sesión con Google/Github") en tu app con Keycloak no requiere escribir código backend en Java. Se configura con 3 clics en la consola administrativa de Keycloak.
- **Single Sign-On (SSO):** Si tu empresa tiene 5 aplicaciones conectadas a Keycloak, cuando el usuario hace login en la Aplicación A, automáticamente está logueado en las Apps B, C, D y E sin tener que volver a meter su contraseña (igual que el ecosistema de Google).
- **Gratis y Open Source:** Auth0 se vuelve prohibitivamente costoso para startups exitosas con muchos usuarios. Keycloak no tiene tarifa por límite de usuarios, te pertenece y lo alojas tú mismo.
- **Estándares del Mercado:** Ocupa los estándares más estrictos y comprobados del mundo: OAuth 2.0 y OpenID Connect (OIDC). Emite **JWTs (JSON Web Tokens)** criptográficamente firmados.

---

## Diferencias Clave

| Aspecto | Crear Login desde Cero (Java) | Auth0 / Okta (SaaS) | Keycloak (Self-hosted) |
| :--- | :--- | :--- | :--- |
| **Esfuerzo de desarrollo** | Meses (Recuperar Clave, MFA, Bloqueos, Captcha) | Inmediato (Pocos minutos) | Inmediato (Requiere desplegar el contenedor Docker) |
| **Costo** | Gratis (Pero alto costo horas-hombre) | Pagado (Escala rápido $) | **Gratis** (Costos de servidor K8s) |
| **Personalización / Privacidad** | Totalmente personalizada. Los datos son tuyos. | Parcial. Los datos caen en un tercero. | **Total.** Control de datos y personalización del motor (SPIs). |
| **Auditoría y Bloqueo** | Tienes que programarlo tú mismo. | Viene de caja con analíticas. | Viene de caja (Bloqueo por fuerza bruta automático). |

---

## Ejemplo: Arquitectura de Configuración

En nuestro microservicio `cja-msa-sc-security`, configuramos Keycloak mediante un administrador local. 
En la configuración (`application.properties`) no verás algoritmos raros, simplemente apuntamos nuestro microservicio de Quarkus a la URL del Realm de Keycloak:

```properties
# Quarkus delega la validación de tokens inmediatamente hacia la firma criptográfica del Realm de Keycloak
quarkus.oidc.auth-server-url=http://localhost:8080/realms/quarkus
quarkus.oidc.client-id=backend-service
```

En la consola visual de Keycloak (puerto 8080), simplemente hacemos:
1. Crear un **Realm** (Espacio de trabajo llamado `quarkus`).
2. Crear un **Client** (Llamado `backend-service`).
3. Crear un **Usuario** (Ej. `xgarnica` con su password).
4. El servidor Quarkus ahora confía ciega y criptográficamente en los Tokens firmados por Keycloak.
