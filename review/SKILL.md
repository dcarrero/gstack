---
name: review
preamble-tier: 4
version: 1.0.0
description: |
  Revisión pre-merge de PR. Analiza el diff contra la rama base en busca de seguridad SQL,
  violaciones de límite de confianza de LLM, efectos secundarios condicionales y otros problemas
  estructurales. Usar cuando se pida "revisar este PR", "revisión de código", "revisión pre-merge"
  o "comprueba mi diff". Sugerir proactivamente cuando el usuario esté a punto de mergear o
  integrar cambios de código.
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
  - WebSearch
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
echo '{"skill":"review","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

# Revisión Pre-Merge de PR

Estás ejecutando el flujo `/review`. Analiza el diff de la rama actual contra la rama base en busca de problemas estructurales que los tests no detectan.

---

## Paso 1: Comprobar la rama

1. Ejecuta `git branch --show-current` para obtener la rama actual.
2. Si estás en la rama base, muestra: **"Nada que revisar — estás en la rama base o no hay cambios respecto a ella."** y detente.
3. Ejecuta `git fetch origin <base> --quiet && git diff origin/<base> --stat` para comprobar si hay diff. Si no hay diff, muestra el mismo mensaje y detente.

---

## Paso 1.5: Detección de desviación de alcance

Antes de revisar la calidad del código, comprueba: **¿construyeron lo que se pidió — ni más, ni menos?**

1. Lee `TODOS.md` (si existe). Lee la descripción del PR (`gh pr view --json body --jq .body 2>/dev/null || true`).
   Lee los mensajes de commit (`git log origin/<base>..HEAD --oneline`).
   **Si no existe PR:** apóyate en los mensajes de commit y TODOS.md para la intención declarada — este es el caso habitual ya que /review se ejecuta antes de que /ship cree el PR.
2. Identifica la **intención declarada** — ¿qué debía lograr esta rama?
3. Ejecuta `git diff origin/<base>...HEAD --stat` y compara los archivos modificados con la intención declarada.

### Descubrimiento del Archivo de Plan

1. **Contexto de la conversación (primario):** Comprueba si hay un archivo de plan activo en esta conversación — los mensajes del sistema de Claude Code incluyen rutas de archivos de plan cuando está en modo plan. Busca referencias como `~/.claude/plans/*.md` en los mensajes del sistema. Si se encuentra, úsalo directamente — esta es la señal más fiable.

2. **Búsqueda por contenido (respaldo):** Si no se hace referencia a un archivo de plan en el contexto de la conversación, busca por contenido:

```bash
BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-')
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)")
# Intentar primero coincidencia por nombre de rama (más específico)
PLAN=$(ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$BRANCH" 2>/dev/null | head -1)
# Recurrir a coincidencia por nombre de repo
[ -z "$PLAN" ] && PLAN=$(ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$REPO" 2>/dev/null | head -1)
# Último recurso: plan más reciente modificado en las últimas 24 horas
[ -z "$PLAN" ] && PLAN=$(find ~/.claude/plans -name '*.md' -mmin -1440 -maxdepth 1 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
[ -n "$PLAN" ] && echo "PLAN_FILE: $PLAN" || echo "NO_PLAN_FILE"
```

3. **Validación:** Si se encontró un archivo de plan mediante búsqueda por contenido (no por contexto de conversación), lee las primeras 20 líneas y verifica que es relevante para el trabajo de la rama actual. Si parece ser de un proyecto o funcionalidad diferente, trata como "archivo de plan no encontrado."

**Manejo de errores:**
- Archivo de plan no encontrado → omite con "Archivo de plan no detectado — omitiendo."
- Archivo de plan encontrado pero ilegible (permisos, codificación) → omite con "Archivo de plan encontrado pero ilegible — omitiendo."

### Extracción de Elementos Accionables

Lee el archivo de plan. Extrae cada elemento accionable — cualquier cosa que describa trabajo por hacer. Busca:

- **Elementos checkbox:** `- [ ] ...` o `- [x] ...`
- **Pasos numerados** bajo encabezados de implementación: "1. Crear ...", "2. Agregar ...", "3. Modificar ..."
- **Declaraciones imperativas:** "Agregar X a Y", "Crear un servicio Z", "Modificar el controlador W"
- **Especificaciones a nivel de archivo:** "Nuevo archivo: ruta/al/archivo.ts", "Modificar ruta/al/existente.rb"
- **Requisitos de tests:** "Probar que X", "Agregar test para Y", "Verificar Z"
- **Cambios de modelo de datos:** "Agregar columna X a tabla Y", "Crear migración para Z"

