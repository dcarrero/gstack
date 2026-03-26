---
name: document-release
preamble-tier: 2
version: 1.0.0
description: |
  Actualización de documentación post-publicación. Lee todos los documentos del proyecto,
  los cruza con el diff, actualiza README/ARCHITECTURE/CONTRIBUTING/CLAUDE.md para que
  coincidan con lo publicado, pule el tono del CHANGELOG, limpia los TODOS, y opcionalmente
  incrementa VERSION. Usar cuando se pida "actualizar los docs", "sincronizar documentación"
  o "docs post-publicación". Sugerir proactivamente después de que se fusione un PR o se
  publique código.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/gstack/bin/gstack-update-check 2>/dev/null || .claude/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(~/.claude/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
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
echo '{"skill":"document-release","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
# zsh-compatible: use find instead of glob to avoid NOMATCH error
for _PF in $(find ~/.gstack/analytics -maxdepth 1 -name '.pending-*' 2>/dev/null); do [ -f "$_PF" ] && ~/.claude/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true; break; done
```

If `PROACTIVE` is `"false"`, do not proactively suggest gstack skills — only invoke
them when the user explicitly asks. The user opted out of proactive suggestions.

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/gstack/gstack-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined). If `JUST_UPGRADED <from> <to>`: tell user "Running gstack v{to} (just updated!)" and continue.

If `LAKE_INTRO` is `no`: Before continuing, introduce the Completeness Principle.
Tell the user: "gstack follows the **Boil the Lake** principle — always do the complete
thing when AI makes the marginal cost near-zero. Read more: https://garryslist.org/posts/boil-the-ocean"
Then offer to open the essay in their default browser:

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

Only run `open` if the user says yes. Always run `touch` to mark as seen. This only happens once.

If `TEL_PROMPTED` is `no` AND `LAKE_INTRO` is `yes`: After the lake intro is handled,
ask the user about telemetry. Use AskUserQuestion:

> Help gstack get better! Community mode shares usage data (which skills you use, how long
> they take, crash info) with a stable device ID so we can track trends and fix bugs faster.
> No code, file paths, or repo names are ever sent.
> Change anytime with `gstack-config set telemetry off`.

Options:
- A) Help gstack get better! (recommended)
- B) No thanks

If A: run `~/.claude/skills/gstack/bin/gstack-config set telemetry community`

If B: ask a follow-up AskUserQuestion:

> How about anonymous mode? We just learn that *someone* used gstack — no unique ID,
> no way to connect sessions. Just a counter that helps us know if anyone's out there.

Options:
- A) Sure, anonymous is fine
- B) No thanks, fully off

If B→A: run `~/.claude/skills/gstack/bin/gstack-config set telemetry anonymous`
If B→B: run `~/.claude/skills/gstack/bin/gstack-config set telemetry off`

Always run:
```bash
touch ~/.gstack/.telemetry-prompted
```

This only happens once. If `TEL_PROMPTED` is `yes`, skip this entirely.

## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value printed by the preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts (see Completeness Principle). Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work. If both options are 8+, pick the higher; if one is ≤5, flag it.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`
5. **One decision per question:** NEVER combine multiple independent decisions into a single AskUserQuestion. Each decision gets its own call with its own recommendation and focused options. Batching multiple AskUserQuestion calls in rapid succession is fine and often preferred. Only after all individual taste decisions are resolved should a final "Approve / Revise / Reject" gate be presented.

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

Per-skill instructions may add additional formatting rules on top of this baseline.

## Completeness Principle — Boil the Lake

AI-assisted coding makes the marginal cost of completeness near-zero. When you present options:

- If Option A is the complete implementation (full parity, all edge cases, 100% coverage) and Option B is a shortcut that saves modest effort — **always recommend A**. The delta between 80 lines and 150 lines is meaningless with CC+gstack. "Good enough" is the wrong instinct when "complete" costs minutes more.
- **Lake vs. ocean:** A "lake" is boilable — 100% test coverage for a module, full feature implementation, handling all edge cases, complete error paths. An "ocean" is not — rewriting an entire system from scratch, adding features to dependencies you don't control, multi-quarter platform migrations. Recommend boiling lakes. Flag oceans as out of scope.
- **When estimating effort**, always show both scales: human team time and CC+gstack time. The compression ratio varies by task type — use this reference:

| Task type | Human team | CC+gstack | Compression |
|-----------|-----------|-----------|-------------|
| Boilerplate / scaffolding | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature implementation | 1 week | 30 min | ~30x |
| Bug fix + regression test | 4 hours | 15 min | ~20x |
| Architecture / design | 2 days | 4 hours | ~5x |
| Research / exploration | 1 day | 3 hours | ~3x |

- This principle applies to test coverage, error handling, documentation, edge cases, and feature completeness. Don't skip the last 10% to "save time" — with AI, that 10% costs seconds.

**Anti-patterns — DON'T do this:**
- BAD: "Choose B — it covers 90% of the value with less code." (If A is only 70 lines more, choose A.)
- BAD: "We can skip edge case handling to save time." (Edge case handling costs minutes with CC.)
- BAD: "Let's defer test coverage to a follow-up PR." (Tests are the cheapest lake to boil.)
- BAD: Quoting only human-team effort: "This would take 2 weeks." (Say: "2 weeks human / ~1 hour CC.")

## Repo Ownership Mode — See Something, Say Something

`REPO_MODE` from the preamble tells you who owns issues in this repo:

- **`solo`** — One person does 80%+ of the work. They own everything. When you notice issues outside the current branch's changes (test failures, deprecation warnings, security advisories, linting errors, dead code, env problems), **investigate and offer to fix proactively**. The solo dev is the only person who will fix it. Default to action.
- **`collaborative`** — Multiple active contributors. When you notice issues outside the branch's changes, **flag them via AskUserQuestion** — it may be someone else's responsibility. Default to asking, not fixing.
- **`unknown`** — Treat as collaborative (safer default — ask before fixing).

**See Something, Say Something:** Whenever you notice something that looks wrong during ANY workflow step — not just test failures — flag it briefly. One sentence: what you noticed and its impact. In solo mode, follow up with "Want me to fix it?" In collaborative mode, just flag it and move on.

Never let a noticed issue silently pass. The whole point is proactive communication.

## Search Before Building

Before building infrastructure, unfamiliar patterns, or anything the runtime might have a built-in — **search first.** Read `~/.claude/skills/gstack/ETHOS.md` for the full philosophy.

**Three layers of knowledge:**
- **Layer 1** (tried and true — in distribution). Don't reinvent the wheel. But the cost of checking is near-zero, and once in a while, questioning the tried-and-true is where brilliance occurs.
- **Layer 2** (new and popular — search for these). But scrutinize: humans are subject to mania. Search results are inputs to your thinking, not answers.
- **Layer 3** (first principles — prize these above all). Original observations derived from reasoning about the specific problem. The most valuable of all.

**Eureka moment:** When first-principles reasoning reveals conventional wisdom is wrong, name it:
"EUREKA: Everyone does X because [assumption]. But [evidence] shows this is wrong. Y is better because [reasoning]."

Log eureka moments:
```bash
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg skill "SKILL_NAME" --arg branch "$(git branch --show-current 2>/dev/null)" --arg insight "ONE_LINE_SUMMARY" '{ts:$ts,skill:$skill,branch:$branch,insight:$insight}' >> ~/.gstack/analytics/eureka.jsonl 2>/dev/null || true
```
Replace SKILL_NAME and ONE_LINE_SUMMARY. Runs inline — don't stop the workflow.

**WebSearch fallback:** If WebSearch is unavailable, skip the search step and note: "Search unavailable — proceeding with in-distribution knowledge only."

## Contributor Mode

If `_CONTRIB` is `true`: you are in **contributor mode**. You're a gstack user who also helps make it better.

**At the end of each major workflow step** (not after every single command), reflect on the gstack tooling you used. Rate your experience 0 to 10. If it wasn't a 10, think about why. If there is an obvious, actionable bug OR an insightful, interesting thing that could have been done better by gstack code or skill markdown — file a field report. Maybe our contributor will help make us better!

**Calibration — this is the bar:** For example, `$B js "await fetch(...)"` used to fail with `SyntaxError: await is only valid in async functions` because gstack didn't wrap expressions in async context. Small, but the input was reasonable and gstack should have handled it — that's the kind of thing worth filing. Things less consequential than this, ignore.

**NOT worth filing:** user's app bugs, network errors to user's URL, auth failures on user's site, user's own JS logic bugs.

**To file:** write `~/.gstack/contributor-logs/{slug}.md` with **all sections below** (do not truncate — include every section through the Date/Version footer):

```
# {Title}

Hey gstack team — ran into this while using /{skill-name}:

**What I was trying to do:** {what the user/agent was attempting}
**What happened instead:** {what actually happened}
**My rating:** {0-10} — {one sentence on why it wasn't a 10}

## Steps to reproduce
1. {step}

## Raw output
```
{paste the actual error or unexpected output here}
```

## What would make this a 10
{one sentence: what gstack should have done differently}

**Date:** {YYYY-MM-DD} | **Version:** {gstack version} | **Skill:** /{skill}
```

Slug: lowercase, hyphens, max 60 chars (e.g. `browse-js-no-await`). Skip if file already exists. Max 3 reports per session. File inline and continue — don't stop the workflow. Tell user: "Filed gstack field report: {title}"

## Completion Status Protocol

When completing a skill workflow, report status using one of:
- **DONE** — All steps completed successfully. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the user should know about. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information required to continue. State exactly what you need.

### Escalation

It is always OK to stop and say "this is too hard for me" or "I'm not confident in this result."

Bad work is worse than no work. You will not be penalized for escalating.
- If you have attempted a task 3 times without success, STOP and escalate.
- If you are uncertain about a security-sensitive change, STOP and escalate.
- If the scope of work exceeds what you can verify, STOP and escalate.

Escalation format:
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

## Telemetry (run last)

After the skill workflow completes (success, error, or abort), log the telemetry event.
Determine the skill name from the `name:` field in this file's YAML frontmatter.
Determine the outcome from the workflow result (success if completed normally, error
if it failed, abort if the user interrupted).

**PLAN MODE EXCEPTION — ALWAYS RUN:** This command writes telemetry to
`~/.gstack/analytics/` (user config directory, not project files). The skill
preamble already writes to the same directory — this is the same pattern.
Skipping this command loses session duration and outcome data.

Run this bash:

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

Replace `SKILL_NAME` with the actual skill name from frontmatter, `OUTCOME` with
success/error/abort, and `USED_BROWSE` with true/false based on whether `$B` was used.
If you cannot determine the outcome, use "unknown". This runs in the background and
never blocks the user.

## Plan Status Footer

When you are in plan mode and about to call ExitPlanMode:

1. Check if the plan file already has a `## GSTACK REVIEW REPORT` section.
2. If it DOES — skip (a review skill already wrote a richer report).
3. If it does NOT — run this command:

\`\`\`bash
~/.claude/skills/gstack/bin/gstack-review-read
\`\`\`

Then write a `## GSTACK REVIEW REPORT` section to the end of the plan file:

- If the output contains review entries (JSONL lines before `---CONFIG---`): format the
  standard report table with runs/status/findings per skill, same format as the review
  skills use.
- If the output is `NO_REVIEWS` or empty: write this placeholder table:

\`\`\`markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \`/plan-ceo-review\` | Scope & strategy | 0 | — | — |
| Codex Review | \`/codex review\` | Independent 2nd opinion | 0 | — | — |
| Eng Review | \`/plan-eng-review\` | Architecture & tests (required) | 0 | — | — |
| Design Review | \`/plan-design-review\` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run \`/autoplan\` for full review pipeline, or individual reviews above.
\`\`\`

**PLAN MODE EXCEPTION — ALWAYS RUN:** This writes to the plan file, which is the one
file you are allowed to edit in plan mode. The plan file review report is part of the
plan's living status.

## Step 0: Detect base branch

Determine which branch this PR targets. Use the result as "the base branch" in all subsequent steps.

1. Check if a PR already exists for this branch:
   `gh pr view --json baseRefName -q .baseRefName`
   If this succeeds, use the printed branch name as the base branch.

2. If no PR exists (command fails), detect the repo's default branch:
   `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

3. If both commands fail, fall back to `main`.

Print the detected base branch name. In every subsequent `git diff`, `git log`,
`git fetch`, `git merge`, and `gh pr create` command, substitute the detected
branch name wherever the instructions say "the base branch."

---

# Document Release: Actualización de Documentación Post-Publicación

Estás ejecutando el flujo de trabajo `/document-release`. Esto se ejecuta **después de `/ship`** (código confirmado, el PR
existe o está a punto de existir) pero **antes de que se fusione el PR**. Tu trabajo: asegurar que cada archivo de
documentación del proyecto sea preciso, esté actualizado y escrito con un tono amigable y orientado al usuario.

Eres mayormente automático. Realiza las actualizaciones factuales obvias directamente. Detente y pregunta solo ante
decisiones arriesgadas o subjetivas.

**Solo detenerse para:**
- Cambios de documentación arriesgados/cuestionables (narrativa, filosofía, seguridad, eliminaciones, reescrituras grandes)
- Decisión sobre incremento de VERSION (si no se ha incrementado ya)
- Nuevos elementos de TODOS a agregar
- Contradicciones entre documentos que sean narrativas (no factuales)

**Nunca detenerse para:**
- Correcciones factuales claramente derivadas del diff
- Agregar elementos a tablas/listas
- Actualizar rutas, conteos, números de versión
- Corregir referencias cruzadas obsoletas
- Pulir el tono del CHANGELOG (ajustes menores de redacción)
- Marcar TODOS como completados
- Inconsistencias factuales entre documentos (ej. discrepancia en número de versión)

**NUNCA hacer:**
- Sobrescribir, reemplazar ni regenerar entradas del CHANGELOG — solo pulir la redacción, preservar todo el contenido
- Incrementar VERSION sin preguntar — siempre usar AskUserQuestion para cambios de versión
- Usar la herramienta `Write` en CHANGELOG.md — siempre usar `Edit` con coincidencias exactas de `old_string`

---

## Paso 1: Verificación Previa y Análisis del Diff

1. Comprobar la rama actual. Si estás en la rama base, **abortar**: "Estás en la rama base. Ejecuta desde una rama de funcionalidad."

2. Recopilar contexto sobre lo que cambió:

```bash
git diff <base>...HEAD --stat
```

```bash
git log <base>..HEAD --oneline
```

```bash
git diff <base>...HEAD --name-only
```

3. Descubrir todos los archivos de documentación en el repositorio:

```bash
find . -maxdepth 2 -name "*.md" -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.gstack/*" -not -path "./.context/*" | sort
```

4. Clasificar los cambios en categorías relevantes para la documentación:
   - **Nuevas funcionalidades** — archivos nuevos, comandos nuevos, skills nuevos, nuevas capacidades
   - **Comportamiento modificado** — servicios modificados, APIs actualizadas, cambios de configuración
   - **Funcionalidad eliminada** — archivos eliminados, comandos eliminados
   - **Infraestructura** — sistema de build, infraestructura de tests, CI

5. Mostrar un breve resumen: "Analizando N archivos modificados a lo largo de M commits. Se encontraron K archivos de documentación para revisar."

---

## Paso 2: Auditoría de Documentación por Archivo

Leer cada archivo de documentación y cruzarlo con el diff. Usar estas heurísticas genéricas
(adaptar al proyecto en el que estés — no son específicas de gstack):

**README.md:**
- ¿Describe todas las funcionalidades y capacidades visibles en el diff?
- ¿Las instrucciones de instalación/configuración son consistentes con los cambios?
- ¿Los ejemplos, demos y descripciones de uso siguen siendo válidos?
- ¿Los pasos de resolución de problemas siguen siendo precisos?

**ARCHITECTURE.md:**
- ¿Los diagramas ASCII y las descripciones de componentes coinciden con el código actual?
- ¿Las decisiones de diseño y las explicaciones del "porqué" siguen siendo precisas?
- Ser conservador — solo actualizar cosas claramente contradichas por el diff. Los documentos de arquitectura
  describen cosas que es poco probable que cambien frecuentemente.

**CONTRIBUTING.md — Prueba de humo para nuevos contribuidores:**
- Recorrer las instrucciones de configuración como si fueras un contribuidor completamente nuevo.
- ¿Los comandos listados son precisos? ¿Cada paso tendría éxito?
- ¿Las descripciones de niveles de test coinciden con la infraestructura de tests actual?
- ¿Las descripciones de flujos de trabajo (configuración de desarrollo, modo de contribuidor, etc.) están actualizadas?
- Señalar cualquier cosa que fallaría o confundiría a un contribuidor primerizo.

**CLAUDE.md / instrucciones del proyecto:**
- ¿La sección de estructura del proyecto coincide con el árbol real de archivos?
- ¿Los comandos y scripts listados son precisos?
- ¿Las instrucciones de build/test coinciden con lo que hay en package.json (o equivalente)?

**Cualquier otro archivo .md:**
- Leer el archivo, determinar su propósito y audiencia.
- Cruzar con el diff para verificar si contradice algo de lo que dice el archivo.

Para cada archivo, clasificar las actualizaciones necesarias como:

- **Auto-actualización** — Correcciones factuales claramente justificadas por el diff: agregar un elemento a una
  tabla, actualizar una ruta de archivo, corregir un conteo, actualizar un árbol de estructura del proyecto.
- **Preguntar al usuario** — Cambios narrativos, eliminación de secciones, cambios en el modelo de seguridad, reescrituras grandes
  (más de ~10 líneas en una sección), relevancia ambigua, agregar secciones completamente nuevas.

---

## Paso 3: Aplicar Auto-Actualizaciones

Realizar todas las actualizaciones claras y factuales directamente usando la herramienta Edit.

Para cada archivo modificado, mostrar un resumen de una línea describiendo **qué cambió específicamente** — no
solo "Se actualizó README.md" sino "README.md: se agregó /new-skill a la tabla de skills, se actualizó el conteo de skills
de 9 a 10."

**Nunca auto-actualizar:**
- Introducción del README o posicionamiento del proyecto
- Filosofía o justificación de diseño del ARCHITECTURE
- Descripciones del modelo de seguridad
- No eliminar secciones completas de ningún documento

---

## Paso 4: Preguntar Sobre Cambios Arriesgados/Cuestionables

Para cada actualización arriesgada o cuestionable identificada en el Paso 2, usar AskUserQuestion con:
- Contexto: nombre del proyecto, rama, qué archivo de documentación, qué estamos revisando
- La decisión específica de documentación
- `RECOMENDACIÓN: Elegir [X] porque [razón en una línea]`
- Opciones incluyendo C) Omitir — dejar como está

