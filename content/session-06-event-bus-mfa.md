# Session 06: Event Bus y MFA con Arquitectura Orientada a Eventos

## 1. Objetivo de la sesion
Entre `session5-dev` y `session6-dev` el microservicio `cja-msa-sc-security` incorpora un flujo MFA didactico basado en eventos internos con Quarkus Event Bus. La idea no es solo agregar dos endpoints nuevos, sino mostrar como desacoplar un proceso compuesto en varios pasos pequenos que colaboran mediante mensajes.

Esta sesion introduce:
- Event-driven design dentro de un mismo microservicio.
- Orquestacion reactiva con `Uni` y `eventBus.request(...)`.
- Consumers `@ConsumeEvent` para separar responsabilidades.
- Un contexto comun (`MfaEventContext`) que fluye entre handlers.
- Manejo de errores de Event Bus en `GlobalExceptionMapper`.
- Un ejemplo de consumer bloqueante con `blocking = true`.

## 2. Diferencias entre `session5-dev` y `session6-dev`

### Cambios de plataforma
- Se agrega la dependencia `io.quarkus:quarkus-vertx` en [`build.gradle.kts`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/build.gradle.kts).
- El proyecto baja de Java 25 a Java 21 en [`build.gradle.kts`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/build.gradle.kts) para usar una version soportada de forma uniforme en el entorno.
- Se ajusta [`gradle.properties`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/gradle.properties) sin impacto funcional relevante.

