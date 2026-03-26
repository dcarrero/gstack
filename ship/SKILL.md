---
name: ship
preamble-tier: 4
version: 1.0.0
description: |
  Flujo de envío: detectar + fusionar rama base, ejecutar tests, revisar diff, incrementar VERSION, actualizar CHANGELOG, hacer commit, push, crear PR. Usar cuando se pida "enviar", "desplegar", "push a main", "crear un PR" o "fusionar y subir".
  Sugerir proactivamente cuando el usuario diga que el código está listo o pregunte sobre desplegar.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
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
echo '{"skill":"ship","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

# Ship: Flujo de envío completamente automatizado

Estás ejecutando el flujo `/ship`. Este es un flujo **no interactivo, completamente automatizado**. NO pidas confirmación en ningún paso. El usuario dijo `/ship`, lo que significa HAZLO. Ejecuta todo de corrido y muestra la URL del PR al final.

**Solo detenerse por:**
- Estar en la rama base (abortar)
- Conflictos de fusión que no se pueden resolver automáticamente (detenerse, mostrar conflictos)
- Fallos de tests en la rama (los fallos preexistentes se clasifican, no bloquean automáticamente)
- La revisión pre-landing encuentra elementos ASK que requieren juicio del usuario
- Se necesita incremento de versión MINOR o MAJOR (preguntar — ver Paso 4)
- Comentarios de revisión de Greptile que necesitan decisión del usuario (correcciones complejas, falsos positivos)
- Cobertura evaluada por IA por debajo del umbral mínimo (puerta obligatoria con opción de anulación del usuario — ver Paso 3.4)
- Elementos del plan NO DONE sin anulación del usuario (ver Paso 3.45)
- Fallos en la verificación del plan (ver Paso 3.47)
- TODOS.md no existe y el usuario quiere crear uno (preguntar — ver Paso 5.5)
- TODOS.md desorganizado y el usuario quiere reorganizarlo (preguntar — ver Paso 5.5)

**Nunca detenerse por:**
- Cambios sin commit (siempre incluirlos)
- Elección de incremento de versión (auto-elegir MICRO o PATCH — ver Paso 4)
- Contenido del CHANGELOG (auto-generar desde el diff)
- Aprobación del mensaje de commit (auto-commit)
- Conjuntos de cambios multi-archivo (auto-dividir en commits bisectables)
- Detección de elementos completados en TODOS.md (auto-marcar)
- Hallazgos de revisión auto-corregibles (código muerto, N+1, comentarios obsoletos — se corrigen automáticamente)
- Brechas de cobertura de tests dentro del umbral objetivo (auto-generar y hacer commit, o marcar en el cuerpo del PR)

---

## Paso 1: Pre-vuelo

1. Verificar la rama actual. Si estás en la rama base o la rama predeterminada del repositorio, **abortar**: "Estás en la rama base. Envía desde una rama de funcionalidad."

2. Ejecutar `git status` (nunca usar `-uall`). Los cambios sin commit siempre se incluyen — no es necesario preguntar.

3. Ejecutar `git diff <base>...HEAD --stat` y `git log <base>..HEAD --oneline` para entender qué se está enviando.

4. Verificar preparación para revisión:

## Review Readiness Dashboard

After completing the review, read the review log and config to display the dashboard.

```bash
~/.claude/skills/gstack/bin/gstack-review-read
```

Parse the output. Find the most recent entry for each skill (plan-ceo-review, plan-eng-review, review, plan-design-review, design-review-lite, adversarial-review, codex-review, codex-plan-review). Ignore entries with timestamps older than 7 days. For the Eng Review row, show whichever is more recent between `review` (diff-scoped pre-landing review) and `plan-eng-review` (plan-stage architecture review). Append "(DIFF)" or "(PLAN)" to the status to distinguish. For the Adversarial row, show whichever is more recent between `adversarial-review` (new auto-scaled) and `codex-review` (legacy). For Design Review, show whichever is more recent between `plan-design-review` (full visual audit) and `design-review-lite` (code-level check). Append "(FULL)" or "(LITE)" to the status to distinguish. Display:

```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Last Run            | Status    | Required |
|-----------------|------|---------------------|-----------|----------|
| Eng Review      |  1   | 2026-03-16 15:00    | CLEAR     | YES      |
| CEO Review      |  0   | —                   | —         | no       |
| Design Review   |  0   | —                   | —         | no       |
| Adversarial     |  0   | —                   | —         | no       |
| Outside Voice   |  0   | —                   | —         | no       |
+--------------------------------------------------------------------+
| VERDICT: CLEARED — Eng Review passed                                |
+====================================================================+
```