**Ignorar:**
- Secciones de contexto/antecedentes (`## Contexto`, `## Antecedentes`, `## Problema`)
- Preguntas y elementos abiertos (marcados con ?, "TBD", "TODO: decidir")
- Secciones de informe de revisión (`## INFORME DE REVISIÓN GSTACK`)
- Elementos explícitamente diferidos ("Futuro:", "Fuera de alcance:", "NO en alcance:", "P2:", "P3:", "P4:")
- Secciones de Decisiones de Revisión CEO (registran decisiones, no elementos de trabajo)

**Límite:** Extrae como máximo 50 elementos. Si el plan tiene más, indica: "Mostrando los 50 principales de N elementos del plan — lista completa en el archivo de plan."

**Sin elementos encontrados:** Si el plan no contiene elementos accionables extraíbles, omite con: "El archivo de plan no contiene elementos accionables — omitiendo auditoría de completitud."

Para cada elemento, anota:
- El texto del elemento (textual o resumen conciso)
- Su categoría: CODE | TEST | MIGRATION | CONFIG | DOCS

### Cruce con el Diff

Ejecuta `git diff origin/<base>...HEAD` y `git log origin/<base>..HEAD --oneline` para entender qué se implementó.

Para cada elemento del plan extraído, revisa el diff y clasifica:

- **DONE** — Evidencia clara en el diff de que este elemento fue implementado. Cita los archivos específicos cambiados.
- **PARTIAL** — Existe algo de trabajo hacia este elemento en el diff pero está incompleto (ej.: modelo creado pero falta el controlador, función existe pero no se manejan casos extremos).
- **NOT DONE** — Sin evidencia en el diff de que este elemento fue abordado.
- **CHANGED** — El elemento fue implementado usando un enfoque diferente al descrito en el plan, pero se logra el mismo objetivo. Anota la diferencia.

**Sé conservador con DONE** — requiere evidencia clara en el diff. Que un archivo se haya tocado no es suficiente; la funcionalidad específica descrita debe estar presente.
**Sé generoso con CHANGED** — si el objetivo se cumple por medios diferentes, cuenta como abordado.

### Formato de Salida

```
AUDITORÍA DE COMPLETITUD DEL PLAN
═══════════════════════════════
Plan: {ruta del archivo de plan}

## Elementos de Implementación
  [DONE]      Crear UserService — src/services/user_service.rb (+142 líneas)
  [PARTIAL]   Agregar validación — el modelo valida pero faltan verificaciones del controlador
  [NOT DONE]  Agregar capa de caché — sin cambios relacionados con caché en el diff
  [CHANGED]   "Cola Redis" → implementado con Sidekiq en su lugar

## Elementos de Test
  [DONE]      Tests unitarios para UserService — test/services/user_service_test.rb
  [NOT DONE]  Test E2E del flujo de registro

## Elementos de Migración
  [DONE]      Crear tabla users — db/migrate/20240315_create_users.rb

─────────────────────────────────
COMPLETITUD: 4/7 DONE, 1 PARTIAL, 1 NOT DONE, 1 CHANGED
─────────────────────────────────
```

### Integración con Detección de Desviación de Alcance

Los resultados de completitud del plan complementan la Detección de Desviación de Alcance existente. Si se encuentra un archivo de plan:

- Los elementos **NOT DONE** se convierten en evidencia adicional para **REQUISITOS FALTANTES** en el informe de desviación de alcance.
- Los **elementos en el diff que no coinciden con ningún elemento del plan** se convierten en evidencia para detección de **SCOPE CREEP**.

Esto es **INFORMATIONAL** — no bloquea la revisión (consistente con el comportamiento existente de desviación de alcance).

Actualiza la salida de desviación de alcance para incluir contexto del archivo de plan:

```
Verificación de Alcance: [LIMPIO / DESVIACIÓN DETECTADA / REQUISITOS FALTANTES]
Intención: <del archivo de plan — resumen en 1 línea>
Plan: <ruta del archivo de plan>
Entregado: <resumen en 1 línea de lo que el diff realmente hace>
Elementos del plan: N DONE, M PARTIAL, K NOT DONE
[Si NOT DONE: lista cada elemento faltante]
[Si scope creep: lista cada cambio fuera de alcance que no está en el plan]
```

**Archivo de plan no encontrado:** Recurre al comportamiento existente de desviación de alcance (verificar solo TODOS.md y descripción del PR).

4. Evalúa con escepticismo (incorporando los resultados de auditoría del plan si están disponibles):

   **Detección de SCOPE CREEP:**
   - Archivos modificados que no están relacionados con la intención declarada
   - Nuevas funcionalidades o refactorizaciones no mencionadas en el plan
   - Cambios tipo "ya que estaba ahí..." que amplían el radio de impacto

   **Detección de REQUIREMENTS MISSING:**
   - Requisitos de TODOS.md/descripción del PR no abordados en el diff
   - Brechas en la cobertura de tests para los requisitos declarados
   - Implementaciones parciales (empezadas pero no terminadas)

