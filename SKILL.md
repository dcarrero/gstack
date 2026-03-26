---
name: gstack
preamble-tier: 1
version: 1.1.0
description: |
  Navegador headless rápido para pruebas QA y pruebas de uso propio en sitios. Navega páginas, interactúa con
  elementos, verifica estados, compara antes/después, toma screenshots anotados, prueba diseños
  responsive, formularios, subidas de archivos, diálogos y captura evidencia de errores. Úsalo cuando
  te pidan abrir o probar un sitio, verificar un despliegue, probar un flujo de usuario o reportar
  un error con screenshots.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion

---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preámbulo (ejecutar primero)

```bash
_UPD=$(~/.claude/skills/gstack/bin/gstack-update-check 2>/dev/null || .claude/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(~/.claude/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_PROACTIVE_PROMPTED=$([ -f ~/.gstack/.proactive-prompted ] && echo "yes" || echo "no")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
echo "PROACTIVE_PROMPTED: $_PROACTIVE_PROMPTED"
source <(~/.claude/skills/gstack/bin/gstack-repo-mode 2>/dev/null) || true
REPO_MODE=${REPO_MODE:-unknown}
echo "REPO_MODE: $REPO_MODE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(~/.claude/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: ${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
mkdir -p ~/.gstack/analytics
echo '{"skill":"gstack","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
# compatible con zsh: usar find en lugar de glob para evitar error NOMATCH
for _PF in $(find ~/.gstack/analytics -maxdepth 1 -name '.pending-*' 2>/dev/null); do [ -f "$_PF" ] && ~/.claude/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true; break; done
```

Si `PROACTIVE` es `"false"`, no sugieras proactivamente skills de gstack NI invoques
automáticamente skills según el contexto de la conversación. Solo ejecuta los skills que el usuario
escriba explícitamente (p. ej., /qa, /ship). Si hubieras invocado un skill automáticamente, en su lugar di brevemente:
"Creo que /nombredelskill podría ayudar aquí — ¿quieres que lo ejecute?" y espera confirmación.
El usuario optó por desactivar el comportamiento proactivo.

Si la salida muestra `UPGRADE_AVAILABLE <old> <new>`: lee `~/.claude/skills/gstack/gstack-upgrade/SKILL.md` y sigue el "Flujo de actualización en línea" (actualizar automáticamente si está configurado, de lo contrario AskUserQuestion con 4 opciones, guardar estado de pausa si se rechaza). Si `JUST_UPGRADED <from> <to>`: informa al usuario "Ejecutando gstack v{to} (¡recién actualizado!)" y continúa.

Si `LAKE_INTRO` es `no`: Antes de continuar, presenta el Principio de Completitud.
Dile al usuario: "gstack sigue el principio de **Completar sin Atajos** — siempre hacer lo completo
cuando la IA hace que el coste marginal sea casi cero. Más información: https://garryslist.org/posts/boil-the-ocean"
Luego ofrece abrir el ensayo en su navegador predeterminado:

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

Solo ejecuta `open` si el usuario dice que sí. Siempre ejecuta `touch` para marcarlo como visto. Esto solo ocurre una vez.

Si `TEL_PROMPTED` es `no` Y `LAKE_INTRO` es `yes`: Después de gestionar la introducción del principio de completitud,
pregunta al usuario sobre la telemetría. Usa AskUserQuestion:

> ¡Ayuda a mejorar gstack! El modo comunidad comparte datos de uso (qué skills usas, cuánto
> tardan, información de errores) con un ID de dispositivo estable para que podamos rastrear tendencias y corregir errores más rápido.
> Nunca se envía código, rutas de archivos ni nombres de repositorios.
> Cámbialo en cualquier momento con `gstack-config set telemetry off`.

Opciones:
- A) ¡Ayudar a mejorar gstack! (recomendado)
- B) No, gracias

Si A: ejecuta `~/.claude/skills/gstack/bin/gstack-config set telemetry community`

Si B: haz una pregunta de seguimiento con AskUserQuestion:

> ¿Qué tal el modo anónimo? Solo sabríamos que *alguien* usó gstack — sin ID único,
> sin forma de conectar sesiones. Solo un contador que nos ayuda a saber si alguien está ahí fuera.

Opciones:
- A) Claro, anónimo está bien
- B) No, gracias, totalmente desactivado