**Review tiers:**
- **Eng Review (required by default):** The only review that gates shipping. Covers architecture, code quality, tests, performance. Can be disabled globally with \`gstack-config set skip_eng_review true\` (the "don't bother me" setting).
- **CEO Review (optional):** Use your judgment. Recommend it for big product/business changes, new user-facing features, or scope decisions. Skip for bug fixes, refactors, infra, and cleanup.
- **Design Review (optional):** Use your judgment. Recommend it for UI/UX changes. Skip for backend-only, infra, or prompt-only changes.
- **Adversarial Review (automatic):** Auto-scales by diff size. Small diffs (<50 lines) skip adversarial. Medium diffs (50–199) get cross-model adversarial. Large diffs (200+) get all 4 passes: Claude structured, Codex structured, Claude adversarial subagent, Codex adversarial. No configuration needed.
- **Outside Voice (optional):** Independent plan review from a different AI model. Offered after all review sections complete in /plan-ceo-review and /plan-eng-review. Falls back to Claude subagent if Codex is unavailable. Never gates shipping.

**Verdict logic:**
- **CLEARED**: Eng Review has >= 1 entry within 7 days from either \`review\` or \`plan-eng-review\` with status "clean" (or \`skip_eng_review\` is \`true\`)
- **NOT CLEARED**: Eng Review missing, stale (>7 days), or has open issues
- CEO, Design, and Codex reviews are shown for context but never block shipping
- If \`skip_eng_review\` config is \`true\`, Eng Review shows "SKIPPED (global)" and verdict is CLEARED

**Staleness detection:** After displaying the dashboard, check if any existing reviews may be stale:
- Parse the \`---HEAD---\` section from the bash output to get the current HEAD commit hash
- For each review entry that has a \`commit\` field: compare it against the current HEAD. If different, count elapsed commits: \`git rev-list --count STORED_COMMIT..HEAD\`. Display: "Note: {skill} review from {date} may be stale — {N} commits since review"
- For entries without a \`commit\` field (legacy entries): display "Note: {skill} review from {date} has no commit tracking — consider re-running for accurate staleness detection"
- If all reviews match the current HEAD, do not display any staleness notes

Si la Revisión de Ingeniería NO es "CLEAR":

1. **Verificar si existe una anulación previa en esta rama:**
   ```bash
   eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)"
   grep '"skill":"ship-review-override"' ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl 2>/dev/null || echo "NO_OVERRIDE"
   ```
   Si existe una anulación, mostrar el panel y anotar "Puerta de revisión previamente aceptada — continuando." NO preguntar de nuevo.

2. **Si no existe anulación,** usar AskUserQuestion:
   - Mostrar que la Revisión de Ingeniería falta o tiene problemas abiertos
   - RECOMMENDATION: Elegir C si el cambio es obviamente trivial (< 20 líneas, corrección de erratas, solo configuración); Elegir B para cambios más grandes
   - Opciones: A) Enviar de todos modos  B) Abortar — ejecutar /review o /plan-eng-review primero  C) El cambio es demasiado pequeño para necesitar revisión de ingeniería
   - Si falta la Revisión del CEO, mencionar como informativo ("Revisión del CEO no ejecutada — recomendada para cambios de producto") pero NO bloquear
   - Para Revisión de Diseño: ejecutar `source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)`. Si `SCOPE_FRONTEND=true` y no existe revisión de diseño (plan-design-review o design-review-lite) en el panel, mencionar: "Revisión de Diseño no ejecutada — este PR cambia código frontend. La verificación de diseño lite se ejecutará automáticamente en el Paso 3.5, pero considere ejecutar /design-review para una auditoría visual completa post-implementación." Nunca bloquear de todos modos.

3. **Si el usuario elige A o C,** persistir la decisión para que futuras ejecuciones de `/ship` en esta rama omitan la puerta:
   ```bash
   eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)"
   echo '{"skill":"ship-review-override","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","decision":"USER_CHOICE"}' >> ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl
   ```
   Sustituir USER_CHOICE con "ship_anyway" o "not_relevant".

---

## Paso 1.5: Verificación del pipeline de distribución

Si el diff introduce un nuevo artefacto independiente (binario CLI, paquete de biblioteca, herramienta) — no un servicio web con despliegue existente — verificar que existe un pipeline de distribución.

1. Verificar si el diff añade un nuevo directorio `cmd/`, `main.go`, o punto de entrada `bin/`:
   ```bash
   git diff origin/<base> --name-only | grep -E '(cmd/.*/main\.go|bin/|Cargo\.toml|setup\.py|package\.json)' | head -5
   ```

2. Si se detecta un nuevo artefacto, verificar si existe un flujo de release:
   ```bash
   ls .github/workflows/ 2>/dev/null | grep -iE 'release|publish|dist'
   ```

3. **Si no existe pipeline de release y se añadió un nuevo artefacto:** Usar AskUserQuestion:
   - "Este PR añade un nuevo binario/herramienta pero no hay pipeline de CI/CD para compilarlo y publicarlo.
     Los usuarios no podrán descargar el artefacto después del merge."
   - A) Añadir un flujo de release ahora (GitHub Actions compilación multiplataforma + GitHub Releases)
   - B) Diferir — añadir a TODOS.md
   - C) No es necesario — esto es interno/solo web, el despliegue existente lo cubre

4. **Si existe pipeline de release:** Continuar silenciosamente.
5. **Si no se detectó nuevo artefacto:** Omitir silenciosamente.

---

## Paso 2: Fusionar la rama base (ANTES de los tests)

Obtener y fusionar la rama base en la rama de funcionalidad para que los tests se ejecuten contra el estado fusionado:

```bash
git fetch origin <base> && git merge origin/<base> --no-edit
```

**Si hay conflictos de fusión:** Intentar resolver automáticamente si son simples (VERSION, schema.rb, ordenamiento de CHANGELOG). Si los conflictos son complejos o ambiguos, **DETENERSE** y mostrarlos.

**Si ya está actualizado:** Continuar silenciosamente.

---

## Paso 2.5: Inicialización del framework de tests

## Test Framework Bootstrap

**Detect existing test framework and project runtime:**

```bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Detect sub-frameworks
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Check opt-out marker
[ -f .gstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
```

**If test framework detected** (config files or test directories found):
Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap."
Read 2-3 existing test files to learn conventions (naming, imports, assertion style, setup patterns).
Store conventions as prose context for use in Phase 8e.5 or Step 3.4. **Skip the rest of bootstrap.**

**If BOOTSTRAP_DECLINED** appears: Print "Test bootstrap previously declined — skipping." **Skip the rest of bootstrap.**

**If NO runtime detected** (no config files found): Use AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
If user picks H → write `.gstack/no-test-bootstrap` and continue without tests.

**If runtime detected but no test framework — bootstrap:**

### B2. Research best practices

Use WebSearch to find current best practices for the detected runtime:
- `"[runtime] best test framework 2025 2026"`
- `"[framework A] vs [framework B] comparison"`

If WebSearch is unavailable, use this built-in knowledge table:

| Runtime | Primary recommendation | Alternative |
|---------|----------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot + shoulda-matchers |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |
| Rust | cargo test (built-in) + mockall | — |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (built-in) + ex_machina | — |

### B3. Framework selection

Use AskUserQuestion:
"I detected this is a [Runtime/Framework] project with no test framework. I researched current best practices. Here are the options:
A) [Primary] — [rationale]. Includes: [packages]. Supports: unit, integration, smoke, e2e
B) [Alternative] — [rationale]. Includes: [packages]
C) Skip — don't set up testing right now
RECOMMENDATION: Choose A because [reason based on project context]"

If user picks C → write `.gstack/no-test-bootstrap`. Tell user: "If you change your mind later, delete `.gstack/no-test-bootstrap` and re-run." Continue without tests.

If multiple runtimes detected (monorepo) → ask which runtime to set up first, with option to do both sequentially.

### B4. Install and configure

1. Install the chosen packages (npm/bun/gem/pip/etc.)
2. Create minimal config file
3. Create directory structure (test/, spec/, etc.)
4. Create one example test matching the project's code to verify setup works

If package installation fails → debug once. If still failing → revert with `git checkout -- package.json package-lock.json` (or equivalent for the runtime). Warn user and continue without tests.

### B4.5. First real tests

Generate 3-5 real tests for existing code:

1. **Find recently changed files:** `git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10`
2. **Prioritize by risk:** Error handlers > business logic with conditionals > API endpoints > pure functions
3. **For each file:** Write one test that tests real behavior with meaningful assertions. Never `expect(x).toBeDefined()` — test what the code DOES.
4. Run each test. Passes → keep. Fails → fix once. Still fails → delete silently.
5. Generate at least 1 test, cap at 5.

Never import secrets, API keys, or credentials in test files. Use environment variables or test fixtures.

### B5. Verify

```bash
# Run the full test suite to confirm everything works
{detected test command}
```

If tests fail → debug once. If still failing → revert all bootstrap changes and warn user.

### B5.5. CI/CD pipeline

```bash
# Check CI provider
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
```

If `.github/` exists (or no CI detected — default to GitHub Actions):
Create `.github/workflows/test.yml` with:
- `runs-on: ubuntu-latest`
- Appropriate setup action for the runtime (setup-node, setup-ruby, setup-python, etc.)
- The same test command verified in B5
- Trigger: push + pull_request

If non-GitHub CI detected → skip CI generation with note: "Detected {provider} — CI pipeline generation supports GitHub Actions only. Add test step to your existing pipeline manually."

### B6. Create TESTING.md

First check: If TESTING.md already exists → read it and update/append rather than overwriting. Never destroy existing content.

Write TESTING.md with:
- Philosophy: "100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower."
- Framework name and version
- How to run tests (the verified command from B5)
- Test layers: Unit tests (what, where, when), Integration tests, Smoke tests, E2E tests
- Conventions: file naming, assertion style, setup/teardown patterns

### B7. Update CLAUDE.md

First check: If CLAUDE.md already has a `## Testing` section → skip. Don't duplicate.

Append a `## Testing` section:
- Run command and test directory
- Reference to TESTING.md
- Test expectations:
  - 100% test coverage is the goal — tests make vibe coding safe
  - When writing new functions, write a corresponding test
  - When fixing a bug, write a regression test
  - When adding error handling, write a test that triggers the error
  - When adding a conditional (if/else, switch), write tests for BOTH paths
  - Never commit code that makes existing tests fail

### B8. Commit

```bash
git status --porcelain
```

Only commit if there are changes. Stage all bootstrap files (config, test directory, TESTING.md, CLAUDE.md, .github/workflows/test.yml if created):
`git commit -m "chore: bootstrap test framework ({framework name})"`

---

---

## Paso 3: Ejecutar tests (sobre el código fusionado)

**NO ejecutar `RAILS_ENV=test bin/rails db:migrate`** — `bin/test-lane` ya llama a
`db:test:prepare` internamente, que carga el schema en la base de datos del lane correcto.
Ejecutar migraciones de test sin INSTANCE toca una BD huérfana y corrompe structure.sql.

Ejecutar ambas suites de tests en paralelo:

```bash
bin/test-lane 2>&1 | tee /tmp/ship_tests.txt &
npm run test 2>&1 | tee /tmp/ship_vitest.txt &
wait
```

Una vez que ambas terminen, leer los archivos de salida y verificar éxito/fallo.

**Si algún test falla:** NO detenerse inmediatamente. Aplicar la Clasificación de Propiedad de Fallos de Test:

## Test Failure Ownership Triage

When tests fail, do NOT immediately stop. First, determine ownership:

### Step T1: Classify each failure

For each failing test:

1. **Get the files changed on this branch:**
   ```bash
   git diff origin/<base>...HEAD --name-only
   ```

2. **Classify the failure:**
   - **In-branch** if: the failing test file itself was modified on this branch, OR the test output references code that was changed on this branch, OR you can trace the failure to a change in the branch diff.
   - **Likely pre-existing** if: neither the test file nor the code it tests was modified on this branch, AND the failure is unrelated to any branch change you can identify.
   - **When ambiguous, default to in-branch.** It is safer to stop the developer than to let a broken test ship. Only classify as pre-existing when you are confident.

   This classification is heuristic — use your judgment reading the diff and the test output. You do not have a programmatic dependency graph.

### Step T2: Handle in-branch failures

**STOP.** These are your failures. Show them and do not proceed. The developer must fix their own broken tests before shipping.

### Step T3: Handle pre-existing failures

Check `REPO_MODE` from the preamble output.

**If REPO_MODE is `solo`:**

Use AskUserQuestion:

> These test failures appear pre-existing (not caused by your branch changes):
>
> [list each failure with file:line and brief error description]
>
> Since this is a solo repo, you're the only one who will fix these.
>
> RECOMMENDATION: Choose A — fix now while the context is fresh. Completeness: 9/10.
> A) Investigate and fix now (human: ~2-4h / CC: ~15min) — Completeness: 10/10
> B) Add as P0 TODO — fix after this branch lands — Completeness: 7/10
> C) Skip — I know about this, ship anyway — Completeness: 3/10

