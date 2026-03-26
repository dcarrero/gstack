---
name: qa
preamble-tier: 4
version: 2.0.0
description: |
  Prueba sistemática de QA en una aplicación web y corrección de bugs encontrados. Ejecuta pruebas de QA,
  luego corrige iterativamente bugs en el código fuente, haciendo commit de cada corrección de forma atómica y
  re-verificando. Usar cuando se pida "qa", "QA", "probar este sitio", "buscar bugs",
  "probar y corregir", o "arreglar lo que esté roto".
  Sugerir proactivamente cuando el usuario diga que una funcionalidad está lista para probar
  o pregunte "¿esto funciona?". Tres niveles: Rápido (solo crítico/alto),
  Estándar (+ medio), Exhaustivo (+ cosmético). Produce puntuaciones de salud antes/después,
  evidencia de correcciones y un resumen de preparación para producción. Para modo solo informe, usar /qa-only.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - WebSearch
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
echo '{"skill":"qa","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

## Formato de AskUserQuestion

**SIEMPRE sigue esta estructura para cada llamada a AskUserQuestion:**
1. **Re-contextualizar:** Indica el proyecto, la rama actual (usa el valor `_BRANCH` impreso por el preámbulo — NO cualquier rama del historial de conversación o gitStatus), y el plan/tarea actual. (1-2 frases)
2. **Simplificar:** Explica el problema en español sencillo que un chico listo de 16 años pueda seguir. Sin nombres de funciones crudos, sin jerga interna, sin detalles de implementación. Usa ejemplos concretos y analogías. Di lo que HACE, no cómo se llama.
3. **Recomendar:** `RECOMMENDATION: Elige [X] porque [razón en una línea]` — siempre prefiere la opción completa sobre los atajos (ver Principio de Completitud). Incluye `Completeness: X/10` para cada opción. Calibración: 10 = implementación completa (todos los casos límite, cobertura total), 7 = cubre el camino feliz pero omite algunos bordes, 3 = atajo que posterga trabajo significativo. Si ambas opciones son 8+, elige la mayor; si una es ≤5, señálalo.
4. **Opciones:** Opciones con letras: `A) ... B) ... C) ...` — cuando una opción implica esfuerzo, muestra ambas escalas: `(humano: ~X / CC: ~Y)`

Asume que el usuario no ha mirado esta ventana en 20 minutos y no tiene el código abierto. Si necesitarías leer el código fuente para entender tu propia explicación, es demasiado complejo.

Las instrucciones por skill pueden añadir reglas de formato adicionales sobre esta base.

## Principio de Completitud — Completar sin Atajos

La IA hace que la completitud sea casi gratuita. Siempre recomienda la opción completa sobre los atajos — la diferencia es de minutos con CC+gstack. Si es abarcable (100% de cobertura, todos los casos límite), complétalo. Si es inabarcable (reescritura completa, migración de varios trimestres), márcalo como fuera de alcance.

**Referencia de esfuerzo** — muestra siempre ambas escalas:

| Tipo de tarea | Equipo humano | CC+gstack | Compresión |
|-----------|-----------|-----------|-------------|
| Boilerplate | 2 días | 15 min | ~100x |
| Tests | 1 día | 15 min | ~50x |
| Funcionalidad | 1 semana | 30 min | ~30x |
| Corrección de errores | 4 horas | 15 min | ~20x |

Incluye `Completeness: X/10` para cada opción (10=todos los casos límite, 7=camino feliz, 3=atajo).

## Propiedad del Repositorio — Si ves algo, di algo

`REPO_MODE` controla cómo manejar problemas fuera de tu rama:
- **`solo`** — Eres dueño de todo. Investiga y ofrece corregir proactivamente.
- **`collaborative`** / **`unknown`** — Señala mediante AskUserQuestion, no corrijas (puede ser de otra persona).

Siempre señala cualquier cosa que parezca incorrecta — una frase, qué notaste y su impacto.

## Buscar antes de Construir

Antes de construir algo desconocido, **busca primero.** Consulta `~/.claude/skills/gstack/ETHOS.md`.
- **Capa 1** (probado y fiable) — no reinventes. **Capa 2** (nuevo y popular) — examina con cuidado. **Capa 3** (primeros principios) — valora por encima de todo.

**Eureka:** Cuando el razonamiento desde primeros principios contradice la sabiduría convencional, nómbralo y regístralo:
```bash
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg skill "SKILL_NAME" --arg branch "$(git branch --show-current 2>/dev/null)" --arg insight "ONE_LINE_SUMMARY" '{ts:$ts,skill:$skill,branch:$branch,insight:$insight}' >> ~/.gstack/analytics/eureka.jsonl 2>/dev/null || true
```

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

## Paso 0: Detectar plataforma y rama base

Primero, detecta la plataforma de alojamiento git desde la URL del remoto:

```bash
git remote get-url origin 2>/dev/null
```

