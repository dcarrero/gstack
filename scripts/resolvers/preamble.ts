import type { TemplateContext } from './types';

function generatePreambleBash(ctx: TemplateContext): string {
  const runtimeRoot = ctx.host === 'codex'
    ? `_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
GSTACK_ROOT="$HOME/.codex/skills/gstack"
[ -n "$_ROOT" ] && [ -d "$_ROOT/.agents/skills/gstack" ] && GSTACK_ROOT="$_ROOT/.agents/skills/gstack"
GSTACK_BIN="$GSTACK_ROOT/bin"
GSTACK_BROWSE="$GSTACK_ROOT/browse/dist"
`
    : '';

  return `## Preámbulo (ejecutar primero)

\`\`\`bash
${runtimeRoot}_UPD=$(${ctx.paths.binDir}/gstack-update-check 2>/dev/null || ${ctx.paths.localSkillRoot}/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(${ctx.paths.binDir}/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(${ctx.paths.binDir}/gstack-config get proactive 2>/dev/null || echo "true")
_PROACTIVE_PROMPTED=$([ -f ~/.gstack/.proactive-prompted ] && echo "yes" || echo "no")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
echo "PROACTIVE_PROMPTED: $_PROACTIVE_PROMPTED"
source <(${ctx.paths.binDir}/gstack-repo-mode 2>/dev/null) || true
REPO_MODE=\${REPO_MODE:-unknown}
echo "REPO_MODE: $REPO_MODE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(${ctx.paths.binDir}/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: \${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
mkdir -p ~/.gstack/analytics
echo '{"skill":"${ctx.skillName}","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
# compatible con zsh: usar find en lugar de glob para evitar error NOMATCH
for _PF in $(find ~/.gstack/analytics -maxdepth 1 -name '.pending-*' 2>/dev/null); do [ -f "$_PF" ] && ${ctx.paths.binDir}/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true; break; done
\`\`\``;
}

function generateUpgradeCheck(ctx: TemplateContext): string {
  return `Si \`PROACTIVE\` es \`"false"\`, no sugieras proactivamente skills de gstack NI invoques
automáticamente skills según el contexto de la conversación. Solo ejecuta los skills que el usuario
escriba explícitamente (p. ej., /qa, /ship). Si hubieras invocado un skill automáticamente, en su lugar di brevemente:
"Creo que /nombredelskill podría ayudar aquí — ¿quieres que lo ejecute?" y espera confirmación.
El usuario optó por desactivar el comportamiento proactivo.

Si la salida muestra \`UPGRADE_AVAILABLE <old> <new>\`: lee \`${ctx.paths.skillRoot}/gstack-upgrade/SKILL.md\` y sigue el "Flujo de actualización en línea" (actualizar automáticamente si está configurado, de lo contrario AskUserQuestion con 4 opciones, guardar estado de pausa si se rechaza). Si \`JUST_UPGRADED <from> <to>\`: informa al usuario "Ejecutando gstack v{to} (¡recién actualizado!)" y continúa.`;
}

function generateLakeIntro(): string {
  return `Si \`LAKE_INTRO\` es \`no\`: Antes de continuar, presenta el Principio de Completitud.
Dile al usuario: "gstack sigue el principio de **Hervir el Lago** — siempre hacer lo completo
cuando la IA hace que el coste marginal sea casi cero. Más información: https://garryslist.org/posts/boil-the-ocean"
Luego ofrece abrir el ensayo en su navegador predeterminado:

\`\`\`bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
\`\`\`

Solo ejecuta \`open\` si el usuario dice que sí. Siempre ejecuta \`touch\` para marcarlo como visto. Esto solo ocurre una vez.`;
}