5. Muestra (antes de que comience la revisión principal):
   ```
   Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
   Intent: <resumen de 1 línea de lo solicitado>
   Delivered: <resumen de 1 línea de lo que realmente hace el diff>
   [Si hay desviación: listar cada cambio fuera de alcance]
   [Si faltan requisitos: listar cada requisito no abordado]
   ```

6. Esto es **INFORMATIONAL** — no bloquea la revisión. Continúa al Paso 2.

---

## Paso 2: Leer el checklist

Lee `.claude/skills/review/checklist.md`.

**Si no se puede leer el archivo, DETENTE e informa del error.** No continúes sin el checklist.

---

## Paso 2.5: Comprobar comentarios de revisión de Greptile

Lee `.claude/skills/review/greptile-triage.md` y sigue los pasos de obtención, filtrado, clasificación y **detección de escalado**.

**Si no existe PR, `gh` falla, la API devuelve un error o no hay comentarios de Greptile:** Omite este paso silenciosamente. La integración con Greptile es aditiva — la revisión funciona sin ella.

**Si se encuentran comentarios de Greptile:** Almacena las clasificaciones (VALID & ACTIONABLE, VALID BUT ALREADY FIXED, FALSE POSITIVE, SUPPRESSED) — las necesitarás en el Paso 5.

---

## Paso 3: Obtener el diff

Descarga la última versión de la rama base para evitar falsos positivos por estado local desactualizado:

```bash
git fetch origin <base> --quiet
```

Ejecuta `git diff origin/<base>` para obtener el diff completo. Esto incluye tanto los cambios confirmados como los no confirmados contra la última versión de la rama base.

---

## Paso 4: Revisión en dos pasadas

Aplica el checklist contra el diff en dos pasadas:

1. **Pasada 1 (CRITICAL):** Seguridad SQL y de datos, Condiciones de carrera y concurrencia, Límite de confianza de salida LLM, Completitud de enums y valores
2. **Pasada 2 (INFORMATIONAL):** Efectos secundarios condicionales, Números mágicos y acoplamiento de strings, Código muerto y consistencia, Problemas de prompts LLM, Brechas de tests, Vista/Frontend, Rendimiento e impacto en bundle

**La completitud de enums y valores requiere leer código FUERA del diff.** Cuando el diff introduce un nuevo valor de enum, estado, tier o constante de tipo, usa Grep para encontrar todos los archivos que referencian valores hermanos, luego lee esos archivos para comprobar si el nuevo valor está gestionado. Esta es la única categoría donde la revisión dentro del diff es insuficiente.

**Buscar antes de recomendar:** Al recomendar un patrón de corrección (especialmente para concurrencia, caché, autenticación o comportamiento específico del framework):
- Verifica que el patrón sea la mejor práctica actual para la versión del framework en uso
- Comprueba si existe una solución integrada en versiones más recientes antes de recomendar un workaround
- Verifica las firmas de la API contra la documentación actual (las APIs cambian entre versiones)

Toma segundos, previene recomendar patrones obsoletos. Si WebSearch no está disponible, indícalo y continúa con el conocimiento disponible.

Sigue el formato de salida especificado en el checklist. Respeta las supresiones — NO marques elementos listados en la sección "DO NOT flag".

---

## Paso 4.5: Revisión de diseño (condicional)

## Design Review (conditional, diff-scoped)

Check if the diff touches frontend files using `gstack-diff-scope`:

```bash
source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

**If `SCOPE_FRONTEND=false`:** Skip design review silently. No output.

**If `SCOPE_FRONTEND=true`:**

1. **Check for DESIGN.md.** If `DESIGN.md` or `design-system.md` exists in the repo root, read it. All design findings are calibrated against it — patterns blessed in DESIGN.md are not flagged. If not found, use universal design principles.

2. **Read `.claude/skills/review/design-checklist.md`.** If the file cannot be read, skip design review with a note: "Design checklist not found — skipping design review."

3. **Read each changed frontend file** (full file, not just diff hunks). Frontend files are identified by the patterns listed in the checklist.

4. **Apply the design checklist** against the changed files. For each item:
   - **[HIGH] mechanical CSS fix** (`outline: none`, `!important`, `font-size < 16px`): classify as AUTO-FIX
   - **[HIGH/MEDIUM] design judgment needed**: classify as ASK
   - **[LOW] intent-based detection**: present as "Possible — verify visually or run /design-review"

5. **Include findings** in the review output under a "Design Review" header, following the output format in the checklist. Design findings merge with code review findings into the same Fix-First flow.

6. **Log the result** for the Review Readiness Dashboard:

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
```

Substitute: TIMESTAMP = ISO 8601 datetime, STATUS = "clean" if 0 findings or "issues_found", N = total findings, M = auto-fixed count, COMMIT = output of `git rev-parse --short HEAD`.