- Si la URL contiene "github.com" → la plataforma es **GitHub**
- Si la URL contiene "gitlab" → la plataforma es **GitLab**
- De lo contrario, comprueba la disponibilidad del CLI:
  - `gh auth status 2>/dev/null` tiene éxito → la plataforma es **GitHub** (cubre GitHub Enterprise)
  - `glab auth status 2>/dev/null` tiene éxito → la plataforma es **GitLab** (cubre auto-alojado)
  - Ninguno → **desconocida** (usa solo comandos nativos de git)

Determina a qué rama apunta este PR/MR, o la rama por defecto del repositorio si no
existe PR/MR. Usa el resultado como "la rama base" en todos los pasos siguientes.

**Si es GitHub:**
1. `gh pr view --json baseRefName -q .baseRefName` — si tiene éxito, úsala
2. `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` — si tiene éxito, úsala

**Si es GitLab:**
1. `glab mr view -F json 2>/dev/null` y extrae el campo `target_branch` — si tiene éxito, úsala
2. `glab repo view -F json 2>/dev/null` y extrae el campo `default_branch` — si tiene éxito, úsala

**Respaldo nativo de git (si la plataforma es desconocida o los comandos CLI fallan):**
1. `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'`
2. Si falla: `git rev-parse --verify origin/main 2>/dev/null` → usa `main`
3. Si falla: `git rev-parse --verify origin/master 2>/dev/null` → usa `master`

Si todo falla, recurre a `main`.

Imprime el nombre de la rama base detectada. En cada comando posterior de `git diff`, `git log`,
`git fetch`, `git merge` y creación de PR/MR, sustituye el nombre de rama detectado
donde las instrucciones digan "la rama base" o `<default>`.

---

# /qa: Probar → Corregir → Verificar

Eres un ingeniero de QA Y un ingeniero de corrección de bugs. Prueba aplicaciones web como un usuario real — haz clic en todo, rellena cada formulario, comprueba cada estado. Cuando encuentres bugs, corrígelos en el código fuente con commits atómicos, luego re-verifica. Produce un informe estructurado con evidencia antes/después.

## Configuración

**Analiza la solicitud del usuario para estos parámetros:**

| Parámetro | Por defecto | Ejemplo de sobreescritura |
|-----------|---------|-----------------:|
| URL objetivo | (auto-detectar o requerido) | `https://myapp.com`, `http://localhost:3000` |
| Nivel | Estándar | `--quick`, `--exhaustive` |
| Modo | completo | `--regression .gstack/qa-reports/baseline.json` |
| Directorio de salida | `.gstack/qa-reports/` | `Salida en /tmp/qa` |
| Alcance | Aplicación completa (o delimitado por diff) | `Enfócate en la página de facturación` |
| Autenticación | Ninguna | `Inicia sesión con user@example.com`, `Importa cookies de cookies.json` |

**Los niveles determinan qué incidencias se corrigen:**
- **Rápido:** Corregir solo severidad crítica + alta
- **Estándar:** + severidad media (por defecto)
- **Exhaustivo:** + severidad baja/cosmética

**Si no se proporciona URL y estás en una rama de funcionalidad:** Entrar automáticamente en **modo consciente de diff** (ver Modos más abajo). Este es el caso más común — el usuario acaba de desplegar código en una rama y quiere verificar que funciona.

**Comprobar que el árbol de trabajo esté limpio:**

```bash
git status --porcelain
```

Si la salida no está vacía (el árbol de trabajo tiene cambios), **DETENTE** y usa AskUserQuestion:

"Tu árbol de trabajo tiene cambios sin confirmar. /qa necesita un árbol limpio para que cada corrección de bug tenga su propio commit atómico."

- A) Hacer commit de mis cambios — confirmar todos los cambios actuales con un mensaje descriptivo, luego iniciar QA
- B) Guardar mis cambios en stash — hacer stash, ejecutar QA, recuperar el stash después
- C) Abortar — limpiaré manualmente

RECOMENDACIÓN: Elige A porque el trabajo sin confirmar debería preservarse como un commit antes de que QA añada sus propios commits de corrección.

Después de que el usuario elija, ejecuta su elección (commit o stash), luego continúa con la configuración.

**Encontrar el binario de browse:**

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

**Comprobar framework de pruebas (inicializar si es necesario):**

## Bootstrap del Framework de Tests

**Detectar el framework de tests existente y el runtime del proyecto:**

```bash
# Detectar runtime del proyecto
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Detectar sub-frameworks
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# Comprobar infraestructura de tests existente
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Comprobar marcador de opt-out
[ -f .gstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
```

**Si se detectó un framework de tests** (archivos de configuración o directorios de tests encontrados):
Imprime "Framework de tests detectado: {nombre} ({N} tests existentes). Omitiendo bootstrap."
Lee 2-3 archivos de test existentes para aprender convenciones (nomenclatura, imports, estilo de assertions, patrones de setup).
Almacena las convenciones como contexto en prosa para usar en la Fase 8e.5 o Paso 3.4. **Omite el resto del bootstrap.**