function generateTelemetryPrompt(ctx: TemplateContext): string {
  return `Si \`TEL_PROMPTED\` es \`no\` Y \`LAKE_INTRO\` es \`yes\`: Después de gestionar la introducción del lago,
pregunta al usuario sobre la telemetría. Usa AskUserQuestion:

> ¡Ayuda a mejorar gstack! El modo comunidad comparte datos de uso (qué skills usas, cuánto
> tardan, información de errores) con un ID de dispositivo estable para que podamos rastrear tendencias y corregir errores más rápido.
> Nunca se envía código, rutas de archivos ni nombres de repositorios.
> Cámbialo en cualquier momento con \`gstack-config set telemetry off\`.

Opciones:
- A) ¡Ayudar a mejorar gstack! (recomendado)
- B) No, gracias

Si A: ejecuta \`${ctx.paths.binDir}/gstack-config set telemetry community\`

Si B: haz una pregunta de seguimiento con AskUserQuestion:

> ¿Qué tal el modo anónimo? Solo sabríamos que *alguien* usó gstack — sin ID único,
> sin forma de conectar sesiones. Solo un contador que nos ayuda a saber si alguien está ahí fuera.

Opciones:
- A) Claro, anónimo está bien
- B) No, gracias, totalmente desactivado

Si B→A: ejecuta \`${ctx.paths.binDir}/gstack-config set telemetry anonymous\`
Si B→B: ejecuta \`${ctx.paths.binDir}/gstack-config set telemetry off\`

Siempre ejecuta:
\`\`\`bash
touch ~/.gstack/.telemetry-prompted
\`\`\`

Esto solo ocurre una vez. Si \`TEL_PROMPTED\` es \`yes\`, omite esto por completo.`;
}

function generateProactivePrompt(ctx: TemplateContext): string {
  return `Si \`PROACTIVE_PROMPTED\` es \`no\` Y \`TEL_PROMPTED\` es \`yes\`: Después de gestionar la telemetría,
pregunta al usuario sobre el comportamiento proactivo. Usa AskUserQuestion:

> gstack puede detectar proactivamente cuándo podrías necesitar un skill mientras trabajas —
> como sugerir /qa cuando dices "¿esto funciona?" o /investigate cuando encuentras
> un error. Recomendamos mantenerlo activado — acelera cada parte de tu flujo de trabajo.

Opciones:
- A) Mantenerlo activado (recomendado)
- B) Desactivarlo — yo escribiré los /comandos manualmente

Si A: ejecuta \`${ctx.paths.binDir}/gstack-config set proactive true\`
Si B: ejecuta \`${ctx.paths.binDir}/gstack-config set proactive false\`

Siempre ejecuta:
\`\`\`bash
touch ~/.gstack/.proactive-prompted
\`\`\`

Esto solo ocurre una vez. Si \`PROACTIVE_PROMPTED\` es \`yes\`, omite esto por completo.`;
}

function generateAskUserFormat(_ctx: TemplateContext): string {
  return `## Formato de AskUserQuestion

**SIEMPRE sigue esta estructura para cada llamada a AskUserQuestion:**
1. **Re-contextualizar:** Indica el proyecto, la rama actual (usa el valor \`_BRANCH\` impreso por el preámbulo — NO cualquier rama del historial de conversación o gitStatus), y el plan/tarea actual. (1-2 frases)
2. **Simplificar:** Explica el problema en español sencillo que un chico listo de 16 años pueda seguir. Sin nombres de funciones crudos, sin jerga interna, sin detalles de implementación. Usa ejemplos concretos y analogías. Di lo que HACE, no cómo se llama.
3. **Recomendar:** \`RECOMMENDATION: Elige [X] porque [razón en una línea]\` — siempre prefiere la opción completa sobre los atajos (ver Principio de Completitud). Incluye \`Completeness: X/10\` para cada opción. Calibración: 10 = implementación completa (todos los casos límite, cobertura total), 7 = cubre el camino feliz pero omite algunos bordes, 3 = atajo que posterga trabajo significativo. Si ambas opciones son 8+, elige la mayor; si una es ≤5, señálalo.
4. **Opciones:** Opciones con letras: \`A) ... B) ... C) ...\` — cuando una opción implica esfuerzo, muestra ambas escalas: \`(humano: ~X / CC: ~Y)\`

Asume que el usuario no ha mirado esta ventana en 20 minutos y no tiene el código abierto. Si necesitarías leer el código fuente para entender tu propia explicación, es demasiado complejo.

Las instrucciones por skill pueden añadir reglas de formato adicionales sobre esta base.`;
}

function generateCompletenessSection(): string {
  return `## Principio de Completitud — Hervir el Lago

La IA hace que la completitud sea casi gratuita. Siempre recomienda la opción completa sobre los atajos — la diferencia es de minutos con CC+gstack. Un "lago" (100% de cobertura, todos los casos límite) se puede hervir; un "océano" (reescritura completa, migración de varios trimestres) no. Hierve lagos, señala océanos.

**Referencia de esfuerzo** — muestra siempre ambas escalas:

| Tipo de tarea | Equipo humano | CC+gstack | Compresión |
|-----------|-----------|-----------|-------------|
| Boilerplate | 2 días | 15 min | ~100x |
| Tests | 1 día | 15 min | ~50x |
| Funcionalidad | 1 semana | 30 min | ~30x |
| Corrección de errores | 4 horas | 15 min | ~20x |

Incluye \`Completeness: X/10\` para cada opción (10=todos los casos límite, 7=camino feliz, 3=atajo).`;
}