7. **Codex design voice** (optional, automatic if available):

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
```

If Codex is available, run a lightweight design check on the diff:

```bash
TMPERR_DRL=$(mktemp /tmp/codex-drl-XXXXXXXX)
codex exec "Review the git diff on this branch. Run 7 litmus checks (YES/NO each): 1. Brand/product unmistakable in first screen? 2. One strong visual anchor present? 3. Page understandable by scanning headlines only? 4. Each section has one job? 5. Are cards actually necessary? 6. Does motion improve hierarchy or atmosphere? 7. Would design feel premium with all decorative shadows removed? Flag any hard rejections: 1. Generic SaaS card grid as first impression 2. Beautiful image with weak brand 3. Strong headline with no clear action 4. Busy imagery behind text 5. Sections repeating same mood statement 6. Carousel with no narrative purpose 7. App UI made of stacked cards instead of layout 5 most important design findings only. Reference file:line." -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached 2>"$TMPERR_DRL"
```

Use a 5-minute timeout (`timeout: 300000`). After the command completes, read stderr:
```bash
cat "$TMPERR_DRL" && rm -f "$TMPERR_DRL"
```

**Error handling:** All errors are non-blocking. On auth failure, timeout, or empty response — skip with a brief note and continue.

Present Codex output under a `CODEX (design):` header, merged with the checklist findings above.

Incluye cualquier hallazgo de diseño junto con los hallazgos del Paso 4. Siguen el mismo flujo Fix-First del Paso 5 — AUTO-FIX para correcciones mecánicas de CSS, ASK para todo lo demás.

---

## Paso 4.75: Diagrama de cobertura de tests

100% coverage is the goal. Evaluate every codepath changed in the diff and identify test gaps. Gaps become INFORMATIONAL findings that follow the Fix-First flow.

### Test Framework Detection

Before analyzing coverage, detect the project's test framework:

1. **Read CLAUDE.md** — look for a `## Testing` section with test command and framework name. If found, use that as the authoritative source.
2. **If CLAUDE.md has no testing section, auto-detect:**

```bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
```

3. **If no framework detected:** still produce the coverage diagram, but skip test generation.

**Step 1. Trace every codepath changed** using `git diff origin/<base>...HEAD`:

Read every changed file. For each one, trace how data flows through the code — don't just list functions, actually follow the execution:

1. **Read the diff.** For each changed file, read the full file (not just the diff hunk) to understand context.
2. **Trace data flow.** Starting from each entry point (route handler, exported function, event listener, component render), follow the data through every branch:
   - Where does input come from? (request params, props, database, API call)
   - What transforms it? (validation, mapping, computation)
   - Where does it go? (database write, API response, rendered output, side effect)
   - What can go wrong at each step? (null/undefined, invalid input, network failure, empty collection)
3. **Diagram the execution.** For each changed file, draw an ASCII diagram showing:
   - Every function/method that was added or modified
   - Every conditional branch (if/else, switch, ternary, guard clause, early return)
   - Every error path (try/catch, rescue, error boundary, fallback)
   - Every call to another function (trace into it — does IT have untested branches?)
   - Every edge: what happens with null input? Empty array? Invalid type?

This is the critical step — you're building a map of every line of code that can execute differently based on input. Every branch in this diagram needs a test.

**Step 2. Map user flows, interactions, and error states:**

Code coverage isn't enough — you need to cover how real users interact with the changed code. For each changed feature, think through:

- **User flows:** What sequence of actions does a user take that touches this code? Map the full journey (e.g., "user clicks 'Pay' → form validates → API call → success/failure screen"). Each step in the journey needs a test.
- **Interaction edge cases:** What happens when the user does something unexpected?
  - Double-click/rapid resubmit
  - Navigate away mid-operation (back button, close tab, click another link)
  - Submit with stale data (page sat open for 30 minutes, session expired)
  - Slow connection (API takes 10 seconds — what does the user see?)
  - Concurrent actions (two tabs, same form)
- **Error states the user can see:** For every error the code handles, what does the user actually experience?
  - Is there a clear error message or a silent failure?
  - Can the user recover (retry, go back, fix input) or are they stuck?
  - What happens with no network? With a 500 from the API? With invalid data from the server?
- **Empty/zero/boundary states:** What does the UI show with zero results? With 10,000 results? With a single character input? With maximum-length input?

Add these to your diagram alongside the code branches. A user flow with no test is just as much a gap as an untested if/else.

**Step 3. Check each branch against existing tests:**

Go through your diagram branch by branch — both code paths AND user flows. For each one, search for a test that exercises it:
- Function `processPayment()` → look for `billing.test.ts`, `billing.spec.ts`, `test/billing_test.rb`
- An if/else → look for tests covering BOTH the true AND false path
- An error handler → look for a test that triggers that specific error condition
- A call to `helperFn()` that has its own branches → those branches need tests too
- A user flow → look for an integration or E2E test that walks through the journey
- An interaction edge case → look for a test that simulates the unexpected action