**If REPO_MODE is `collaborative` or `unknown`:**

Use AskUserQuestion:

> These test failures appear pre-existing (not caused by your branch changes):
>
> [list each failure with file:line and brief error description]
>
> This is a collaborative repo — these may be someone else's responsibility.
>
> RECOMMENDATION: Choose B — assign it to whoever broke it so the right person fixes it. Completeness: 9/10.
> A) Investigate and fix now anyway — Completeness: 10/10
> B) Blame + assign GitHub issue to the author — Completeness: 9/10
> C) Add as P0 TODO — Completeness: 7/10
> D) Skip — ship anyway — Completeness: 3/10

### Step T4: Execute the chosen action

**If "Investigate and fix now":**
- Switch to /investigate mindset: root cause first, then minimal fix.
- Fix the pre-existing failure.
- Commit the fix separately from the branch's changes: `git commit -m "fix: pre-existing test failure in <test-file>"`
- Continue with the workflow.

**If "Add as P0 TODO":**
- If `TODOS.md` exists, add the entry following the format in `review/TODOS-format.md` (or `.claude/skills/review/TODOS-format.md`).
- If `TODOS.md` does not exist, create it with the standard header and add the entry.
- Entry should include: title, the error output, which branch it was noticed on, and priority P0.
- Continue with the workflow — treat the pre-existing failure as non-blocking.

**If "Blame + assign GitHub issue" (collaborative only):**
- Find who likely broke it. Check BOTH the test file AND the production code it tests:
  ```bash
  # Who last touched the failing test?
  git log --format="%an (%ae)" -1 -- <failing-test-file>
  # Who last touched the production code the test covers? (often the actual breaker)
  git log --format="%an (%ae)" -1 -- <source-file-under-test>
  ```
  If these are different people, prefer the production code author — they likely introduced the regression.
- Create a GitHub issue assigned to that person:
  ```bash
  gh issue create \
    --title "Pre-existing test failure: <test-name>" \
    --body "Found failing on branch <current-branch>. Failure is pre-existing.\n\n**Error:**\n```\n<first 10 lines>\n```\n\n**Last modified by:** <author>\n**Noticed by:** gstack /ship on <date>" \
    --assignee "<github-username>"
  ```