function generateRepoModeSection(): string {
  return `## Propiedad del Repositorio — Si ves algo, di algo

\`REPO_MODE\` controla cómo manejar problemas fuera de tu rama:
- **\`solo\`** — Eres dueño de todo. Investiga y ofrece corregir proactivamente.
- **\`collaborative\`** / **\`unknown\`** — Señala mediante AskUserQuestion, no corrijas (puede ser de otra persona).

Siempre señala cualquier cosa que parezca incorrecta — una frase, qué notaste y su impacto.`;
}

export function generateTestFailureTriage(): string {
  return `## Triaje de Fallos en Tests

Cuando los tests fallan, NO te detengas inmediatamente. Primero, determina la propiedad:

### Paso T1: Clasifica cada fallo

Para cada test fallido:

1. **Obtén los archivos modificados en esta rama:**
   \`\`\`bash
   git diff origin/<base>...HEAD --name-only
   \`\`\`

2. **Clasifica el fallo:**
   - **En la rama** si: el archivo del test fallido fue modificado en esta rama, O la salida del test hace referencia a código que fue cambiado en esta rama, O puedes rastrear el fallo hasta un cambio en el diff de la rama.
   - **Probablemente preexistente** si: ni el archivo del test ni el código que prueba fueron modificados en esta rama, Y el fallo no está relacionado con ningún cambio de la rama que puedas identificar.
   - **Cuando sea ambiguo, clasifícalo como de la rama.** Es más seguro detener al desarrollador que dejar pasar un test roto. Solo clasifica como preexistente cuando estés seguro.

   Esta clasificación es heurística — usa tu criterio leyendo el diff y la salida del test. No tienes un grafo de dependencias programático.

### Paso T2: Gestiona los fallos de la rama

**DETENTE.** Estos son tus fallos. Muéstralos y no continúes. El desarrollador debe corregir sus propios tests rotos antes de enviar.

### Paso T3: Gestiona los fallos preexistentes

Consulta \`REPO_MODE\` de la salida del preámbulo.

**Si REPO_MODE es \`solo\`:**

Usa AskUserQuestion:

> Estos fallos de tests parecen preexistentes (no causados por los cambios de tu rama):
>
> [lista cada fallo con archivo:línea y breve descripción del error]
>
> Como este es un repositorio en solitario, eres la única persona que los corregirá.
>
> RECOMMENDATION: Elige A — corregir ahora mientras el contexto está fresco. Completeness: 9/10.
> A) Investigar y corregir ahora (humano: ~2-4h / CC: ~15min) — Completeness: 10/10
> B) Añadir como TODO P0 — corregir después de que esta rama se integre — Completeness: 7/10
> C) Omitir — ya lo sé, enviar de todos modos — Completeness: 3/10

**Si REPO_MODE es \`collaborative\` o \`unknown\`:**

Usa AskUserQuestion:

> Estos fallos de tests parecen preexistentes (no causados por los cambios de tu rama):
>
> [lista cada fallo con archivo:línea y breve descripción del error]
>
> Este es un repositorio colaborativo — estos pueden ser responsabilidad de otra persona.
>
> RECOMMENDATION: Elige B — asígnalo a quien lo rompió para que la persona correcta lo corrija. Completeness: 9/10.
> A) Investigar y corregir ahora de todos modos — Completeness: 10/10
> B) Blame + asignar issue de GitHub al autor — Completeness: 9/10
> C) Añadir como TODO P0 — Completeness: 7/10
> D) Omitir — enviar de todos modos — Completeness: 3/10

### Paso T4: Ejecuta la acción elegida

**Si "Investigar y corregir ahora":**
- Cambia a mentalidad /investigate: primero la causa raíz, luego la corrección mínima.
- Corrige el fallo preexistente.
- Haz commit de la corrección por separado de los cambios de la rama: \`git commit -m "fix: pre-existing test failure in <test-file>"\`
- Continúa con el flujo de trabajo.

**Si "Añadir como TODO P0":**
- Si \`TODOS.md\` existe, añade la entrada siguiendo el formato en \`review/TODOS-format.md\` (o \`.claude/skills/review/TODOS-format.md\`).
- Si \`TODOS.md\` no existe, créalo con la cabecera estándar y añade la entrada.
- La entrada debe incluir: título, la salida del error, en qué rama se detectó, y prioridad P0.
- Continúa con el flujo de trabajo — trata el fallo preexistente como no bloqueante.

**Si "Blame + asignar issue de GitHub" (solo colaborativo):**
- Encuentra quién probablemente lo rompió. Comprueba TANTO el archivo del test COMO el código de producción que prueba:
  \`\`\`bash
  # ¿Quién tocó por última vez el test fallido?
  git log --format="%an (%ae)" -1 -- <failing-test-file>
  # ¿Quién tocó por última vez el código de producción que cubre el test? (a menudo el verdadero causante)
  git log --format="%an (%ae)" -1 -- <source-file-under-test>
  \`\`\`
  Si son personas diferentes, prefiere al autor del código de producción — probablemente introdujo la regresión.
- Crea un issue de GitHub asignado a esa persona:
  \`\`\`bash
  gh issue create \\
    --title "Pre-existing test failure: <test-name>" \\
    --body "Found failing on branch <current-branch>. Failure is pre-existing.\\n\\n**Error:**\\n\`\`\`\\n<first 10 lines>\\n\`\`\`\\n\\n**Last modified by:** <author>\\n**Noticed by:** gstack /ship on <date>" \\
    --assignee "<github-username>"
  \`\`\`
- Si \`gh\` no está disponible o \`--assignee\` falla (usuario no está en la org, etc.), crea el issue sin asignado y menciona en el cuerpo quién debería revisarlo.
- Continúa con el flujo de trabajo.

**Si "Omitir":**
- Continúa con el flujo de trabajo.
- Indica en la salida: "Fallo de test preexistente omitido: <nombre-del-test>"`;
}