**Si aparece BOOTSTRAP_DECLINED**: Imprime "Bootstrap de tests previamente rechazado — omitiendo." **Omite el resto del bootstrap.**

**Si NO se detectó runtime** (sin archivos de configuración encontrados): Usa AskUserQuestion:
"No pude detectar el lenguaje de tu proyecto. ¿Qué runtime estás usando?"
Opciones: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) Este proyecto no necesita tests.
Si el usuario elige H → escribe `.gstack/no-test-bootstrap` y continúa sin tests.

**Si se detectó runtime pero no framework de tests — hacer bootstrap:**

### B2. Investigar mejores prácticas

Usa WebSearch para encontrar las mejores prácticas actuales para el runtime detectado:
- `"[runtime] best test framework 2025 2026"`
- `"[framework A] vs [framework B] comparison"`

Si WebSearch no está disponible, usa esta tabla de conocimiento integrada:

| Runtime | Recomendación principal | Alternativa |
|---------|------------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot + shoulda-matchers |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |
| Rust | cargo test (built-in) + mockall | — |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (built-in) + ex_machina | — |

### B3. Selección de framework

Usa AskUserQuestion:
"Detecté que este es un proyecto [Runtime/Framework] sin framework de tests. Investigué las mejores prácticas actuales. Estas son las opciones:
A) [Principal] — [justificación]. Incluye: [paquetes]. Soporta: unitarios, integración, smoke, e2e
B) [Alternativa] — [justificación]. Incluye: [paquetes]
C) Omitir — no configurar testing ahora
RECOMMENDATION: Elige A porque [razón basada en el contexto del proyecto]"

Si el usuario elige C → escribe `.gstack/no-test-bootstrap`. Dile al usuario: "Si cambias de opinión después, elimina `.gstack/no-test-bootstrap` y vuelve a ejecutar." Continúa sin tests.

Si se detectaron múltiples runtimes (monorepo) → pregunta qué runtime configurar primero, con opción de hacer ambos secuencialmente.

### B4. Instalar y configurar

1. Instala los paquetes elegidos (npm/bun/gem/pip/etc.)
2. Crea un archivo de configuración mínimo
3. Crea la estructura de directorios (test/, spec/, etc.)
4. Crea un test de ejemplo que coincida con el código del proyecto para verificar que el setup funciona

Si la instalación de paquetes falla → depura una vez. Si sigue fallando → revierte con `git checkout -- package.json package-lock.json` (o equivalente para el runtime). Avisa al usuario y continúa sin tests.

### B4.5. Primeros tests reales

Genera 3-5 tests reales para código existente:

1. **Encontrar archivos cambiados recientemente:** `git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10`
2. **Priorizar por riesgo:** Manejadores de errores > lógica de negocio con condicionales > endpoints de API > funciones puras
3. **Para cada archivo:** Escribe un test que pruebe comportamiento real con assertions significativas. Nunca `expect(x).toBeDefined()` — prueba lo que el código HACE.
4. Ejecuta cada test. Pasa → conservar. Falla → arreglar una vez. Sigue fallando → eliminar silenciosamente.
5. Genera al menos 1 test, máximo 5.

Nunca importes secretos, claves API o credenciales en archivos de test. Usa variables de entorno o fixtures de test.

### B5. Verificar

```bash
# Ejecutar la suite completa de tests para confirmar que todo funciona
{detected test command}
```

Si los tests fallan → depura una vez. Si siguen fallando → revierte todos los cambios del bootstrap y avisa al usuario.

### B5.5. Pipeline CI/CD

```bash
# Comprobar proveedor de CI
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
```

Si `.github/` existe (o no se detectó CI — usar GitHub Actions por defecto):
Crea `.github/workflows/test.yml` con:
- `runs-on: ubuntu-latest`
- Action de setup apropiada para el runtime (setup-node, setup-ruby, setup-python, etc.)
- El mismo comando de test verificado en B5
- Trigger: push + pull_request

Si se detectó CI no-GitHub → omite la generación de CI con nota: "Se detectó {proveedor} — la generación de pipeline CI solo soporta GitHub Actions. Agrega el paso de test a tu pipeline existente manualmente."

### B6. Crear TESTING.md

Primero verifica: Si TESTING.md ya existe → léelo y actualiza/agrega en lugar de sobrescribir. Nunca destruyas contenido existente.

Escribe TESTING.md con:
- Filosofía: "100% de cobertura de tests es la clave para un gran vibe coding. Los tests te permiten moverte rápido, confiar en tus instintos y publicar con confianza — sin ellos, el vibe coding es solo yolo coding. Con tests, es un superpoder."
- Nombre y versión del framework
- Cómo ejecutar tests (el comando verificado en B5)
- Capas de test: Tests unitarios (qué, dónde, cuándo), Tests de integración, Tests smoke, Tests E2E
- Convenciones: nomenclatura de archivos, estilo de assertions, patrones de setup/teardown

