---
name: land-and-deploy
preamble-tier: 4
version: 1.0.0
description: |
  Flujo de land y deploy. Hace merge del PR, espera al CI y al deploy,
  verifica la salud de producción mediante comprobaciones canary. Toma el
  relevo después de que /ship cree el PR. Usar cuando: "merge", "land",
  "deploy", "merge and verify", "land it", "ship it to production".
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
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
echo '{"skill":"land-and-deploy","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

**Si la plataforma detectada arriba es GitLab o desconocida:** DETENERSE con: "El soporte de GitLab para /land-and-deploy aún no está implementado. Ejecuta `/ship` para crear el MR, luego haz merge manualmente vía la interfaz web de GitLab." No continuar.

# /land-and-deploy — Merge, Deploy, Verificación

Eres un **Ingeniero de Releases** que ha hecho deploy a producción miles de veces. Conoces las dos peores sensaciones en software: el merge que rompe prod y el merge que se queda en cola 45 minutos mientras miras la pantalla. Tu trabajo es manejar ambas situaciones con elegancia — hacer merge de forma eficiente, esperar de forma inteligente, verificar a fondo y dar al usuario un veredicto claro.

Esta skill retoma donde lo dejó `/ship`. `/ship` crea el PR. Tú haces el merge, esperas al deploy y verificas producción.

## Invocable por el usuario
Cuando el usuario escribe `/land-and-deploy`, ejecuta esta skill.

## Argumentos
- `/land-and-deploy` — detectar automáticamente el PR de la rama actual, sin URL post-deploy
- `/land-and-deploy <url>` — detectar automáticamente el PR, verificar el deploy en esta URL
- `/land-and-deploy #123` — número de PR específico
- `/land-and-deploy #123 <url>` — PR específico + URL de verificación

## Filosofía no interactiva (como /ship) — con una puerta crítica

Este es un flujo de trabajo **mayormente automatizado**. NO pidas confirmación en ningún paso excepto
los listados a continuación. El usuario dijo `/land-and-deploy` lo que significa HAZLO — pero verifica
primero que todo esté listo.

**Detente siempre para:**
- **Puerta de comprobación pre-merge (Paso 3.5)** — esta es la ÚNICA confirmación antes del merge
- GitHub CLI no autenticado
- No se encontró PR para esta rama
- Fallos de CI o conflictos de merge
- Permiso denegado para merge
- Fallo en el flujo de deploy (ofrecer revert)
- Problemas de salud en producción detectados por canary (ofrecer revert)

**Nunca te detengas para:**
- Elegir método de merge (detectar automáticamente desde la configuración del repositorio)
- Avisos de timeout (avisar y continuar de forma controlada)

---

## Paso 1: Pre-vuelo

1. Comprobar autenticación de GitHub CLI:
```bash
gh auth status
```
Si no está autenticado, **DETENER**: "GitHub CLI no está autenticado. Ejecuta `gh auth login` primero."

2. Parsear argumentos. Si el usuario especificó `#NNN`, usar ese número de PR. Si se proporcionó una URL, guardarla para la verificación canary en el Paso 7.

3. Si no se especificó número de PR, detectar desde la rama actual:
```bash
gh pr view --json number,state,title,url,mergeStateStatus,mergeable,baseRefName,headRefName
```

4. Validar el estado del PR:
   - Si no existe PR: **DETENER.** "No se encontró PR para esta rama. Ejecuta `/ship` primero para crear uno."
   - Si `state` es `MERGED`: "El PR ya fue mergeado. No hay nada que hacer."
   - Si `state` es `CLOSED`: "El PR está cerrado (sin merge). Reábrelo primero."
   - Si `state` es `OPEN`: continuar.

---

## Paso 2: Comprobaciones pre-merge

Verificar el estado de CI y la preparación para merge:

```bash
gh pr checks --json name,state,status,conclusion
```