### Nuevos componentes funcionales
- Nuevo resource REST MFA en [`MfaResource.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/infrastructure/adapters/in/rest/MfaResource.java).
- Nuevo orquestador de eventos en [`MfaEventConsumers.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/application/service/MfaEventConsumers.java).
- Nuevo modelo de contexto compartido en [`MfaEventContext.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/domain/model/MfaEventContext.java).
- Nuevos DTOs para iniciar y verificar MFA.
- Nuevo enum [`MfaStatus.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/domain/model/enums/MfaStatus.java).
- Nuevo modelo [`MfaChallenge.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/domain/model/MfaChallenge.java) agregado como pieza de dominio para representar el reto MFA.

### Cambios transversales
- `GlobalExceptionMapper` ahora reconoce `ReplyException`, porque los errores lanzados dentro de un `@ConsumeEvent` regresan a la capa REST envueltos por el Event Bus.

## 3. Teoria: por que usar eventos aqui

### La pregunta correcta no es "como llamo al siguiente metodo"
Cuando un sistema crece, la pregunta arquitectonica deja de ser "que clase sigue" y pasa a ser "que acaba de ocurrir en el negocio". Ese cambio de perspectiva es profundo: ya no pensamos en una cadena de llamadas, pensamos en una cadena de hechos.

Un flujo orientado a llamadas directas dice:
- valida usuario;
- decide politica;
- genera OTP;
- crea challenge;
- completa login.

Un flujo orientado a eventos dice:
- se recibieron credenciales;
- se evaluo una politica MFA;
- se genero un OTP;
- se creo un challenge;
- se completo la autenticacion.

La diferencia parece sutil, pero cambia la arquitectura. Cuando el sistema gira alrededor de hechos, los componentes dejan de empujarse unos a otros y empiezan a colaborar alrededor de un contrato comun. Esa es una idea que conviene recordar: los sistemas mas faciles de evolucionar son los que reaccionan a lo que sucede, no los que dependen rigidamente de quien llama a quien.

### Que es un evento
Un evento es un mensaje que representa un hecho o una transicion relevante. Puede decir:
- algo ocurrio;
- algo fue solicitado;
- algo debe continuar.

En esta sesion usamos eventos internos para mover el flujo MFA entre componentes sin acoplar directamente el endpoint con toda la logica. El endpoint deja de ser el lugar donde "todo pasa" y se convierte en el iniciador del proceso.

### Que es EDA
EDA significa Event-Driven Architecture. En este estilo:
- un productor emite un mensaje;
- uno o varios consumidores reaccionan;
- el contrato principal ya no es una llamada de metodo, sino el contenido y la direccion del mensaje.

La trascendencia de este modelo esta en que el sistema deja de organizarse por dependencias tecnicas y empieza a organizarse por significado. Cuando la arquitectura refleja el lenguaje del negocio, el codigo se vuelve mas entendible, mas reemplazable y mas durable.

### Llamadas directas vs eventos

#### Modelo tradicional
```mermaid
flowchart LR
    A[Resource] --> B[Service A]
    B --> C[Service B]
    C --> D[Service C]
    D --> E[Service D]
```

En este modelo:
- cada paso conoce explicitamente al siguiente;
- el flujo suele quedar concentrado en pocas clases;
- cambiar un paso puede obligar a modificar varios consumidores directos.

#### Modelo orientado a eventos
```mermaid
flowchart LR
    A[Resource] --> EB[(Event Bus)]
    EB --> B[Consumer: credentials.validate]
    EB --> C[Consumer: policy.evaluate]
    EB --> D[Consumer: otp.generate]
    EB --> E[Consumer: challenge.generate]
```

En este modelo:
- el emisor conoce una direccion, no una implementacion concreta;
- cada paso puede evolucionar con mas independencia;
- el flujo es mas visible porque queda modelado por mensajes.

### Tres ideas que deben calar hondo
- Un sistema fuertemente acoplado funciona hasta que el cambio llega. Un sistema orientado a eventos esta pensado precisamente para el cambio.
- Donde antes habia una cadena de dependencias, ahora hay una conversacion entre componentes.
- El verdadero valor de los eventos no es la asincronia; es el desacoplamiento semantico.

### Productor, canal y consumidor
Un flujo EDA sencillo tiene tres piezas:
- productor: quien emite el mensaje;
- canal: medio por el que viaja el mensaje;
- consumidor: quien reacciona al mensaje.

```mermaid
flowchart LR
    P[Productor] --> M[Mensaje]
    M --> C[Canal / Bus]
    C --> X[Consumidor A]
    C --> Y[Consumidor B]
```

En esta sesion:
- `MfaResource` actua como productor inicial;
- Quarkus Event Bus es el canal;
- `MfaEventConsumers` contiene los consumidores del flujo.

### Orquestacion por etapas
El MFA es un buen ejemplo porque no es una sola accion, sino una secuencia de decisiones y validaciones. Dividirlo en eventos hace visible cada frontera del proceso.

```mermaid
flowchart TD
    A[Credenciales recibidas] --> B[Evento: credentials.validate]
    B --> C[Evento: policy.evaluate]
    C --> D[Evento: otp.generate]
    D --> E[Evento: challenge.generate]
    E --> F[Cliente recibe challengeId]
    F --> G[Evento: challenge.load]
    G --> H[Evento: otp.verify]
    H --> I[Evento: login.complete]
    I --> J[Cliente recibe token]
```

Cada bloque representa una responsabilidad delimitada. Esa separacion deja una ensenanza importante: cuando un flujo de negocio complejo se parte correctamente, el sistema deja de sentirse como una masa de codigo y empieza a sentirse como un proceso.

### Acoplamiento tecnico vs acoplamiento semantico
Ningun sistema elimina el acoplamiento por completo. Lo que hace EDA es moverlo al lugar correcto.

- Acoplamiento tecnico: una clase depende de otra clase concreta.
- Acoplamiento semantico: un componente depende de que exista cierto mensaje con cierto significado.

El segundo es mas sano, porque cambia menos con el tiempo. Las implementaciones cambian, los nombres de clases cambian, los frameworks cambian. Pero un hecho del negocio como "credenciales validadas" o "OTP verificado" suele permanecer.

### Request/Reply y Publish/Subscribe
No todos los eventos se usan igual.

#### Request/Reply
Se usa cuando quien emite el mensaje necesita una respuesta. Eso ocurre en esta sesion porque el endpoint REST debe continuar el flujo y finalmente responder al cliente.

```mermaid
sequenceDiagram
    participant R as Resource
    participant EB as Event Bus
    participant C as Consumer

    R->>EB: request(address, payload)
    EB->>C: mensaje
    C-->>EB: respuesta
    EB-->>R: reply
```

#### Publish/Subscribe
Se usa cuando un mensaje debe ser difundido sin que el emisor espere respuesta. Es ideal para auditoria, notificaciones o telemetria.

```mermaid
sequenceDiagram
    participant P as Productor
    participant EB as Event Bus
    participant A as Subscriptor A
    participant B as Subscriptor B

    P->>EB: publish(evento)
    EB-->>A: copia del evento
    EB-->>B: copia del evento
```

### Por que Quarkus Event Bus es suficiente para esta sesion
Porque el objetivo pedagogico no es distribuir mensajes entre microservicios, sino aprender el patron mental correcto:
- modelar pasos como eventos;
- separar productores y consumidores;
- entender hilos reactivos y workers;
- aprender a propagar errores en pipelines asincronicos.

Primero se aprende a pensar en eventos dentro del mismo proceso. Despues, si el sistema lo necesita, ese mismo pensamiento puede proyectarse a Kafka o a cualquier broker distribuido. La madurez arquitectonica no empieza cuando introduces infraestructura mas compleja; empieza cuando el codigo expresa bien las transiciones del negocio.

### Que no es este ejemplo
Este ejemplo no implementa EDA distribuida entre microservicios. Quarkus Event Bus es un bus local al proceso. Sirve para aprendizaje, desacoplamiento interno y orquestacion reactiva, pero no reemplaza un broker distribuido.

## 4. Quarkus Event Bus en esta sesion

Quarkus expone el Event Bus de Vert.x. En esta implementacion se usa con el patron `request/reply`, donde un componente envia un mensaje a una direccion y espera una respuesta asincronica.

Conceptos clave:
- `EventBus.request(address, payload)`: envia y espera respuesta.
- `@ConsumeEvent("address")`: registra un consumer para esa direccion.
- `@ConsumeEvent(value = "...", blocking = true)`: ejecuta el consumer en worker threads para no bloquear el event loop.
- `Uni<T>`: modela la respuesta asincronica del pipeline.

## 5. Arquitectura implementada

### Vista general
```mermaid
flowchart LR
    Client[Cliente HTTP] --> MfaResource[MfaResource]
    MfaResource --> EB[(Quarkus Event Bus)]
    EB --> C1[credentials.validate]
    EB --> C2[policy.evaluate]
    EB --> C3[otp.generate]
    EB --> C4[challenge.generate]
    EB --> C5[challenge.load]
    EB --> C6[otp.verify]
    EB --> C7[login.complete]
    C1 --> AuthPort[AuthenticationPort / Keycloak]
    C4 --> Store[(challengeStore en memoria)]
    C5 --> Store
```

### Vista separada por flujos
```mermaid
flowchart LR
    Client[Cliente] --> Start["POST /mfa/start"]
    Client --> Verify["POST /mfa/verify"]

    Start --> EB1[(Event Bus)]
    EB1 --> S1[credentials.validate]
    EB1 --> S2[policy.evaluate]
    EB1 --> S3[otp.generate]
    EB1 --> S4[challenge.generate]
    S4 --> Store[(challengeStore)]

    Verify --> EB2[(Event Bus)]
    EB2 --> V1[challenge.load]
    V1 --> Store
    EB2 --> V2[otp.verify]
    EB2 --> V3[login.complete]
```

### Separacion por capas
- La capa REST inicia el flujo y compone `Uni`.
- La capa application procesa cada evento.
- El adaptador de autenticacion sigue encapsulando la llamada a Keycloak.
- El estado temporal del reto MFA vive en memoria en `challengeStore`.

### Como se divide la arquitectura entre `start` y `verify`
La arquitectura de esta sesion esta partida en dos mitades complementarias:
- `start` construye el reto MFA;
- `verify` resuelve el reto MFA y libera el token final.

La primera mitad prepara el contexto. La segunda mitad consume ese contexto. Esa division hace que el proceso sea mas facil de razonar porque cada endpoint tiene una intencion clara y una frontera funcional definida.

### Eventos que pertenecen al flujo `start`

#### `security.mfa.credentials.validate`
Rol arquitectonico:
- abrir el flujo validando el primer factor;
- enriquecer el contexto con el token emitido por el proveedor de identidad.

Comportamiento:
- recibe `username` y `password`;
- llama a `AuthenticationPort`;
- si autentica, guarda `token` en `MfaEventContext`;
- si falla, interrumpe el pipeline desde el inicio.

#### `security.mfa.policy.evaluate`
Rol arquitectonico:
- separar la autenticacion de la decision de seguridad.

Comportamiento:
- recibe el contexto ya autenticado;
- decide si el usuario requiere MFA;
- deja una bandera (`mfaRequired`) que condiciona los eventos posteriores.

#### `security.mfa.otp.generate`
Rol arquitectonico:
- convertir una decision de politica en una accion concreta.

Comportamiento:
- si `mfaRequired = true`, genera `otpCode`;
- si `mfaRequired = false`, deja pasar el flujo sin OTP;
- no responde al cliente todavia, solo sigue preparando el proceso.

#### `security.mfa.challenge.generate`
Rol arquitectonico:
- cerrar la preparacion del flujo y crear un identificador de continuidad.

Comportamiento:
- genera `challengeId`;
- almacena el `MfaEventContext` en `challengeStore`;
- devuelve la informacion minima que el cliente necesitara para continuar en `/verify`.

Lectura de arquitectura:
- `start` no autentica completamente al usuario;
- `start` deja listo el estado para que la autenticacion pueda completarse despues.

### Eventos que pertenecen al flujo `verify`

#### `security.mfa.challenge.load`
Rol arquitectonico:
- reconstruir el estado del proceso usando el `challengeId`.

Comportamiento:
- busca el contexto previamente guardado;
- copia el OTP recibido desde el request al contexto almacenado;
- falla si el challenge no existe.

#### `security.mfa.otp.verify`
Rol arquitectonico:
- validar el segundo factor.

Comportamiento:
- compara `otpCode` con `otpCodeReceived` cuando aplica MFA;
- marca el proceso como autenticado si la verificacion es correcta;
- permite continuar sin OTP cuando la politica indica que MFA no es requerido.

#### `security.mfa.login.complete`
Rol arquitectonico:
- consolidar el resultado final del flujo.

Comportamiento:
- toma el `token` ya guardado en el contexto;
- limpia el challenge del almacenamiento temporal;
- devuelve `TokenResponseDto` al endpoint REST.

Lectura de arquitectura:
- `verify` no vuelve a pedir autenticacion al proveedor externo;
- `verify` toma una decision final sobre un contexto ya preparado durante `start`.

### Lectura de conjunto
Si se observa la arquitectura completa, los eventos se agrupan naturalmente en dos responsabilidades:
- eventos de preparacion: autenticar, decidir politica, generar OTP, crear challenge;
- eventos de resolucion: recuperar contexto, verificar OTP, completar login.

Eso deja una idea importante: una buena arquitectura no solo separa clases; separa momentos del negocio. Aqui el flujo queda partido en el momento en que el sistema promete una autenticacion y en el momento en que finalmente la concede.

## 6. Casos de uso frecuentes y ventajas cuantificables

### Donde esta arquitectura aporta mas valor
La arquitectura orientada a eventos aporta mas valor cuando una operacion no es una sola accion, sino una cadena de verificaciones, decisiones y efectos posteriores. En finanzas eso ocurre a diario: autenticar, validar riesgo, aprobar, auditar, notificar y reconciliar son partes de un mismo proceso, pero no necesariamente deben vivir en el mismo metodo ni ejecutarse con el mismo ritmo.

Casos de uso frecuentes:
- autenticacion multifactor y controles de acceso por riesgo;
- validacion de transferencias bancarias de alto monto;
- autorizacion de pagos con revisiones antifraude;
- conciliacion de movimientos entre canales, cuentas y libros contables;
- actualizacion de limites de credito o scoring;
- alertas transaccionales y notificaciones regulatorias;
- monitoreo AML, KYC y deteccion de patrones sospechosos;
- procesamiento de lotes con confirmaciones parciales y reintentos.

### Teoria minima que importa
- una operacion financiera suele convertirse en varios eventos de negocio;
- cada evento puede tener un consumidor especializado;
- el sistema gana control porque cada paso queda aislado, medible y auditable.

La consecuencia practica es importante: cuando el negocio ya es secuencial y regulado, modelarlo como eventos deja de ser una sofisticacion y pasa a ser una forma mas fiel de representar la realidad.

### 1. Autenticacion multifactor y controles de acceso por riesgo
Este caso aplica cuando el acceso depende no solo de usuario y password, sino tambien de contexto: dispositivo, geolocalizacion, horario, monto esperado de operacion o historial reciente.

Comportamiento tipico:
- llega un intento de login;
- se valida identidad primaria;
- se calcula riesgo;
- si el riesgo sube, se exige OTP, biometria o aprobacion adicional;
- se registra el resultado y se habilita o rechaza la sesion.

Ventaja de modelarlo con eventos:
- la decision de riesgo puede cambiar sin reescribir el login completo;
- nuevas señales de riesgo pueden agregarse como consumidores adicionales;
- cada paso queda auditado.

```mermaid
flowchart LR
    A[Login recibido] --> B[Validar credenciales]
    B --> C[Evaluar riesgo]
    C -->|Riesgo bajo| D[Sesion aprobada]
    C -->|Riesgo alto| E[Solicitar OTP]
    E --> F[Verificar OTP]
    F --> G[Sesion aprobada o rechazada]
```

### 2. Validacion de transferencias bancarias de alto monto
En transferencias relevantes no basta con validar saldo. Tambien se evalua perfil del cliente, topes, reglas regulatorias, beneficiario, comportamiento historico y, a veces, aprobacion adicional.

Comportamiento tipico:
- se recibe la instruccion;
- se validan saldo y limites;
- se consulta el perfil de riesgo;
- se aplica aprobacion reforzada si el monto supera umbrales;
- se registra la autorizacion y se ejecuta o rechaza la operacion.

Ventaja de modelarlo con eventos:
- la aprobacion no queda embebida en una sola clase gigante;
- cada validacion puede fallar de forma independiente y trazable;
- el sistema puede frenar antes de llegar al core bancario si un control previo falla.

```mermaid
flowchart LR
    A[Transferencia recibida] --> B[Validar saldo]
    B --> C[Validar limites]
    C --> D[Evaluar riesgo]
    D --> E{Monto alto?}
    E -->|Si| F[Solicitar segundo factor o aprobacion]
    E -->|No| G[Autorizar]
    F --> G
    G --> H[Registrar y ejecutar]
```

### 3. Autorizacion de pagos con revisiones antifraude
En pagos con tarjeta, billeteras o pasarelas, un pago puede ser valido desde el punto de vista tecnico y aun asi ser sospechoso desde el punto de vista de fraude.

Comportamiento tipico:
- se recibe el intento de pago;
- se valida el medio de pago;
- se consulta score antifraude;
- se revisan patrones como pais, dispositivo, frecuencia y ticket promedio;
- se aprueba, desafia o rechaza.

Ventaja de modelarlo con eventos:
- las reglas antifraude pueden crecer sin romper la autorizacion base;
- se pueden disparar acciones paralelas como alerta, bloqueo temporal o revision manual;
- se preserva la trazabilidad completa del caso.

```mermaid
flowchart LR
    A[Pago recibido] --> B[Validar instrumento]
    B --> C[Score antifraude]
    C --> D{Resultado}
    D -->|Aprobar| E[Autorizar pago]
    D -->|Desafiar| F[OTP o 3DS]
    D -->|Rechazar| G[Denegar pago]
    F --> E
```

### 4. Conciliacion de movimientos entre canales, cuentas y libros contables
La conciliacion compara registros que vienen de fuentes distintas: canal digital, switch, ledger interno, motor de pagos, cuenta corriente o sistema contable.

Comportamiento tipico:
- llegan movimientos desde varias fuentes;
- se normalizan;
- se emparejan por referencia, monto y fecha;
- se marcan diferencias;
- se generan ajustes, alertas o casos manuales.

Ventaja de modelarlo con eventos:
- cada movimiento puede procesarse como unidad independiente;
- los faltantes o diferencias no detienen el lote completo;
- los pasos de matching, exception handling y ajuste quedan separados.

```mermaid
flowchart LR
    A[Movimientos canal] --> D[Normalizar]
    B[Movimientos cuenta] --> D
    C[Movimientos ledger] --> D
    D --> E[Conciliar]
    E --> F{Coincide?}
    F -->|Si| G[Marcar conciliado]
    F -->|No| H[Generar diferencia]
    H --> I[Ajuste o revision manual]
```

### 5. Actualizacion de limites de credito o scoring
Este caso aparece cuando el banco, fintech o cooperativa recalcula limites en base a comportamiento de pago, ingresos, mora, buro, consumo y exposicion total.

Comportamiento tipico:
- se detecta un cambio relevante;
- se recalcula score;
- se consulta politica comercial;
- se actualiza limite o cupo;
- se notifica al cliente y a sistemas dependientes.

Ventaja de modelarlo con eventos:
- scoring, politica y notificacion evolucionan por separado;
- una recalificacion masiva puede distribuirse por etapas;
- se evita recalcular todo el universo en una sola transaccion gigante.

```mermaid
flowchart LR
    A[Evento financiero del cliente] --> B[Recalcular score]
    B --> C[Aplicar politica]
    C --> D[Actualizar limite]
    D --> E[Notificar cliente]
    D --> F[Actualizar sistemas dependientes]
```

### 6. Alertas transaccionales y notificaciones regulatorias
Muchas operaciones exigen reaccionar rapido: alertas al cliente, reportes internos, mensajes regulatorios o evidencia para cumplimiento.

Comportamiento tipico:
- se aprueba o rechaza una operacion;
- se emite un evento;
- consumidores especializados envian SMS, email, push o generan reportes;
- cada canal reacciona sin afectar el flujo principal.

Ventaja de modelarlo con eventos:
- la transaccion critica no queda esperando todos los canales;
- un fallo en notificaciones no invalida necesariamente la operacion financiera;
- cada salida puede monitorearse y reintentarse por separado.

```mermaid
flowchart LR
    A[Operacion confirmada] --> EB[(Evento)]
    EB --> B[SMS]
    EB --> C[Email]
    EB --> D[Push]
    EB --> E[Reporte regulatorio]
```

### 7. Monitoreo AML, KYC y deteccion de patrones sospechosos
Los controles AML y KYC necesitan observar comportamiento, no solo operaciones aisladas. Un sistema orientado a eventos permite construir esa vista de forma incremental.

Comportamiento tipico:
- se reciben eventos de apertura, login, transferencias, cambios de datos y beneficiarios;
- motores especializados correlacionan frecuencia, montos, paises, contrapartes y cambios de perfil;
- si aparece un patron sospechoso, se genera un caso o alerta.

Ventaja de modelarlo con eventos:
- la inteligencia no vive solo en un punto del sistema;
- distintos detectores pueden escuchar el mismo flujo;
- las alertas salen de patrones acumulados, no de una sola transaccion aislada.

```mermaid
flowchart LR
    A[Login] --> E[Motor AML/KYC]
    B[Transferencia] --> E
    C[Cambio de datos] --> E
    D[Nuevo beneficiario] --> E
    E --> F{Patron sospechoso?}
    F -->|Si| G[Crear alerta/caso]
    F -->|No| H[Continuar monitoreo]
```

### 8. Procesamiento de lotes con confirmaciones parciales y reintentos
En cierres diarios, dispersiones, pagos masivos o conciliaciones nocturnas, no todas las unidades deben tener el mismo destino. Algunas se procesan, otras fallan y otras deben reintentarse.

Comportamiento tipico:
- entra un lote;
- se divide en items;
- cada item se valida y procesa;
- los exitos se confirman;
- los fallidos se reintentan o se envian a una cola de excepciones.

Ventaja de modelarlo con eventos:
- el lote deja de ser una unidad rigida y pasa a ser un conjunto de casos trazables;
- una falla puntual ya no obliga a tumbar todo el procesamiento;
- es posible medir porcentaje de exito, porcentaje de reintento y tiempo por etapa.

```mermaid
flowchart LR
    A[Lote recibido] --> B[Particionar items]
    B --> C[Procesar item]
    C --> D{Resultado}
    D -->|Exito| E[Confirmar]
    D -->|Falla recuperable| F[Reintentar]
    D -->|Falla definitiva| G[Enviar a excepciones]
```

### Ventajas operativas con numeros
Las cifras exactas dependen del hardware, la base de datos, la latencia de red y el tipo de carga. Aun asi, hay mejoras tipicas y defendibles cuando se pasa de flujos sincronos fuertemente acoplados a pipelines por eventos bien separados.

#### 1. Mejor uso de recursos
En un flujo tradicional, una solicitud HTTP puede retener el hilo mientras espera varias llamadas. En un flujo reactivo con eventos internos:
- un solo nodo puede sostener cientos o miles de operaciones concurrentes si la mayor parte del tiempo esta esperando I/O;
- una aplicacion bloqueante puede saturarse con 100 a 300 requests concurrentes en escenarios medianos;
- una implementacion reactiva bien hecha puede manejar 3x a 10x mas concurrencia efectiva con el mismo numero de hilos, porque no inmoviliza threads durante esperas de red.

La idea de fondo es simple: el throughput no mejora solo por "ser reactivo"; mejora porque los recursos se desperdician menos.

#### 2. Menor latencia acumulada por desacoplamiento de pasos
Si un flujo de 5 pasos tarda, por ejemplo:
- 40 ms en autenticacion;
- 15 ms en politica;
- 10 ms en OTP;
- 5 ms en persistencia temporal;
- 20 ms en notificacion o auditoria;

un diseno monolitico puede terminar obligando a que el cliente espere la suma completa de tareas necesarias y accesorias. Si los pasos no criticos se separan o se desacoplan correctamente:
- la latencia visible al cliente puede reducirse entre 15% y 40%;
- tareas accesorias pueden ejecutarse fuera del camino critico;
- el tiempo de respuesta deja de crecer linealmente con cada responsabilidad agregada al mismo metodo.

#### 3. Mayor capacidad de procesamiento por particion del flujo
Supongamos una plataforma que procesa 50 transacciones por segundo con un servicio acoplado y picos frecuentes. Si cada transaccion pasa por 4 a 6 validaciones internas:
- separar etapas permite medir donde esta el cuello de botella;
- el paso lento puede optimizarse sin reescribir todo el proceso;
- en escenarios reales, esa visibilidad suele traducirse en mejoras de 20% a 60% en throughput al atacar solo la etapa limitante.

La mejora no proviene de la teoria, sino de poder aislar y afinar el cuello de botella correcto.

#### 4. Mejor resiliencia operativa
En procesos financieros, el costo de reintentar todo un flujo puede ser alto. Con eventos:
- si falla un paso puntual, no siempre hace falta repetir toda la transaccion;
- una cola o un almacenamiento temporal permite retomar desde una etapa concreta;
- el tiempo operativo de recuperacion puede bajar de minutos a segundos cuando el estado del proceso esta bien modelado.

Ejemplo practico:
- sin eventos: una falla en el paso 5 obliga a repetir los 4 pasos anteriores;
- con eventos y estado intermedio: el sistema puede reiniciar desde el paso 5 o reenviar solo el mensaje fallido.

#### 5. Trazabilidad y auditoria mas precisas
En sectores regulados, saber que fallo no es suficiente; hay que saber cuando, donde y bajo que contexto fallo.

Con eventos se pueden registrar hitos como:
- solicitud recibida a las 10:00:01.021;
- validacion de identidad completada a las 10:00:01.080;
- verificacion de OTP completada a las 10:00:01.241;
- autorizacion final emitida a las 10:00:01.260.

Eso permite:
- reconstruir la linea de tiempo completa;
- detectar cuellos de botella por etapa;
- facilitar auditoria tecnica y regulatoria;
- reducir horas de analisis cuando aparece una incidencia.

### Lectura ejecutiva de la ventaja
Si hubiera que resumir el beneficio con una sola idea, seria esta: en dominios financieros, la arquitectura orientada a eventos no solo ayuda a escalar; ayuda a gobernar el sistema.

Escalar importa, pero no es lo unico:
- importa entender cada estado de una operacion;
- importa aislar fallos sin derribar el proceso entero;
- importa auditar con precision;
- importa evolucionar reglas sin romper el flujo completo.

En otras palabras, esta arquitectura no solo compra rendimiento. Compra claridad operacional, control del riesgo y capacidad de cambio.

## 7. Modelo central: `MfaEventContext`

El cambio conceptual mas importante entre ramas es la introduccion de [`MfaEventContext.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/domain/model/MfaEventContext.java).