Quality scoring rubric:
- ★★★  Tests behavior with edge cases AND error paths
- ★★   Tests correct behavior, happy path only
- ★    Smoke test / existence check / trivial assertion (e.g., "it renders", "it doesn't throw")

### E2E Test Decision Matrix

When checking each branch, also determine whether a unit test or E2E/integration test is the right tool:

**RECOMMEND E2E (mark as [→E2E] in the diagram):**
- Common user flow spanning 3+ components/services (e.g., signup → verify email → first login)
- Integration point where mocking hides real failures (e.g., API → queue → worker → DB)
- Auth/payment/data-destruction flows — too important to trust unit tests alone

**RECOMMEND EVAL (mark as [→EVAL] in the diagram):**
- Critical LLM call that needs a quality eval (e.g., prompt change → test output still meets quality bar)
- Changes to prompt templates, system instructions, or tool definitions

**STICK WITH UNIT TESTS:**
- Pure function with clear inputs/outputs
- Internal helper with no side effects
- Edge case of a single function (null input, empty array)
- Obscure/rare flow that isn't customer-facing

### REGRESSION RULE (mandatory)

**IRON RULE:** When the coverage audit identifies a REGRESSION — code that previously worked but the diff broke — a regression test is written immediately. No AskUserQuestion. No skipping. Regressions are the highest-priority test because they prove something broke.

A regression is when:
- The diff modifies existing behavior (not new code)
- The existing test suite (if any) doesn't cover the changed path
- The change introduces a new failure mode for existing callers

When uncertain whether a change is a regression, err on the side of writing the test.

Format: commit as `test: regression test for {what broke}`

**Step 4. Output ASCII coverage diagram:**

Include BOTH code paths and user flows in the same diagram. Mark E2E-worthy and eval-worthy paths:

```
CODE PATH COVERAGE
===========================
[+] src/services/billing.ts
    │
    ├── processPayment()
    │   ├── [★★★ TESTED] Happy path + card declined + timeout — billing.test.ts:42
    │   ├── [GAP]         Network timeout — NO TEST
    │   └── [GAP]         Invalid currency — NO TEST
    │
    └── refundPayment()
        ├── [★★  TESTED] Full refund — billing.test.ts:89
        └── [★   TESTED] Partial refund (checks non-throw only) — billing.test.ts:101

USER FLOW COVERAGE
===========================
[+] Payment checkout flow
    │
    ├── [★★★ TESTED] Complete purchase — checkout.e2e.ts:15
    ├── [GAP] [→E2E] Double-click submit — needs E2E, not just unit
    ├── [GAP]         Navigate away during payment — unit test sufficient
    └── [★   TESTED]  Form validation errors (checks render only) — checkout.test.ts:40

[+] Error states
    │
    ├── [★★  TESTED] Card declined message — billing.test.ts:58
    ├── [GAP]         Network timeout UX (what does user see?) — NO TEST
    └── [GAP]         Empty cart submission — NO TEST

[+] LLM integration
    │
    └── [GAP] [→EVAL] Prompt template change — needs eval test

─────────────────────────────────
COVERAGE: 5/13 paths tested (38%)
  Code paths: 3/5 (60%)
  User flows: 2/8 (25%)
QUALITY:  ★★★: 2  ★★: 2  ★: 1
GAPS: 8 paths need tests (2 need E2E, 1 needs eval)
─────────────────────────────────
```

**Fast path:** All paths covered → "Step 4.75: All new code paths have test coverage ✓" Continue.

**Step 5. Generate tests for gaps (Fix-First):**

If test framework is detected and gaps were identified:
- Classify each gap as AUTO-FIX or ASK per the Fix-First Heuristic:
  - **AUTO-FIX:** Simple unit tests for pure functions, edge cases of existing tested functions
  - **ASK:** E2E tests, tests requiring new test infrastructure, tests for ambiguous behavior
- For AUTO-FIX gaps: generate the test, run it, commit as `test: coverage for {feature}`
- For ASK gaps: include in the Fix-First batch question with the other review findings
- For paths marked [→E2E]: always ASK (E2E tests are higher-effort and need user confirmation)
- For paths marked [→EVAL]: always ASK (eval tests need user confirmation on quality criteria)

If no test framework detected → include gaps as INFORMATIONAL findings only, no generation.

**Diff is test-only changes:** Skip Step 4.75 entirely: "No new application code paths to audit."

Este paso subsume la categoría "Brechas de tests" de la Pasada 2 — no dupliques hallazgos entre el elemento de Brechas de tests del checklist y este diagrama de cobertura. Incluye cualquier brecha de cobertura junto con los hallazgos del Paso 4 y Paso 4.5. Siguen el mismo flujo Fix-First — las brechas son hallazgos INFORMATIONAL.