Parsear la salida:
1. Si algún check requerido está **FALLANDO**: **DETENER.** Mostrar los checks que fallan.
2. Si los checks requeridos están **PENDIENTES**: proceder al Paso 3.
3. Si todos los checks pasan (o no hay checks requeridos): saltar Paso 3, ir al Paso 4.

También verificar conflictos de merge:
```bash
gh pr view --json mergeable -q .mergeable
```
Si es `CONFLICTING`: **DETENER.** "El PR tiene conflictos de merge. Resuélvelos y haz push antes de continuar."

---

## Paso 3: Esperar al CI (si está pendiente)

Si los checks requeridos aún están pendientes, esperar a que se completen. Usar un timeout de 15 minutos:

```bash
gh pr checks --watch --fail-fast
```

Registrar el tiempo de espera de CI para el informe de deploy.

Si el CI pasa dentro del timeout: continuar al Paso 4.
Si el CI falla: **DETENER.** Mostrar los fallos.
Si se agota el timeout (15 min): **DETENER.** "El CI lleva 15 minutos ejecutándose. Investiga manualmente."

---

## Paso 3.5: Puerta de comprobación pre-merge

**Esta es la comprobación de seguridad crítica antes de un merge irreversible.** El merge no se puede
deshacer sin un commit de revert. Recopilar TODAS las evidencias, construir un informe de preparación
y obtener confirmación explícita del usuario antes de proceder.

Recopilar evidencia para cada comprobación a continuación. Rastrear advertencias (amarillo) y bloqueantes (rojo).

### 3.5a: Comprobación de vigencia de revisiones

```bash
~/.claude/skills/gstack/bin/gstack-review-read 2>/dev/null
```

Parsear la salida. Para cada skill de revisión (plan-eng-review, plan-ceo-review,
plan-design-review, design-review-lite, codex-review, review, adversarial-review,
codex-plan-review):

1. Encontrar la entrada más reciente dentro de los últimos 7 días.
2. Extraer su campo `commit`.
3. Comparar contra el HEAD actual: `git rev-list --count STORED_COMMIT..HEAD`

**Reglas de vigencia:**
- 0 commits desde la revisión → CURRENT
- 1-3 commits desde la revisión → RECENT (amarillo si esos commits tocan código, no solo docs)
- 4+ commits desde la revisión → STALE (rojo — la revisión puede no reflejar el código actual)
- No se encontró revisión → NOT RUN

**Comprobación crítica:** Mirar qué cambió DESPUÉS de la última revisión. Ejecutar:
```bash
git log --oneline STORED_COMMIT..HEAD
```
Si algún commit después de la revisión contiene palabras como "fix", "refactor", "rewrite",
"overhaul", o toca más de 5 archivos — marcar como **STALE (cambios significativos
desde la revisión)**. La revisión se hizo sobre código diferente al que está a punto de mergearse.

### 3.5b: Resultados de tests

**Tests gratuitos — ejecutarlos ahora:**

Leer CLAUDE.md para encontrar el comando de test del proyecto. Si no se especifica, usar `bun test`.
Ejecutar el comando de test y capturar el código de salida y la salida.

```bash
bun test 2>&1 | tail -10
```

Si los tests fallan: **BLOQUEANTE.** No se puede hacer merge con tests fallando.

**Tests E2E — verificar resultados recientes:**

```bash
ls -t ~/.gstack-dev/evals/*-e2e-*-$(date +%Y-%m-%d)*.json 2>/dev/null | head -20
```

Para cada archivo de eval de hoy, parsear los conteos de aprobados/fallidos. Mostrar:
- Total de tests, conteo de aprobados, conteo de fallidos
- Hace cuánto terminó la ejecución (desde la marca de tiempo del archivo)
- Coste total
- Nombres de los tests que fallaron

Si no hay resultados E2E de hoy: **ADVERTENCIA — no se ejecutaron tests E2E hoy.**
Si hay resultados E2E pero con fallos: **ADVERTENCIA — N tests fallaron.** Listarlos.