- If `gh` is not available or `--assignee` fails (user not in org, etc.), create the issue without assignee and note who should look at it in the body.
- Continue with the workflow.

**If "Skip":**
- Continue with the workflow.
- Note in output: "Pre-existing test failure skipped: <test-name>"

**Después de la clasificación:** Si quedan fallos de la rama sin corregir, **DETENERSE**. No continuar. Si todos los fallos eran preexistentes y se gestionaron (corregidos, marcados como TODO, asignados u omitidos), continuar al Paso 3.25.

**Si todos pasan:** Continuar silenciosamente — solo anotar los conteos brevemente.

---

## Paso 3.25: Suites de evaluación (condicional)

Las evaluaciones son obligatorias cuando cambian archivos relacionados con prompts. Omitir este paso por completo si no hay archivos de prompts en el diff.

**1. Verificar si el diff toca archivos relacionados con prompts:**

```bash
git diff origin/<base> --name-only
```

Comparar contra estos patrones (de CLAUDE.md):
- `app/services/*_prompt_builder.rb`
- `app/services/*_generation_service.rb`, `*_writer_service.rb`, `*_designer_service.rb`
- `app/services/*_evaluator.rb`, `*_scorer.rb`, `*_classifier_service.rb`, `*_analyzer.rb`
- `app/services/concerns/*voice*.rb`, `*writing*.rb`, `*prompt*.rb`, `*token*.rb`
- `app/services/chat_tools/*.rb`, `app/services/x_thread_tools/*.rb`
- `config/system_prompts/*.txt`
- `test/evals/**/*` (cambios en la infraestructura de evaluación afectan a todas las suites)

**Si no hay coincidencias:** Imprimir "No se modificaron archivos relacionados con prompts — omitiendo evaluaciones." y continuar al Paso 3.5.

**2. Identificar suites de evaluación afectadas:**

Cada ejecutor de evaluación (`test/evals/*_eval_runner.rb`) declara `PROMPT_SOURCE_FILES` listando qué archivos fuente le afectan. Buscar con grep para encontrar qué suites coinciden con los archivos modificados:

```bash
grep -l "changed_file_basename" test/evals/*_eval_runner.rb
```

Mapear ejecutor → archivo de test: `post_generation_eval_runner.rb` → `post_generation_eval_test.rb`.

**Casos especiales:**
- Cambios en `test/evals/judges/*.rb`, `test/evals/support/*.rb`, o `test/evals/fixtures/` afectan a TODAS las suites que usan esos judges/archivos de soporte. Verificar las importaciones en los archivos de test de evaluación para determinar cuáles.
- Cambios en `config/system_prompts/*.txt` — buscar con grep en los ejecutores de evaluación el nombre del archivo de prompt para encontrar suites afectadas.
- Si no está claro qué suites se ven afectadas, ejecutar TODAS las suites que puedan verse plausiblemente impactadas. Sobre-testear es mejor que perder una regresión.

**3. Ejecutar suites afectadas con `EVAL_JUDGE_TIER=full`:**

`/ship` es una puerta pre-merge, así que siempre usar tier completo (jueces estructurales Sonnet + jueces de persona Opus).

```bash
EVAL_JUDGE_TIER=full EVAL_VERBOSE=1 bin/test-lane --eval test/evals/<suite>_eval_test.rb 2>&1 | tee /tmp/ship_evals.txt
```

Si se necesitan ejecutar múltiples suites, ejecutarlas secuencialmente (cada una necesita un test lane). Si la primera suite falla, detenerse inmediatamente — no gastar coste de API en las suites restantes.

**4. Verificar resultados:**

- **Si alguna evaluación falla:** Mostrar los fallos, el panel de costes, y **DETENERSE**. No continuar.
- **Si todas pasan:** Anotar conteos de éxito y coste. Continuar al Paso 3.5.

**5. Guardar salida de evaluación** — incluir resultados de evaluación y panel de costes en el cuerpo del PR (Paso 8).

**Referencia de tiers (para contexto — /ship siempre usa `full`):**
| Tier | Cuándo | Velocidad (en caché) | Coste |
|------|--------|---------------------|-------|
| `fast` (Haiku) | Iteración de desarrollo, pruebas de humo | ~5s (14x más rápido) | ~$0.07/ejecución |
| `standard` (Sonnet) | Desarrollo por defecto, `bin/test-lane --eval` | ~17s (4x más rápido) | ~$0.37/ejecución |
| `full` (Opus persona) | **`/ship` y pre-merge** | ~72s (referencia) | ~$1.27/ejecución |

---

## Paso 3.4: Auditoría de cobertura de tests

100% coverage is the goal — every untested path is a path where bugs hide and vibe coding becomes yolo coding. Evaluate what was ACTUALLY coded (from the diff), not what was planned.

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

3. **If no framework detected:** falls through to the Test Framework Bootstrap step (Step 2.5) which handles full setup.

**0. Before/after test count:**

```bash
# Count test files before any generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

Store this number for the PR body.

**1. Trace every codepath changed** using `git diff origin/<base>...HEAD`:

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

**2. Map user flows, interactions, and error states:**

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

**3. Check each branch against existing tests:**

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

**4. Output ASCII coverage diagram:**

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

**Fast path:** All paths covered → "Step 3.4: All new code paths have test coverage ✓" Continue.

**5. Generate tests for uncovered paths:**

If test framework detected (or bootstrapped in Step 2.5):
- Prioritize error handlers and edge cases first (happy paths are more likely already tested)
- Read 2-3 existing test files to match conventions exactly
- Generate unit tests. Mock all external dependencies (DB, API, Redis).
- For paths marked [→E2E]: generate integration/E2E tests using the project's E2E framework (Playwright, Cypress, Capybara, etc.)
- For paths marked [→EVAL]: generate eval tests using the project's eval framework, or flag for manual eval if none exists
- Write tests that exercise the specific uncovered path with real assertions
- Run each test. Passes → commit as `test: coverage for {feature}`
- Fails → fix once. Still fails → revert, note gap in diagram.

Caps: 30 code paths max, 20 tests generated max (code + user flow combined), 2-min per-test exploration cap.

If no test framework AND user declined bootstrap → diagram only, no generation. Note: "Test generation skipped — no test framework configured."

**Diff is test-only changes:** Skip Step 3.4 entirely: "No new application code paths to audit."

**6. After-count and coverage summary:**

```bash
# Count test files after generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

For PR body: `Tests: {before} → {after} (+{delta} new)`
Coverage line: `Test Coverage Audit: N new code paths. M covered (X%). K tests generated, J committed.`