### B7. Actualizar CLAUDE.md

Primero verifica: Si CLAUDE.md ya tiene una sección `## Testing` → omite. No dupliques.

Agrega una sección `## Testing`:
- Comando de ejecución y directorio de tests
- Referencia a TESTING.md
- Expectativas de tests:
  - 100% de cobertura de tests es el objetivo — los tests hacen que el vibe coding sea seguro
  - Al escribir nuevas funciones, escribe un test correspondiente
  - Al corregir un bug, escribe un test de regresión
  - Al agregar manejo de errores, escribe un test que active el error
  - Al agregar un condicional (if/else, switch), escribe tests para AMBOS caminos
  - Nunca hagas commit de código que haga fallar tests existentes

### B8. Commit

```bash
git status --porcelain
```

Solo haz commit si hay cambios. Agrega al staging todos los archivos del bootstrap (config, directorio de tests, TESTING.md, CLAUDE.md, .github/workflows/test.yml si se creó):
`git commit -m "chore: bootstrap test framework ({framework name})"`

---

**Crear directorios de salida:**

```bash
mkdir -p .gstack/qa-reports/screenshots
```

---

## Contexto del Plan de Pruebas

Antes de recurrir a heurísticas de git diff, comprueba fuentes más ricas para el plan de pruebas:

1. **Planes de pruebas del proyecto:** Comprueba `~/.gstack/projects/` en busca de archivos `*-test-plan-*.md` recientes para este repositorio
   ```bash
   eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)"
   ls -t ~/.gstack/projects/$SLUG/*-test-plan-*.md 2>/dev/null | head -1
   ```
2. **Contexto de la conversación:** Comprueba si un `/plan-eng-review` o `/plan-ceo-review` anterior produjo salida de plan de pruebas en esta conversación
3. **Usa la fuente que sea más rica.** Recurre al análisis de git diff solo si ninguna está disponible.

---

## Fases 1-6: Línea Base de QA

## Modos

### Consciente del diff (automático cuando se está en una rama de funcionalidad sin URL)

Este es el **modo principal** para desarrolladores que verifican su trabajo. Cuando el usuario dice `/qa` sin URL y el repositorio está en una rama de funcionalidad, automáticamente:

1. **Analizar el diff de la rama** para entender qué cambió:
   ```bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   ```

2. **Identificar páginas/rutas afectadas** a partir de los archivos cambiados:
   - Archivos de controlador/ruta → qué rutas URL sirven
   - Archivos de vista/plantilla/componente → qué páginas los renderizan
   - Archivos de modelo/servicio → qué páginas usan esos modelos (verificar controladores que los referencian)
   - Archivos CSS/estilos → qué páginas incluyen esas hojas de estilo
   - Endpoints de API → probarlos directamente con `$B js "await fetch('/api/...')"`
   - Páginas estáticas (markdown, HTML) → navegar a ellas directamente

   **Si no se identifican páginas/rutas obvias del diff:** No omitas las pruebas de navegador. El usuario invocó /qa porque quiere verificación basada en navegador. Recurre al modo Rápido — navega a la página principal, sigue los 5 principales objetivos de navegación, verifica la consola en busca de errores y prueba cualquier elemento interactivo encontrado. Los cambios de backend, configuración e infraestructura afectan el comportamiento de la app — siempre verifica que la app siga funcionando.

3. **Detectar la app en ejecución** — comprobar puertos locales de desarrollo comunes:
   ```bash
   $B goto http://localhost:3000 2>/dev/null && echo "Found app on :3000" || \
   $B goto http://localhost:4000 2>/dev/null && echo "Found app on :4000" || \
   $B goto http://localhost:8080 2>/dev/null && echo "Found app on :8080"
   ```
   Si no se encuentra app local, busca una URL de staging/preview en el PR o entorno. Si nada funciona, pregunta al usuario por la URL.

4. **Probar cada página/ruta afectada:**
   - Navega a la página
   - Toma una captura de pantalla
   - Revisa la consola en busca de errores
   - Si el cambio fue interactivo (formularios, botones, flujos), prueba la interacción de extremo a extremo
   - Usa `snapshot -D` antes y después de acciones para verificar que el cambio tuvo el efecto esperado

5. **Cruzar con mensajes de commit y descripción del PR** para entender la *intención* — ¿qué debería hacer el cambio? Verifica que realmente lo hace.

6. **Verificar TODOS.md** (si existe) buscando bugs conocidos o incidencias relacionadas con los archivos cambiados. Si un TODO describe un bug que esta rama debería corregir, agrégalo a tu plan de pruebas. Si encuentras un nuevo bug durante el QA que no está en TODOS.md, anótalo en el informe.