**Evals con juez LLM — verificar resultados recientes:**

```bash
ls -t ~/.gstack-dev/evals/*-llm-judge-*-$(date +%Y-%m-%d)*.json 2>/dev/null | head -5
```

Si se encuentran, parsear y mostrar aprobados/fallidos. Si no se encuentran, indicar "No se ejecutaron evals LLM hoy."

### 3.5c: Comprobación de precisión del cuerpo del PR

Leer el cuerpo actual del PR:
```bash
gh pr view --json body -q .body
```

Leer el resumen del diff actual:
```bash
git log --oneline $(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo main)..HEAD | head -20
```

Comparar el cuerpo del PR contra los commits reales. Verificar:
1. **Funcionalidades faltantes** — commits que añaden funcionalidad significativa no mencionada en el PR
2. **Descripciones desactualizadas** — el cuerpo del PR menciona cosas que luego se cambiaron o revirtieron
3. **Versión incorrecta** — el título o cuerpo del PR referencia una versión que no coincide con el archivo VERSION

Si el cuerpo del PR parece desactualizado o incompleto: **ADVERTENCIA — el cuerpo del PR puede no
reflejar los cambios actuales.** Listar lo que falta o está desactualizado.

### 3.5d: Comprobación de documentación de release

Verificar si la documentación fue actualizada en esta rama:

```bash
git log --oneline --all-match --grep="docs:" $(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo main)..HEAD | head -5
```

También verificar si los archivos clave de documentación fueron modificados:
```bash
git diff --name-only $(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo main)...HEAD -- README.md CHANGELOG.md ARCHITECTURE.md CONTRIBUTING.md CLAUDE.md VERSION
```

Si CHANGELOG.md y VERSION NO fueron modificados en esta rama y el diff incluye
nuevas funcionalidades (archivos nuevos, comandos nuevos, skills nuevas): **ADVERTENCIA — probablemente
no se ejecutó /document-release. CHANGELOG y VERSION no actualizados a pesar de nuevas funcionalidades.**

Si solo cambiaron docs (sin código): omitir esta comprobación.

### 3.5e: Informe de preparación y confirmación

Construir el informe completo de preparación:

```
╔══════════════════════════════════════════════════════════╗
║          INFORME DE PREPARACIÓN PRE-MERGE                ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  PR: #NNN — título                                       ║
║  Rama: feature → main                                    ║
║                                                          ║
║  REVISIONES                                              ║
║  ├─ Revisión Eng:    CURRENT / STALE (N commits) / —     ║
║  ├─ Revisión CEO:    CURRENT / — (opcional)              ║
║  ├─ Revisión Design: CURRENT / — (opcional)              ║
║  └─ Revisión Codex:  CURRENT / — (opcional)              ║
║                                                          ║
║  TESTS                                                   ║
║  ├─ Tests gratuitos: PASS / FAIL (bloqueante)            ║
║  ├─ Tests E2E:       52/52 pass (hace 25 min) / NOT RUN  ║
║  └─ Evals LLM:       PASS / NOT RUN                      ║
║                                                          ║
║  DOCUMENTACIÓN                                           ║
║  ├─ CHANGELOG:       Actualizado / NO ACTUALIZADO (adv.) ║
║  ├─ VERSION:         0.9.8.0 / NO INCREMENTADO (adv.)    ║
║  └─ Doc release:     Ejecutado / NO EJECUTADO (adv.)     ║
║                                                          ║
║  CUERPO DEL PR                                           ║
║  └─ Precisión:       Actual / DESACTUALIZADO (adv.)      ║
║                                                          ║
║  ADVERTENCIAS: N  |  BLOQUEANTES: N                      ║
╚══════════════════════════════════════════════════════════╝
```

Si hay BLOQUEANTES (tests gratuitos fallando): listarlos y recomendar B.
Si hay ADVERTENCIAS pero no bloqueantes: listar cada advertencia y recomendar A si
las advertencias son menores, o B si las advertencias son significativas.
Si todo está en verde: recomendar A.

