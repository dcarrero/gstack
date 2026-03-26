---
name: codex
preamble-tier: 3
version: 1.0.0
description: |
  Wrapper de OpenAI Codex CLI — tres modos. Revisión de código: revisión independiente del diff
  mediante codex review con gate de aprobación/rechazo. Desafío: modo adversarial que intenta
  romper tu código. Consulta: pregunta a codex lo que quieras con continuidad de sesión para
  seguimientos. La "segunda opinión del desarrollador autista con 200 de IQ". Usar cuando se
  pida "codex review", "codex challenge", "ask codex", "segunda opinión" o "consultar codex".
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
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
echo '{"skill":"codex","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

# /codex — Segunda Opinión Multi-IA

Estás ejecutando el skill `/codex`. Esto envuelve el CLI de OpenAI Codex para obtener una segunda
opinión independiente y brutalmente honesta de un sistema de IA diferente.

Codex es el "desarrollador autista con 200 de IQ" — directo, conciso, técnicamente preciso, cuestiona
suposiciones, detecta cosas que podrías pasar por alto. Presenta su salida fielmente, sin resumir.

---

## Paso 0: Verificar el binario de codex

```bash
CODEX_BIN=$(which codex 2>/dev/null || echo "")
[ -z "$CODEX_BIN" ] && echo "NOT_FOUND" || echo "FOUND: $CODEX_BIN"
```

Si `NOT_FOUND`: detenerse e informar al usuario:
"Codex CLI no encontrado. Instálalo: `npm install -g @openai/codex` o consulta https://github.com/openai/codex"

---

## Paso 1: Detectar modo

Analizar la entrada del usuario para determinar qué modo ejecutar:

1. `/codex review` o `/codex review <instrucciones>` — **Modo revisión** (Paso 2A)
2. `/codex challenge` o `/codex challenge <enfoque>` — **Modo desafío** (Paso 2B)
3. `/codex` sin argumentos — **Auto-detección:**
   - Buscar un diff (con respaldo si origin no está disponible):
     `git diff origin/<base> --stat 2>/dev/null | tail -1 || git diff <base> --stat 2>/dev/null | tail -1`
   - Si existe un diff, usar AskUserQuestion:
     ```
     Codex detectó cambios respecto a la rama base. ¿Qué debería hacer?
     A) Revisar el diff (revisión de código con gate de aprobación/rechazo)
     B) Desafiar el diff (adversarial — intentar romperlo)
     C) Otra cosa — proporcionaré un prompt
     ```
   - Si no hay diff, buscar archivos de plan del proyecto actual:
     `ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$(basename $(pwd))" 2>/dev/null | head -1`
     Si no hay coincidencia con el proyecto, recurrir a: `ls -t ~/.claude/plans/*.md 2>/dev/null | head -1`
     pero advertir al usuario: "Nota: este plan puede ser de un proyecto diferente."
   - Si existe un archivo de plan, ofrecer revisarlo
   - De lo contrario, preguntar: "¿Qué te gustaría preguntarle a Codex?"
4. `/codex <cualquier otra cosa>` — **Modo consulta** (Paso 2C), donde el texto restante es el prompt

---

## Paso 2A: Modo Revisión

Ejecutar la revisión de código de Codex contra el diff de la rama actual.

1. Crear archivos temporales para captura de salida:
```bash
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

2. Ejecutar la revisión (timeout de 5 minutos):
```bash
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