function generateSearchBeforeBuildingSection(ctx: TemplateContext): string {
  return `## Buscar antes de Construir

Antes de construir algo desconocido, **busca primero.** Consulta \`${ctx.paths.skillRoot}/ETHOS.md\`.
- **Capa 1** (probado y fiable) — no reinventes. **Capa 2** (nuevo y popular) — examina con cuidado. **Capa 3** (primeros principios) — valora por encima de todo.

**Eureka:** Cuando el razonamiento desde primeros principios contradice la sabiduría convencional, nómbralo y regístralo:
\`\`\`bash
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg skill "SKILL_NAME" --arg branch "$(git branch --show-current 2>/dev/null)" --arg insight "ONE_LINE_SUMMARY" '{ts:$ts,skill:$skill,branch:$branch,insight:$insight}' >> ~/.gstack/analytics/eureka.jsonl 2>/dev/null || true
\`\`\``;
}

function generateContributorMode(): string {
  return `## Modo Contribuidor

Si \`_CONTRIB\` es \`true\`: estás en **modo contribuidor**. Al final de cada paso principal del flujo de trabajo, puntúa tu experiencia con gstack de 0 a 10. Si no es un 10 y hay un error o mejora accionable — presenta un informe de campo.

**Informa solo de:** errores de herramientas de gstack donde la entrada era razonable pero gstack falló. **Omite:** errores de la aplicación del usuario, errores de red, fallos de autenticación en el sitio del usuario.

**Para informar:** escribe \`~/.gstack/contributor-logs/{slug}.md\`:
\`\`\`
# {Título}
**Qué intenté:** {acción} | **Qué pasó:** {resultado} | **Puntuación:** {0-10}
## Reproducción
1. {paso}
## Qué lo haría un 10
{una frase}
**Fecha:** {YYYY-MM-DD} | **Versión:** {versión} | **Skill:** /{skill}
\`\`\`
Slug: minúsculas con guiones, máximo 60 caracteres. Omitir si ya existe. Máximo 3/sesión. Informar en línea, no detenerse.`;
}