### Test Plan Artifact

After producing the coverage diagram, write a test plan artifact so `/qa` and `/qa-only` can consume it:

```bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
```

Write to `~/.gstack/projects/{slug}/{user}-{branch}-ship-test-plan-{datetime}.md`:

```markdown
# Test Plan
Generated by /ship on {date}
Branch: {branch}
Repo: {owner/repo}

## Affected Pages/Routes
- {URL path} — {what to test and why}

## Key Interactions to Verify
- {interaction description} on {page}

## Edge Cases
- {edge case} on {page}

## Critical Paths
- {end-to-end flow that must work}
```

---

## Paso 3.45: Auditoría de finalización del plan

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

### Lógica del Gate

Después de producir la checklist de completitud:

- **Todos DONE o CHANGED:** Aprobado. "Completitud del plan: APROBADO — todos los elementos abordados." Continúa.
- **Solo elementos PARTIAL (sin NOT DONE):** Continúa con una nota en el cuerpo del PR. No es bloqueante.
- **Algún elemento NOT DONE:** Usa AskUserQuestion:
  - Muestra la checklist de completitud anterior
  - "{N} elementos del plan están NOT DONE. Estos eran parte del plan original pero faltan en la implementación."
  - RECOMMENDATION: depende de la cantidad y gravedad de elementos. Si son 1-2 elementos menores (docs, config), recomienda B. Si falta funcionalidad principal, recomienda A.
  - Opciones:
    A) Detener — implementar los elementos faltantes antes de enviar
    B) Enviar de todos modos — diferir estos a un seguimiento (se crearán TODOs P1 en el Paso 5.5)
    C) Estos elementos fueron eliminados intencionalmente — remover del alcance
  - Si A: DETENER. Lista los elementos faltantes para que el usuario los implemente.
  - Si B: Continúa. Para cada elemento NOT DONE, crea un TODO P1 en el Paso 5.5 con "Diferido del plan: {ruta del archivo de plan}".
  - Si C: Continúa. Indica en el cuerpo del PR: "Elementos del plan eliminados intencionalmente: {lista}."

**Archivo de plan no encontrado:** Omite por completo. "Archivo de plan no detectado — omitiendo auditoría de completitud del plan."

**Incluir en el cuerpo del PR (Paso 8):** Agrega una sección `## Completitud del Plan` con el resumen de la checklist.

---

## Paso 3.47: Verificación del Plan

Verifica automáticamente los pasos de testing/verificación del plan usando el skill `/qa-only`.

### 1. Verificar si existe sección de verificación

Usando el archivo de plan ya descubierto en el Paso 3.45, busca una sección de verificación. Coincide con cualquiera de estos encabezados: `## Verificación`, `## Plan de tests`, `## Testing`, `## Cómo probar`, `## Testing manual`, o cualquier sección con elementos con sabor a verificación (URLs a visitar, cosas a verificar visualmente, interacciones a probar).

**Si no se encuentra sección de verificación:** Omite con "No se encontraron pasos de verificación en el plan — omitiendo auto-verificación."
**Si no se encontró archivo de plan en el Paso 3.45:** Omite (ya manejado).

### 2. Verificar si hay servidor de desarrollo ejecutándose

Antes de invocar verificación basada en navegador, comprueba si un servidor de desarrollo es accesible:

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || \
curl -s -o /dev/null -w '%{http_code}' http://localhost:8080 2>/dev/null || \
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null || \
curl -s -o /dev/null -w '%{http_code}' http://localhost:4000 2>/dev/null || echo "NO_SERVER"
```

**Si NO_SERVER:** Omite con "No se detectó servidor de desarrollo — omitiendo verificación del plan. Ejecuta /qa por separado después de desplegar."

### 3. Invocar /qa-only en línea

Lee el skill `/qa-only` desde disco:

```bash
cat ${CLAUDE_SKILL_DIR}/../qa-only/SKILL.md
```

**Si es ilegible:** Omite con "No se pudo cargar /qa-only — omitiendo verificación del plan."

Sigue el flujo de trabajo de /qa-only con estas modificaciones:
- **Omite el preámbulo** (ya manejado por /ship)
- **Usa la sección de verificación del plan como entrada primaria de tests** — trata cada elemento de verificación como un caso de prueba
- **Usa la URL del servidor de desarrollo detectado** como URL base
- **Omite el bucle de corrección** — esto es verificación solo de reporte durante /ship
- **Limita a los elementos de verificación del plan** — no expandas a QA general del sitio

### 4. Lógica del gate

- **Todos los elementos de verificación PASS:** Continúa silenciosamente. "Verificación del plan: APROBADO."
- **Algún FAIL:** Usa AskUserQuestion:
  - Muestra los fallos con evidencia en capturas de pantalla
  - RECOMMENDATION: Elige A si los fallos indican funcionalidad rota. Elige B si son solo cosméticos.
  - Opciones:
    A) Corregir los fallos antes de enviar (recomendado para problemas funcionales)
    B) Enviar de todos modos — incidencias conocidas (aceptable para problemas cosméticos)
- **Sin sección de verificación / sin servidor / skill ilegible:** Omite (no bloqueante).

### 5. Incluir en el cuerpo del PR

Agrega una sección `## Resultados de Verificación` al cuerpo del PR (Paso 8):
- Si la verificación se ejecutó: resumen de resultados (N PASS, M FAIL, K OMITIDOS)
- Si se omitió: razón de la omisión (sin plan, sin servidor, sin sección de verificación)

---

## Paso 3.5: Revisión pre-landing

Revisar el diff buscando problemas estructurales que los tests no detectan.

1. Leer `.claude/skills/review/checklist.md`. Si el archivo no se puede leer, **DETENERSE** e informar del error.

2. Ejecutar `git diff origin/<base>` para obtener el diff completo (limitado a los cambios de la funcionalidad contra la rama base recién obtenida).

3. Aplicar la lista de verificación de revisión en dos pasadas:
   - **Pasada 1 (CRITICAL):** Seguridad SQL y de Datos, Límite de Confianza de Salida LLM
   - **Pasada 2 (INFORMATIONAL):** Todas las categorías restantes

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

   Incluir cualquier hallazgo de diseño junto con los hallazgos de revisión de código. Siguen el mismo flujo de Corregir-Primero a continuación.

4. **Clasificar cada hallazgo como AUTO-FIX o ASK** según la Heurística de Corregir-Primero en
   checklist.md. Los hallazgos críticos tienden hacia ASK; los informativos tienden hacia AUTO-FIX.

5. **Auto-corregir todos los elementos AUTO-FIX.** Aplicar cada corrección. Mostrar una línea por corrección:
   `[AUTO-FIXED] [archivo:línea] Problema → qué se hizo`