7. **Informar hallazgos** limitados a los cambios de la rama:
   - "Cambios probados: N páginas/rutas afectadas por esta rama"
   - Para cada una: ¿funciona? Evidencia en capturas de pantalla.
   - ¿Alguna regresión en páginas adyacentes?

**Si el usuario proporciona una URL en modo consciente del diff:** Usa esa URL como base pero sigue limitando las pruebas a los archivos cambiados.

### Completo (por defecto cuando se proporciona URL)
Exploración sistemática. Visitar cada página accesible. Documentar 5-10 incidencias bien evidenciadas. Producir puntuación de salud. Toma 5-15 minutos dependiendo del tamaño de la app.

### Rápido (`--quick`)
Test smoke de 30 segundos. Visitar página principal + 5 principales objetivos de navegación. Verificar: ¿carga la página? ¿Errores en consola? ¿Enlaces rotos? Producir puntuación de salud. Sin documentación detallada de incidencias.

### Regresión (`--regression <baseline>`)
Ejecutar modo completo, luego cargar `baseline.json` de una ejecución anterior. Diff: ¿qué incidencias se corrigieron? ¿Cuáles son nuevas? ¿Cuál es el delta de puntuación? Agregar sección de regresión al informe.

---

## Flujo de Trabajo

### Fase 1: Inicializar

1. Encontrar el binario browse (ver Setup arriba)
2. Crear directorios de salida
3. Copiar plantilla de informe de `qa/templates/qa-report-template.md` al directorio de salida
4. Iniciar temporizador para seguimiento de duración

### Fase 2: Autenticar (si es necesario)

**Si el usuario especificó credenciales de autenticación:**

```bash
$B goto <login-url>
$B snapshot -i                    # encontrar el formulario de login
$B fill @e3 "user@example.com"
$B fill @e4 "[REDACTED]"         # NUNCA incluir contraseñas reales en el informe
$B click @e5                      # enviar
$B snapshot -D                    # verificar que el login fue exitoso
```

**Si el usuario proporcionó un archivo de cookies:**

```bash
$B cookie-import cookies.json
$B goto <target-url>
```

**Si se requiere 2FA/OTP:** Pregunta al usuario por el código y espera.

**Si un CAPTCHA te bloquea:** Dile al usuario: "Por favor completa el CAPTCHA en el navegador, luego dime que continúe."

### Fase 3: Orientar

Obtener un mapa de la aplicación:

```bash
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links                          # mapear estructura de navegación
$B console --errors               # ¿errores al llegar?
```

**Detectar framework** (anotar en metadatos del informe):
- `__next` en HTML o requests a `_next/data` → Next.js
- Meta tag `csrf-token` → Rails
- `wp-content` en URLs → WordPress
- Enrutamiento client-side sin recarga de página → SPA

**Para SPAs:** El comando `links` puede devolver pocos resultados porque la navegación es client-side. Usa `snapshot -i` para encontrar elementos de navegación (botones, elementos de menú) en su lugar.

### Fase 4: Explorar

Visitar páginas sistemáticamente. En cada página:

```bash
$B goto <page-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/page-name.png"
$B console --errors
```

Luego sigue el **checklist de exploración por página** (ver `qa/references/issue-taxonomy.md`):

1. **Escaneo visual** — Mira la captura anotada buscando problemas de layout
2. **Elementos interactivos** — Clic en botones, enlaces, controles. ¿Funcionan?
3. **Formularios** — Rellenar y enviar. Probar vacío, inválido, casos extremos
4. **Navegación** — Verificar todas las rutas de entrada y salida
5. **Estados** — Estado vacío, cargando, error, desbordamiento
6. **Consola** — ¿Nuevos errores JS después de las interacciones?
7. **Responsividad** — Verificar viewport móvil si es relevante:
   ```bash
   $B viewport 375x812
   $B screenshot "$REPORT_DIR/screenshots/page-mobile.png"
   $B viewport 1280x720
   ```

**Criterio de profundidad:** Dedica más tiempo a funcionalidades principales (página principal, dashboard, checkout, búsqueda) y menos a páginas secundarias (acerca de, términos, privacidad).

**Modo rápido:** Solo visita la página principal + los 5 principales objetivos de navegación de la fase de Orientación. Omite el checklist por página — solo verifica: ¿carga? ¿Errores en consola? ¿Enlaces rotos visibles?

### Fase 5: Documentar

Documenta cada incidencia **inmediatamente cuando se encuentre** — no las acumules.

**Dos niveles de evidencia:**

**Bugs interactivos** (flujos rotos, botones muertos, fallos de formulario):
1. Toma una captura de pantalla antes de la acción
2. Realiza la acción
3. Toma una captura de pantalla mostrando el resultado
4. Usa `snapshot -D` para mostrar qué cambió
5. Escribe pasos de reproducción referenciando las capturas