Aplicar los cambios aprobados inmediatamente después de cada respuesta.

---

## Paso 5: Pulido de Tono del CHANGELOG

**CRÍTICO — NUNCA DESTRUIR ENTRADAS DEL CHANGELOG.**

Este paso pule el tono. NO reescribe, reemplaza ni regenera contenido del CHANGELOG.

Hubo un incidente real donde un agente reemplazó entradas existentes del CHANGELOG cuando debería haberlas
preservado. Este skill NUNCA debe hacer eso.

**Reglas:**
1. Leer todo el CHANGELOG.md primero. Entender lo que ya existe.
2. Solo modificar la redacción dentro de las entradas existentes. Nunca eliminar, reordenar ni reemplazar entradas.
3. Nunca regenerar una entrada del CHANGELOG desde cero. La entrada fue escrita por `/ship` a partir del
   diff real y el historial de commits. Es la fuente de verdad. Estás puliendo la prosa, no
   reescribiendo la historia.
4. Si una entrada parece incorrecta o incompleta, usar AskUserQuestion — NO corregirla silenciosamente.
5. Usar la herramienta Edit con coincidencias exactas de `old_string` — nunca usar Write para sobrescribir CHANGELOG.md.

**Si el CHANGELOG no fue modificado en esta rama:** omitir este paso.

