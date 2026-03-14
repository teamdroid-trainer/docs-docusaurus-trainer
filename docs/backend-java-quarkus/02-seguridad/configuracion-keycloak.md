---
id: configuracion-keycloak
title: "Configuración de Keycloak"
description: "Guía paso a paso para levantar y configurar Keycloak local con Docker para el microservicio de seguridad"
sidebar_position: 3
---

# Guía de Configuración Local de Keycloak

Este documento sirve como guía paso a paso para levantar y configurar un servidor Keycloak local utilizando Docker, registrar un cliente para el microservicio `cja-msa-sc-security`, crear roles y finalmente usuarios de prueba para interactuar con la API.

---

## 1. Levantar Keycloak mediante Docker

Para iniciar Keycloak 24.0.0 en modo desarrollo local, ejecuta el siguiente comando en tu terminal:

```bash
docker run -p 8180:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:24.0.0 start-dev
```

*Nota: Esto iniciará la consola de administración de Keycloak en http://localhost:8180.*

---

## 2. Configuración en la Consola de Keycloak (Paso a Paso)

Accede a `http://localhost:8180` en tu navegador y haz clic en "Administration Console". Inicia sesión con las credenciales que definiste en Docker (`admin` / `admin`).

### 2.1 Crear el Realm
1. En el panel lateral izquierdo, haz clic en el menú desplegable que dice **master** (arriba del todo).
2. Haz clic en **Create Realm**.
3. En el campo **Realm name**, escribe `quarkus` y dale a **Create**.

### 2.2 Crear el Cliente (Client)
1. Asegúrate de estar en el realm `quarkus`.
2. Ve a **Clients** en el menú izquierdo y haz clic en **Create client**.
3. **Pestaña 1 (General Settings):**
   - **Client type:** `OpenID Connect`
   - **Client ID:** `backend-service` (Debe coincidir con la configuración de tu aplicación).
   - Haz clic en **Next**.
4. **Pestaña 2 (Capability config):**
   - **Client authentication:** Activa el switch a **ON** (Esto habilitará el uso de un *Secret*).
   - **Authorization:** Déjalo en **OFF**.
   - En *Authentication flow*, asegúrate de que **Standard flow** y **Direct access grants** estén marcados.
   - Haz clic en **Next**.
5. **Pestaña 3 (Login settings):**
   - **Valid redirect URIs:** Escribe `*` (asterisco puro) o `http://localhost:8080/*`.
   - **Web origins:** Escribe `*` (asterisco puro) o `+`.
   - Haz clic en **Save**.
6. **Obtener el Secret:**
   - Una vez guardado, aparecerá una pestaña arriba llamada **Credentials**.
   - Ingresa a la pestaña y copia el valor del **Client Secret** mostrado en pantalla.

### 2.3 Crear Roles (Realm Roles)
1. En el menú izquierdo ve a **Realm roles**.
2. Dale a **Create role**.
3. Crea los roles exactos usados en tu API. Repite el proceso para crear:
   - `ADMIN`
   - `OPERATOR`
   - `CONSULTATION`

### 2.4 Crear Usuarios y Asignar Credenciales
1. Ve a **Users** en el menú izquierdo y haz clic en **Add user**.
2. Crear Usuario 1 (Admin):
   - **Username:** `admin`
   - **Email:** `admin@admin.com`
   - **First name:** `Admin`
   - **Last name:** `Sistema`
   - **Email verified:** Actívalo a **ON** (Para evitar el error *"Account is not fully set up"*).
   - Haz clic en **Save**.
3. Crear Usuario 2 (Operator):
   - Repite el proceso para crear `operator01` llenando todos los campos.

#### Asignar Contraseñas a los Usuarios:
1. Dentro de cada registro de Usuario recién creado, ve a la pestaña **Credentials**.
2. Haz clic en **Set password**.
3. Escribe la contraseña deseada (ej. `admin` o `operator01`).
4. 🚨 **CRÍTICO:** Cambia el switch de **Temporary** a **OFF**. Si se queda en verde, la petición CURL fallará obligándote a cambiar la clave en una web interactiva.
5. Haz clic en **Save** y confirma en **Save password**.

#### Mapear los Roles:
1. Estando en la vista del usuario (ej. `admin`), ve a la pestaña **Role mapping**.
2. Haz clic en **Assign role**.
3. Activa la casilla del rol correspondiente (`ADMIN`) y dale a **Assign**.
4. Repite el proceso para `operator01`, pero asignándole el rol `OPERATOR`.

---

## 3. Configuración en la Aplicación Quarkus

En tu archivo `src/main/resources/application.properties`, agrega la siguiente configuración mapeando los valores de tu Keycloak local:

```properties
# ── Configuración Keycloak (OIDC JWT) ─────────────────────────
quarkus.oidc.auth-server-url=${OIDC_AUTH_SERVER_URL:http://localhost:8180/realms/quarkus}
quarkus.oidc.client-id=${OIDC_CLIENT_ID:backend-service}
# NOTA: Reemplaza este valor con el Secret exacto que copiaste en el Paso 2.2
quarkus.oidc.credentials.secret=${OIDC_CLIENT_SECRET:tYbv6fT4UDIEMR6xWks2gvkBeszjzrCV}
# Mapear roles de Keycloak a `@RolesAllowed` en Quarkus
quarkus.oidc.roles.role-claim-path=realm_access/roles

# Obligar validación tras Logout (Introspección activa con Keycloak en cada request)
quarkus.oidc.token.require-jwt-introspection-only=true

# ── Configuración MicroProfile REST Client (Facade Keycloak) ──
quarkus.rest-client.keycloak-api.url=${OIDC_AUTH_SERVER_URL:http://localhost:8180/realms/quarkus}
```

---

## 4. Pruebas de API mediante CURL

### Paso 1: Obtener Tokens a través del Facade (`/api/v1/auth/login`)

```bash
curl -X POST "http://localhost:8080/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username": "admin","password": "admin"}'
```
Copia el valor en el campo `"access_token"`. En caso de necesitar desloguear al usuario más adelante, copia también el `"refresh_token"`.

### Paso 2: Probar el Endpoint Protegido (201 Created)
*Sustituye `<TU_TOKEN_AQUI>` con el valor del `access_token` obtenido en el Paso 1.*

```bash
curl -v -X POST "http://localhost:8080/api/v1/users" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TU_TOKEN_AQUI>" \
     -d '{"username": "usuario_valido","email": "test@dominio.com","password": "Password123!","fullName": "Usuario Valido"}'
```

### Paso 3: Probar Seguridad de Roles (403 Forbidden)
Si intentas iniciar sesión con el usuario `operator01` y luego invocas la creación de usuario usando ese token, la API devolverá **403 Forbidden**, validando exitosamente que la anotación `@RolesAllowed({"ADMIN"})` funciona correctamente.

### Paso 4: Cerrar Sesión (Logout Facade)
*Sustituye `<TU_REFRESH_TOKEN_AQUI>` con el valor del `refresh_token` obtenido en el Paso 1.*

```bash
curl -v -X POST "http://localhost:8080/api/v1/auth/logout" \
     -H "Content-Type: application/json" \
     -d '{"refreshToken": "<TU_REFRESH_TOKEN_AQUI>"}'
```
El servidor devolverá un `204 No Content`, invalidando exitosamente el token en Keycloak.