Si B→A: ejecuta `~/.claude/skills/gstack/bin/gstack-config set telemetry anonymous`
Si B→B: ejecuta `~/.claude/skills/gstack/bin/gstack-config set telemetry off`

Siempre ejecuta:
```bash
touch ~/.gstack/.telemetry-prompted
```

Esto solo ocurre una vez. Si `TEL_PROMPTED` es `yes`, omite esto por completo.

Si `PROACTIVE_PROMPTED` es `no` Y `TEL_PROMPTED` es `yes`: Después de gestionar la telemetría,
pregunta al usuario sobre el comportamiento proactivo. Usa AskUserQuestion:

> gstack puede detectar proactivamente cuándo podrías necesitar un skill mientras trabajas —
> como sugerir /qa cuando dices "¿esto funciona?" o /investigate cuando encuentras
> un error. Recomendamos mantenerlo activado — acelera cada parte de tu flujo de trabajo.

Opciones:
- A) Mantenerlo activado (recomendado)
- B) Desactivarlo — yo escribiré los /comandos manualmente

Si A: ejecuta `~/.claude/skills/gstack/bin/gstack-config set proactive true`
Si B: ejecuta `~/.claude/skills/gstack/bin/gstack-config set proactive false`

Siempre ejecuta:
```bash
touch ~/.gstack/.proactive-prompted
```

Esto solo ocurre una vez. Si `PROACTIVE_PROMPTED` es `yes`, omite esto por completo.

## Modo Contribuidor

Si `_CONTRIB` es `true`: estás en **modo contribuidor**. Al final de cada paso principal del flujo de trabajo, puntúa tu experiencia con gstack de 0 a 10. Si no es un 10 y hay un error o mejora accionable — presenta un informe de campo.

**Informa solo de:** errores de herramientas de gstack donde la entrada era razonable pero gstack falló. **Omite:** errores de la aplicación del usuario, errores de red, fallos de autenticación en el sitio del usuario.

**Para informar:** escribe `~/.gstack/contributor-logs/{slug}.md`:
```
# {Título}
**Qué intenté:** {acción} | **Qué pasó:** {resultado} | **Puntuación:** {0-10}
## Reproducción
1. {paso}
## Qué lo haría un 10
{una frase}
**Fecha:** {YYYY-MM-DD} | **Versión:** {versión} | **Skill:** /{skill}
```
Slug: minúsculas con guiones, máximo 60 caracteres. Omitir si ya existe. Máximo 3/sesión. Informar en línea, no detenerse.

## Protocolo de Estado de Finalización

Al completar un flujo de trabajo de un skill, informa el estado usando uno de:
- **DONE** — Todos los pasos completados exitosamente. Evidencia proporcionada para cada afirmación.
- **DONE_WITH_CONCERNS** — Completado, pero con problemas que el usuario debería conocer. Lista cada preocupación.
- **BLOCKED** — No se puede continuar. Indica qué está bloqueando y qué se intentó.
- **NEEDS_CONTEXT** — Falta información necesaria para continuar. Indica exactamente qué necesitas.

### Escalación

Siempre está bien detenerse y decir "esto es demasiado difícil para mí" o "no estoy seguro de este resultado."

Un trabajo mal hecho es peor que no hacer nada. No serás penalizado por escalar.
- Si has intentado una tarea 3 veces sin éxito, DETENTE y escala.
- Si no estás seguro sobre un cambio sensible en seguridad, DETENTE y escala.
- Si el alcance del trabajo excede lo que puedes verificar, DETENTE y escala.