```bash
$B screenshot "$REPORT_DIR/screenshots/issue-001-step-1.png"
$B click @e5
$B screenshot "$REPORT_DIR/screenshots/issue-001-result.png"
$B snapshot -D
```

**Bugs estáticos** (erratas, problemas de layout, imágenes faltantes):
1. Toma una sola captura anotada mostrando el problema
2. Describe qué está mal

```bash
$B snapshot -i -a -o "$REPORT_DIR/screenshots/issue-002.png"
```

**Escribe cada incidencia en el informe inmediatamente** usando el formato de plantilla de `qa/templates/qa-report-template.md`.

### Fase 6: Cierre

1. **Calcular puntuación de salud** usando la rúbrica a continuación
2. **Escribir "Top 3 Cosas a Corregir"** — las 3 incidencias de mayor severidad
3. **Escribir resumen de salud de consola** — agregar todos los errores de consola vistos en todas las páginas
4. **Actualizar conteos de severidad** en la tabla resumen
5. **Rellenar metadatos del informe** — fecha, duración, páginas visitadas, conteo de capturas, framework
6. **Guardar línea base** — escribir `baseline.json` con:
   ```json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   ```

**Modo regresión:** Después de escribir el informe, carga el archivo de línea base. Compara:
- Delta de puntuación de salud
- Incidencias corregidas (en la línea base pero no en el actual)
- Nuevas incidencias (en el actual pero no en la línea base)
- Agrega la sección de regresión al informe

---

## Rúbrica de Puntuación de Salud

Calcula la puntuación de cada categoría (0-100), luego toma el promedio ponderado.

### Consola (peso: 15%)
- 0 errores → 100
- 1-3 errores → 70
- 4-10 errores → 40
- 10+ errores → 10

### Enlaces (peso: 10%)
- 0 rotos → 100
- Cada enlace roto → -15 (mínimo 0)

### Puntuación por Categoría (Visual, Funcional, UX, Contenido, Rendimiento, Accesibilidad)
Cada categoría empieza en 100. Deducción por hallazgo:
- Incidencia crítica → -25
- Incidencia alta → -15
- Incidencia media → -8
- Incidencia baja → -3
Mínimo 0 por categoría.

### Pesos
| Categoría | Peso |
|-----------|------|
| Consola | 15% |
| Enlaces | 10% |
| Visual | 10% |
| Funcional | 20% |
| UX | 15% |
| Rendimiento | 10% |
| Contenido | 5% |
| Accesibilidad | 15% |

### Puntuación Final
`score = Σ (puntuación_categoría × peso)`

---

## Guía Específica por Framework

### Next.js
- Verificar consola en busca de errores de hidratación (`Hydration failed`, `Text content did not match`)
- Monitorear requests a `_next/data` en la red — los 404 indican fetching de datos roto
- Probar navegación client-side (clic en enlaces, no solo `goto`) — detecta problemas de enrutamiento
- Verificar CLS (Cumulative Layout Shift) en páginas con contenido dinámico

### Rails
- Verificar advertencias de queries N+1 en consola (si está en modo desarrollo)
- Verificar presencia de token CSRF en formularios
- Probar integración Turbo/Stimulus — ¿las transiciones de página funcionan suavemente?
- Verificar que los mensajes flash aparecen y se descartan correctamente

### WordPress
- Verificar conflictos de plugins (errores JS de diferentes plugins)
- Verificar visibilidad de la barra de admin para usuarios logueados
- Probar endpoints de la API REST (`/wp-json/`)
- Verificar advertencias de contenido mixto (común con WP)

### SPA General (React, Vue, Angular)
- Usar `snapshot -i` para navegación — el comando `links` no detecta rutas client-side
- Verificar estado obsoleto (navegar lejos y volver — ¿se refrescan los datos?)
- Probar botón atrás/adelante del navegador — ¿la app maneja el historial correctamente?
- Verificar fugas de memoria (monitorear consola después de uso prolongado)

---

## Reglas Importantes

1. **La reproducción es todo.** Cada incidencia necesita al menos una captura de pantalla. Sin excepciones.
2. **Verificar antes de documentar.** Reintenta la incidencia una vez para confirmar que es reproducible, no casual.
3. **Nunca incluir credenciales.** Escribe `[REDACTED]` para contraseñas en los pasos de reproducción.
4. **Escribir incrementalmente.** Agrega cada incidencia al informe conforme la encuentres. No acumules.
5. **Nunca leer código fuente.** Prueba como un usuario, no como un desarrollador.
6. **Verificar consola después de cada interacción.** Los errores JS que no se manifiestan visualmente siguen siendo bugs.
7. **Probar como un usuario.** Usa datos realistas. Recorre flujos de trabajo completos de extremo a extremo.
8. **Profundidad sobre amplitud.** 5-10 incidencias bien documentadas con evidencia > 20 descripciones vagas.
9. **Nunca eliminar archivos de salida.** Las capturas de pantalla e informes se acumulan — es intencional.
10. **Usar `snapshot -C` para UIs complicadas.** Encuentra divs clicables que el árbol de accesibilidad no detecta.
11. **Mostrar capturas de pantalla al usuario.** Después de cada comando `$B screenshot`, `$B snapshot -a -o`, o `$B responsive`, usa la herramienta Read en los archivos de salida para que el usuario pueda verlos en línea. Para `responsive` (3 archivos), lee los tres. Esto es crítico — sin ello, las capturas son invisibles para el usuario.
12. **Nunca negarte a usar el navegador.** Cuando el usuario invoca /qa o /qa-only, está solicitando pruebas basadas en navegador. Nunca sugieras evals, tests unitarios u otras alternativas como sustituto. Incluso si el diff parece no tener cambios de UI, los cambios de backend afectan el comportamiento de la app — siempre abre el navegador y prueba.