Usar `timeout: 300000` en la llamada Bash. Si el usuario proporcionó instrucciones personalizadas
(ej. `/codex review focus on security`), pasarlas como argumento del prompt:
```bash
codex review "focus on security" --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

3. Capturar la salida. Luego analizar el costo desde stderr:
```bash
grep "tokens used" "$TMPERR" 2>/dev/null || echo "tokens: unknown"
```

4. Determinar el veredicto del gate verificando la salida de la revisión en busca de hallazgos críticos.
   Si la salida contiene `[P1]` — el gate es **FALLO**.
   Si no se encuentran marcadores `[P1]` (solo `[P2]` o sin hallazgos) — el gate es **APROBADO**.

5. Presentar la salida:

```
CODEX DICE (revisión de código):
════════════════════════════════════════════════════════════
<salida completa de codex, textual — no truncar ni resumir>
════════════════════════════════════════════════════════════
GATE: PASS                    Tokens: 14,331 | Costo est.: ~$0.12
```

o

```
GATE: FAIL (N hallazgos críticos)
```

6. **Comparación entre modelos:** Si `/review` (la revisión propia de Claude) ya se ejecutó
   antes en esta conversación, comparar los dos conjuntos de hallazgos:

```
ANÁLISIS ENTRE MODELOS:
  Ambos encontraron: [hallazgos que coinciden entre Claude y Codex]
  Solo Codex encontró: [hallazgos únicos de Codex]
  Solo Claude encontró: [hallazgos únicos de la /review de Claude]
  Tasa de coincidencia: X% (N/M hallazgos únicos totales coinciden)
```

7. Persistir el resultado de la revisión:
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"codex-review","timestamp":"TIMESTAMP","status":"STATUS","gate":"GATE","findings":N,"findings_fixed":N}'
```

Sustituir: TIMESTAMP (ISO 8601), STATUS ("clean" si PASS, "issues_found" si FAIL),
GATE ("pass" o "fail"), findings (conteo de marcadores [P1] + [P2]),
findings_fixed (conteo de hallazgos que fueron abordados/corregidos antes de publicar).

8. Limpiar archivos temporales:
```bash
rm -f "$TMPERR"
```

## Plan File Review Report

After displaying the Review Readiness Dashboard in conversation output, also update the
**plan file** itself so review status is visible to anyone reading the plan.

### Detect the plan file

1. Check if there is an active plan file in this conversation (the host provides plan file
   paths in system messages — look for plan file references in the conversation context).
2. If not found, skip this section silently — not every review runs in plan mode.

### Generate the report

Read the review log output you already have from the Review Readiness Dashboard step above.
Parse each JSONL entry. Each skill logs different fields:

- **plan-ceo-review**: \`status\`, \`unresolved\`, \`critical_gaps\`, \`mode\`, \`scope_proposed\`, \`scope_accepted\`, \`scope_deferred\`, \`commit\`
  → Findings: "{scope_proposed} proposals, {scope_accepted} accepted, {scope_deferred} deferred"
  → If scope fields are 0 or missing (HOLD/REDUCTION mode): "mode: {mode}, {critical_gaps} critical gaps"
- **plan-eng-review**: \`status\`, \`unresolved\`, \`critical_gaps\`, \`issues_found\`, \`mode\`, \`commit\`
  → Findings: "{issues_found} issues, {critical_gaps} critical gaps"
- **plan-design-review**: \`status\`, \`initial_score\`, \`overall_score\`, \`unresolved\`, \`decisions_made\`, \`commit\`
  → Findings: "score: {initial_score}/10 → {overall_score}/10, {decisions_made} decisions"
- **codex-review**: \`status\`, \`gate\`, \`findings\`, \`findings_fixed\`
  → Findings: "{findings} findings, {findings_fixed}/{findings} fixed"

All fields needed for the Findings column are now present in the JSONL entries.
For the review you just completed, you may use richer details from your own Completion
Summary. For prior reviews, use the JSONL fields directly — they contain all required data.

Produce this markdown table:

\`\`\`markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \`/plan-ceo-review\` | Scope & strategy | {runs} | {status} | {findings} |
| Codex Review | \`/codex review\` | Independent 2nd opinion | {runs} | {status} | {findings} |
| Eng Review | \`/plan-eng-review\` | Architecture & tests (required) | {runs} | {status} | {findings} |
| Design Review | \`/plan-design-review\` | UI/UX gaps | {runs} | {status} | {findings} |
\`\`\`

Below the table, add these lines (omit any that are empty/not applicable):

- **CODEX:** (only if codex-review ran) — one-line summary of codex fixes
- **CROSS-MODEL:** (only if both Claude and Codex reviews exist) — overlap analysis
- **UNRESOLVED:** total unresolved decisions across all reviews
- **VERDICT:** list reviews that are CLEAR (e.g., "CEO + ENG CLEARED — ready to implement").
  If Eng Review is not CLEAR and not skipped globally, append "eng review required".

### Write to the plan file

**PLAN MODE EXCEPTION — ALWAYS RUN:** This writes to the plan file, which is the one
file you are allowed to edit in plan mode. The plan file review report is part of the
plan's living status.

- Search the plan file for a \`## GSTACK REVIEW REPORT\` section **anywhere** in the file
  (not just at the end — content may have been added after it).
- If found, **replace it** entirely using the Edit tool. Match from \`## GSTACK REVIEW REPORT\`
  through either the next \`## \` heading or end of file, whichever comes first. This ensures
  content added after the report section is preserved, not eaten. If the Edit fails
  (e.g., concurrent edit changed the content), re-read the plan file and retry once.
- If no such section exists, **append it** to the end of the plan file.
- Always place it as the very last section in the plan file. If it was found mid-file,
  move it: delete the old location and append at the end.

---

## Paso 2B: Modo Desafío (Adversarial)

Codex intenta romper tu código — encontrando casos límite, condiciones de carrera, agujeros de seguridad
y modos de fallo que una revisión normal pasaría por alto.

1. Construir el prompt adversarial. Si el usuario proporcionó un área de enfoque
(ej. `/codex challenge security`), incluirla:

Prompt por defecto (sin enfoque):
"Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems."

Con enfoque (ej. "security"):
"Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Focus specifically on SECURITY. Your job is to find every way an attacker could exploit this code. Think about injection vectors, auth bypasses, privilege escalation, data exposure, and timing attacks. Be adversarial."

2. Ejecutar codex exec con **salida JSONL** para capturar trazas de razonamiento y llamadas a herramientas (timeout de 5 minutos):
```bash
codex exec "<prompt>" -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>/dev/null | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex thinking] {text}')
                print()
            elif itype == 'agent_message' and text:
                print(text)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}')
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}')
    except: pass