Este objeto viaja de un evento al siguiente y acumula estado del flujo:

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MfaEventContext {
    private String username;
    private String password;
    private String challengeId;
    private String otpCode;
    private String otpCodeReceived;
    private TokenResponseDto token;
    private MfaStatus status;

    @Builder.Default
    private boolean mfaRequired = true;
}
```

Rol de cada campo:
- `username`, `password`: entrada del flujo `/start`.
- `token`: token real obtenido desde Keycloak antes de completar MFA.
- `mfaRequired`: resultado de la politica.
- `otpCode`: OTP generado internamente.
- `otpCodeReceived`: OTP enviado por el cliente en `/verify`.
- `challengeId`: identificador del reto.
- `status`: estado funcional del proceso.

## 8. Endpoints nuevos

### `POST /api/v1/auth/mfa/start`
Recibe credenciales, valida al usuario, decide si requiere MFA, genera OTP y crea el challenge.

Request:
```json
{
  "username": "user1",
  "password": "password123"
}
```

Response:
```json
{
  "challengeId": "mfa-7f8a9b12",
  "status": "PENDING_MFA"
}
```

### `POST /api/v1/auth/mfa/verify`
Recibe el `challengeId` y el OTP, carga el contexto asociado, valida el codigo y devuelve el token final.

Request:
```json
{
  "challengeId": "mfa-7f8a9b12",
  "otpCode": "123456"
}
```

Response:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 300
}
```

