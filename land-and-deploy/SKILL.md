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
echo '{"skill":"land-and-deploy","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

## SETUP (run this check BEFORE any browse command)

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

If `NEEDS_SETUP`:
1. Tell the user: "gstack browse needs a one-time build (~10 seconds). OK to proceed?" Then STOP and wait.
2. Run: `cd <SKILL_DIR> && ./setup`
3. If `bun` is not installed: `curl -fsSL https://bun.sh/install | bash`

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
plan-design-review, design-review-lite, codex-review):

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
- Si las revisiones están desactualizadas: "Volver a ejecutar /plan-eng-review (o /review) para revisar el código actual."
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
# Check for persisted deploy config in CLAUDE.md
DEPLOY_CONFIG=$(grep -A 20 "## Deploy Configuration" CLAUDE.md 2>/dev/null || echo "NO_CONFIG")
echo "$DEPLOY_CONFIG"

# If config exists, parse it
if [ "$DEPLOY_CONFIG" != "NO_CONFIG" ]; then
  PROD_URL=$(echo "$DEPLOY_CONFIG" | grep -i "production.*url" | head -1 | sed 's/.*: *//')
  PLATFORM=$(echo "$DEPLOY_CONFIG" | grep -i "platform" | head -1 | sed 's/.*: *//')
  echo "PERSISTED_PLATFORM:$PLATFORM"
  echo "PERSISTED_URL:$PROD_URL"
fi

# Auto-detect platform from config files
[ -f fly.toml ] && echo "PLATFORM:fly"
[ -f render.yaml ] && echo "PLATFORM:render"
([ -f vercel.json ] || [ -d .vercel ]) && echo "PLATFORM:vercel"
[ -f netlify.toml ] && echo "PLATFORM:netlify"
[ -f Procfile ] && echo "PLATFORM:heroku"
([ -f railway.json ] || [ -f railway.toml ]) && echo "PLATFORM:railway"

# Detect deploy workflows
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$f" ] && grep -qiE "deploy|release|production|staging|cd" "$f" 2>/dev/null && echo "DEPLOY_WORKFLOW:$f"
done
```

If `PERSISTED_PLATFORM` and `PERSISTED_URL` were found in CLAUDE.md, use them directly
and skip manual detection. If no persisted config exists, use the auto-detected platform
to guide deploy verification. If nothing is detected, ask the user via AskUserQuestion
in the decision tree below.

If you want to persist deploy settings for future runs, suggest the user run `/setup-deploy`.

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
