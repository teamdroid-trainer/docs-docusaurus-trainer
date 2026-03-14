---
id: intro
title: Introducción al Curso
description: Backend Java con Quarkus — Plataforma documental del curso para institución financiera
sidebar_position: 1
---

# Backend Java con Quarkus

Bienvenido a la plataforma de documentación del curso **Backend Java con Quarkus**, diseñado para instituciones financieras que buscan construir microservicios modernos, seguros y resilientes.

## ¿Qué aprenderás?

Este curso cubre el ciclo completo de desarrollo de microservicios de nivel profesional, desde la estructura del proyecto hasta arquitecturas orientadas a eventos con autenticación multifactor.

## Stack Tecnológico

| Herramienta | Versión | Rol |
|---|---|---|
| **Java** | 21 / 25 (EA) | Lenguaje principal |
| **Quarkus** | 3.x | Framework de microservicios cloud-native |
| **Gradle** | 8.x (Kotlin DSL) | Build tool |
| **Keycloak** | 24+ | Autenticación y autorización (OIDC) |
| **PostgreSQL** | 15+ | Persistencia relacional |
| **Redis** | 7+ | Caché en memoria |
| **Docker** | 24+ | Contenedores locales |
| **Lombok** | 1.18.x | Reducción de boilerplate |
| **MapStruct** | 1.5+ | Mapeo entre capas |
| **Mutiny** | — (Quarkus) | Programación reactiva |

## Estructura del Curso

| Sesión | Tema Principal | Microservicio(s) |
|---|---|---|
| [Sesión 1](./fundamentos/especificacion-tecnica) | Arquitectura Hexagonal y estructura del proyecto | `cja-msa-sc-security` |
| [Sesión 2](./seguridad/validacion-openapi-seguridad) | Validación, OpenAPI y Seguridad con Keycloak | `cja-msa-sc-security` |
| [Sesión 3](./auditoria/microservicio-auditoria) | Microservicio de Auditoría Reactivo | `cja-msa-sc-audit` |
| [Sesión 4](./persistencia-cache/persistencia-cqrs-postgres) | Persistencia CQRS con PostgreSQL y Redis | `cja-msa-sc-audit` + `security` |
| [Sesión 5](./resiliencia/fault-tolerance) | Resiliencia y Tolerancia a Fallos | `cja-msa-sc-security` |
| [Sesión 6](./event-driven-mfa/event-bus-mfa) | Arquitectura Orientada a Eventos y MFA | `cja-msa-sc-security` |

## Prerrequisitos

- JDK 21 LTS (o JDK 25 EA)
- Gradle 8.x
- Docker Desktop
- IntelliJ IDEA o VS Code con extensión Java

## Microservicios del Curso

### `cja-msa-sc-security`
Microservicio principal de seguridad. Gestiona autenticación, autorización, caché de tokens y flujo MFA.

### `cja-msa-sc-audit`
Microservicio de auditoría reactivo. Registra todos los eventos de seguridad de forma asíncrona.

## Principios Aplicados

- **Hexagonal Architecture** (Ports & Adapters)
- **Clean Architecture**
- **Reactive Programming** con Mutiny
- **Cloud-native** con Quarkus
- **Security by design**
- **Fault tolerance** con MicroProfile
- **Event-Driven Architecture** (EDA)