## 9. Flujo `start` paso a paso

### Secuencia
```mermaid
sequenceDiagram
    participant C as Cliente
    participant R as MfaResource
    participant EB as Event Bus
    participant V as credentials.validate
    participant P as policy.evaluate
    participant O as otp.generate
    participant G as challenge.generate
    participant S as challengeStore

    C->>R: POST /mfa/start
    R->>EB: request(credentials.validate, context)
    EB->>V: context
    V->>V: authenticate(username, password)
    V-->>EB: context + token
    EB->>P: context
    P-->>EB: context + mfaRequired
    EB->>O: context
    O-->>EB: context + otpCode
    EB->>G: context
    G->>S: guardar context por challengeId
    G-->>EB: context + challengeId
    EB-->>R: context final
    R-->>C: 200 + challengeId + PENDING_MFA
```

### Eventos del flujo `start`
1. `security.mfa.credentials.validate`
   - Consumer bloqueante.
   - Valida credenciales contra `AuthenticationPort`.
   - Guarda el token en el contexto.
2. `security.mfa.policy.evaluate`
   - Decide si el usuario necesita MFA.
   - En la implementacion de `session6-dev`, `admin` no requiere MFA.
3. `security.mfa.otp.generate`
   - Genera OTP si la politica lo requiere.