function generateCompletionStatus(): string {
  return `## Protocolo de Estado de Finalización

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
\`\`\`
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 frases]
ATTEMPTED: [qué intentaste]
RECOMMENDATION: [qué debería hacer el usuario a continuación]
\`\`\`

## Telemetría (ejecutar al final)

Después de que el flujo de trabajo del skill se complete (éxito, error o cancelación), registra el evento de telemetría.
Determina el nombre del skill a partir del campo \`name:\` en el frontmatter YAML de este archivo.
Determina el resultado del flujo de trabajo (success si se completó normalmente, error
si falló, abort si el usuario interrumpió).

**EXCEPCIÓN DE MODO PLAN — EJECUTAR SIEMPRE:** Este comando escribe telemetría en
\`~/.gstack/analytics/\` (directorio de configuración del usuario, no archivos del proyecto). El preámbulo
del skill ya escribe en el mismo directorio — es el mismo patrón.
Omitir este comando pierde datos de duración de sesión y resultado.

Ejecuta este bash:

\`\`\`bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \\
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \\
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
\`\`\`

Reemplaza \`SKILL_NAME\` con el nombre real del skill del frontmatter, \`OUTCOME\` con
success/error/abort, y \`USED_BROWSE\` con true/false según si se usó \`$B\`.
Si no puedes determinar el resultado, usa "unknown". Esto se ejecuta en segundo plano y
nunca bloquea al usuario.

## Pie de Estado del Plan

Cuando estés en modo plan y a punto de llamar a ExitPlanMode:

1. Comprueba si el archivo del plan ya tiene una sección \`## GSTACK REVIEW REPORT\`.
2. Si la TIENE — omite (un skill de revisión ya escribió un informe más completo).
3. Si NO la tiene — ejecuta este comando:

\\\`\\\`\\\`bash
~/.claude/skills/gstack/bin/gstack-review-read
\\\`\\\`\\\`

Luego escribe una sección \`## GSTACK REVIEW REPORT\` al final del archivo del plan:

- Si la salida contiene entradas de revisión (líneas JSONL antes de \`---CONFIG---\`): formatea la
  tabla estándar del informe con ejecuciones/estado/hallazgos por skill, mismo formato que usan los
  skills de revisión.
- Si la salida es \`NO_REVIEWS\` o vacía: escribe esta tabla de marcador de posición:

\\\`\\\`\\\`markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \\\`/plan-ceo-review\\\` | Scope & strategy | 0 | — | — |
| Codex Review | \\\`/codex review\\\` | Independent 2nd opinion | 0 | — | — |
| Eng Review | \\\`/plan-eng-review\\\` | Architecture & tests (required) | 0 | — | — |
| Design Review | \\\`/plan-design-review\\\` | UI/UX gaps | 0 | — | — |

**VEREDICTO:** AÚN SIN REVISIONES — ejecuta \\\`/autoplan\\\` para el pipeline completo de revisión, o las revisiones individuales de arriba.
\\\`\\\`\\\`

**EXCEPCIÓN DE MODO PLAN — EJECUTAR SIEMPRE:** Esto escribe en el archivo del plan, que es el único
archivo que puedes editar en modo plan. El informe de revisión del archivo del plan forma parte del
estado vivo del plan.`;
}

// Preamble Composition (tier → sections)
// ─────────────────────────────────────────────
// T1: core + upgrade + lake + telemetry + contributor + completion
// T2: T1 + ask + completeness
// T3: T2 + repo-mode + search
// T4: (same as T3 — TEST_FAILURE_TRIAGE is a separate {{}} placeholder, not preamble)
//
// Skills by tier:
//   T1: browse, setup-cookies, benchmark
//   T2: investigate, cso, retro, doc-release, setup-deploy, canary
//   T3: autoplan, codex, design-consult, office-hours, ceo/design/eng-review
//   T4: ship, review, qa, qa-only, design-review, land-deploy
export function generatePreamble(ctx: TemplateContext): string {
  const tier = ctx.preambleTier ?? 4;
  if (tier < 1 || tier > 4) {
    throw new Error(`Invalid preamble-tier: ${tier} in ${ctx.tmplPath}. Must be 1-4.`);
  }
  const sections = [
    generatePreambleBash(ctx),
    generateUpgradeCheck(ctx),
    generateLakeIntro(),
    generateTelemetryPrompt(ctx),
    generateProactivePrompt(ctx),
    ...(tier >= 2 ? [generateAskUserFormat(ctx), generateCompletenessSection()] : []),
    ...(tier >= 3 ? [generateRepoModeSection(), generateSearchBeforeBuildingSection(ctx)] : []),
    generateContributorMode(),
    generateCompletionStatus(),
  ];
  return sections.join('\n\n');
}