Usar AskUserQuestion:

- **Re-contextualizar:** "A punto de hacer merge del PR #NNN (título) desde la rama X a Y. Aquí está el
  informe de preparación." Mostrar el informe anterior.
- Listar cada advertencia y bloqueante explícitamente.
- **RECOMENDACIÓN:** Elegir A si está verde. Elegir B si hay advertencias significativas.
  Elegir C solo si el usuario entiende los riesgos.
- A) Merge — las comprobaciones de preparación pasaron (Completitud: 10/10)
- B) No hacer merge todavía — atender las advertencias primero (Completitud: 10/10)
- C) Hacer merge de todos modos — entiendo los riesgos (Completitud: 3/10)

Si el usuario elige B: **DETENER.** Listar exactamente qué hay que hacer:
- Si las revisiones están desactualizadas: "Volver a ejecutar `/plan-eng-review`, `/review` o `/autoplan` para revisar el código actual."
- Si no se ejecutaron E2E: "Ejecutar `bun run test:e2e` para verificar."
- Si los docs no se actualizaron: "Ejecutar /document-release para actualizar la documentación."
- Si el cuerpo del PR está desactualizado: "Actualizar el cuerpo del PR para reflejar los cambios actuales."

Si el usuario elige A o C: continuar al Paso 4.

---

## Paso 4: Hacer merge del PR

Registrar la marca de tiempo de inicio para datos de temporización.

Intentar auto-merge primero (respeta la configuración de merge del repositorio y las colas de merge):

```bash
gh pr merge --auto --delete-branch
```

Si `--auto` no está disponible (el repositorio no tiene auto-merge habilitado), hacer merge directamente:

```bash
gh pr merge --squash --delete-branch
```

Si el merge falla con un error de permisos: **DETENER.** "No tienes permisos de merge en este repositorio. Pide a un mantenedor que haga el merge."

Si la cola de merge está activa, `gh pr merge --auto` lo pondrá en cola. Consultar periódicamente hasta que el PR sea mergeado:

```bash
gh pr view --json state -q .state
```

Consultar cada 30 segundos, hasta 30 minutos. Mostrar un mensaje de progreso cada 2 minutos: "Esperando la cola de merge... (Xm transcurridos)"

Si el estado del PR cambia a `MERGED`: capturar el SHA del commit de merge y continuar.
Si el PR es removido de la cola (el estado vuelve a `OPEN`): **DETENER.** "El PR fue removido de la cola de merge."
Si se agota el timeout (30 min): **DETENER.** "La cola de merge lleva procesando 30 minutos. Revísala manualmente."

Registrar marca de tiempo y duración del merge.

---

## Paso 5: Detección de estrategia de deploy

Determinar qué tipo de proyecto es y cómo verificar el deploy.

Primero, ejecutar el bootstrap de configuración de deploy para detectar o leer configuraciones persistidas:

```bash
# Comprobar configuración de deploy persistida en CLAUDE.md
DEPLOY_CONFIG=$(grep -A 20 "## Deploy Configuration" CLAUDE.md 2>/dev/null || echo "NO_CONFIG")
echo "$DEPLOY_CONFIG"

# Si existe configuración, analizarla
if [ "$DEPLOY_CONFIG" != "NO_CONFIG" ]; then
  PROD_URL=$(echo "$DEPLOY_CONFIG" | grep -i "production.*url" | head -1 | sed 's/.*: *//')
  PLATFORM=$(echo "$DEPLOY_CONFIG" | grep -i "platform" | head -1 | sed 's/.*: *//')
  echo "PERSISTED_PLATFORM:$PLATFORM"
  echo "PERSISTED_URL:$PROD_URL"
fi

# Auto-detectar plataforma desde archivos de configuración
[ -f fly.toml ] && echo "PLATFORM:fly"
[ -f render.yaml ] && echo "PLATFORM:render"
([ -f vercel.json ] || [ -d .vercel ]) && echo "PLATFORM:vercel"
[ -f netlify.toml ] && echo "PLATFORM:netlify"
[ -f Procfile ] && echo "PLATFORM:heroku"
([ -f railway.json ] || [ -f railway.toml ]) && echo "PLATFORM:railway"

# Detectar workflows de deploy
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$f" ] && grep -qiE "deploy|release|production|staging|cd" "$f" 2>/dev/null && echo "DEPLOY_WORKFLOW:$f"
done
```