6. **Si quedan elementos ASK,** presentarlos en UNA AskUserQuestion:
   - Listar cada uno con número, severidad, problema, corrección recomendada
   - Opciones por elemento: A) Corregir  B) Omitir
   - RECOMMENDATION general
   - Si hay 3 o menos elementos ASK, se pueden usar llamadas individuales a AskUserQuestion en su lugar

7. **Después de todas las correcciones (automáticas + aprobadas por el usuario):**
   - Si se aplicó ALGUNA corrección: hacer commit de los archivos corregidos por nombre (`git add <archivos-corregidos> && git commit -m "fix: pre-landing review fixes"`), luego **DETENERSE** e indicar al usuario que ejecute `/ship` de nuevo para re-testear.
   - Si no se aplicaron correcciones (todos los elementos ASK omitidos, o no se encontraron problemas): continuar al Paso 4.

8. Mostrar resumen: `Pre-Landing Review: N problemas — M auto-corregidos, K consultados (J corregidos, L omitidos)`

   Si no se encontraron problemas: `Pre-Landing Review: No issues found.`

Guardar la salida de la revisión — va en el cuerpo del PR en el Paso 8.

---

## Paso 3.75: Abordar comentarios de revisión de Greptile (si existe PR)

Leer `.claude/skills/review/greptile-triage.md` y seguir los pasos de obtención, filtrado, clasificación y **detección de escalamiento**.

**Si no existe PR, `gh` falla, la API devuelve un error, o hay cero comentarios de Greptile:** Omitir este paso silenciosamente. Continuar al Paso 4.

**Si se encuentran comentarios de Greptile:**

Incluir un resumen de Greptile en la salida: `+ N comentarios de Greptile (X válidos, Y corregidos, Z FP)`

Antes de responder a cualquier comentario, ejecutar el algoritmo de **Detección de Escalamiento** de greptile-triage.md para determinar si usar plantillas de respuesta Tier 1 (amigable) o Tier 2 (firme).

Para cada comentario clasificado:

**VÁLIDO Y ACCIONABLE:** Usar AskUserQuestion con:
- El comentario (archivo:línea o [nivel-superior] + resumen del cuerpo + URL de enlace permanente)
- `RECOMMENDATION: Choose A because [razón en una línea]`
- Opciones: A) Corregir ahora, B) Reconocer y enviar de todos modos, C) Es un falso positivo
- Si el usuario elige A: aplicar la corrección, hacer commit de los archivos corregidos (`git add <archivos-corregidos> && git commit -m "fix: address Greptile review — <descripción breve>"`), responder usando la **plantilla de respuesta Fix** de greptile-triage.md (incluir diff en línea + explicación), y guardar tanto en el historial greptile del proyecto como en el global (tipo: fix).
- Si el usuario elige C: responder usando la **plantilla de respuesta False Positive** de greptile-triage.md (incluir evidencia + sugerencia de re-clasificación), guardar tanto en el historial greptile del proyecto como en el global (tipo: fp).

**VÁLIDO PERO YA CORREGIDO:** Responder usando la **plantilla de respuesta Already Fixed** de greptile-triage.md — no se necesita AskUserQuestion:
- Incluir qué se hizo y el SHA del commit que lo corrige
- Guardar tanto en el historial greptile del proyecto como en el global (tipo: already-fixed)

**FALSO POSITIVO:** Usar AskUserQuestion:
- Mostrar el comentario y por qué se cree que es incorrecto (archivo:línea o [nivel-superior] + resumen del cuerpo + URL de enlace permanente)
- Opciones:
  - A) Responder a Greptile explicando el falso positivo (recomendado si claramente erróneo)
  - B) Corregirlo de todos modos (si es trivial)
  - C) Ignorar silenciosamente
- Si el usuario elige A: responder usando la **plantilla de respuesta False Positive** de greptile-triage.md (incluir evidencia + sugerencia de re-clasificación), guardar tanto en el historial greptile del proyecto como en el global (tipo: fp)

**SUPRIMIDO:** Omitir silenciosamente — estos son falsos positivos conocidos de clasificaciones anteriores.

**Después de resolver todos los comentarios:** Si se aplicaron correcciones, los tests del Paso 3 ahora están obsoletos. **Re-ejecutar tests** (Paso 3) antes de continuar al Paso 4. Si no se aplicaron correcciones, continuar al Paso 4.

---

## Step 3.8: Adversarial review (auto-scaled)

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

If A: address the findings. After fixing, re-run tests (Step 3) since code has changed. Re-run `codex review` to verify.

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

## Paso 4: Incremento de versión (auto-decidir)

1. Leer el archivo `VERSION` actual (formato de 4 dígitos: `MAJOR.MINOR.PATCH.MICRO`)

2. **Auto-decidir el nivel de incremento basado en el diff:**
   - Contar líneas cambiadas (`git diff origin/<base>...HEAD --stat | tail -1`)
   - **MICRO** (4to dígito): < 50 líneas cambiadas, ajustes triviales, erratas, configuración
   - **PATCH** (3er dígito): 50+ líneas cambiadas, correcciones de errores, funcionalidades pequeñas-medianas
   - **MINOR** (2do dígito): **PREGUNTAR al usuario** — solo para funcionalidades mayores o cambios arquitectónicos significativos
   - **MAJOR** (1er dígito): **PREGUNTAR al usuario** — solo para hitos o cambios incompatibles

3. Calcular la nueva versión:
   - Incrementar un dígito reinicia todos los dígitos a su derecha a 0
   - Ejemplo: `0.19.1.0` + PATCH → `0.19.2.0`

4. Escribir la nueva versión en el archivo `VERSION`.

---

## Paso 5: CHANGELOG (auto-generar)

1. Leer la cabecera de `CHANGELOG.md` para conocer el formato.

2. Auto-generar la entrada desde **TODOS los commits de la rama** (no solo los recientes):
   - Usar `git log <base>..HEAD --oneline` para ver cada commit que se envía
   - Usar `git diff <base>...HEAD` para ver el diff completo contra la rama base
   - La entrada del CHANGELOG debe ser completa con TODOS los cambios que van al PR
   - Si las entradas existentes del CHANGELOG en la rama ya cubren algunos commits, reemplazarlas con una entrada unificada para la nueva versión
   - Categorizar los cambios en secciones aplicables:
     - `### Added` — nuevas funcionalidades
     - `### Changed` — cambios a funcionalidad existente
     - `### Fixed` — correcciones de errores
     - `### Removed` — funcionalidades eliminadas
   - Escribir puntos concisos y descriptivos
   - Insertar después de la cabecera del archivo (línea 5), con fecha de hoy
   - Formato: `## [X.Y.Z.W] - YYYY-MM-DD`