**Si el CHANGELOG fue modificado en esta rama**, revisar la entrada por tono:

- **Prueba de venta:** ¿Un usuario leyendo cada viñeta pensaría "oh genial, quiero probar eso"? Si no,
  reescribir la redacción (no el contenido).
- Empezar con lo que el usuario ahora puede **hacer** — no con detalles de implementación.
- "Ahora puedes..." no "Se refactorizó el..."
- Señalar y reescribir cualquier entrada que se lea como un mensaje de commit.
- Los cambios internos/para contribuidores pertenecen a una subsección separada "### Para contribuidores".
- Auto-corregir ajustes menores de tono. Usar AskUserQuestion si una reescritura alteraría el significado.

---

## Paso 6: Verificación de Consistencia y Descubribilidad Entre Documentos

Después de auditar cada archivo individualmente, hacer un pase de consistencia entre documentos:

1. ¿La lista de funcionalidades/capacidades del README coincide con lo que describe CLAUDE.md (o las instrucciones del proyecto)?
2. ¿La lista de componentes del ARCHITECTURE coincide con la descripción de estructura del proyecto en CONTRIBUTING?
3. ¿La última versión del CHANGELOG coincide con el archivo VERSION?
4. **Descubribilidad:** ¿Cada archivo de documentación es accesible desde README.md o CLAUDE.md? Si
   ARCHITECTURE.md existe pero ni README ni CLAUDE.md enlazan a él, señalarlo. Cada documento
   debería ser descubrible desde uno de los dos archivos de punto de entrada.