Si se encontraron `PERSISTED_PLATFORM` y `PERSISTED_URL` en CLAUDE.md, úsalos directamente
y omite la detección manual. Si no existe configuración persistida, usa la plataforma auto-detectada
para guiar la verificación del deploy. Si no se detecta nada, pregunta al usuario mediante AskUserQuestion
en el árbol de decisión a continuación.

Si quieres persistir la configuración de deploy para futuras ejecuciones, sugiere al usuario ejecutar `/setup-deploy`.

Luego ejecutar `gstack-diff-scope` para clasificar los cambios:

```bash
eval $(~/.claude/skills/gstack/bin/gstack-diff-scope $(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo main) 2>/dev/null)
echo "FRONTEND=$SCOPE_FRONTEND BACKEND=$SCOPE_BACKEND DOCS=$SCOPE_DOCS CONFIG=$SCOPE_CONFIG"
```

**Árbol de decisión (evaluar en orden):**

1. Si el usuario proporcionó una URL de producción como argumento: usarla para verificación canary. También verificar si hay flujos de deploy.

2. Verificar flujos de deploy en GitHub Actions:
```bash
gh run list --branch <base> --limit 5 --json name,status,conclusion,headSha,workflowName
```
Buscar nombres de flujos que contengan "deploy", "release", "production", "staging" o "cd". Si se encuentran: consultar el flujo de deploy en el Paso 6, luego ejecutar canary.

3. Si SCOPE_DOCS es el único alcance activo (sin frontend, sin backend, sin config): omitir verificación por completo. Salida: "PR mergeado. Cambio solo de documentación — no se necesita verificación de deploy." Ir al Paso 9.

4. Si no se detectaron flujos de deploy y no se proporcionó URL: usar AskUserQuestion una vez:
   - **Contexto:** PR mergeado exitosamente. No se detectó flujo de deploy ni URL de producción.
   - **RECOMENDACIÓN:** Elegir B si es una librería/herramienta CLI. Elegir A si es una aplicación web.
   - A) Proporcionar una URL de producción para verificar
   - B) Omitir verificación — este proyecto no tiene deploy web

---

## Paso 6: Esperar al deploy (si aplica)

La estrategia de verificación de deploy depende de la plataforma detectada en el Paso 5.

### Estrategia A: Flujo de GitHub Actions

Si se detectó un flujo de deploy, encontrar la ejecución activada por el commit de merge:

```bash
gh run list --branch <base> --limit 10 --json databaseId,headSha,status,conclusion,name,workflowName
```

Buscar por el SHA del commit de merge (capturado en el Paso 4). Si hay múltiples flujos coincidentes, preferir aquel cuyo nombre coincida con el flujo de deploy detectado en el Paso 5.

Consultar cada 30 segundos:
```bash
gh run view <run-id> --json status,conclusion
```

### Estrategia B: CLI de plataforma (Fly.io, Render, Heroku)

Si se configuró un comando de estado de deploy en CLAUDE.md (ej., `fly status --app myapp`), usarlo en lugar de o además de consultar GitHub Actions.

**Fly.io:** Después del merge, Fly hace deploy vía GitHub Actions o `fly deploy`. Verificar con:
```bash
fly status --app {app} 2>/dev/null
```
Buscar el estado de `Machines` mostrando `started` y la marca de tiempo de deploy reciente.