Formato de escalación:
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 frases]
ATTEMPTED: [qué intentaste]
RECOMMENDATION: [qué debería hacer el usuario a continuación]
```

## Telemetría (ejecutar al final)

Después de que el flujo de trabajo del skill se complete (éxito, error o cancelación), registra el evento de telemetría.
Determina el nombre del skill a partir del campo `name:` en el frontmatter YAML de este archivo.
Determina el resultado del flujo de trabajo (success si se completó normalmente, error
si falló, abort si el usuario interrumpió).

**EXCEPCIÓN DE MODO PLAN — EJECUTAR SIEMPRE:** Este comando escribe telemetría en
`~/.gstack/analytics/` (directorio de configuración del usuario, no archivos del proyecto). El preámbulo
del skill ya escribe en el mismo directorio — es el mismo patrón.
Omitir este comando pierde datos de duración de sesión y resultado.

Ejecuta este bash:

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

Reemplaza `SKILL_NAME` con el nombre real del skill del frontmatter, `OUTCOME` con
success/error/abort, y `USED_BROWSE` con true/false según si se usó `$B`.
Si no puedes determinar el resultado, usa "unknown". Esto se ejecuta en segundo plano y
nunca bloquea al usuario.

## Pie de Estado del Plan

Cuando estés en modo plan y a punto de llamar a ExitPlanMode:

1. Comprueba si el archivo del plan ya tiene una sección `## GSTACK REVIEW REPORT`.
2. Si la TIENE — omite (un skill de revisión ya escribió un informe más completo).
3. Si NO la tiene — ejecuta este comando:

\`\`\`bash
~/.claude/skills/gstack/bin/gstack-review-read
\`\`\`

Luego escribe una sección `## GSTACK REVIEW REPORT` al final del archivo del plan:

- Si la salida contiene entradas de revisión (líneas JSONL antes de `---CONFIG---`): formatea la
  tabla estándar del informe con ejecuciones/estado/hallazgos por skill, mismo formato que usan los
  skills de revisión.
- Si la salida es `NO_REVIEWS` o vacía: escribe esta tabla de marcador de posición:

\`\`\`markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \`/plan-ceo-review\` | Scope & strategy | 0 | — | — |
| Codex Review | \`/codex review\` | Independent 2nd opinion | 0 | — | — |
| Eng Review | \`/plan-eng-review\` | Architecture & tests (required) | 0 | — | — |
| Design Review | \`/plan-design-review\` | UI/UX gaps | 0 | — | — |

**VEREDICTO:** AÚN SIN REVISIONES — ejecuta \`/autoplan\` para el pipeline completo de revisión, o las revisiones individuales de arriba.
\`\`\`

**EXCEPCIÓN DE MODO PLAN — EJECUTAR SIEMPRE:** Esto escribe en el archivo del plan, que es el único
archivo que puedes editar en modo plan. El informe de revisión del archivo del plan forma parte del
estado vivo del plan.

Si `PROACTIVE` es `false`: NO sugieras proactivamente otros skills de gstack durante esta sesión.
Solo ejecuta los skills que el usuario invoque explícitamente. Esta preferencia persiste entre sesiones
mediante `gstack-config`.

Si `PROACTIVE` es `true` (por defecto): sugiere skills de gstack relacionados cuando sean relevantes
para la etapa del flujo de trabajo del usuario:
- Lluvia de ideas → /office-hours
- Estrategia → /plan-ceo-review
- Arquitectura → /plan-eng-review
- Diseño → /plan-design-review o /design-consultation
- Auto-revisión → /autoplan
- Depuración → /investigate
- QA → /qa
- Revisión de código → /review
- Auditoría visual → /design-review
- Lanzamiento → /ship
- Documentación → /document-release
- Retrospectiva → /retro
- Segunda opinión → /codex
- Seguridad en producción → /careful o /guard
- Ediciones con alcance limitado → /freeze o /unfreeze
- Actualizaciones → /gstack-upgrade

Si el usuario rechaza las sugerencias, ejecuta `gstack-config set proactive false`.
Si vuelve a aceptarlas, ejecuta `gstack-config set proactive true`.

# gstack browse: Pruebas QA y Uso propio (dogfooding)

Chromium headless persistente. La primera llamada inicia automáticamente (~3s), luego ~100-200ms por comando.
Se apaga automáticamente tras 30 min de inactividad. El estado persiste entre llamadas (cookies, pestañas, sesiones).

## SETUP (ejecuta esta verificación ANTES de cualquier comando browse)

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B=~/.claude/skills/gstack/browse/dist/browse
if [ -x "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP"
fi
```

Si `NEEDS_SETUP`:
1. Dile al usuario: "gstack browse necesita una compilación inicial (~10 segundos). ¿Proceder?" Luego DETENTE y espera.
2. Ejecuta: `cd <SKILL_DIR> && ./setup`
3. Si `bun` no está instalado: `curl -fsSL https://bun.sh/install | bash`

## IMPORTANTE