"
```

Esto analiza los eventos JSONL de codex para extraer trazas de razonamiento, llamadas a herramientas y la
respuesta final. Las líneas `[codex thinking]` muestran lo que codex razonó antes de su respuesta.

3. Presentar la salida completa transmitida:

```
CODEX DICE (desafío adversarial):
════════════════════════════════════════════════════════════
<salida completa de arriba, textual>
════════════════════════════════════════════════════════════
Tokens: N | Costo est.: ~$X.XX
```

---

## Paso 2C: Modo Consulta

Pregunta a Codex lo que quieras sobre la base de código. Soporta continuidad de sesión para seguimientos.

1. **Verificar sesión existente:**
```bash
cat .context/codex-session-id 2>/dev/null || echo "NO_SESSION"
```

Si existe un archivo de sesión (no `NO_SESSION`), usar AskUserQuestion:
```
Tienes una conversación activa con Codex de antes. ¿Continuarla o empezar de nuevo?
A) Continuar la conversación (Codex recuerda el contexto previo)
B) Iniciar una nueva conversación
```

2. Crear archivos temporales:
```bash
TMPRESP=$(mktemp /tmp/codex-resp-XXXXXX.txt)
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

3. **Auto-detección de revisión de plan:** Si el prompt del usuario trata sobre revisar un plan,
o si existen archivos de plan y el usuario dijo `/codex` sin argumentos:
```bash
ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$(basename $(pwd))" 2>/dev/null | head -1
```
Si no hay coincidencia con el proyecto, recurrir a `ls -t ~/.claude/plans/*.md 2>/dev/null | head -1`
pero advertir: "Nota: este plan puede ser de un proyecto diferente — verifica antes de enviarlo a Codex."
Leer el archivo de plan y anteponer la persona al prompt del usuario:
"You are a brutally honest technical reviewer. Review this plan for: logical gaps and
unstated assumptions, missing error handling or edge cases, overcomplexity (is there a
simpler approach?), feasibility risks (what could go wrong?), and missing dependencies
or sequencing issues. Be direct. Be terse. No compliments. Just the problems.

THE PLAN:
<plan content>"

4. Ejecutar codex exec con **salida JSONL** para capturar trazas de razonamiento (timeout de 5 minutos):