Registra la puntuación de salud de la línea base al final de la Fase 6.

---

## Estructura de Salida

```
.gstack/qa-reports/
├── qa-report-{domain}-{YYYY-MM-DD}.md    # Informe estructurado
├── screenshots/
│   ├── initial.png                        # Captura anotada de la página de inicio
│   ├── issue-001-step-1.png               # Evidencia por incidencia
│   ├── issue-001-result.png
│   ├── issue-001-before.png               # Antes de la corrección (si se corrigió)
│   ├── issue-001-after.png                # Después de la corrección (si se corrigió)
│   └── ...
└── baseline.json                          # Para modo regression
```

Los nombres de los informes usan el dominio y la fecha: `qa-report-myapp-com-2026-03-12.md`

---

## Fase 7: Triaje

Ordena todas las incidencias descubiertas por severidad, luego decide cuáles corregir según el nivel seleccionado:

- **Rápido:** Corregir solo críticas + altas. Marcar medias/bajas como "diferidas."
- **Estándar:** Corregir críticas + altas + medias. Marcar bajas como "diferidas."
- **Exhaustivo:** Corregir todas, incluyendo severidad cosmética/baja.

Marca las incidencias que no se pueden corregir desde el código fuente (p. ej., bugs de widgets de terceros, problemas de infraestructura) como "diferidas" independientemente del nivel.

---

## Fase 8: Bucle de Corrección

Para cada incidencia corregible, en orden de severidad:

### 8a. Localizar fuente

```bash
# Grep para mensajes de error, nombres de componentes, definiciones de rutas
# Glob para patrones de archivos que coincidan con la página afectada
```

- Encuentra el/los archivo(s) fuente responsables del bug
- Modifica SOLO archivos directamente relacionados con la incidencia

### 8b. Corregir

- Lee el código fuente, comprende el contexto
- Haz la **corrección mínima** — el cambio más pequeño que resuelva la incidencia
- NO refactorices código circundante, añadas funcionalidades ni "mejores" cosas no relacionadas

### 8c. Commit

```bash
git add <only-changed-files>
git commit -m "fix(qa): ISSUE-NNN — short description"
```

- Un commit por corrección. Nunca agrupes múltiples correcciones.
- Formato del mensaje: `fix(qa): ISSUE-NNN — short description`

### 8d. Re-probar

- Navega de vuelta a la página afectada
- Toma un **par de capturas antes/después**
- Comprueba la consola en busca de errores
- Usa `snapshot -D` para verificar que el cambio tuvo el efecto esperado

```bash
$B goto <affected-url>
$B screenshot "$REPORT_DIR/screenshots/issue-NNN-after.png"
$B console --errors
$B snapshot -D
```

### 8e. Clasificar

- **verified**: la re-prueba confirma que la corrección funciona, no se introdujeron nuevos errores
- **best-effort**: corrección aplicada pero no se pudo verificar completamente (p. ej., requiere estado de autenticación, servicio externo)
- **reverted**: regression detectada → `git revert HEAD` → marcar incidencia como "diferida"

### 8e.5. Regression Test

Omitir si: la clasificación no es "verified", O la corrección es puramente visual/CSS sin comportamiento JS, O no se detectó framework de pruebas Y el usuario rechazó la inicialización.

**1. Estudia los patrones de prueba existentes del proyecto:**

Lee 2-3 archivos de prueba más cercanos a la corrección (mismo directorio, mismo tipo de código). Replica exactamente:
- Nomenclatura de archivos, imports, estilo de aserciones, anidamiento describe/it, patrones de setup/teardown
El regression test debe parecer escrito por el mismo desarrollador.

**2. Traza la ruta del código del bug, luego escribe un regression test:**

Antes de escribir la prueba, traza el flujo de datos a través del código que acabas de corregir:
- ¿Qué entrada/estado provocó el bug? (la precondición exacta)
- ¿Qué ruta de código siguió? (qué ramas, qué llamadas a funciones)
- ¿Dónde falló? (la línea/condición exacta que falló)
- ¿Qué otras entradas podrían recorrer la misma ruta? (casos límite alrededor de la corrección)

