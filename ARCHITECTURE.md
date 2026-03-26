> Traducido de [garrytan/gstack](https://github.com/garrytan/gstack). Original en inglés por Garry Tan.

# Arquitectura

Este documento explica **por qué** gstack está construido de la forma en que lo está. Para la configuración y los comandos, consulta CLAUDE.md. Para contribuir, consulta CONTRIBUTING.md.

## La idea central

gstack proporciona a Claude Code un navegador persistente y un conjunto de skills de flujo de trabajo con criterio propio. El navegador es la parte difícil — todo lo demás es Markdown.

La idea clave: un agente de IA que interactúa con un navegador necesita **latencia inferior al segundo** y **estado persistente**. Si cada comando arranca un navegador desde cero, esperas 3-5 segundos por cada llamada a herramienta. Si el navegador muere entre comandos, pierdes cookies, pestañas y sesiones de inicio de sesión. Por eso gstack ejecuta un daemon de Chromium de larga duración con el que el CLI se comunica a través de HTTP en localhost.

```
Claude Code                     gstack
─────────                      ──────
                               ┌──────────────────────┐
  Tool call: $B snapshot -i    │  CLI (compiled binary)│
  ─────────────────────────→   │  • reads state file   │
                               │  • POST /command      │
                               │    to localhost:PORT   │
                               └──────────┬───────────┘
                                          │ HTTP
                               ┌──────────▼───────────┐
                               │  Server (Bun.serve)   │
                               │  • dispatches command  │
                               │  • talks to Chromium   │
                               │  • returns plain text  │
                               └──────────┬───────────┘
                                          │ CDP
                               ┌──────────▼───────────┐
                               │  Chromium (headless)   │
                               │  • persistent tabs     │
                               │  • cookies carry over  │
                               │  • 30min idle timeout  │
                               └───────────────────────┘
```

La primera llamada arranca todo (~3s). Cada llamada posterior: ~100-200ms.

## Por qué Bun

Node.js funcionaría. Bun es mejor aquí por tres razones:

1. **Binarios compilados.** `bun build --compile` produce un único ejecutable de ~58MB. Sin `node_modules` en tiempo de ejecución, sin `npx`, sin configuración de PATH. El binario simplemente funciona. Esto importa porque gstack se instala en `~/.claude/skills/` donde los usuarios no esperan tener que gestionar un proyecto Node.js.

2. **SQLite nativo.** La desencriptación de cookies lee la base de datos SQLite de cookies de Chromium directamente. Bun trae `new Database()` integrado — sin `better-sqlite3`, sin compilación de addons nativos, sin gyp. Una cosa menos que puede fallar en diferentes máquinas.

3. **TypeScript nativo.** El servidor se ejecuta como `bun run server.ts` durante el desarrollo. Sin paso de compilación, sin `ts-node`, sin source maps que depurar. El binario compilado es para despliegue; los archivos fuente son para desarrollo.

4. **Servidor HTTP integrado.** `Bun.serve()` es rápido, simple y no necesita Express ni Fastify. El servidor gestiona unas ~10 rutas en total. Un framework sería sobrecarga innecesaria.

El cuello de botella siempre es Chromium, no el CLI ni el servidor. La velocidad de arranque de Bun (~1ms para el binario compilado vs ~100ms para Node) es agradable pero no es la razón por la que lo elegimos. Lo son el binario compilado y el SQLite nativo.

## El modelo de daemon

### ¿Por qué no arrancar un navegador por comando?

Playwright puede lanzar Chromium en ~2-3 segundos. Para una sola captura de pantalla, está bien. Para una sesión de QA con más de 20 comandos, son más de 40 segundos de sobrecarga de arranque del navegador. Peor aún: pierdes todo el estado entre comandos. Cookies, localStorage, sesiones de inicio de sesión, pestañas abiertas — todo desaparece.

El modelo de daemon significa:

- **Estado persistente.** Inicia sesión una vez, permanece con la sesión iniciada. Abre una pestaña, permanece abierta. localStorage persiste entre comandos.
- **Comandos en menos de un segundo.** Después de la primera llamada, cada comando es simplemente un HTTP POST. ~100-200ms de ida y vuelta incluyendo el trabajo de Chromium.
- **Ciclo de vida automático.** El servidor se inicia automáticamente en el primer uso y se apaga automáticamente tras 30 minutos de inactividad. No se necesita gestión de procesos.

### Archivo de estado

El servidor escribe `.gstack/browse.json` (escritura atómica mediante tmp + rename, modo 0o600):

```json
{ "pid": 12345, "port": 34567, "token": "uuid-v4", "startedAt": "...", "binaryVersion": "abc123" }
```

El CLI lee este archivo para localizar el servidor. Si el archivo no existe o el servidor falla en la comprobación de salud HTTP, el CLI lanza un nuevo servidor. En Windows, la detección de procesos basada en PID no es fiable en binarios de Bun, por lo que la comprobación de salud (GET /health) es la señal principal de actividad en todas las plataformas.

### Selección de puerto

Puerto aleatorio entre 10000-60000 (hasta 5 reintentos en caso de colisión). Esto significa que 10 workspaces de Conductor pueden ejecutar cada uno su propio daemon de navegador con cero configuración y cero conflictos de puertos. El enfoque anterior (escanear 9400-9409) fallaba constantemente en configuraciones multi-workspace.

### Reinicio automático por versión

El build escribe `git rev-parse HEAD` en `browse/dist/.version`. En cada invocación del CLI, si la versión del binario no coincide con el `binaryVersion` del servidor en ejecución, el CLI mata el servidor antiguo e inicia uno nuevo. Esto previene completamente la clase de bugs de "binario obsoleto" — recompila el binario, el siguiente comando lo recoge automáticamente.

## Modelo de seguridad

### Solo localhost

El servidor HTTP se enlaza a `localhost`, no a `0.0.0.0`. No es accesible desde la red.

### Autenticación con bearer token

Cada sesión del servidor genera un token UUID aleatorio, escrito en el archivo de estado con modo 0o600 (lectura solo para el propietario). Cada solicitud HTTP debe incluir `Authorization: Bearer <token>`. Si el token no coincide, el servidor devuelve 401.

Esto impide que otros procesos en la misma máquina se comuniquen con tu servidor de navegación. La interfaz de selección de cookies (`/cookie-picker`) y la comprobación de salud (`/health`) están exentas — son solo de localhost y no ejecutan comandos.

### Seguridad de cookies

Las cookies son los datos más sensibles que maneja gstack. El diseño:

1. **El acceso al Keychain requiere aprobación del usuario.** La primera importación de cookies por navegador activa un diálogo del Keychain de macOS. El usuario debe hacer clic en "Permitir" o "Permitir siempre". gstack nunca accede silenciosamente a las credenciales.

2. **La desencriptación ocurre en el proceso.** Los valores de las cookies se desencriptan en memoria (PBKDF2 + AES-128-CBC), se cargan en el contexto de Playwright y nunca se escriben en disco en texto plano. La interfaz de selección de cookies nunca muestra los valores de las cookies — solo nombres de dominio y recuentos.

3. **La base de datos es de solo lectura.** gstack copia la base de datos de cookies de Chromium a un archivo temporal (para evitar conflictos de bloqueo de SQLite con el navegador en ejecución) y la abre en modo de solo lectura. Nunca modifica la base de datos de cookies de tu navegador real.

4. **La caché de claves es por sesión.** La contraseña del Keychain y la clave AES derivada se almacenan en caché en memoria durante la vida del servidor. Cuando el servidor se apaga (timeout por inactividad o parada explícita), la caché desaparece.

5. **Sin valores de cookies en los logs.** Los logs de consola, red y diálogos nunca contienen valores de cookies. El comando `cookies` genera metadatos de cookies (dominio, nombre, caducidad) pero los valores se truncan.

### Prevención de inyección de shell

El registro de navegadores (Comet, Chrome, Arc, Brave, Edge) está hardcodeado. Las rutas a las bases de datos se construyen a partir de constantes conocidas, nunca de la entrada del usuario. El acceso al Keychain usa `Bun.spawn()` con arrays de argumentos explícitos, no interpolación de cadenas de shell.

## El sistema de refs

Los refs (`@e1`, `@e2`, `@c1`) son la forma en que el agente se dirige a los elementos de la página sin escribir CSS selectors ni XPath.

### Cómo funciona

```
1. Agent runs: $B snapshot -i
2. Server calls Playwright's page.accessibility.snapshot()
3. Parser walks the ARIA tree, assigns sequential refs: @e1, @e2, @e3...
4. For each ref, builds a Playwright Locator: getByRole(role, { name }).nth(index)
5. Stores Map<string, RefEntry> on the BrowserManager instance (role + name + Locator)
6. Returns the annotated tree as plain text

Later:
7. Agent runs: $B click @e3
8. Server resolves @e3 → Locator → locator.click()
```

### Por qué Locators y no mutación del DOM

El enfoque obvio sería inyectar atributos `data-ref="@e1"` en el DOM. Esto falla con:

- **CSP (Content Security Policy).** Muchos sitios en producción bloquean la modificación del DOM desde scripts.
- **Hidratación de React/Vue/Svelte.** La reconciliación del framework puede eliminar los atributos inyectados.
- **Shadow DOM.** No se puede acceder al interior de shadow roots desde el exterior.

Los Locators de Playwright son externos al DOM. Usan el árbol de accesibilidad (que Chromium mantiene internamente) y consultas `getByRole()`. Sin mutación del DOM, sin problemas de CSP, sin conflictos con frameworks.

### Ciclo de vida de los refs

Los refs se limpian en la navegación (el evento `framenavigated` en el frame principal). Esto es correcto — después de la navegación, todos los locators están obsoletos. El agente debe ejecutar `snapshot` de nuevo para obtener refs actualizados. Esto es por diseño: los refs obsoletos deben fallar de forma ruidosa, no hacer clic en el elemento equivocado.

### Detección de obsolescencia de refs

Las SPAs pueden mutar el DOM sin disparar `framenavigated` (por ejemplo, transiciones de React router, cambios de pestaña, apertura de modales). Esto hace que los refs queden obsoletos aunque la URL de la página no haya cambiado. Para detectar esto, `resolveRef()` realiza una comprobación asíncrona con `count()` antes de usar cualquier ref:

```
resolveRef(@e3) → entry = refMap.get("e3")
                → count = await entry.locator.count()
                → if count === 0: throw "Ref @e3 is stale — element no longer exists. Run 'snapshot' to get fresh refs."
                → if count > 0: return { locator }
```

Esto falla rápidamente (~5ms de sobrecarga) en lugar de dejar que expire el timeout de acción de 30 segundos de Playwright sobre un elemento ausente. El `RefEntry` almacena metadatos de `role` y `name` junto al Locator para que el mensaje de error pueda indicar al agente qué era el elemento.

### Refs interactivos por cursor (@c)

El flag `-C` encuentra elementos que son clicables pero no están en el árbol ARIA — cosas con estilo `cursor: pointer`, elementos con atributos `onclick` o `tabindex` personalizado. Estos obtienen refs `@c1`, `@c2` en un namespace separado. Esto captura componentes personalizados que los frameworks renderizan como `<div>` pero que en realidad son botones.

## Arquitectura de logging

Tres buffers circulares (50.000 entradas cada uno, O(1) al insertar):

```
Browser events → CircularBuffer (in-memory) → Async flush to .gstack/*.log
```

Los mensajes de consola, las solicitudes de red y los eventos de diálogo tienen cada uno su propio buffer. El vaciado a disco ocurre cada 1 segundo — el servidor solo añade las entradas nuevas desde el último vaciado. Esto significa:

- El manejo de solicitudes HTTP nunca se bloquea por I/O de disco
- Los logs sobreviven a caídas del servidor (con hasta 1 segundo de pérdida de datos)
- La memoria está acotada (50K entradas x 3 buffers)
- Los archivos en disco son de solo escritura incremental, legibles por herramientas externas

Los comandos `console`, `network` y `dialog` leen de los buffers en memoria, no del disco. Los archivos en disco son para depuración post-mortem.

## Sistema de plantillas SKILL.md

### El problema

Los archivos SKILL.md le dicen a Claude cómo usar los comandos de navegación. Si la documentación lista un flag que no existe, o se olvida de un comando que se añadió, el agente encuentra errores. La documentación mantenida a mano siempre se desfasa del código.

### La solución

```
SKILL.md.tmpl          (human-written prose + placeholders)
       ↓
gen-skill-docs.ts      (reads source code metadata)
       ↓
SKILL.md               (committed, auto-generated sections)
```

Las plantillas contienen los flujos de trabajo, consejos y ejemplos que requieren juicio humano. Los placeholders se rellenan desde el código fuente en tiempo de build:

| Placeholder | Fuente | Qué genera |
|-------------|--------|------------|
| `{{COMMAND_REFERENCE}}` | `commands.ts` | Tabla categorizada de comandos |
| `{{SNAPSHOT_FLAGS}}` | `snapshot.ts` | Referencia de flags con ejemplos |
| `{{PREAMBLE}}` | `gen-skill-docs.ts` | Bloque de inicio: comprobación de actualizaciones, seguimiento de sesiones, modo contribuidor, formato AskUserQuestion |
| `{{BROWSE_SETUP}}` | `gen-skill-docs.ts` | Descubrimiento del binario + instrucciones de configuración |
| `{{BASE_BRANCH_DETECT}}` | `gen-skill-docs.ts` | Detección dinámica de la rama base para skills orientadas a PR (ship, review, qa, plan-ceo-review) |
| `{{QA_METHODOLOGY}}` | `gen-skill-docs.ts` | Bloque compartido de metodología QA para /qa y /qa-only |
| `{{DESIGN_METHODOLOGY}}` | `gen-skill-docs.ts` | Metodología compartida de auditoría de diseño para /plan-design-review y /design-review |
| `{{REVIEW_DASHBOARD}}` | `gen-skill-docs.ts` | Dashboard de preparación para revisión para el pre-vuelo de /ship |
| `{{TEST_BOOTSTRAP}}` | `gen-skill-docs.ts` | Detección de framework de tests, bootstrap, configuración de CI/CD para /qa, /ship, /design-review |
| `{{CODEX_PLAN_REVIEW}}` | `gen-skill-docs.ts` | Revisión opcional de plan cross-model (Codex o fallback a subagente Claude) para /plan-ceo-review y /plan-eng-review |

Esto es estructuralmente sólido — si un comando existe en el código, aparece en la documentación. Si no existe, no puede aparecer.

### El preámbulo

Cada skill comienza con un bloque `{{PREAMBLE}}` que se ejecuta antes de la lógica propia de la skill. Gestiona cinco cosas en un solo comando bash:

1. **Comprobación de actualizaciones** — llama a `gstack-update-check`, informa si hay una actualización disponible.
2. **Seguimiento de sesiones** — toca `~/.gstack/sessions/$PPID` y cuenta las sesiones activas (archivos modificados en las últimas 2 horas). Cuando hay 3+ sesiones ejecutándose, todas las skills entran en "modo ELI16" — cada pregunta recontextualiza al usuario porque está haciendo malabarismos entre ventanas.
3. **Modo contribuidor** — lee `gstack_contributor` de la configuración. Cuando es true, el agente registra informes de campo informales en `~/.gstack/contributor-logs/` cuando gstack falla.
4. **Formato AskUserQuestion** — formato universal: contexto, pregunta, `RECOMMENDATION: Choose X because ___`, opciones con letras. Consistente en todas las skills.
5. **Buscar antes de construir** — antes de construir infraestructura o patrones desconocidos, buscar primero. Tres capas de conocimiento: probado y comprobado (Capa 1), nuevo y popular (Capa 2), primeros principios (Capa 3). Cuando el razonamiento desde primeros principios revela que la sabiduría convencional está equivocada, el agente nombra el "momento eureka" y lo registra. Consulta `ETHOS.md` para la filosofía completa del constructor.

### ¿Por qué se commitea en lugar de generarse en tiempo de ejecución?

Tres razones:

1. **Claude lee SKILL.md al cargar la skill.** No hay paso de build cuando un usuario invoca `/browse`. El archivo ya debe existir y ser correcto.
2. **CI puede validar la frescura.** `gen:skill-docs --dry-run` + `git diff --exit-code` detecta documentación obsoleta antes del merge.
3. **Git blame funciona.** Puedes ver cuándo se añadió un comando y en qué commit.

### Niveles de pruebas de plantillas

| Nivel | Qué | Coste | Velocidad |
|-------|-----|-------|-----------|
| 1 — Validación estática | Parsear cada comando `$B` en SKILL.md, validar contra el registro | Gratis | <2s |
| 2 — E2E via `claude -p` | Lanzar sesión real de Claude, ejecutar cada skill, comprobar errores | ~$3.85 | ~20min |
| 3 — LLM como juez | Sonnet puntúa la documentación en claridad/completitud/accionabilidad | ~$0.15 | ~30s |

El nivel 1 se ejecuta en cada `bun test`. Los niveles 2+3 están protegidos tras `EVALS=1`. La idea es: capturar el 95% de los problemas gratis, usar LLMs solo para juicios de valor.

## Despacho de comandos

Los comandos se categorizan por efectos secundarios:

- **READ** (text, html, links, console, cookies, ...): Sin mutaciones. Seguros de reintentar. Devuelven el estado de la página.
- **WRITE** (goto, click, fill, press, ...): Mutan el estado de la página. No son idempotentes.
- **META** (snapshot, screenshot, tabs, chain, ...): Operaciones a nivel de servidor que no encajan limpiamente en lectura/escritura.

Esto no es solo organizativo. El servidor lo usa para el despacho:

```typescript
if (READ_COMMANDS.has(cmd))  → handleReadCommand(cmd, args, bm)
if (WRITE_COMMANDS.has(cmd)) → handleWriteCommand(cmd, args, bm)
if (META_COMMANDS.has(cmd))  → handleMetaCommand(cmd, args, bm, shutdown)
```

El comando `help` devuelve los tres conjuntos para que los agentes puedan auto-descubrir los comandos disponibles.

## Filosofía de errores

Los errores son para agentes de IA, no para humanos. Cada mensaje de error debe ser accionable:

- "Element not found" -> "Element not found or not interactable. Run `snapshot -i` to see available elements."
- "Selector matched multiple elements" -> "Selector matched multiple elements. Use @refs from `snapshot` instead."
- Timeout -> "Navigation timed out after 30s. The page may be slow or the URL may be wrong."

Los errores nativos de Playwright se reescriben a través de `wrapError()` para eliminar stack traces internos y añadir orientación. El agente debería poder leer el error y saber qué hacer a continuación sin intervención humana.

### Recuperación ante caídas

El servidor no intenta auto-repararse. Si Chromium se cae (`browser.on('disconnected')`), el servidor sale inmediatamente. El CLI detecta el servidor muerto en el siguiente comando y lo reinicia automáticamente. Esto es más simple y más fiable que intentar reconectarse a un proceso de navegador medio muerto.

## Infraestructura de pruebas E2E

### Session runner (`test/helpers/session-runner.ts`)

Las pruebas E2E lanzan `claude -p` como un subproceso completamente independiente — no a través del Agent SDK, que no puede anidarse dentro de sesiones de Claude Code. El runner:

1. Escribe el prompt en un archivo temporal (evita problemas de escape de shell)
2. Lanza `sh -c 'cat prompt | claude -p --output-format stream-json --verbose'`
3. Transmite NDJSON desde stdout para progreso en tiempo real
4. Compite contra un timeout configurable
5. Parsea la transcripción NDJSON completa en resultados estructurados

La función `parseNDJSON()` es pura — sin I/O, sin efectos secundarios — lo que la hace testeable de forma independiente.

### Flujo de datos de observabilidad

```
  skill-e2e-*.test.ts
        │
        │ generates runId, passes testName + runId to each call
        │
  ┌─────┼──────────────────────────────┐
  │     │                              │
  │  runSkillTest()              evalCollector
  │  (session-runner.ts)         (eval-store.ts)
  │     │                              │
  │  per tool call:              per addTest():
  │  ┌──┼──────────┐              savePartial()
  │  │  │          │                   │
  │  ▼  ▼          ▼                   ▼
  │ [HB] [PL]    [NJ]          _partial-e2e.json
  │  │    │        │             (atomic overwrite)
  │  │    │        │
  │  ▼    ▼        ▼
  │ e2e-  prog-  {name}
  │ live  ress   .ndjson
  │ .json .log
  │
  │  on failure:
  │  {name}-failure.json
  │
  │  ALL files in ~/.gstack-dev/
  │  Run dir: e2e-runs/{runId}/
  │
  │         eval-watch.ts
  │              │
  │        ┌─────┴─────┐
  │     read HB     read partial
  │        └─────┬─────┘
  │              ▼
  │        render dashboard
  │        (stale >10min? warn)
```

**Propiedad dividida:** session-runner es dueño del heartbeat (estado actual del test), eval-store es dueño de los resultados parciales (estado de tests completados). El watcher lee ambos. Ningún componente sabe del otro — comparten datos solo a través del sistema de archivos.

**Todo es no-fatal:** Todo el I/O de observabilidad está envuelto en try/catch. Un fallo de escritura nunca causa que un test falle. Los propios tests son la fuente de verdad; la observabilidad es de mejor esfuerzo.

**Diagnósticos legibles por máquina:** Cada resultado de test incluye `exit_reason` (success, timeout, error_max_turns, error_api, exit_code_N), `timeout_at_turn` y `last_tool_call`. Esto permite consultas con `jq` como:
```bash
jq '.tests[] | select(.exit_reason == "timeout") | .last_tool_call' ~/.gstack-dev/evals/_partial-e2e.json
```

### Persistencia de evals (`test/helpers/eval-store.ts`)

El `EvalCollector` acumula resultados de tests y los escribe de dos formas:

1. **Incremental:** `savePartial()` escribe `_partial-e2e.json` después de cada test (atómico: escribe `.tmp`, `fs.renameSync`). Sobrevive a kills.
2. **Final:** `finalize()` escribe un archivo de eval con marca de tiempo (por ejemplo, `e2e-20260314-143022.json`). El archivo parcial nunca se limpia — persiste junto al archivo final para observabilidad.

`eval:compare` compara dos ejecuciones de eval. `eval:summary` agrega estadísticas de todas las ejecuciones en `~/.gstack-dev/evals/`.

### Niveles de pruebas

| Nivel | Qué | Coste | Velocidad |
|-------|-----|-------|-----------|
| 1 — Validación estática | Parsear comandos `$B`, validar contra el registro, tests unitarios de observabilidad | Gratis | <5s |
| 2 — E2E via `claude -p` | Lanzar sesión real de Claude, ejecutar cada skill, buscar errores | ~$3.85 | ~20min |
| 3 — LLM como juez | Sonnet puntúa la documentación en claridad/completitud/accionabilidad | ~$0.15 | ~30s |

El nivel 1 se ejecuta en cada `bun test`. Los niveles 2+3 están protegidos tras `EVALS=1`. La idea: capturar el 95% de los problemas gratis, usar LLMs solo para juicios de valor y pruebas de integración.

## Lo que intencionalmente no está aquí

- **Sin streaming por WebSocket.** HTTP request/response es más simple, depurable con curl y suficientemente rápido. El streaming añadiría complejidad con beneficio marginal.
- **Sin protocolo MCP.** MCP añade sobrecarga de JSON schema por solicitud y requiere una conexión persistente. HTTP plano + salida en texto plano es más ligero en tokens y más fácil de depurar.
- **Sin soporte multi-usuario.** Un servidor por workspace, un usuario. La autenticación por token es defensa en profundidad, no multi-tenancy.
- **Sin desencriptación de cookies en Windows/Linux.** El Keychain de macOS es el único almacén de credenciales soportado. Linux (GNOME Keyring/kwallet) y Windows (DPAPI) son arquitecturalmente posibles pero no están implementados.
- **Sin soporte de iframes.** Playwright puede manejar iframes pero el sistema de refs aún no cruza los límites de frames. Esta es la funcionalidad ausente más solicitada.