**NO preguntar al usuario que describa los cambios.** Inferir del diff y el historial de commits.

---

## Paso 5.5: TODOS.md (auto-actualizar)

Cruzar el TODOS.md del proyecto con los cambios que se envían. Marcar elementos completados automáticamente; preguntar solo si el archivo no existe o está desorganizado.

Leer `.claude/skills/review/TODOS-format.md` para la referencia de formato canónico.

**1. Verificar si existe TODOS.md** en la raíz del repositorio.

**Si TODOS.md no existe:** Usar AskUserQuestion:
- Mensaje: "GStack recomienda mantener un TODOS.md organizado por skill/componente, luego prioridad (P0 arriba hasta P4, luego Completados al final). Ver TODOS-format.md para el formato completo. ¿Quieres crear uno?"
- Opciones: A) Crearlo ahora, B) Omitir por ahora
- Si A: Crear `TODOS.md` con un esqueleto (encabezado # TODOS + sección ## Completed). Continuar al paso 3.
- Si B: Omitir el resto del Paso 5.5. Continuar al Paso 6.

**2. Verificar estructura y organización:**

Leer TODOS.md y verificar que sigue la estructura recomendada:
- Elementos agrupados bajo encabezados `## <Skill/Componente>`
- Cada elemento tiene campo `**Priority:**` con valor P0-P4
- Una sección `## Completed` al final

**Si está desorganizado** (faltan campos de prioridad, sin agrupaciones por componente, sin sección Completed): Usar AskUserQuestion:
- Mensaje: "TODOS.md no sigue la estructura recomendada (agrupaciones por skill/componente, prioridad P0-P4, sección Completed). ¿Quieres reorganizarlo?"
- Opciones: A) Reorganizar ahora (recomendado), B) Dejar como está
- Si A: Reorganizar en sitio siguiendo TODOS-format.md. Preservar todo el contenido — solo reestructurar, nunca eliminar elementos.
- Si B: Continuar al paso 3 sin reestructurar.

**3. Detectar TODOs completados:**

Este paso es completamente automático — sin interacción del usuario.

Usar el diff y el historial de commits ya recopilados en pasos anteriores:
- `git diff <base>...HEAD` (diff completo contra la rama base)
- `git log <base>..HEAD --oneline` (todos los commits que se envían)

Para cada elemento TODO, verificar si los cambios en este PR lo completan:
- Comparar mensajes de commit contra el título y descripción del TODO
- Verificar si los archivos referenciados en el TODO aparecen en el diff
- Verificar si el trabajo descrito en el TODO coincide con los cambios funcionales

**Ser conservador:** Solo marcar un TODO como completado si hay evidencia clara en el diff. Si hay duda, dejarlo como está.

**4. Mover elementos completados** a la sección `## Completed` al final. Añadir: `**Completed:** vX.Y.Z (YYYY-MM-DD)`

**5. Mostrar resumen:**
- `TODOS.md: N elementos marcados como completos (elemento1, elemento2, ...). M elementos pendientes.`
- O: `TODOS.md: No se detectaron elementos completados. M elementos pendientes.`
- O: `TODOS.md: Creado.` / `TODOS.md: Reorganizado.`

**6. Defensivo:** Si TODOS.md no se puede escribir (error de permisos, disco lleno), avisar al usuario y continuar. Nunca detener el flujo de envío por un fallo de TODOS.

Guardar este resumen — va en el cuerpo del PR en el Paso 8.

---

## Paso 6: Commit (fragmentos bisectables)

**Objetivo:** Crear commits pequeños y lógicos que funcionen bien con `git bisect` y ayuden a los LLM a entender qué cambió.

1. Analizar el diff y agrupar cambios en commits lógicos. Cada commit debe representar **un cambio coherente** — no un archivo, sino una unidad lógica.

2. **Orden de commits** (los commits anteriores primero):
   - **Infraestructura:** migraciones, cambios de configuración, adiciones de rutas
   - **Modelos y servicios:** nuevos modelos, servicios, concerns (con sus tests)
   - **Controladores y vistas:** controladores, vistas, componentes JS/React (con sus tests)
   - **VERSION + CHANGELOG + TODOS.md:** siempre en el commit final

3. **Reglas para dividir:**
   - Un modelo y su archivo de test van en el mismo commit
   - Un servicio y su archivo de test van en el mismo commit
   - Un controlador, sus vistas y su test van en el mismo commit
   - Las migraciones son su propio commit (o agrupadas con el modelo que soportan)
   - Los cambios de configuración/rutas pueden agruparse con la funcionalidad que habilitan
   - Si el diff total es pequeño (< 50 líneas en < 4 archivos), un solo commit está bien

4. **Cada commit debe ser independientemente válido** — sin importaciones rotas, sin referencias a código que aún no existe. Ordenar los commits para que las dependencias vayan primero.

5. Componer cada mensaje de commit:
   - Primera línea: `<tipo>: <resumen>` (tipo = feat/fix/chore/refactor/docs)
   - Cuerpo: descripción breve de lo que contiene este commit
   - Solo el **commit final** (VERSION + CHANGELOG) lleva la etiqueta de versión y el trailer de co-autoría:

```bash
git commit -m "$(cat <<'EOF'
chore: bump version and changelog (vX.Y.Z.W)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Paso 6.5: Puerta de verificación

**LEY DE HIERRO: NO HAY DECLARACIONES DE COMPLETADO SIN EVIDENCIA DE VERIFICACIÓN FRESCA.**

Antes de hacer push, re-verificar si el código cambió durante los Pasos 4-6:

1. **Verificación de tests:** Si CUALQUIER código cambió después de la ejecución de tests del Paso 3 (las correcciones de hallazgos de revisión cuentan, las ediciones del CHANGELOG no), re-ejecutar la suite de tests. Pegar salida fresca. La salida obsoleta del Paso 3 NO es aceptable.

2. **Verificación de compilación:** Si el proyecto tiene un paso de compilación, ejecutarlo. Pegar la salida.

3. **Prevención de racionalización:**
   - "Debería funcionar ahora" → EJECÚTALO.
   - "Estoy seguro" → La seguridad no es evidencia.
   - "Ya lo testé antes" → El código cambió desde entonces. Testear de nuevo.
   - "Es un cambio trivial" → Los cambios triviales rompen producción.

**Si los tests fallan aquí:** DETENERSE. No hacer push. Corregir el problema y volver al Paso 3.

Declarar que el trabajo está completo sin verificación es deshonestidad, no eficiencia.

---

## Paso 7: Push

Hacer push al remoto con seguimiento de upstream:

```bash
git push -u origin <branch-name>
```

---

## Paso 8: Crear PR

Crear un pull request usando `gh`:

```bash
gh pr create --base <base> --title "<tipo>: <resumen>" --body "$(cat <<'EOF'
## Resumen
<puntos del CHANGELOG>