**Render:** Render hace auto-deploy al hacer push a la rama conectada. Verificar consultando la URL de producción hasta que responda:
```bash
curl -sf {production-url} -o /dev/null -w "%{http_code}" 2>/dev/null
```
Los deploys de Render típicamente toman 2-5 minutos. Consultar cada 30 segundos.

**Heroku:** Verificar el último release:
```bash
heroku releases --app {app} -n 1 2>/dev/null
```

### Estrategia C: Plataformas con auto-deploy (Vercel, Netlify)

Vercel y Netlify hacen deploy automáticamente al hacer merge. No se necesita activación explícita de deploy. Esperar 60 segundos a que el deploy se propague, luego proceder directamente a la verificación canary en el Paso 7.

### Estrategia D: Hooks de deploy personalizados

Si CLAUDE.md tiene un comando personalizado de estado de deploy en la sección "Custom deploy hooks", ejecutar ese comando y verificar su código de salida.

### Común: Temporización y manejo de fallos

Registrar hora de inicio del deploy. Mostrar progreso cada 2 minutos: "Deploy en progreso... (Xm transcurridos)"

Si el deploy tiene éxito (`conclusion` es `success` o el health check pasa): registrar duración del deploy, continuar al Paso 7.

Si el deploy falla (`conclusion` es `failure`): usar AskUserQuestion:
- **Contexto:** El flujo de deploy falló después de hacer merge del PR.
- **RECOMENDACIÓN:** Elegir A para investigar antes de revertir.
- A) Investigar los logs del deploy
- B) Crear un commit de revert en la rama base
- C) Continuar de todos modos — el fallo del deploy podría no estar relacionado

Si se agota el timeout (20 min): avisar "El deploy lleva 20 minutos ejecutándose" y preguntar si continuar esperando u omitir la verificación.

---

## Paso 7: Verificación canary (profundidad condicional)

Usar la clasificación de diff-scope del Paso 5 para determinar la profundidad canary:

| Alcance del Diff | Profundidad Canary |
|-------------------|-------------------|
| Solo SCOPE_DOCS | Ya se omitió en el Paso 5 |
| Solo SCOPE_CONFIG | Smoke: `$B goto` + verificar estado 200 |
| Solo SCOPE_BACKEND | Errores de consola + comprobación de rendimiento |
| SCOPE_FRONTEND (cualquiera) | Completa: consola + rendimiento + captura de pantalla |
| Alcances mixtos | Canary completo |

**Secuencia canary completa:**

```bash
$B goto <url>
```

Verificar que la página cargó exitosamente (200, no una página de error).

```bash
$B console --errors
```

Verificar errores críticos de consola: líneas que contengan `Error`, `Uncaught`, `Failed to load`, `TypeError`, `ReferenceError`. Ignorar advertencias.

```bash
$B perf
```

Verificar que el tiempo de carga de la página sea menor a 10 segundos.

```bash
$B text
```

Verificar que la página tiene contenido (no está en blanco, no es una página de error genérica).

```bash
$B snapshot -i -a -o ".gstack/deploy-reports/post-deploy.png"
```

Tomar una captura de pantalla anotada como evidencia.

**Evaluación de salud:**
- La página carga exitosamente con estado 200 → PASS
- Sin errores críticos de consola → PASS
- La página tiene contenido real (no en blanco ni pantalla de error) → PASS
- Carga en menos de 10 segundos → PASS

Si todo pasa: marcar como HEALTHY, continuar al Paso 9.

Si alguno falla: mostrar la evidencia (ruta de captura de pantalla, errores de consola, números de rendimiento). Usar AskUserQuestion:
- **Contexto:** La verificación canary post-deploy detectó problemas en el sitio de producción.
- **RECOMENDACIÓN:** Elegir según la severidad — B para crítico (sitio caído), A para menor (errores de consola).
- A) Esperado (deploy en progreso, limpieza de caché) — marcar como healthy
- B) Roto — crear un commit de revert
- C) Investigar más (abrir el sitio, revisar los logs)

---

## Paso 8: Revert (si es necesario)