Para una **sesión nueva:**
```bash
codex exec "<prompt>" -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>"$TMPERR" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'thread.started':
            tid = obj.get('thread_id','')
            if tid: print(f'SESSION_ID:{tid}')
        elif t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex thinking] {text}')
                print()
            elif itype == 'agent_message' and text:
                print(text)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}')
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}')
    except: pass
"
```

Para una **sesión reanudada** (el usuario eligió "Continuar"):
```bash
codex exec resume <session-id> "<prompt>" -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>"$TMPERR" | python3 -c "
<mismo parser de streaming en python de arriba>
"
```

5. Capturar el ID de sesión de la salida transmitida. El parser imprime `SESSION_ID:<id>`
   del evento `thread.started`. Guardarlo para seguimientos:
```bash
mkdir -p .context
```
Guardar el ID de sesión impreso por el parser (la línea que comienza con `SESSION_ID:`)
en `.context/codex-session-id`.

6. Presentar la salida completa transmitida:

```
CODEX DICE (consulta):
════════════════════════════════════════════════════════════
<salida completa, textual — incluye trazas [codex thinking]>
════════════════════════════════════════════════════════════
Tokens: N | Costo est.: ~$X.XX
Sesión guardada — ejecuta /codex de nuevo para continuar esta conversación.
```

7. Después de presentar, señalar cualquier punto donde el análisis de Codex difiera de tu propio
   entendimiento. Si hay un desacuerdo, marcarlo:
   "Nota: Claude Code discrepa en X porque Y."

---

## Modelo y Razonamiento

**Modelo:** No se fija ningún modelo en el código — codex usa el que sea su valor por defecto actual (el modelo
agéntico de codificación de frontera). Esto significa que a medida que OpenAI publique modelos más nuevos, /codex los usa
automáticamente. Si el usuario quiere un modelo específico, pasar `-m` a codex.

**Esfuerzo de razonamiento:** Todos los modos usan `xhigh` — máxima potencia de razonamiento. Cuando revisas código, intentas romper código o consultas sobre arquitectura, quieres que el modelo piense lo más intensamente posible.

**Búsqueda web:** Todos los comandos de codex usan `--enable web_search_cached` para que Codex pueda buscar
documentación y APIs durante la revisión. Es el índice cacheado de OpenAI — rápido, sin costo extra.

Si el usuario especifica un modelo (ej. `/codex review -m gpt-5.1-codex-max`
o `/codex challenge -m gpt-5.2`), pasar el flag `-m` a codex.

---

## Estimación de Costo

Analizar el conteo de tokens desde stderr. Codex imprime `tokens used\nN` a stderr.

Mostrar como: `Tokens: N`

Si el conteo de tokens no está disponible, mostrar: `Tokens: unknown`

---

## Manejo de Errores

- **Binario no encontrado:** Detectado en el Paso 0. Detenerse con instrucciones de instalación.
- **Error de autenticación:** Codex imprime un error de autenticación a stderr. Mostrar el error:
  "La autenticación de Codex falló. Ejecuta `codex login` en tu terminal para autenticarte vía ChatGPT."
- **Timeout:** Si la llamada Bash expira (5 min), informar al usuario:
  "Codex expiró después de 5 minutos. El diff puede ser demasiado grande o la API puede estar lenta. Intenta de nuevo o usa un alcance más pequeño."
- **Respuesta vacía:** Si `$TMPRESP` está vacío o no existe, informar al usuario:
  "Codex no devolvió respuesta. Verifica stderr para errores."
- **Fallo al reanudar sesión:** Si la reanudación falla, eliminar el archivo de sesión y empezar de nuevo.

---

## Reglas Importantes

- **Nunca modificar archivos.** Este skill es de solo lectura. Codex ejecuta en modo sandbox de solo lectura.
- **Presentar la salida textualmente.** No truncar, resumir ni editorializar la salida de Codex
  antes de mostrarla. Mostrarla completa dentro del bloque CODEX DICE.
- **Agregar síntesis después, no en lugar de.** Cualquier comentario de Claude viene después de la salida completa.
- **Timeout de 5 minutos** en todas las llamadas Bash a codex (`timeout: 300000`).
- **No hacer doble revisión.** Si el usuario ya ejecutó `/review`, Codex proporciona una segunda
  opinión independiente. No re-ejecutar la revisión propia de Claude Code.