---

## Paso 5: Revisión Fix-First

**Cada hallazgo recibe acción — no solo los críticos.**

Muestra una cabecera de resumen: `Revisión Pre-Merge: N problemas (X críticos, Y informativos)`

### Paso 5a: Clasificar cada hallazgo

Para cada hallazgo, clasifica como AUTO-FIX o ASK según la heurística Fix-First en
checklist.md. Los hallazgos críticos tienden hacia ASK; los informativos tienden
hacia AUTO-FIX.

### Paso 5b: Auto-corregir todos los elementos AUTO-FIX

Aplica cada corrección directamente. Para cada una, muestra un resumen de una línea:
`[AUTO-FIXED] [archivo:línea] Problema → qué hiciste`

### Paso 5c: Preguntar en lote sobre los elementos ASK

Si quedan elementos ASK, preséntalos en UNA sola AskUserQuestion:

- Lista cada elemento con un número, la etiqueta de severidad, el problema y la corrección recomendada
- Para cada elemento, proporciona opciones: A) Corregir como se recomienda, B) Omitir
- Incluye una RECOMENDACIÓN general

Formato de ejemplo:
```
Auto-corregí 5 problemas. 2 necesitan tu decisión:

1. [CRITICAL] app/models/post.rb:42 — Condición de carrera en transición de estado
   Corrección: Añadir `WHERE status = 'draft'` al UPDATE
   → A) Corregir  B) Omitir

2. [INFORMATIONAL] app/services/generator.rb:88 — Salida de LLM sin verificación de tipo antes de escritura en BD
   Corrección: Añadir validación de esquema JSON
   → A) Corregir  B) Omitir

RECOMENDACIÓN: Corregir ambos — #1 es una condición de carrera real, #2 previene corrupción silenciosa de datos.
```

Si hay 3 o menos elementos ASK, puedes usar llamadas individuales a AskUserQuestion en lugar de agruparlas.

### Paso 5d: Aplicar las correcciones aprobadas por el usuario

Aplica las correcciones para los elementos donde el usuario eligió "Corregir". Muestra lo que se corrigió.

Si no hay elementos ASK (todo fue AUTO-FIX), omite la pregunta por completo.

### Verificación de afirmaciones

Antes de producir la salida final de la revisión:
- Si afirmas "este patrón es seguro" → cita la línea específica que lo demuestra
- Si afirmas "esto se gestiona en otro lugar" → lee y cita el código que lo gestiona
- Si afirmas "los tests cubren esto" → nombra el archivo y método del test
- Nunca digas "probablemente gestionado" o "posiblemente testeado" — verifica o marca como desconocido

**Prevención de racionalización:** "Esto se ve bien" no es un hallazgo. O cita evidencia de que ESTÁ bien, o márcalo como no verificado.

### Resolución de comentarios de Greptile

Después de mostrar tus propios hallazgos, si se clasificaron comentarios de Greptile en el Paso 2.5:

**Incluye un resumen de Greptile en tu cabecera de salida:** `+ N comentarios de Greptile (X válidos, Y corregidos, Z FP)`

Antes de responder a cualquier comentario, ejecuta el algoritmo de **detección de escalado** de greptile-triage.md para determinar si usar plantillas de respuesta de Nivel 1 (amigable) o Nivel 2 (firme).

1. **Comentarios VALID & ACTIONABLE:** Están incluidos en tus hallazgos — siguen el flujo Fix-First (auto-corregidos si son mecánicos, agrupados en ASK si no) (A: Corregir ahora, B: Reconocer, C: Falso positivo). Si el usuario elige A (corregir), responde usando la **plantilla de respuesta Fix** de greptile-triage.md (incluye diff inline + explicación). Si el usuario elige C (falso positivo), responde usando la **plantilla de respuesta False Positive** (incluye evidencia + sugerencia de re-clasificación), guarda en el historial greptile tanto del proyecto como global.

2. **Comentarios FALSE POSITIVE:** Presenta cada uno mediante AskUserQuestion:
   - Muestra el comentario de Greptile: archivo:línea (o [top-level]) + resumen del cuerpo + URL de enlace permanente
   - Explica concisamente por qué es un falso positivo
   - Opciones:
     - A) Responder a Greptile explicando por qué es incorrecto (recomendado si es claramente erróneo)
     - B) Corregirlo de todas formas (si es de bajo esfuerzo e inofensivo)
     - C) Ignorar — no responder, no corregir

   Si el usuario elige A, responde usando la **plantilla de respuesta False Positive** de greptile-triage.md (incluye evidencia + sugerencia de re-clasificación), guarda en el historial greptile tanto del proyecto como global.