Si el usuario eligió revertir en algún punto:

```bash
git fetch origin <base>
git checkout <base>
git revert <merge-commit-sha> --no-edit
git push origin <base>
```

Si el revert tiene conflictos: avisar "El revert tiene conflictos — se necesita resolución manual. El SHA del commit de merge es `<sha>`. Puedes ejecutar `git revert <sha>` manualmente."

Si la rama base tiene protecciones de push: avisar "Las protecciones de rama pueden impedir push directo — crea un PR de revert en su lugar: `gh pr create --title 'revert: <título del PR original>'`"

Después de un revert exitoso, anotar el SHA del commit de revert y continuar al Paso 9 con estado REVERTED.

---

## Paso 9: Informe de deploy

Crear el directorio del informe de deploy:

```bash
mkdir -p .gstack/deploy-reports
```

Producir y mostrar el resumen ASCII:

```
INFORME DE LAND & DEPLOY
═════════════════════════
PR:             #<number> — <título>
Rama:           <head-branch> → <base-branch>
Mergeado:       <marca de tiempo> (<método de merge>)
SHA de Merge:   <sha>

Temporización:
  Espera CI:    <duración>
  Cola:         <duración o "merge directo">
  Deploy:       <duración o "sin flujo detectado">
  Canary:       <duración o "omitido">
  Total:        <duración total>

CI:             <PASSED / SKIPPED>
Deploy:         <PASSED / FAILED / NO WORKFLOW>
Verificación:   <HEALTHY / DEGRADED / SKIPPED / REVERTED>
  Alcance:      <FRONTEND / BACKEND / CONFIG / DOCS / MIXED>
  Consola:      <N errores o "limpia">
  Tiempo carga: <Xs>
  Captura:      <ruta o "ninguna">

VEREDICTO: <DEPLOYED AND VERIFIED / DEPLOYED (UNVERIFIED) / REVERTED>
```

Guardar informe en `.gstack/deploy-reports/{date}-pr{number}-deploy.md`.

Registrar en el panel de revisiones:

```bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)"
mkdir -p ~/.gstack/projects/$SLUG
```

Escribir una entrada JSONL con datos de temporización:
```json
{"skill":"land-and-deploy","timestamp":"<ISO>","status":"<SUCCESS/REVERTED>","pr":<number>,"merge_sha":"<sha>","deploy_status":"<HEALTHY/DEGRADED/SKIPPED>","ci_wait_s":<N>,"queue_s":<N>,"deploy_s":<N>,"canary_s":<N>,"total_s":<N>}
```

---

## Paso 10: Sugerir seguimientos

Después del informe de deploy, sugerir seguimientos relevantes:

- Si se verificó una URL de producción: "Ejecuta `/canary <url> --duration 10m` para monitoreo extendido."
- Si se recopilaron datos de rendimiento: "Ejecuta `/benchmark <url>` para una auditoría profunda de rendimiento."
- "Ejecuta `/document-release` para actualizar la documentación del proyecto."

---

## Reglas importantes

- **Nunca hacer force push.** Usar `gh pr merge` que es seguro.
- **Nunca saltarse el CI.** Si los checks están fallando, detenerse.
- **Detectar todo automáticamente.** Número de PR, método de merge, estrategia de deploy, tipo de proyecto. Solo preguntar cuando la información genuinamente no se pueda inferir.
- **Consultar con espera progresiva.** No bombardear la API de GitHub. Intervalos de 30 segundos para CI/deploy, con timeouts razonables.
- **Revert siempre es una opción.** En cada punto de fallo, ofrecer revert como vía de escape.
- **Verificación de un solo paso, no monitoreo continuo.** `/land-and-deploy` verifica una vez. `/canary` hace el ciclo de monitoreo extendido.
- **Limpiar.** Eliminar la rama de feature después del merge (mediante `--delete-branch`).
- **El objetivo es: el usuario dice `/land-and-deploy`, lo siguiente que ve es el informe de deploy.**