4. `security.mfa.challenge.generate`
   - Genera `challengeId`.
   - Persiste el contexto en `challengeStore`.

### Como se comporta cada paso de `start`

#### 1. `credentials.validate`
Este es el primer filtro real del flujo. Su responsabilidad es autenticar las credenciales recibidas contra el proveedor de identidad.

Entrada esperada:
- `username`
- `password`

Salida:
- el mismo `MfaEventContext`, ahora enriquecido con `token`

Comportamiento:
- si las credenciales son correctas, el consumer obtiene el token real desde `AuthenticationPort`;
- ese token se guarda temporalmente en el contexto para reutilizarlo al final del MFA;
- el password deja de ser informacion util una vez pasada esta etapa, por eso este paso marca una frontera clara entre entrada sensible y estado de proceso.

Idea clave:
- este paso no responde todavia al cliente;
- solo confirma que el usuario ya demostro el primer factor.

#### 2. `policy.evaluate`
Aqui el sistema decide si el segundo factor es obligatorio. Este paso no valida OTP ni toca infraestructura externa; solo aplica una regla de negocio.

Entrada esperada:
- `username`
- `token`

Salida:
- el mismo contexto con `mfaRequired` y `status`

Comportamiento:
- si el usuario requiere MFA, el contexto sigue por la ruta completa;
- si no lo requiere, el contexto igualmente avanza, pero con una bandera que condiciona el comportamiento posterior;
- en `session6-dev`, el caso didactico usado es que `admin` no requiere MFA.