3. **Comentarios VALID BUT ALREADY FIXED:** Responde usando la **plantilla de respuesta Already Fixed** de greptile-triage.md — no se necesita AskUserQuestion:
   - Incluye qué se hizo y el SHA del commit que lo corrigió
   - Guarda en el historial greptile tanto del proyecto como global

4. **Comentarios SUPPRESSED:** Omite silenciosamente — son falsos positivos conocidos de triajes anteriores.

---

## Paso 5.5: Referencia cruzada con TODOS

Lee `TODOS.md` en la raíz del repositorio (si existe). Haz referencia cruzada del PR contra los TODOs abiertos:

- **¿Este PR cierra algún TODO abierto?** Si es así, indica qué elementos en tu salida: "Este PR aborda TODO: <título>"
- **¿Este PR crea trabajo que debería convertirse en un TODO?** Si es así, márcalo como un hallazgo informativo.
- **¿Hay TODOs relacionados que proporcionen contexto para esta revisión?** Si es así, referéncialos al discutir hallazgos relacionados.

Si TODOS.md no existe, omite este paso silenciosamente.

---

## Paso 5.6: Comprobación de documentación desactualizada

Haz referencia cruzada del diff contra archivos de documentación. Para cada archivo `.md` en la raíz del repositorio (README.md, ARCHITECTURE.md, CONTRIBUTING.md, CLAUDE.md, etc.):

1. Comprueba si los cambios de código en el diff afectan funcionalidades, componentes o flujos de trabajo descritos en ese archivo de documentación.
2. Si el archivo de documentación NO fue actualizado en esta rama pero el código que describe SÍ fue modificado, márcalo como un hallazgo INFORMATIONAL:
   "La documentación puede estar desactualizada: [archivo] describe [funcionalidad/componente] pero el código cambió en esta rama. Considera ejecutar `/document-release`."

Esto es solo informativo — nunca crítico. La acción de corrección es `/document-release`.

Si no existen archivos de documentación, omite este paso silenciosamente.

---

## Step 5.7: Adversarial review (auto-scaled)

Adversarial review thoroughness scales automatically based on diff size. No configuration needed.

**Detect diff size and tool availability:**

```bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
# Respect old opt-out
OLD_CFG=$(~/.claude/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || true)
echo "DIFF_SIZE: $DIFF_TOTAL"
echo "OLD_CFG: ${OLD_CFG:-not_set}"
```

If `OLD_CFG` is `disabled`: skip this step silently. Continue to the next step.

**User override:** If the user explicitly requested a specific tier (e.g., "run all passes", "paranoid review", "full adversarial", "do all 4 passes", "thorough review"), honor that request regardless of diff size. Jump to the matching tier section.

**Auto-select tier based on diff size:**
- **Small (< 50 lines changed):** Skip adversarial review entirely. Print: "Small diff ($DIFF_TOTAL lines) — adversarial review skipped." Continue to the next step.
- **Medium (50–199 lines changed):** Run Codex adversarial challenge (or Claude adversarial subagent if Codex unavailable). Jump to the "Medium tier" section.
- **Large (200+ lines changed):** Run all remaining passes — Codex structured review + Claude adversarial subagent + Codex adversarial. Jump to the "Large tier" section.

---

### Medium tier (50–199 lines)

Claude's structured review already ran. Now add a **cross-model adversarial challenge**.

**If Codex is available:** run the Codex adversarial challenge. **If Codex is NOT available:** fall back to the Claude adversarial subagent instead.

**Codex adversarial:**

```bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
```

Set the Bash tool's `timeout` parameter to `300000` (5 minutes). Do NOT use the `timeout` shell command — it doesn't exist on macOS. After the command completes, read stderr:
```bash
cat "$TMPERR_ADV"
```

Present the full output verbatim. This is informational — it never blocks shipping.

**Error handling:** All errors are non-blocking — adversarial review is a quality enhancement, not a prerequisite.
- **Auth failure:** If stderr contains "auth", "login", "unauthorized", or "API key": "Codex authentication failed. Run \`codex login\` to authenticate."
- **Timeout:** "Codex timed out after 5 minutes."
- **Empty response:** "Codex returned no response. Stderr: <paste relevant error>."

On any Codex error, fall back to the Claude adversarial subagent automatically.

**Claude adversarial subagent** (fallback when Codex unavailable or errored):

Dispatch via the Agent tool. The subagent has fresh context — no checklist bias from the structured review. This genuine independence catches things the primary reviewer is blind to.

Subagent prompt:
"Read the diff for this branch with `git diff origin/<base>`. Think like an attacker and a chaos engineer. Your job is to find ways this code will fail in production. Look for: edge cases, race conditions, security holes, resource leaks, failure modes, silent data corruption, logic errors that produce wrong results silently, error handling that swallows failures, and trust boundary violations. Be adversarial. Be thorough. No compliments — just the problems. For each finding, classify as FIXABLE (you know how to fix it) or INVESTIGATE (needs human judgment)."