- Usa el binario compilado mediante Bash: `$B <command>`
- NUNCA uses las herramientas `mcp__claude-in-chrome__*`. Son lentas y poco fiables.
- El navegador persiste entre llamadas — las cookies, sesiones de inicio de sesión y pestañas se mantienen.
- Los diálogos (alert/confirm/prompt) se aceptan automáticamente por defecto — sin bloqueo del navegador.
- **Mostrar screenshots:** Después de `$B screenshot`, `$B snapshot -a -o` o `$B responsive`, usa siempre la herramienta Read sobre los PNG generados para que el usuario pueda verlos. Sin esto, los screenshots son invisibles.

## Flujos de trabajo QA

### Probar un flujo de usuario (login, registro, checkout, etc.)

```bash
# 1. Ir a la página
$B goto https://app.example.com/login

# 2. Ver qué es interactivo
$B snapshot -i

# 3. Rellenar el formulario usando refs
$B fill @e3 "test@example.com"
$B fill @e4 "password123"
$B click @e5

# 4. Verificar que funcionó
$B snapshot -D              # el diff muestra qué cambió tras hacer clic
$B is visible ".dashboard"  # confirmar que apareció el dashboard
$B screenshot /tmp/after-login.png
```

### Verificar un despliegue / comprobar producción

```bash
$B goto https://yourapp.com
$B text                          # leer la página — ¿carga correctamente?
$B console                       # ¿errores de JS?
$B network                       # ¿peticiones fallidas?
$B js "document.title"           # ¿título correcto?
$B is visible ".hero-section"    # ¿elementos clave presentes?
$B screenshot /tmp/prod-check.png
```

### Probar una funcionalidad de extremo a extremo (uso propio / dogfooding)

```bash
# Navegar a la funcionalidad
$B goto https://app.example.com/new-feature

# Tomar screenshot anotado — muestra cada elemento interactivo con etiquetas
$B snapshot -i -a -o /tmp/feature-annotated.png

# Encontrar TODOS los elementos clicables (incluyendo divs con cursor:pointer)
$B snapshot -C

# Recorrer el flujo
$B snapshot -i          # línea base
$B click @e3            # interactuar
$B snapshot -D          # ¿qué cambió? (diff unificado)

# Comprobar estados de elementos
$B is visible ".success-toast"
$B is enabled "#next-step-btn"
$B is checked "#agree-checkbox"

# Revisar la consola en busca de errores después de las interacciones
$B console
```

### Probar diseños responsive

```bash
# Rápido: 3 screenshots en móvil/tablet/escritorio
$B goto https://yourapp.com
$B responsive /tmp/layout

# Manual: viewport específico
$B viewport 375x812     # iPhone
$B screenshot /tmp/mobile.png
$B viewport 1440x900    # Escritorio
$B screenshot /tmp/desktop.png

# Screenshot de elemento (recortar a un elemento específico)
$B screenshot "#hero-banner" /tmp/hero.png
$B snapshot -i
$B screenshot @e3 /tmp/button.png

# Recorte por región
$B screenshot --clip 0,0,800,600 /tmp/above-fold.png

# Solo viewport (sin scroll)
$B screenshot --viewport /tmp/viewport.png
```

### Probar subida de archivos

```bash
$B goto https://app.example.com/upload
$B snapshot -i
$B upload @e3 /path/to/test-file.pdf
$B is visible ".upload-success"
$B screenshot /tmp/upload-result.png
```

### Probar formularios con validación

```bash
$B goto https://app.example.com/form
$B snapshot -i

# Enviar vacío — comprobar que aparecen errores de validación
$B click @e10                        # botón de envío
$B snapshot -D                       # el diff muestra que aparecieron mensajes de error
$B is visible ".error-message"

# Rellenar y reenviar
$B fill @e3 "valid input"
$B click @e10
$B snapshot -D                       # el diff muestra que los errores desaparecieron, estado exitoso
```

### Probar diálogos (confirmaciones de eliminación, prompts)

```bash
# Configurar el manejo de diálogos ANTES de activarlos
$B dialog-accept              # aceptará automáticamente el siguiente alert/confirm
$B click "#delete-button"     # activa el diálogo de confirmación
$B dialog                     # ver qué diálogo apareció
$B snapshot -D                # verificar que el elemento fue eliminado

# Para prompts que necesitan entrada de texto
$B dialog-accept "my answer"  # aceptar con texto
$B click "#rename-button"     # activa el prompt
```

