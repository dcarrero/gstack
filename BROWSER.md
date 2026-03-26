> Traducido de [garrytan/gstack](https://github.com/garrytan/gstack). Original en inglés por Garry Tan.

# Navegador — detalles técnicos

Este documento cubre la referencia de comandos y los detalles internos del navegador headless de gstack.

## Referencia de comandos

| Categoría | Comandos | Para qué |
|-----------|----------|----------|
| Navegar | `goto`, `back`, `forward`, `reload`, `url` | Ir a una página |
| Leer | `text`, `html`, `links`, `forms`, `accessibility` | Extraer contenido |
| Snapshot | `snapshot [-i] [-c] [-d N] [-s sel] [-D] [-a] [-o] [-C]` | Obtener refs, diff, anotar |
| Interactuar | `click`, `fill`, `select`, `hover`, `type`, `press`, `scroll`, `wait`, `viewport`, `upload` | Usar la página |
| Inspeccionar | `js`, `eval`, `css`, `attrs`, `is`, `console`, `network`, `dialog`, `cookies`, `storage`, `perf` | Depurar y verificar |
| Visual | `screenshot [--viewport] [--clip x,y,w,h] [sel\|@ref] [path]`, `pdf`, `responsive` | Ver lo que Claude ve |
| Comparar | `diff <url1> <url2>` | Detectar diferencias entre entornos |
| Diálogos | `dialog-accept [text]`, `dialog-dismiss` | Controlar el manejo de alert/confirm/prompt |
| Pestañas | `tabs`, `tab`, `newtab`, `closetab` | Flujos de trabajo multi-página |
| Cookies | `cookie-import`, `cookie-import-browser` | Importar cookies desde archivo o navegador real |
| Multi-paso | `chain` (JSON desde stdin) | Ejecutar comandos en lote en una sola llamada |
| Traspaso | `handoff [reason]`, `resume` | Cambiar a Chrome visible para intervención del usuario |

Todos los argumentos de selector aceptan CSS selectors, refs `@e` después de `snapshot`, o refs `@c` después de `snapshot -C`. Más de 50 comandos en total más importación de cookies.

## Cómo funciona

El navegador de gstack es un binario CLI compilado que se comunica con un daemon local persistente de Chromium a través de HTTP. El CLI es un cliente ligero — lee un archivo de estado, envía un comando e imprime la respuesta a stdout. El servidor hace el trabajo real a través de [Playwright](https://playwright.dev/).

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code                                                    │
│                                                                 │
│  "browse goto https://staging.myapp.com"                        │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐    HTTP POST     ┌──────────────┐                 │
│  │ browse   │ ──────────────── │ Bun HTTP     │                 │
│  │ CLI      │  localhost:rand  │ server       │                 │
│  │          │  Bearer token    │              │                 │
│  │ compiled │ ◄──────────────  │  Playwright  │──── Chromium    │
│  │ binary   │  plain text      │  API calls   │    (headless)   │
│  └──────────┘                  └──────────────┘                 │
│   ~1ms startup                  persistent daemon               │
│                                 auto-starts on first call       │
│                                 auto-stops after 30 min idle    │
└─────────────────────────────────────────────────────────────────┘
```

### Ciclo de vida

1. **Primera llamada**: El CLI comprueba `.gstack/browse.json` (en la raíz del proyecto) buscando un servidor en ejecución. No se encuentra ninguno — lanza `bun run browse/src/server.ts` en segundo plano. El servidor inicia Chromium headless a través de Playwright, elige un puerto aleatorio (10000-60000), genera un bearer token, escribe el archivo de estado y comienza a aceptar solicitudes HTTP. Esto tarda ~3 segundos.

2. **Llamadas posteriores**: El CLI lee el archivo de estado, envía un HTTP POST con el bearer token e imprime la respuesta. ~100-200ms de ida y vuelta.

3. **Apagado por inactividad**: Después de 30 minutos sin comandos, el servidor se apaga y limpia el archivo de estado. La siguiente llamada lo reinicia automáticamente.

4. **Recuperación ante caídas**: Si Chromium se cae, el servidor sale inmediatamente (sin auto-reparación — no ocultar fallos). El CLI detecta el servidor muerto en la siguiente llamada e inicia uno nuevo.

### Componentes clave

```
browse/
├── src/
│   ├── cli.ts              # Thin client — reads state file, sends HTTP, prints response
│   ├── server.ts           # Bun.serve HTTP server — routes commands to Playwright
│   ├── browser-manager.ts  # Chromium lifecycle — launch, tabs, ref map, crash handling
│   ├── snapshot.ts         # Accessibility tree → @ref assignment → Locator map + diff/annotate/-C
│   ├── read-commands.ts    # Non-mutating commands (text, html, links, js, css, is, dialog, etc.)
│   ├── write-commands.ts   # Mutating commands (click, fill, select, upload, dialog-accept, etc.)
│   ├── meta-commands.ts    # Server management, chain, diff, snapshot routing
│   ├── cookie-import-browser.ts  # Decrypt + import cookies from real Chromium browsers
│   ├── cookie-picker-routes.ts   # HTTP routes for interactive cookie picker UI
│   ├── cookie-picker-ui.ts       # Self-contained HTML/CSS/JS for cookie picker
│   └── buffers.ts          # CircularBuffer<T> + console/network/dialog capture
├── test/                   # Integration tests + HTML fixtures
└── dist/
    └── browse              # Compiled binary (~58MB, Bun --compile)
```

### El sistema de snapshot

La innovación clave del navegador es la selección de elementos basada en refs, construida sobre la API de árbol de accesibilidad de Playwright:

1. `page.locator(scope).ariaSnapshot()` devuelve un árbol de accesibilidad tipo YAML
2. El parser de snapshots asigna refs (`@e1`, `@e2`, ...) a cada elemento
3. Para cada ref, construye un `Locator` de Playwright (usando `getByRole` + nth-child)
4. El mapa de ref-a-Locator se almacena en `BrowserManager`
5. Comandos posteriores como `click @e3` buscan el Locator y llaman a `locator.click()`

Sin mutación del DOM. Sin scripts inyectados. Solo la API de accesibilidad nativa de Playwright.

**Detección de obsolescencia de refs:** Las SPAs pueden mutar el DOM sin navegación (React router, cambios de pestaña, modales). Cuando esto ocurre, los refs recopilados de un `snapshot` anterior pueden apuntar a elementos que ya no existen. Para manejar esto, `resolveRef()` ejecuta una comprobación asíncrona con `count()` antes de usar cualquier ref — si el recuento de elementos es 0, lanza una excepción inmediatamente con un mensaje indicando al agente que vuelva a ejecutar `snapshot`. Esto falla rápidamente (~5ms) en lugar de esperar al timeout de acción de 30 segundos de Playwright.

**Funcionalidades extendidas de snapshot:**
- `--diff` (`-D`): Almacena cada snapshot como línea base. En la siguiente llamada con `-D`, devuelve un diff unificado mostrando qué cambió. Úsalo para verificar que una acción (click, fill, etc.) realmente funcionó.
- `--annotate` (`-a`): Inyecta divs de superposición temporales en el bounding box de cada ref, toma una captura de pantalla con las etiquetas de refs visibles, y luego elimina las superposiciones. Usa `-o <path>` para controlar la ruta de salida.
- `--cursor-interactive` (`-C`): Escanea elementos interactivos no-ARIA (divs con `cursor:pointer`, `onclick`, `tabindex>=0`) usando `page.evaluate`. Asigna refs `@c1`, `@c2`... con CSS selectors deterministas de `nth-child`. Estos son elementos que el árbol ARIA omite pero los usuarios aún pueden hacer clic.

### Modos de captura de pantalla

El comando `screenshot` soporta cuatro modos:

| Modo | Sintaxis | API de Playwright |
|------|----------|-------------------|
| Página completa (por defecto) | `screenshot [path]` | `page.screenshot({ fullPage: true })` |
| Solo viewport | `screenshot --viewport [path]` | `page.screenshot({ fullPage: false })` |
| Recorte de elemento | `screenshot "#sel" [path]` o `screenshot @e3 [path]` | `locator.screenshot()` |
| Recorte de región | `screenshot --clip x,y,w,h [path]` | `page.screenshot({ clip })` |

El recorte de elemento acepta CSS selectors (`.class`, `#id`, `[attr]`) o refs `@e`/`@c` de `snapshot`. Auto-detección: prefijo `@e`/`@c` = ref, prefijo `.`/`#`/`[` = CSS selector, prefijo `--` = flag, todo lo demás = ruta de salida.

Exclusión mutua: `--clip` + selector y `--viewport` + `--clip` lanzan errores. Los flags desconocidos (por ejemplo, `--bogus`) también lanzan error.

### Autenticación

Cada sesión del servidor genera un UUID aleatorio como bearer token. El token se escribe en el archivo de estado (`.gstack/browse.json`) con chmod 600. Cada solicitud HTTP debe incluir `Authorization: Bearer <token>`. Esto impide que otros procesos en la máquina controlen el navegador.

### Captura de consola, red y diálogos

El servidor se conecta a los eventos `page.on('console')`, `page.on('response')` y `page.on('dialog')` de Playwright. Todas las entradas se mantienen en buffers circulares O(1) (capacidad de 50.000 cada uno) y se vacían a disco de forma asíncrona mediante `Bun.write()`:

- Consola: `.gstack/browse-console.log`
- Red: `.gstack/browse-network.log`
- Diálogos: `.gstack/browse-dialog.log`

Los comandos `console`, `network` y `dialog` leen de los buffers en memoria, no del disco.

### Traspaso al usuario

Cuando el navegador headless no puede continuar (CAPTCHA, MFA, autenticación compleja), `handoff` abre una ventana visible de Chrome en la misma página exacta con todas las cookies, localStorage y pestañas preservadas. El usuario resuelve el problema manualmente, y luego `resume` devuelve el control al agente con un snapshot actualizado.

```bash
$B handoff "Stuck on CAPTCHA at login page"   # opens visible Chrome
# User solves CAPTCHA...
$B resume                                       # returns to headless with fresh snapshot
```

El navegador sugiere automáticamente `handoff` después de 3 fallos consecutivos. El estado se preserva completamente durante el cambio — no es necesario volver a iniciar sesión.

### Manejo de diálogos

Los diálogos (alert, confirm, prompt) se aceptan automáticamente por defecto para prevenir bloqueos del navegador. Los comandos `dialog-accept` y `dialog-dismiss` controlan este comportamiento. Para prompts, `dialog-accept <text>` proporciona el texto de respuesta. Todos los diálogos se registran en el buffer de diálogos con tipo, mensaje y acción tomada.

### Ejecución de JavaScript (`js` y `eval`)

`js` ejecuta una sola expresión, `eval` ejecuta un archivo JS. Ambos soportan `await` — las expresiones que contienen `await` se envuelven automáticamente en un contexto asíncrono:

```bash
$B js "await fetch('/api/data').then(r => r.json())"  # works
$B js "document.title"                                  # also works (no wrapping needed)
$B eval my-script.js                                    # file with await works too
```

Para archivos `eval`, los archivos de una sola línea devuelven el valor de la expresión directamente. Los archivos de varias líneas necesitan `return` explícito cuando usan `await`. Los comentarios que contienen "await" no activan el envolvimiento.

### Soporte multi-workspace

Cada workspace obtiene su propia instancia de navegador aislada con su propio proceso de Chromium, pestañas, cookies y logs. El estado se almacena en `.gstack/` dentro de la raíz del proyecto (detectada mediante `git rev-parse --show-toplevel`).

| Workspace | Archivo de estado | Puerto |
|-----------|-------------------|--------|
| `/code/project-a` | `/code/project-a/.gstack/browse.json` | aleatorio (10000-60000) |
| `/code/project-b` | `/code/project-b/.gstack/browse.json` | aleatorio (10000-60000) |

Sin colisiones de puertos. Sin estado compartido. Cada proyecto está completamente aislado.

### Variables de entorno

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `BROWSE_PORT` | 0 (aleatorio 10000-60000) | Puerto fijo para el servidor HTTP (override de depuración) |
| `BROWSE_IDLE_TIMEOUT` | 1800000 (30 min) | Timeout de apagado por inactividad en ms |
| `BROWSE_STATE_FILE` | `.gstack/browse.json` | Ruta al archivo de estado (el CLI lo pasa al servidor) |
| `BROWSE_SERVER_SCRIPT` | auto-detectado | Ruta a server.ts |

### Rendimiento

| Herramienta | Primera llamada | Llamadas posteriores | Sobrecarga de contexto por llamada |
|-------------|----------------|---------------------|------------------------------------|
| Chrome MCP | ~5s | ~2-5s | ~2000 tokens (schema + protocolo) |
| Playwright MCP | ~3s | ~1-3s | ~1500 tokens (schema + protocolo) |
| **gstack browse** | **~3s** | **~100-200ms** | **0 tokens** (texto plano a stdout) |

La diferencia en sobrecarga de contexto se acumula rápidamente. En una sesión de navegador de 20 comandos, las herramientas MCP queman 30.000-40.000 tokens solo en el encuadre del protocolo. gstack quema cero.

### ¿Por qué CLI en lugar de MCP?

MCP (Model Context Protocol) funciona bien para servicios remotos, pero para automatización de navegador local añade pura sobrecarga:

- **Inflación de contexto**: cada llamada MCP incluye JSON schemas completos y encuadre de protocolo. Un simple "obtener el texto de la página" cuesta 10 veces más tokens de contexto de lo que debería.
- **Fragilidad de conexión**: las conexiones persistentes de WebSocket/stdio se caen y fallan al reconectarse.
- **Abstracción innecesaria**: Claude Code ya tiene una herramienta Bash. Un CLI que imprime a stdout es la interfaz más simple posible.

gstack se salta todo esto. Binario compilado. Texto plano de entrada, texto plano de salida. Sin protocolo. Sin schema. Sin gestión de conexiones.

## Agradecimientos

La capa de automatización del navegador está construida sobre [Playwright](https://playwright.dev/) de Microsoft. La API de árbol de accesibilidad de Playwright, el sistema de locators y la gestión de Chromium headless son lo que hace posible la interacción basada en refs. El sistema de snapshots — asignar etiquetas `@ref` a nodos del árbol de accesibilidad y mapearlos de vuelta a Locators de Playwright — está construido enteramente sobre las primitivas de Playwright. Gracias al equipo de Playwright por construir una base tan sólida.

## Desarrollo

### Requisitos previos

- [Bun](https://bun.sh/) v1.0+
- Chromium de Playwright (se instala automáticamente con `bun install`)

### Inicio rápido

```bash
bun install              # install dependencies + Playwright Chromium
bun test                 # run integration tests (~3s)
bun run dev <cmd>        # run CLI from source (no compile)
bun run build            # compile to browse/dist/browse
```

### Modo desarrollo vs binario compilado

Durante el desarrollo, usa `bun run dev` en lugar del binario compilado. Ejecuta `browse/src/cli.ts` directamente con Bun, así obtienes respuesta inmediata sin paso de compilación:

```bash
bun run dev goto https://example.com
bun run dev text
bun run dev snapshot -i
bun run dev click @e3
```

El binario compilado (`bun run build`) solo se necesita para distribución. Produce un único ejecutable de ~58MB en `browse/dist/browse` usando el flag `--compile` de Bun.

### Ejecutar tests

```bash
bun test                         # run all tests
bun test browse/test/commands              # run command integration tests only
bun test browse/test/snapshot              # run snapshot tests only
bun test browse/test/cookie-import-browser # run cookie import unit tests only
```

Los tests levantan un servidor HTTP local (`browse/test/test-server.ts`) que sirve fixtures HTML desde `browse/test/fixtures/`, y luego ejercitan los comandos del CLI contra esas páginas. 203 tests en 3 archivos, ~15 segundos en total.

### Mapa de código fuente

| Archivo | Rol |
|---------|-----|
| `browse/src/cli.ts` | Punto de entrada. Lee `.gstack/browse.json`, envía HTTP al servidor, imprime la respuesta. |
| `browse/src/server.ts` | Servidor HTTP con Bun. Enruta comandos al handler correcto. Gestiona el timeout de inactividad. |
| `browse/src/browser-manager.ts` | Ciclo de vida de Chromium — lanzamiento, gestión de pestañas, mapa de refs, detección de caídas. |
| `browse/src/snapshot.ts` | Parsea el árbol de accesibilidad, asigna refs `@e`/`@c`, construye el mapa de Locators. Maneja `--diff`, `--annotate`, `-C`. |
| `browse/src/read-commands.ts` | Comandos sin mutación: `text`, `html`, `links`, `js`, `css`, `is`, `dialog`, `forms`, etc. Exporta `getCleanText()`. |
| `browse/src/write-commands.ts` | Comandos con mutación: `goto`, `click`, `fill`, `upload`, `dialog-accept`, `useragent` (con recreación de contexto), etc. |
| `browse/src/meta-commands.ts` | Gestión del servidor, enrutamiento de chain, diff (DRY mediante `getCleanText`), delegación de snapshot. |
| `browse/src/cookie-import-browser.ts` | Desencripta cookies de Chromium desde perfiles de navegador en macOS y Linux usando búsqueda de claves de safe-storage específica de plataforma. Auto-detecta navegadores instalados. |
| `browse/src/cookie-picker-routes.ts` | Rutas HTTP para `/cookie-picker/*` — lista de navegadores, búsqueda de dominio, importar, eliminar. |
| `browse/src/cookie-picker-ui.ts` | Generador de HTML autocontenido para el selector de cookies interactivo (tema oscuro, sin frameworks). |
| `browse/src/buffers.ts` | `CircularBuffer<T>` (ring buffer O(1)) + captura de consola/red/diálogos con vaciado asíncrono a disco. |

### Desplegar a la skill activa

La skill activa vive en `~/.claude/skills/gstack/`. Después de hacer cambios:

1. Haz push de tu rama
2. Haz pull en el directorio de la skill: `cd ~/.claude/skills/gstack && git pull`
3. Recompila: `cd ~/.claude/skills/gstack && bun run build`

O copia el binario directamente: `cp browse/dist/browse ~/.claude/skills/gstack/browse/dist/browse`

### Añadir un nuevo comando

1. Añade el handler en `read-commands.ts` (sin mutación) o `write-commands.ts` (con mutación)
2. Registra la ruta en `server.ts`
3. Añade un caso de prueba en `browse/test/commands.test.ts` con un fixture HTML si es necesario
4. Ejecuta `bun test` para verificar
5. Ejecuta `bun run build` para compilar