Idea clave:
- separar politica de autenticacion evita mezclar reglas de negocio con detalles tecnicos;
- autenticar no es lo mismo que decidir el nivel de seguridad que aplica.

#### 3. `otp.generate`
Este paso genera el codigo OTP, pero solo si la politica determino que hace falta MFA.

Entrada esperada:
- `username`
- `mfaRequired`

Salida:
- el contexto con `otpCode` si aplica MFA

Comportamiento:
- si `mfaRequired = true`, genera un OTP de 6 digitos y lo registra en el contexto;
- si `mfaRequired = false`, simplemente no genera OTP y deja el flujo avanzar;
- en la demo el envio es simulado mediante logs.

Idea clave:
- este paso demuestra que no todos los consumers transforman siempre el contexto del mismo modo;
- algunos pasos son condicionales y reaccionan segun el estado que dejaron pasos anteriores.

#### 4. `challenge.generate`
Este paso materializa el reto MFA. Convierte el estado acumulado en una referencia concreta que el cliente puede usar despues en `/verify`.

Entrada esperada:
- `username`
- `token`
- `otpCode`
- `mfaRequired`

Salida:
- el contexto con `challengeId`
- almacenamiento temporal del contexto en `challengeStore`

Comportamiento:
- crea un `challengeId` unico;
- asocia ese identificador al contexto actual;
- guarda el contexto en memoria para que pueda recuperarse despues;
- devuelve al cliente el `challengeId` y el estado `PENDING_MFA`.