5. Señalar cualquier contradicción entre documentos. Auto-corregir inconsistencias factuales claras (ej. una
   discrepancia de versión). Usar AskUserQuestion para contradicciones narrativas.

---

## Paso 7: Limpieza de TODOS.md

Este es un segundo pase que complementa el Paso 5.5 de `/ship`. Leer `review/TODOS-format.md` (si
está disponible) para el formato canónico de elementos TODO.

Si TODOS.md no existe, omitir este paso.

1. **Elementos completados no marcados aún:** Cruzar el diff con los elementos TODO abiertos. Si un
   TODO fue claramente completado por los cambios en esta rama, moverlo a la sección Completados
   con `**Completado:** vX.Y.Z.W (YYYY-MM-DD)`. Ser conservador — solo marcar elementos con evidencia
   clara en el diff.

2. **Elementos que necesitan actualización de descripción:** Si un TODO hace referencia a archivos o componentes que fueron
   significativamente modificados, su descripción puede estar obsoleta. Usar AskUserQuestion para confirmar si
   el TODO debería actualizarse, completarse o dejarse como está.

3. **Nuevo trabajo diferido:** Revisar el diff buscando comentarios `TODO`, `FIXME`, `HACK` y `XXX`. Para
   cada uno que represente trabajo diferido significativo (no una nota trivial en línea), usar
   AskUserQuestion para preguntar si debería capturarse en TODOS.md.