### Probar páginas autenticadas (importar cookies del navegador real)

```bash
# Importar cookies de tu navegador real (abre un selector interactivo)
$B cookie-import-browser

# O importar un dominio específico directamente
$B cookie-import-browser comet --domain .github.com

# Ahora probar páginas autenticadas
$B goto https://github.com/settings/profile
$B snapshot -i
$B screenshot /tmp/github-profile.png
```

### Comparar dos páginas / entornos

```bash
$B diff https://staging.app.com https://prod.app.com
```

### Cadena de múltiples pasos (eficiente para flujos largos)

```bash
echo '[
  ["goto","https://app.example.com"],
  ["snapshot","-i"],
  ["fill","@e3","test@test.com"],
  ["fill","@e4","password"],
  ["click","@e5"],
  ["snapshot","-D"],
  ["screenshot","/tmp/result.png"]
]' | $B chain
```

## Patrones rápidos de aserción

```bash
# El elemento existe y es visible
$B is visible ".modal"

# El botón está habilitado/deshabilitado
$B is enabled "#submit-btn"
$B is disabled "#submit-btn"

# Estado del checkbox
$B is checked "#agree"

# El campo de entrada es editable
$B is editable "#name-field"

# El elemento tiene el foco
$B is focused "#search-input"

# La página contiene texto
$B js "document.body.textContent.includes('Success')"

# Cantidad de elementos
$B js "document.querySelectorAll('.list-item').length"

# Valor de un atributo específico
$B attrs "#logo"    # devuelve todos los atributos como JSON

# Propiedad CSS
$B css ".button" "background-color"
```

## Sistema de Snapshot

El snapshot es tu herramienta principal para entender e interactuar con las páginas.

```
-i        --interactive           Interactive elements only (buttons, links, inputs) with @e refs
-c        --compact               Compact (no empty structural nodes)
-d <N>    --depth                 Limit tree depth (0 = root only, default: unlimited)
-s <sel>  --selector              Scope to CSS selector
-D        --diff                  Unified diff against previous snapshot (first call stores baseline)
-a        --annotate              Annotated screenshot with red overlay boxes and ref labels
-o <path> --output                Output path for annotated screenshot (default: <temp>/browse-annotated.png)
-C        --cursor-interactive    Cursor-interactive elements (@c refs — divs with pointer, onclick)
```

Todos los flags se pueden combinar libremente. `-o` solo aplica cuando `-a` también se usa.
Ejemplo: `$B snapshot -i -a -C -o /tmp/annotated.png`

**Numeración de refs:** Las refs @e se asignan secuencialmente (@e1, @e2, ...) en orden de árbol.
Las refs @c de `-C` se numeran por separado (@c1, @c2, ...).

Después del snapshot, usa @refs como selectores en cualquier comando:
```bash
$B click @e3       $B fill @e4 "value"     $B hover @e1
$B html @e2        $B css @e5 "color"      $B attrs @e6
$B click @c1       # ref interactiva por cursor (de -C)
```

**Formato de salida:** árbol de accesibilidad indentado con IDs @ref, un elemento por línea.
```
  @e1 [heading] "Welcome" [level=1]
  @e2 [textbox] "Email"
  @e3 [button] "Submit"
```

Las refs se invalidan al navegar — ejecuta `snapshot` de nuevo después de `goto`.

## Referencia de comandos

### Navigation
| Comando | Descripción |
|---------|-------------|
| `back` | History back |
| `forward` | History forward |
| `goto <url>` | Navigate to URL |
| `reload` | Reload page |
| `url` | Print current URL |

### Reading
| Comando | Descripción |
|---------|-------------|
| `accessibility` | Full ARIA tree |
| `forms` | Form fields as JSON |
| `html [selector]` | innerHTML of selector (throws if not found), or full page HTML if no selector given |
| `links` | All links as "text → href" |
| `text` | Cleaned page text |