Idea clave:
- aqui termina la primera mitad del proceso;
- el sistema ya autentico el primer factor, ya decidio la politica y ya dejo preparado el estado de continuidad del flujo.

## 10. Flujo `verify` paso a paso

### Secuencia
```mermaid
sequenceDiagram
    participant C as Cliente
    participant R as MfaResource
    participant EB as Event Bus
    participant L as challenge.load
    participant V as otp.verify
    participant F as login.complete
    participant S as challengeStore

    C->>R: POST /mfa/verify
    R->>EB: request(challenge.load, context)
    EB->>L: context(challengeId, otpCodeReceived)
    L->>S: leer context
    L-->>EB: context recuperado
    EB->>V: context
    V-->>EB: context validado
    EB->>F: context
    F->>S: eliminar challengeId
    F-->>EB: TokenResponseDto
    EB-->>R: token
    R-->>C: 200 + token final
```

### Eventos del flujo `verify`
1. `security.mfa.challenge.load`
   - Consumer bloqueante.
   - Recupera el contexto guardado en memoria.
   - Copia `otpCodeReceived` al contexto persistido.
2. `security.mfa.otp.verify`
   - Si `mfaRequired = true`, compara OTP generado vs OTP recibido.
   - Si no aplica MFA, deja pasar el flujo.
3. `security.mfa.login.complete`
   - Recupera el token que ya estaba en el contexto.
   - Limpia el challenge almacenado.

### Como se comporta cada paso de `verify`

#### 1. `challenge.load`
Este paso rehidrata el flujo. El cliente solo trae `challengeId` y `otpCode`, pero el sistema necesita reconstruir el contexto completo que quedo guardado en `/start`.

Entrada esperada:
- `challengeId`
- `otpCodeReceived`

Salida:
- el contexto previamente almacenado, ya enriquecido con el OTP recibido del cliente

Comportamiento:
- busca el `challengeId` en `challengeStore`;
- si no existe, el flujo falla con error porque el reto es invalido o ya no esta disponible;
- si existe, copia el OTP enviado por el cliente al contexto recuperado.

Idea clave:
- este paso no valida el OTP;
- solo reconstruye el estado necesario para que el siguiente consumer tome la decision correcta.

#### 2. `otp.verify`
Aqui ocurre la validacion funcional del segundo factor. Este es el punto donde el sistema compara lo que esperaba con lo que realmente envio el cliente.

Entrada esperada:
- `otpCode`
- `otpCodeReceived`
- `mfaRequired`

Salida:
- el contexto marcado como autenticado

Comportamiento:
- si el usuario requiere MFA, compara OTP generado y OTP recibido;
- si no coinciden, lanza error de autenticacion;
- si coinciden, marca el flujo como `AUTHENTICATED`;
- si `mfaRequired = false`, el paso no compara OTP y deja pasar el flujo.

Idea clave:
- este consumer representa la validacion del segundo factor, no la autenticacion completa;
- la autenticacion completa se concreta en el siguiente paso, cuando se libera el token final.

#### 3. `login.complete`
Este es el cierre del flujo. Aqui ya no se decide nada; se consolida el resultado.

Entrada esperada:
- contexto autenticado
- token guardado desde `credentials.validate`

Salida:
- `TokenResponseDto`

Comportamiento:
- recupera el token del contexto;
- si el token no esta, el flujo se considera inconsistente y falla;
- elimina el challenge del almacenamiento temporal para evitar reutilizacion;
- devuelve al cliente el token final.

Idea clave:
- este paso cierra el ciclo de MFA;
- el token no se vuelve a pedir a Keycloak, simplemente se libera el token ya obtenido al principio una vez que el segundo factor fue satisfecho.

### Lectura conceptual del flujo completo
- `start` prepara el proceso: autentica, decide politica, genera OTP y crea el challenge.
- `verify` resuelve el proceso: recupera estado, valida OTP y entrega el token final.

Dicho de otro modo:
- `start` construye la promesa de autenticacion;
- `verify` convierte esa promesa en una sesion autenticada.

## 11. Direcciones del Event Bus

Las direcciones nuevas introducidas por `session6-dev` son:

| Direccion | Tipo | Responsabilidad |
|---|---|---|
| `security.mfa.credentials.validate` | request/reply | Validar credenciales y guardar token |
| `security.mfa.policy.evaluate` | request/reply | Resolver si aplica MFA |
| `security.mfa.otp.generate` | request/reply | Generar OTP si es necesario |
| `security.mfa.challenge.generate` | request/reply | Crear challenge y persistir contexto |
| `security.mfa.challenge.load` | request/reply | Recuperar challenge/contexto |
| `security.mfa.otp.verify` | request/reply | Validar OTP recibido |
| `security.mfa.login.complete` | request/reply | Entregar token final y cerrar flujo |

## 12. Consumers bloqueantes vs no bloqueantes

### Consumers no bloqueantes
Ejemplos:
- `security.mfa.policy.evaluate`
- `security.mfa.otp.generate`
- `security.mfa.challenge.generate`
- `security.mfa.otp.verify`
- `security.mfa.login.complete`

Estos deben ser rapidos y no bloquear el event loop.

### Consumers bloqueantes
Ejemplos:
- `security.mfa.credentials.validate`
- `security.mfa.challenge.load`

Motivo:
- `credentials.validate` invoca autenticacion externa.
- `challenge.load` representa un punto natural de I/O si el storage en el futuro pasa a BD o Redis.

## 13. Manejo de errores y `ReplyException`

Cuando un consumer lanza una excepcion dentro de `@ConsumeEvent`, el error no siempre llega a REST como `WebApplicationException` original. Al cruzar el Event Bus, Quarkus/Vert.x puede envolverlo en `ReplyException`.

Por eso `session6-dev` agrega soporte en [`GlobalExceptionMapper.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/infrastructure/adapters/in/rest/exception/GlobalExceptionMapper.java):
- reconoce `ReplyException`;
- inspecciona el mensaje;
- devuelve una respuesta JSON consistente al cliente.

### Flujo de error simplificado
```mermaid
flowchart LR
    A[Consumer @ConsumeEvent] --> B[Lanza excepcion]
    B --> C[Event Bus envuelve en ReplyException]
    C --> D[MfaResource falla]
    D --> E[GlobalExceptionMapper]
    E --> F[HTTP JSON error]
```

## 14. Archivos nuevos o modificados en `session6-dev`

### Nuevos
- [`MfaEventConsumers.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/application/service/MfaEventConsumers.java)
- [`MfaEventContext.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/domain/model/MfaEventContext.java)
- [`MfaChallenge.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/domain/model/MfaChallenge.java)
- [`MfaStatus.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/domain/model/enums/MfaStatus.java)
- [`MfaResource.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/infrastructure/adapters/in/rest/MfaResource.java)
- [`MfaStartRequestDto.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/infrastructure/adapters/in/rest/dto/request/MfaStartRequestDto.java)
- [`MfaVerifyRequestDto.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/infrastructure/adapters/in/rest/dto/request/MfaVerifyRequestDto.java)
- [`MfaStartResponseDto.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/infrastructure/adapters/in/rest/dto/response/MfaStartResponseDto.java)
- [`MfaVerifyResponseDto.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/infrastructure/adapters/in/rest/dto/response/MfaVerifyResponseDto.java)

### Modificados
- [`build.gradle.kts`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/build.gradle.kts)
- [`gradle.properties`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/gradle.properties)
- [`GlobalExceptionMapper.java`](/C:/Users/XAVIER%20GARNICA/Desktop/ATOMKODE/TRAINER/BACKEND/cja-msa-sc-security/src/main/java/cja/msa/sc/security/infrastructure/adapters/in/rest/exception/GlobalExceptionMapper.java)

## 15. Decisiones de diseno visibles en la rama

### 1. Estado temporal en memoria
Se usa `ConcurrentMap<String, MfaEventContext>` como almacenamiento temporal. Esto simplifica la demo, pero no sirve en despliegues con multiples replicas.

### 2. Token antes de OTP
El token se obtiene en `credentials.validate` y se retiene en el contexto hasta `login.complete`. Este patron simplifica el ejercicio, aunque en un sistema real podria requerir controles extra de expiracion y seguridad.

### 3. Contexto mutable
`MfaEventContext` es mutable porque cada consumer agrega informacion al mismo objeto. Para un flujo didactico esto reduce ruido. En un sistema mas estricto podrian preferirse eventos inmutables por etapa.

## 16. Relacion con arquitectura de microservicios

Este diseno es una puerta de entrada a EDA, pero todavia en modo local:
- hoy: mensajes dentro del mismo proceso;
- manana: algunos eventos podrian salir a Kafka;
- hoy: `challengeStore` en memoria;
- manana: `challengeStore` en Redis;
- hoy: orquestacion directa desde un resource;
- manana: un saga/orchestrator o un process manager.

La leccion importante es que el contrato por mensaje ya existe. Cambiar el transporte despues es mas facil cuando el flujo ya esta partido en eventos.

## 17. Limitaciones del ejemplo
- No hay expiracion real de challenge.
- No hay OTP delivery real por SMS o email.
- No hay almacenamiento distribuido.
- No hay reintentos ni deduplicacion.
- `MfaVerifyResponseDto` existe en la rama, pero el endpoint `/verify` devuelve realmente `TokenResponseDto`.
- La inferencia de errores basada en `ReplyException` sigue siendo una aproximacion tecnica, no un contrato de negocio robusto.

## 18. Resumen

`session6-dev` agrega mucho mas que MFA. Agrega un nuevo estilo de organizacion del flujo:
- la API deja de ejecutar toda la logica de forma monolitica;
- el proceso se divide en eventos pequenos;
- el contexto viaja entre consumers;
- los errores deben entender el paso por Event Bus;
- la sesion introduce bases reales para avanzar luego a patrones EDA distribuidos.

AIzaSyBTisIjWIwBfXVaVpdPkedT8wRynFmRrIE