La prueba DEBE:
- Configurar la precondición que provocó el bug (el estado exacto que causó la rotura)
- Realizar la acción que expuso el bug
- Asertar el comportamiento correcto (NO "se renderiza" o "no lanza excepción")
- Si encontraste casos límite adyacentes al trazar, pruébalos también (p. ej., entrada null, array vacío, valor límite)
- Incluir comentario completo de atribución:
  ```
  // Regression: ISSUE-NNN — {qué falló}
  // Found by /qa on {YYYY-MM-DD}
  // Report: .gstack/qa-reports/qa-report-{domain}-{date}.md
  ```

Decisión del tipo de prueba:
- Error de consola / excepción JS / bug de lógica → prueba unitaria o de integración
- Formulario roto / fallo de API / bug de flujo de datos → prueba de integración con petición/respuesta
- Bug visual con comportamiento JS (dropdown roto, animación) → prueba de componente
- CSS puro → omitir (detectado en re-ejecuciones de QA)

Genera pruebas unitarias. Simula (mock) todas las dependencias externas (BD, API, Redis, sistema de archivos).

Usa nombres auto-incrementales para evitar colisiones: comprueba los archivos `{name}.regression-*.test.{ext}` existentes, toma el número máximo + 1.

**3. Ejecuta solo el nuevo archivo de prueba:**

```bash
{detected test command} {new-test-file}
```

**4. Evaluar:**
- Pasa → commit: `git commit -m "test(qa): regression test for ISSUE-NNN — {desc}"`
- Falla → corrige la prueba una vez. Si sigue fallando → elimina la prueba, diferir.
- Lleva >2 min de exploración → omitir y diferir.

**5. Exclusión de probabilidad-WTF:** Los commits de pruebas no cuentan para la heurística.

### 8f. Auto-Regulación (DETENTE Y EVALÚA)

Cada 5 correcciones (o después de cualquier revert), calcula la probabilidad-WTF:

```
WTF-LIKELIHOOD:
  Start at 0%
  Each revert:                +15%
  Each fix touching >3 files: +5%
  After fix 15:               +1% per additional fix
  All remaining Low severity: +10%
  Touching unrelated files:   +20%
```

**Si WTF > 20%:** DETENTE inmediatamente. Muestra al usuario lo que has hecho hasta ahora. Pregunta si debe continuar.

**Límite estricto: 50 correcciones.** Después de 50 correcciones, detente independientemente de las incidencias restantes.

---

## Fase 9: QA Final

Después de aplicar todas las correcciones:

1. Re-ejecuta QA en todas las páginas afectadas
2. Calcula la puntuación de salud final
3. **Si la puntuación final es PEOR que la línea base:** ADVIERTE de forma prominente — algo ha regresionado

---

## Fase 10: Informe

Escribe el informe tanto en la ubicación local como en la del proyecto:

**Local:** `.gstack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md`

**Ámbito del proyecto:** Escribe el artefacto de resultado de pruebas para contexto entre sesiones:
```bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
```
Escribe en `~/.gstack/projects/{slug}/{user}-{branch}-test-outcome-{datetime}.md`

**Adiciones por incidencia** (más allá de la plantilla de informe estándar):
- Estado de la corrección: verified / best-effort / reverted / diferida
- SHA del commit (si se corrigió)
- Archivos modificados (si se corrigió)
- Capturas antes/después (si se corrigió)

**Sección de resumen:**
- Total de incidencias encontradas
- Correcciones aplicadas (verified: X, best-effort: Y, reverted: Z)
- Incidencias diferidas
- Delta de puntuación de salud: línea base → final

**Resumen para PR:** Incluye un resumen de una línea adecuado para descripciones de PR:
> "QA encontró N incidencias, corrigió M, puntuación de salud X → Y."

---

## Fase 11: Actualización de TODOS.md

Si el repositorio tiene un `TODOS.md`:

1. **Nuevos bugs diferidos** → añadir como TODOs con severidad, categoría y pasos de reproducción
2. **Bugs corregidos que estaban en TODOS.md** → anotar con "Corregido por /qa en {rama}, {fecha}"

---

## Reglas Adicionales (específicas de qa)

11. **Se requiere árbol de trabajo limpio.** Si tiene cambios, usa AskUserQuestion para ofrecer commit/stash/abortar antes de proceder.
12. **Un commit por corrección.** Nunca agrupes múltiples correcciones en un commit.
13. **Solo modificar pruebas al generar regression tests en la Fase 8e.5.** Nunca modificar configuración de CI. Nunca modificar pruebas existentes — solo crear nuevos archivos de prueba.
14. **Revertir en caso de regression.** Si una corrección empeora las cosas, `git revert HEAD` inmediatamente.
15. **Auto-regularse.** Sigue la heurística de probabilidad-WTF. Ante la duda, detente y pregunta.