### Interaction
| Comando | Descripción |
|---------|-------------|
| `click <sel>` | Click element |
| `cookie <name>=<value>` | Set cookie on current page domain |
| `cookie-import <json>` | Import cookies from JSON file |
| `cookie-import-browser [browser] [--domain d]` | Import cookies from installed Chromium browsers (opens picker, or use --domain for direct import) |
| `dialog-accept [text]` | Auto-accept next alert/confirm/prompt. Optional text is sent as the prompt response |
| `dialog-dismiss` | Auto-dismiss next dialog |
| `fill <sel> <val>` | Fill input |
| `header <name>:<value>` | Set custom request header (colon-separated, sensitive values auto-redacted) |
| `hover <sel>` | Hover element |
| `press <key>` | Press key — Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete, Home, End, PageUp, PageDown, or modifiers like Shift+Enter |
| `scroll [sel]` | Scroll element into view, or scroll to page bottom if no selector |
| `select <sel> <val>` | Select dropdown option by value, label, or visible text |
| `type <text>` | Type into focused element |
| `upload <sel> <file> [file2...]` | Upload file(s) |
| `useragent <string>` | Set user agent |
| `viewport <WxH>` | Set viewport size |
| `wait <sel|--networkidle|--load>` | Wait for element, network idle, or page load (timeout: 15s) |

### Inspection
| Comando | Descripción |
|---------|-------------|
| `attrs <sel|@ref>` | Element attributes as JSON |
| `console [--clear|--errors]` | Console messages (--errors filters to error/warning) |
| `cookies` | All cookies as JSON |
| `css <sel> <prop>` | Computed CSS value |
| `dialog [--clear]` | Dialog messages |
| `eval <file>` | Run JavaScript from file and return result as string (path must be under /tmp or cwd) |
| `is <prop> <sel>` | State check (visible/hidden/enabled/disabled/checked/editable/focused) |
| `js <expr>` | Run JavaScript expression and return result as string |
| `network [--clear]` | Network requests |
| `perf` | Page load timings |
| `storage [set k v]` | Read all localStorage + sessionStorage as JSON, or set <key> <value> to write localStorage |

### Visual
| Comando | Descripción |
|---------|-------------|
| `diff <url1> <url2>` | Text diff between pages |
| `pdf [path]` | Save as PDF |
| `responsive [prefix]` | Screenshots at mobile (375x812), tablet (768x1024), desktop (1280x720). Saves as {prefix}-mobile.png etc. |
| `screenshot [--viewport] [--clip x,y,w,h] [selector|@ref] [path]` | Save screenshot (supports element crop via CSS/@ref, --clip region, --viewport) |

### Snapshot
| Comando | Descripción |
|---------|-------------|
| `snapshot [flags]` | Accessibility tree with @e refs for element selection. Flags: -i interactive only, -c compact, -d N depth limit, -s sel scope, -D diff vs previous, -a annotated screenshot, -o path output, -C cursor-interactive @c refs |

### Meta
| Comando | Descripción |
|---------|-------------|
| `chain` | Run commands from JSON stdin. Format: [["cmd","arg1",...],...] |

### Tabs
| Comando | Descripción |
|---------|-------------|
| `closetab [id]` | Close tab |
| `newtab [url]` | Open new tab |
| `tab <id>` | Switch to tab |
| `tabs` | List open tabs |

### Server
| Comando | Descripción |
|---------|-------------|
| `handoff [message]` | Open visible Chrome at current page for user takeover |
| `restart` | Restart server |
| `resume` | Re-snapshot after user takeover, return control to AI |
| `status` | Health check |
| `stop` | Shutdown server |

## Consejos

1. **Navega una vez, consulta muchas veces.** `goto` carga la página; luego `text`, `js`, `screenshot` acceden a la página cargada al instante.
2. **Usa `snapshot -i` primero.** Ve todos los elementos interactivos, luego haz clic/rellena por ref. Sin adivinar selectores CSS.
3. **Usa `snapshot -D` para verificar.** Línea base → acción → diff. Ve exactamente qué cambió.
4. **Usa `is` para aserciones.** `is visible .modal` es más rápido y fiable que analizar el texto de la página.
5. **Usa `snapshot -a` como evidencia.** Los screenshots anotados son ideales para reportes de errores.
6. **Usa `snapshot -C` para interfaces complejas.** Encuentra divs clicables que el árbol de accesibilidad no detecta.
7. **Revisa `console` después de las acciones.** Detecta errores de JS que no se manifiestan visualmente.
8. **Usa `chain` para flujos largos.** Un solo comando, sin sobrecarga de CLI por cada paso.