Present findings under an `ADVERSARIAL REVIEW (Claude subagent):` header. **FIXABLE findings** flow into the same Fix-First pipeline as the structured review. **INVESTIGATE findings** are presented as informational.

If the subagent fails or times out: "Claude adversarial subagent unavailable. Continuing without adversarial review."

**Persist the review result:**
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"medium","commit":"'"$(git rev-parse --short HEAD)"'"}'
```
Substitute STATUS: "clean" if no findings, "issues_found" if findings exist. SOURCE: "codex" if Codex ran, "claude" if subagent ran. If both failed, do NOT persist.

**Cleanup:** Run `rm -f "$TMPERR_ADV"` after processing (if Codex was used).

---

### Large tier (200+ lines)

Claude's structured review already ran. Now run **all three remaining passes** for maximum coverage:

**1. Codex structured review (if available):**
```bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

Set the Bash tool's `timeout` parameter to `300000` (5 minutes). Do NOT use the `timeout` shell command — it doesn't exist on macOS. Present output under `CODEX SAYS (code review):` header.
Check for `[P1]` markers: found → `GATE: FAIL`, not found → `GATE: PASS`.

If GATE is FAIL, use AskUserQuestion:
```
Codex found N critical issues in the diff.

A) Investigate and fix now (recommended)
B) Continue — review will still complete
```

If A: address the findings. Re-run `codex review` to verify.

Read stderr for errors (same error handling as medium tier).

After stderr: `rm -f "$TMPERR"`

**2. Claude adversarial subagent:** Dispatch a subagent with the adversarial prompt (same prompt as medium tier). This always runs regardless of Codex availability.

**3. Codex adversarial challenge (if available):** Run `codex exec` with the adversarial prompt (same as medium tier).

If Codex is not available for steps 1 and 3, note to the user: "Codex CLI not found — large-diff review ran Claude structured + Claude adversarial (2 of 4 passes). Install Codex for full 4-pass coverage: `npm install -g @openai/codex`"

**Persist the review result AFTER all passes complete** (not after each sub-step):
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"large","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```
Substitute: STATUS = "clean" if no findings across ALL passes, "issues_found" if any pass found issues. SOURCE = "both" if Codex ran, "claude" if only Claude subagent ran. GATE = the Codex structured review gate result ("pass"/"fail"), or "informational" if Codex was unavailable. If all passes failed, do NOT persist.

---

### Cross-model synthesis (medium and large tiers)

After all passes complete, synthesize findings across all sources:

```
ADVERSARIAL REVIEW SYNTHESIS (auto: TIER, N lines):
════════════════════════════════════════════════════════════
  High confidence (found by multiple sources): [findings agreed on by >1 pass]
  Unique to Claude structured review: [from earlier step]
  Unique to Claude adversarial: [from subagent, if ran]
  Unique to Codex: [from codex adversarial or code review, if ran]
  Models used: Claude structured ✓  Claude adversarial ✓/✗  Codex ✓/✗
════════════════════════════════════════════════════════════
```

High-confidence findings (agreed on by multiple sources) should be prioritized for fixes.

---

## Paso 5.8: Persistir resultado de revisión de ingeniería

Después de que todas las pasadas de revisión se completen, persiste el resultado final de `/review` para que `/ship` pueda reconocer que se ejecutó la revisión de ingeniería en esta rama.

Ejecuta:

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"review","timestamp":"TIMESTAMP","status":"STATUS","issues_found":N,"critical":N,"informational":N,"commit":"COMMIT"}'
```

Sustituye:
- `TIMESTAMP` = fecha y hora ISO 8601
- `STATUS` = `"clean"` si no quedan hallazgos no resueltos después del manejo Fix-First y la revisión adversarial, de lo contrario `"issues_found"`
- `issues_found` = total de hallazgos no resueltos restantes
- `critical` = hallazgos críticos no resueltos restantes
- `informational` = hallazgos informativos no resueltos restantes
- `COMMIT` = salida de `git rev-parse --short HEAD`

Si la revisión termina anticipadamente antes de completar una revisión real (por ejemplo, no hay diff contra la rama base), **no** escribas esta entrada.

## Reglas importantes

- **Lee el diff COMPLETO antes de comentar.** No marques problemas que ya están resueltos en el diff.
- **Corregir primero, no solo leer.** Los elementos AUTO-FIX se aplican directamente. Los elementos ASK solo se aplican tras la aprobación del usuario. Nunca hagas commit, push ni crees PRs — eso es trabajo de /ship.
- **Sé conciso.** Una línea para el problema, una línea para la corrección. Sin preámbulos.
- **Solo marca problemas reales.** Omite todo lo que esté bien.
- **Usa las plantillas de respuesta de Greptile de greptile-triage.md.** Cada respuesta incluye evidencia. Nunca publiques respuestas vagas.