## Cobertura de tests
<diagrama de cobertura del Paso 3.4, o "Todas las nuevas rutas de código tienen cobertura de tests.">
<Si el Paso 3.4 se ejecutó: "Tests: {antes} → {después} (+{delta} nuevos)">

## Revisión pre-landing
<hallazgos de la revisión de código del Paso 3.5, o "No issues found.">

## Revisión de diseño
<Si se ejecutó revisión de diseño: "Design Review (lite): N hallazgos — M auto-corregidos, K omitidos. AI Slop: limpio/N problemas.">
<Si no se cambiaron archivos frontend: "No se modificaron archivos frontend — revisión de diseño omitida.">

## Resultados de evaluación
<Si se ejecutaron evaluaciones: nombres de suites, conteos de éxito/fallo, resumen del panel de costes. Si se omitieron: "No se modificaron archivos relacionados con prompts — evaluaciones omitidas.">

## Revisión de Greptile
<Si se encontraron comentarios de Greptile: lista con viñetas con etiqueta [FIXED] / [FALSE POSITIVE] / [ALREADY FIXED] + resumen de una línea por comentario>
<Si no se encontraron comentarios de Greptile: "Sin comentarios de Greptile.">
<Si no existía PR durante el Paso 3.75: omitir esta sección por completo>

## Finalización del plan
<Si se encontró archivo de plan: resumen de la lista de verificación de finalización del Paso 3.45>
<Si no hay archivo de plan: "No se detectó archivo de plan.">
<Si se difirieron elementos del plan: listar elementos diferidos>

## Resultados de verificación
<Si se ejecutó verificación: resumen del Paso 3.47 (N PASS, M FAIL, K SKIPPED)>
<Si se omitió: motivo (sin plan, sin servidor, sin sección de verificación)>
<Si no aplica: omitir esta sección>

## TODOS
<Si se marcaron elementos como completos: lista con viñetas de elementos completados con versión>
<Si no se completaron elementos: "No se completaron elementos TODO en este PR.">
<Si se creó o reorganizó TODOS.md: anotarlo>
<Si TODOS.md no existe y el usuario lo omitió: omitir esta sección>

## Plan de tests
- [x] Todos los tests de Rails pasan (N ejecuciones, 0 fallos)
- [x] Todos los tests de Vitest pasan (N tests)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Mostrar la URL del PR** — luego continuar al Paso 8.5.

---

## Paso 8.5: Auto-invocar /document-release

Después de crear el PR, sincronizar automáticamente la documentación del proyecto. Leer el
archivo de skill `document-release/SKILL.md` (adyacente al directorio de este skill) y
ejecutar su flujo completo:

1. Leer el skill `/document-release`: `cat ${CLAUDE_SKILL_DIR}/../document-release/SKILL.md`
2. Seguir sus instrucciones — lee todos los archivos .md del proyecto, cruza referencias con
   el diff, y actualiza todo lo que haya quedado desactualizado (README, ARCHITECTURE, CONTRIBUTING,
   CLAUDE.md, TODOS, etc.)
3. Si se actualizó alguna documentación, hacer commit de los cambios y push a la misma rama:
   ```bash
   git add -A && git commit -m "docs: sync documentation with shipped changes" && git push
   ```
4. Si no se necesitó actualizar documentación, decir "La documentación está actualizada — no se necesitan cambios."

Este paso es automático. No pedir confirmación al usuario. El objetivo es actualización de
documentación sin fricción — el usuario ejecuta `/ship` y la documentación se mantiene al día sin un comando separado.

---

## Paso 8.75: Persistir métricas de envío

Registrar datos de cobertura y finalización del plan para que `/retro` pueda seguir tendencias:

```bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
```

Añadir a `~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl`:

```bash
echo '{"skill":"ship","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","coverage_pct":COVERAGE_PCT,"plan_items_total":PLAN_TOTAL,"plan_items_done":PLAN_DONE,"verification_result":"VERIFY_RESULT","version":"VERSION","branch":"BRANCH"}' >> ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl
```

Sustituir de los pasos anteriores:
- **COVERAGE_PCT**: porcentaje de cobertura del diagrama del Paso 3.4 (entero, o -1 si no se determinó)
- **PLAN_TOTAL**: total de elementos del plan extraídos en el Paso 3.45 (0 si no hay archivo de plan)
- **PLAN_DONE**: conteo de elementos DONE + CHANGED del Paso 3.45 (0 si no hay archivo de plan)
- **VERIFY_RESULT**: "pass", "fail", o "skipped" del Paso 3.47
- **VERSION**: del archivo VERSION
- **BRANCH**: nombre de la rama actual

Este paso es automático — nunca omitirlo, nunca pedir confirmación.

---

## Reglas importantes

- **Nunca omitir los tests.** Si los tests fallan, detenerse.
- **Nunca omitir la revisión pre-landing.** Si checklist.md no se puede leer, detenerse.
- **Nunca hacer force push.** Usar solo `git push` regular.
- **Nunca pedir confirmaciones triviales** (ej., "¿listo para push?", "¿crear PR?"). SÍ detenerse por: incrementos de versión (MINOR/MAJOR), hallazgos de revisión pre-landing (elementos ASK) y hallazgos de revisión estructurada Codex [P1] (solo diffs grandes).
- **Siempre usar el formato de versión de 4 dígitos** del archivo VERSION.
- **Formato de fecha en CHANGELOG:** `YYYY-MM-DD`
- **Dividir commits para bisectabilidad** — cada commit = un cambio lógico.
- **La detección de finalización de TODOS.md debe ser conservadora.** Solo marcar elementos como completados cuando el diff muestre claramente que el trabajo está hecho.
- **Usar plantillas de respuesta de Greptile de greptile-triage.md.** Cada respuesta incluye evidencia (diff en línea, referencias de código, sugerencia de re-clasificación). Nunca publicar respuestas vagas.
- **Nunca hacer push sin evidencia de verificación fresca.** Si el código cambió después de los tests del Paso 3, re-ejecutar antes de hacer push.
- **El Paso 3.4 genera tests de cobertura.** Deben pasar antes de hacer commit. Nunca hacer commit de tests que fallan.
- **El objetivo es: el usuario dice `/ship`, lo siguiente que ve es la revisión + URL del PR + documentación auto-sincronizada.**