---

## Paso 8: Pregunta sobre Incremento de VERSION

**CRÍTICO — NUNCA INCREMENTAR VERSION SIN PREGUNTAR.**

1. **Si VERSION no existe:** Omitir silenciosamente.

2. Verificar si VERSION ya fue modificado en esta rama:

```bash
git diff <base>...HEAD -- VERSION
```

3. **Si VERSION NO fue incrementado:** Usar AskUserQuestion:
   - RECOMENDACIÓN: Elegir C (Omitir) porque los cambios solo de documentación raramente justifican un incremento de versión
   - A) Incrementar PATCH (X.Y.Z+1) — si los cambios de documentación se publican junto con cambios de código
   - B) Incrementar MINOR (X.Y+1.0) — si esta es una publicación independiente significativa
   - C) Omitir — no se necesita incremento de versión

4. **Si VERSION ya fue incrementado:** NO omitir silenciosamente. En su lugar, verificar si el incremento
   aún cubre el alcance completo de los cambios en esta rama:

   a. Leer la entrada del CHANGELOG para la VERSION actual. ¿Qué funcionalidades describe?
   b. Leer el diff completo (`git diff <base>...HEAD --stat` y `git diff <base>...HEAD --name-only`).
      ¿Hay cambios significativos (nuevas funcionalidades, nuevos skills, nuevos comandos, refactorizaciones grandes)
      que NO están mencionados en la entrada del CHANGELOG para la versión actual?
   c. **Si la entrada del CHANGELOG cubre todo:** Omitir — mostrar "VERSION: Ya incrementado a
      vX.Y.Z, cubre todos los cambios."
   d. **Si hay cambios significativos no cubiertos:** Usar AskUserQuestion explicando lo que cubre la
      versión actual vs lo que es nuevo, y preguntar:
      - RECOMENDACIÓN: Elegir A porque los nuevos cambios justifican su propia versión
      - A) Incrementar al siguiente patch (X.Y.Z+1) — dar a los nuevos cambios su propia versión
      - B) Mantener la versión actual — agregar los nuevos cambios a la entrada existente del CHANGELOG
      - C) Omitir — dejar la versión como está, manejar después

   La idea clave: un incremento de VERSION establecido para la "funcionalidad A" no debería absorber silenciosamente
   la "funcionalidad B" si la funcionalidad B es lo suficientemente importante como para merecer su propia entrada de versión.

---

## Paso 9: Commit y Resultado

**Verificación de vacío primero:** Ejecutar `git status` (nunca usar `-uall`). Si ningún archivo de documentación fue
modificado por algún paso anterior, mostrar "Toda la documentación está actualizada." y salir sin
hacer commit.

**Commit:**

1. Agregar al staging los archivos de documentación modificados por nombre (nunca `git add -A` ni `git add .`).
2. Crear un solo commit:

```bash
git commit -m "$(cat <<'EOF'
docs: update project documentation for vX.Y.Z.W

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

3. Hacer push a la rama actual:

```bash
git push
```

**Actualización del cuerpo del PR (idempotente, segura ante concurrencia):**

1. Leer el cuerpo existente del PR en un archivo temporal con PID único:

```bash
gh pr view --json body -q .body > /tmp/gstack-pr-body-$$.md
```

2. Si el archivo temporal ya contiene una sección `## Documentation`, reemplazar esa sección con el
   contenido actualizado. Si no contiene una, agregar una sección `## Documentation` al final.

3. La sección Documentation debe incluir una **vista previa del diff de documentación** — para cada archivo modificado,
   describir qué cambió específicamente (ej. "README.md: se agregó /document-release a la tabla de skills,
   se actualizó el conteo de skills de 9 a 10").

4. Escribir el cuerpo actualizado de vuelta:

```bash
gh pr edit --body-file /tmp/gstack-pr-body-$$.md
```

5. Limpiar el archivo temporal:

```bash
rm -f /tmp/gstack-pr-body-$$.md
```

6. Si `gh pr view` falla (no existe PR): omitir con el mensaje "No se encontró PR — se omite la actualización del cuerpo."
7. Si `gh pr edit` falla: advertir "No se pudo actualizar el cuerpo del PR — los cambios de documentación están en el
   commit." y continuar.

**Resumen estructurado de salud de documentación (resultado final):**

Mostrar un resumen escaneable indicando el estado de cada archivo de documentación:

```
Salud de la documentación:
  README.md       [estado] ([detalles])
  ARCHITECTURE.md [estado] ([detalles])
  CONTRIBUTING.md [estado] ([detalles])
  CHANGELOG.md    [estado] ([detalles])
  TODOS.md        [estado] ([detalles])
  VERSION         [estado] ([detalles])
```

Donde estado es uno de:
- Actualizado — con descripción de lo que cambió
- Vigente — no se necesitaron cambios
- Tono pulido — se ajustó la redacción
- No incrementado — el usuario eligió omitir
- Ya incrementado — la versión fue establecida por /ship
- Omitido — el archivo no existe

---

## Reglas Importantes

- **Leer antes de editar.** Siempre leer el contenido completo de un archivo antes de modificarlo.
- **Nunca destruir el CHANGELOG.** Solo pulir la redacción. Nunca eliminar, reemplazar ni regenerar entradas.
- **Nunca incrementar VERSION silenciosamente.** Siempre preguntar. Incluso si ya se incrementó, verificar si cubre el alcance completo de los cambios.
- **Ser explícito sobre lo que cambió.** Cada edición recibe un resumen de una línea.
- **Heurísticas genéricas, no específicas del proyecto.** Las verificaciones de auditoría funcionan en cualquier repositorio.
- **La descubribilidad importa.** Cada archivo de documentación debería ser accesible desde README o CLAUDE.md.
- **Tono: amigable, orientado al usuario, no oscuro.** Escribir como si estuvieras explicando a una persona inteligente
  que no ha visto el código.
