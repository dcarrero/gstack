---
name: retro
preamble-tier: 2
version: 2.0.0
description: |
  Retrospectiva semanal de ingenieria. Analiza el historial de commits, patrones de trabajo
  y metricas de calidad de codigo con historial persistente y seguimiento de tendencias.
  Orientado a equipos: desglosa las contribuciones por persona con elogios y areas de mejora.
  Usar cuando se pida "retro semanal", "que enviamos", o "retrospectiva de ingenieria".
  Sugerir proactivamente al final de una semana laboral o sprint.
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
echo '{"skill":"retro","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

## Detectar rama por defecto

Antes de recopilar datos, detecta el nombre de la rama por defecto del repositorio:
`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

Si esto falla, usa `main` como alternativa. Usa el nombre detectado donde las instrucciones
indiquen `origin/<default>` a continuacion.

---

# /retro — Retrospectiva Semanal de Ingenieria

Genera una retrospectiva de ingenieria completa analizando el historial de commits, patrones de trabajo y metricas de calidad de codigo. Orientado a equipos: identifica al usuario que ejecuta el comando, luego analiza a cada contribuidor con elogios y oportunidades de mejora por persona. Disenado para un IC senior/CTO que usa Claude Code como multiplicador de fuerza.

## Invocable por el usuario
Cuando el usuario escriba `/retro`, ejecutar esta skill.

## Argumentos
- `/retro` — por defecto: ultimos 7 dias
- `/retro 24h` — ultimas 24 horas
- `/retro 14d` — ultimos 14 dias
- `/retro 30d` — ultimos 30 dias
- `/retro compare` — comparar la ventana actual con la ventana anterior de igual duracion
- `/retro compare 14d` — comparar con ventana explicita
- `/retro global` — retro entre proyectos a traves de todas las herramientas de IA (7d por defecto)
- `/retro global 14d` — retro entre proyectos con ventana explicita

## Instrucciones

Analiza el argumento para determinar la ventana temporal. Por defecto 7 dias si no se proporciona argumento. Todos los horarios deben reportarse en la **zona horaria local** del usuario (usar la del sistema — NO establecer `TZ`).

**Ventanas alineadas a medianoche:** Para unidades de dia (`d`) y semana (`w`), calcula una fecha de inicio absoluta a medianoche local, no una cadena relativa. Por ejemplo, si hoy es 2026-03-18 y la ventana es de 7 dias: la fecha de inicio es 2026-03-11. Usa `--since="2026-03-11T00:00:00"` para consultas de git log — el sufijo explicito `T00:00:00` asegura que git comience desde medianoche. Sin el, git usa la hora actual del reloj (por ejemplo, `--since="2026-03-11"` a las 11pm significa 11pm, no medianoche). Para unidades de semana, multiplica por 7 para obtener dias (por ejemplo, `2w` = 14 dias atras). Para unidades de hora (`h`), usa `--since="N hours ago"` ya que la alineacion a medianoche no aplica a ventanas sub-diarias.

**Validacion de argumentos:** Si el argumento no coincide con un numero seguido de `d`, `h` o `w`, la palabra `compare` (opcionalmente seguida de una ventana), o la palabra `global` (opcionalmente seguida de una ventana), muestra este uso y detente:
```
Usage: /retro [window | compare | global]
  /retro              — last 7 days (default)
  /retro 24h          — last 24 hours
  /retro 14d          — last 14 days
  /retro 30d          — last 30 days
  /retro compare      — compare this period vs prior period
  /retro compare 14d  — compare with explicit window
  /retro global       — cross-project retro across all AI tools (7d default)
  /retro global 14d   — cross-project retro with explicit window
```

**Si el primer argumento es `global`:** Omitir la retro normal con alcance de repositorio (Pasos 1-14). En su lugar, seguir el flujo de **Retrospectiva Global** al final de este documento. El segundo argumento opcional es la ventana temporal (por defecto 7d). Este modo NO requiere estar dentro de un repositorio git.

### Paso 1: Recopilar Datos en Bruto

Primero, obtener los datos del origin e identificar al usuario actual:
```bash
git fetch origin <default> --quiet
# Identify who is running the retro
git config user.name
git config user.email
```

El nombre devuelto por `git config user.name` es **"tu"** — la persona que lee esta retro. Todos los demas autores son companeros de equipo. Usa esto para orientar la narrativa: "tus" commits frente a las contribuciones de companeros.

Ejecuta TODOS estos comandos de git en paralelo (son independientes):

```bash
# 1. All commits in window with timestamps, subject, hash, AUTHOR, files changed, insertions, deletions
git log origin/<default> --since="<window>" --format="%H|%aN|%ae|%ai|%s" --shortstat

# 2. Per-commit test vs total LOC breakdown with author
#    Each commit block starts with COMMIT:<hash>|<author>, followed by numstat lines.
#    Separate test files (matching test/|spec/|__tests__/) from production files.
git log origin/<default> --since="<window>" --format="COMMIT:%H|%aN" --numstat

# 3. Commit timestamps for session detection and hourly distribution (with author)
git log origin/<default> --since="<window>" --format="%at|%aN|%ai|%s" | sort -n

# 4. Files most frequently changed (hotspot analysis)
git log origin/<default> --since="<window>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn

# 5. PR numbers from commit messages (extract #NNN patterns)
git log origin/<default> --since="<window>" --format="%s" | grep -oE '#[0-9]+' | sed 's/^#//' | sort -n | uniq | sed 's/^/#/'

# 6. Per-author file hotspots (who touches what)
git log origin/<default> --since="<window>" --format="AUTHOR:%aN" --name-only

# 7. Per-author commit counts (quick summary)
git shortlog origin/<default> --since="<window>" -sn --no-merges

# 8. Greptile triage history (if available)
cat ~/.gstack/greptile-history.md 2>/dev/null || true

# 9. TODOS.md backlog (if available)
cat TODOS.md 2>/dev/null || true

# 10. Test file count
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' 2>/dev/null | grep -v node_modules | wc -l

# 11. Regression test commits in window
git log origin/<default> --since="<window>" --oneline --grep="test(qa):" --grep="test(design):" --grep="test: coverage"

# 12. gstack skill usage telemetry (if available)
cat ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true

# 12. Test files changed in window
git log origin/<default> --since="<window>" --format="" --name-only | grep -E '\.(test|spec)\.' | sort -u | wc -l
```

### Paso 2: Calcular Metricas

Calcula y presenta estas metricas en una tabla resumen:

| Metrica | Valor |
|---------|-------|
| Commits a main | N |
| Contribuidores | N |
| PRs fusionados | N |
| Inserciones totales | N |
| Eliminaciones totales | N |
| LOC netas anadidas | N |
| LOC de tests (inserciones) | N |
| Ratio de tests | N% |
| Rango de versiones | vX.Y.Z.W → vX.Y.Z.W |
| Dias activos | N |
| Sesiones detectadas | N |
| LOC promedio/hora-sesion | N |
| Senal Greptile | N% (Y capturas, Z FPs) |
| Salud de Tests | N tests totales · M anadidos este periodo · K tests de regresion |

Luego muestra un **ranking por autor** inmediatamente debajo:

```
Contributor         Commits   +/-          Top area
You (garry)              32   +2400/-300   browse/
alice                    12   +800/-150    app/services/
bob                       3   +120/-40     tests/
```

Ordena por commits en orden descendente. El usuario actual (de `git config user.name`) siempre aparece primero, etiquetado como "You (nombre)".

**Senal Greptile (si existe historial):** Lee `~/.gstack/greptile-history.md` (obtenido en el Paso 1, comando 8). Filtra entradas dentro de la ventana temporal de la retro por fecha. Cuenta entradas por tipo: `fix`, `fp`, `already-fixed`. Calcula el ratio de senal: `(fix + already-fixed) / (fix + already-fixed + fp)`. Si no existen entradas en la ventana o el archivo no existe, omite la fila de la metrica Greptile. Ignora silenciosamente las lineas que no se puedan analizar.

**Salud del Backlog (si existe TODOS.md):** Lee `TODOS.md` (obtenido en el Paso 1, comando 9). Calcula:
- Total de TODOs abiertos (excluir elementos en la seccion `## Completed`)
- Conteo P0/P1 (elementos criticos/urgentes)
- Conteo P2 (elementos importantes)
- Elementos completados en este periodo (elementos en la seccion Completed con fechas dentro de la ventana de la retro)
- Elementos anadidos en este periodo (cruzar con git log para commits que modificaron TODOS.md dentro de la ventana)

Incluir en la tabla de metricas:
```
| Backlog Health | N open (X P0/P1, Y P2) · Z completed this period |
```

Si TODOS.md no existe, omite la fila de Salud del Backlog.

**Uso de Skills (si existen analiticas):** Lee `~/.gstack/analytics/skill-usage.jsonl` si existe. Filtra entradas dentro de la ventana temporal de la retro por campo `ts`. Separa activaciones de skills (sin campo `event`) de disparos de hooks (`event: "hook_fire"`). Agrega por nombre de skill. Presenta como:

```
| Skill Usage | /ship(12) /qa(8) /review(5) · 3 safety hook fires |
```

Si el archivo JSONL no existe o no tiene entradas en la ventana, omite la fila de Uso de Skills.

**Momentos Eureka (si estan registrados):** Lee `~/.gstack/analytics/eureka.jsonl` si existe. Filtra entradas dentro de la ventana temporal de la retro por campo `ts`. Para cada momento eureka, muestra la skill que lo detecto, la rama y un resumen de una linea del hallazgo. Presenta como:

```
| Eureka Moments | 2 this period |
```

Si existen momentos, listalos:
```
  EUREKA /office-hours (branch: garrytan/auth-rethink): "Session tokens don't need server storage — browser crypto API makes client-side JWT validation viable"
  EUREKA /plan-eng-review (branch: garrytan/cache-layer): "Redis isn't needed here — Bun's built-in LRU cache handles this workload"
```

Si el archivo JSONL no existe o no tiene entradas en la ventana, omite la fila de Momentos Eureka.

### Paso 3: Distribucion Temporal de Commits

Muestra un histograma por hora en hora local usando grafico de barras:
```
Hour  Commits  ████████████████
 00:    4      ████
 07:    5      █████
 ...
```

Identifica y senala:
- Horas pico
- Zonas muertas
- Si el patron es bimodal (manana/noche) o continuo
- Grupos de programacion nocturna (despues de las 10pm)

### Paso 4: Deteccion de Sesiones de Trabajo

Detecta sesiones usando un umbral de **45 minutos de pausa** entre commits consecutivos. Para cada sesion reporta:
- Hora de inicio/fin (Pacific)
- Numero de commits
- Duracion en minutos

Clasifica las sesiones:
- **Sesiones profundas** (50+ min)
- **Sesiones medias** (20-50 min)
- **Micro sesiones** (<20 min, tipicamente un solo commit rapido)

Calcula:
- Tiempo total de codificacion activa (suma de duraciones de sesion)
- Duracion promedio de sesion
- LOC por hora de tiempo activo

### Paso 5: Desglose por Tipo de Commit

Categoriza por prefijo de commit convencional (feat/fix/refactor/test/chore/docs). Muestra como barra de porcentaje:

```
feat:     20  (40%)  ████████████████████
fix:      27  (54%)  ███████████████████████████
refactor:  2  ( 4%)  ██
```

Marca si el ratio de fix supera el 50% — esto senala un patron de "enviar rapido, arreglar rapido" que puede indicar brechas en las revisiones.

### Paso 6: Analisis de Puntos Calientes

Muestra los 10 archivos mas modificados. Marca:
- Archivos modificados 5+ veces (puntos calientes de rotacion)
- Archivos de test vs archivos de produccion en la lista de puntos calientes
- Frecuencia de VERSION/CHANGELOG (indicador de disciplina de versionado)

### Paso 7: Distribucion de Tamano de PR

A partir de los diffs de commits, estima los tamanos de PR y clasificalos:
- **Pequeno** (<100 LOC)
- **Mediano** (100-500 LOC)
- **Grande** (500-1500 LOC)
- **XL** (1500+ LOC)

### Paso 8: Puntuacion de Enfoque + Envio de la Semana

**Puntuacion de enfoque:** Calcula el porcentaje de commits que tocan el directorio de nivel superior mas modificado (por ejemplo, `app/services/`, `app/views/`). Mayor puntuacion = trabajo mas enfocado y profundo. Menor puntuacion = cambio de contexto disperso. Reporta como: "Puntuacion de enfoque: 62% (app/services/)"

**Envio de la semana:** Identifica automaticamente el PR con mayor LOC en la ventana. Destacalo:
- Numero y titulo del PR
- LOC modificadas
- Por que importa (inferir de los mensajes de commit y archivos tocados)

### Paso 9: Analisis por Miembro del Equipo

Para cada contribuidor (incluido el usuario actual), calcula:

1. **Commits y LOC** — total de commits, inserciones, eliminaciones, LOC netas
2. **Areas de enfoque** — que directorios/archivos tocaron mas (top 3)
3. **Mezcla de tipos de commit** — su desglose personal feat/fix/refactor/test
4. **Patrones de sesion** — cuando programan (sus horas pico), conteo de sesiones
5. **Disciplina de tests** — su ratio personal de LOC de tests
6. **Mayor envio** — su commit o PR de mayor impacto en la ventana

**Para el usuario actual ("Tu"):** Esta seccion recibe el tratamiento mas detallado. Incluye todo el detalle de la retro individual — analisis de sesiones, patrones temporales, puntuacion de enfoque. Enmarcalo en primera persona: "Tus horas pico...", "Tu mayor envio..."

**Para cada companero de equipo:** Escribe 2-3 oraciones cubriendo en que trabajaron y su patron. Luego:

- **Elogio** (1-2 cosas especificas): Anclar en commits reales. No "buen trabajo" — di exactamente que fue bueno. Ejemplos: "Envio la reescritura completa del middleware de autenticacion en 3 sesiones enfocadas con 45% de cobertura de tests", "Cada PR bajo 200 LOC — descomposicion disciplinada."
- **Oportunidad de crecimiento** (1 cosa especifica): Enmarca como una sugerencia para subir de nivel, no como critica. Anclar en datos reales. Ejemplos: "El ratio de tests fue 12% esta semana — agregar cobertura de tests al modulo de pagos antes de que se vuelva mas complejo seria rentable", "5 commits de fix en el mismo archivo sugieren que el PR original podria haber necesitado una revision."

**Si solo hay un contribuidor (repositorio individual):** Omite el desglose del equipo y continua como antes — la retro es personal.

**Si hay trailers Co-Authored-By:** Analiza las lineas `Co-Authored-By:` en los mensajes de commit. Acredita a esos autores por el commit junto con el autor principal. Nota los coautores de IA (por ejemplo, `noreply@anthropic.com`) pero no los incluyas como miembros del equipo — en su lugar, registra "commits asistidos por IA" como una metrica separada.

### Paso 10: Tendencias Semana a Semana (si la ventana >= 14d)

Si la ventana temporal es de 14 dias o mas, divide en bloques semanales y muestra tendencias:
- Commits por semana (total y por autor)
- LOC por semana
- Ratio de tests por semana
- Ratio de fix por semana
- Conteo de sesiones por semana

### Paso 11: Seguimiento de Racha

Cuenta los dias consecutivos con al menos 1 commit a origin/<default>, retrocediendo desde hoy. Registra tanto la racha del equipo como la racha personal:

```bash
# Team streak: all unique commit dates (local time) — no hard cutoff
git log origin/<default> --format="%ad" --date=format:"%Y-%m-%d" | sort -u

# Personal streak: only the current user's commits
git log origin/<default> --author="<user_name>" --format="%ad" --date=format:"%Y-%m-%d" | sort -u
```

Cuenta hacia atras desde hoy — cuantos dias consecutivos tienen al menos un commit? Esto consulta el historial completo para que las rachas de cualquier longitud se reporten con precision. Muestra ambas:
- "Racha de envio del equipo: 47 dias consecutivos"
- "Tu racha de envio: 32 dias consecutivos"

### Paso 12: Cargar Historial y Comparar

Antes de guardar la nueva instantanea, verifica si hay historial de retros previas:

```bash
ls -t .context/retros/*.json 2>/dev/null
```

**Si existen retros previas:** Carga la mas reciente usando la herramienta Read. Calcula deltas para las metricas clave e incluye una seccion **Tendencias vs Ultima Retro**:
```
                    Last        Now         Delta
Test ratio:         22%    →    41%         ↑19pp
Sessions:           10     →    14          ↑4
LOC/hour:           200    →    350         ↑75%
Fix ratio:          54%    →    30%         ↓24pp (improving)
Commits:            32     →    47          ↑47%
Deep sessions:      3      →    5           ↑2
```

**Si no existen retros previas:** Omite la seccion de comparacion y anade: "Primera retro registrada — ejecuta de nuevo la proxima semana para ver tendencias."

### Paso 13: Guardar Historial de Retro

Despues de calcular todas las metricas (incluyendo racha) y cargar cualquier historial previo para comparacion, guarda una instantanea JSON:

```bash
mkdir -p .context/retros
```

Determina el siguiente numero de secuencia para hoy (sustituye la fecha real por `$(date +%Y-%m-%d)`):
```bash
# Count existing retros for today to get next sequence number
today=$(date +%Y-%m-%d)
existing=$(ls .context/retros/${today}-*.json 2>/dev/null | wc -l | tr -d ' ')
next=$((existing + 1))
# Save as .context/retros/${today}-${next}.json
```

Usa la herramienta Write para guardar el archivo JSON con este esquema:
```json
{
  "date": "2026-03-08",
  "window": "7d",
  "metrics": {
    "commits": 47,
    "contributors": 3,
    "prs_merged": 12,
    "insertions": 3200,
    "deletions": 800,
    "net_loc": 2400,
    "test_loc": 1300,
    "test_ratio": 0.41,
    "active_days": 6,
    "sessions": 14,
    "deep_sessions": 5,
    "avg_session_minutes": 42,
    "loc_per_session_hour": 350,
    "feat_pct": 0.40,
    "fix_pct": 0.30,
    "peak_hour": 22,
    "ai_assisted_commits": 32
  },
  "authors": {
    "Garry Tan": { "commits": 32, "insertions": 2400, "deletions": 300, "test_ratio": 0.41, "top_area": "browse/" },
    "Alice": { "commits": 12, "insertions": 800, "deletions": 150, "test_ratio": 0.35, "top_area": "app/services/" }
  },
  "version_range": ["1.16.0.0", "1.16.1.0"],
  "streak_days": 47,
  "tweetable": "Week of Mar 1: 47 commits (3 contributors), 3.2k LOC, 38% tests, 12 PRs, peak: 10pm",
  "greptile": {
    "fixes": 3,
    "fps": 1,
    "already_fixed": 2,
    "signal_pct": 83
  }
}
```

**Nota:** Solo incluye el campo `greptile` si `~/.gstack/greptile-history.md` existe y tiene entradas dentro de la ventana temporal. Solo incluye el campo `backlog` si `TODOS.md` existe. Solo incluye el campo `test_health` si se encontraron archivos de test (el comando 10 devuelve > 0). Si alguno no tiene datos, omite el campo completamente.

Incluye datos de salud de tests en el JSON cuando existan archivos de test:
```json
  "test_health": {
    "total_test_files": 47,
    "tests_added_this_period": 5,
    "regression_test_commits": 3,
    "test_files_changed": 8
  }
```

Incluye datos de backlog en el JSON cuando exista TODOS.md:
```json
  "backlog": {
    "total_open": 28,
    "p0_p1": 2,
    "p2": 8,
    "completed_this_period": 3,
    "added_this_period": 1
  }
```

### Paso 14: Escribir la Narrativa

Estructura la salida como:

---

**Resumen tweeteable** (primera linea, antes de todo lo demas):
```
Week of Mar 1: 47 commits (3 contributors), 3.2k LOC, 38% tests, 12 PRs, peak: 10pm | Streak: 47d
```

## Retro de Ingenieria: [rango de fechas]

### Tabla Resumen
(del Paso 2)

### Tendencias vs Ultima Retro
(del Paso 11, cargado antes de guardar — omitir si es la primera retro)

### Patrones de Tiempo y Sesiones
(de los Pasos 3-4)

Narrativa interpretando lo que significan los patrones a nivel de equipo:
- Cuales son las horas mas productivas y que las impulsa
- Si las sesiones se estan volviendo mas largas o mas cortas con el tiempo
- Horas estimadas por dia de codificacion activa (agregado del equipo)
- Patrones notables: los miembros del equipo programan al mismo tiempo o en turnos?

### Velocidad de Envio
(de los Pasos 5-7)

Narrativa que cubra:
- Mezcla de tipos de commit y lo que revela
- Distribucion de tamano de PR y lo que revela sobre la cadencia de envio
- Deteccion de cadenas de fix (secuencias de commits de fix en el mismo subsistema)
- Disciplina de versionado

### Senales de Calidad de Codigo
- Tendencia del ratio de LOC de tests
- Analisis de puntos calientes (los mismos archivos estan rotando?)
- Ratio de senal Greptile y tendencia (si existe historial): "Greptile: X% senal (Y capturas validas, Z falsos positivos)"

### Salud de Tests
- Archivos de test totales: N (del comando 10)
- Tests anadidos en este periodo: M (del comando 12 — archivos de test modificados)
- Commits de tests de regresion: listar commits `test(qa):` y `test(design):` y `test: coverage` del comando 11
- Si existe retro previa y tiene `test_health`: mostrar delta "Conteo de tests: {anterior} → {ahora} (+{delta})"
- Si el ratio de tests < 20%: marcar como area de crecimiento — "El 100% de cobertura de tests es el objetivo. Los tests hacen seguro el vibe coding."

### Completitud de Plan
Verifica los logs de revision JSONL para datos de completitud de plan de ejecuciones de /ship en este periodo:

```bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)"
cat ~/.gstack/projects/$SLUG/*-reviews.jsonl 2>/dev/null | grep '"skill":"ship"' | grep '"plan_items_total"' || echo "NO_PLAN_DATA"
```

Si existen datos de completitud de plan dentro de la ventana temporal de la retro:
- Contar ramas enviadas con planes (entradas que tienen `plan_items_total` > 0)
- Calcular promedio de completitud: suma de `plan_items_done` / suma de `plan_items_total`
- Identificar la categoria de elementos mas omitida si los datos lo permiten

Salida:
```
Plan Completion This Period:
  {N} branches shipped with plans
  Average completion: {X}% ({done}/{total} items)
```

Si no existen datos de plan, omite esta seccion silenciosamente.

### Enfoque y Destacados
(del Paso 8)
- Puntuacion de enfoque con interpretacion
- Destaque del envio de la semana

### Tu Semana (analisis profundo personal)
(del Paso 9, solo para el usuario actual)

Esta es la seccion que mas le importa al usuario. Incluye:
- Su conteo personal de commits, LOC, ratio de tests
- Sus patrones de sesion y horas pico
- Sus areas de enfoque
- Su mayor envio
- **Lo que hiciste bien** (2-3 cosas especificas ancladas en commits)
- **Donde subir de nivel** (1-2 sugerencias especificas y accionables)

### Desglose del Equipo
(del Paso 9, para cada companero de equipo — omitir si es repositorio individual)

Para cada companero de equipo (ordenado por commits en orden descendente), escribe una seccion:

#### [Nombre]
- **Lo que envio**: 2-3 oraciones sobre sus contribuciones, areas de enfoque y patrones de commit
- **Elogio**: 1-2 cosas especificas que hizo bien, ancladas en commits reales. Se genuino — que dirias realmente en un 1:1? Ejemplos:
  - "Limpio todo el modulo de autenticacion en 3 PRs pequenos y revisables — descomposicion de manual"
  - "Agrego tests de integracion para cada nuevo endpoint, no solo los casos felices"
  - "Arreglo la consulta N+1 que estaba causando 2s de tiempo de carga en el dashboard"
- **Oportunidad de crecimiento**: 1 sugerencia especifica y constructiva. Enmarca como inversion, no como critica. Ejemplos:
  - "La cobertura de tests en el modulo de pagos esta al 8% — vale la pena invertir antes de que la siguiente funcionalidad se construya encima"
  - "La mayoria de los commits llegan en una sola rafaga — espaciar el trabajo durante el dia podria reducir la fatiga por cambio de contexto"
  - "Todos los commits llegan entre 1-4am — un ritmo sostenible importa para la calidad del codigo a largo plazo"

**Nota de colaboracion con IA:** Si muchos commits tienen trailers `Co-Authored-By` de IA (por ejemplo, Claude, Copilot), nota el porcentaje de commits asistidos por IA como una metrica del equipo. Enmarcalo de forma neutral — "N% de los commits fueron asistidos por IA" — sin juicio.

### Top 3 Logros del Equipo
Identifica las 3 cosas de mayor impacto enviadas en la ventana a traves de todo el equipo. Para cada una:
- Que fue
- Quien lo envio
- Por que importa (impacto en producto/arquitectura)

### 3 Cosas para Mejorar
Especificas, accionables, ancladas en commits reales. Mezcla sugerencias personales y a nivel de equipo. Formula como "para mejorar aun mas, el equipo podria..."

### 3 Habitos para la Proxima Semana
Pequenos, practicos, realistas. Cada uno debe ser algo que tome <5 minutos en adoptar. Al menos uno debe estar orientado al equipo (por ejemplo, "revisar los PRs de los demas el mismo dia").

### Tendencias Semana a Semana
(si aplica, del Paso 10)

---

## Modo Retrospectiva Global

Cuando el usuario ejecuta `/retro global` (o `/retro global 14d`), sigue este flujo en lugar de los Pasos 1-14 con alcance de repositorio. Este modo funciona desde cualquier directorio — NO requiere estar dentro de un repositorio git.

### Paso Global 1: Calcular ventana temporal

Misma logica de alineacion a medianoche que la retro regular. Por defecto 7d. El segundo argumento despues de `global` es la ventana (por ejemplo, `14d`, `30d`, `24h`).

### Paso Global 2: Ejecutar descubrimiento

Localiza y ejecuta el script de descubrimiento usando esta cadena de respaldo:

```bash
DISCOVER_BIN=""
[ -x ~/.claude/skills/gstack/bin/gstack-global-discover ] && DISCOVER_BIN=~/.claude/skills/gstack/bin/gstack-global-discover
[ -z "$DISCOVER_BIN" ] && [ -x .claude/skills/gstack/bin/gstack-global-discover ] && DISCOVER_BIN=.claude/skills/gstack/bin/gstack-global-discover
[ -z "$DISCOVER_BIN" ] && which gstack-global-discover >/dev/null 2>&1 && DISCOVER_BIN=$(which gstack-global-discover)
[ -z "$DISCOVER_BIN" ] && [ -f bin/gstack-global-discover.ts ] && DISCOVER_BIN="bun run bin/gstack-global-discover.ts"
echo "DISCOVER_BIN: $DISCOVER_BIN"
```

Si no se encuentra el binario, indica al usuario: "Script de descubrimiento no encontrado. Ejecuta `bun run build` en el directorio de gstack para compilarlo." y detente.

Ejecuta el descubrimiento:
```bash
$DISCOVER_BIN --since "<window>" --format json 2>/tmp/gstack-discover-stderr
```

Lee la salida stderr de `/tmp/gstack-discover-stderr` para informacion de diagnostico. Analiza la salida JSON de stdout.

Si `total_sessions` es 0, di: "No se encontraron sesiones de codificacion con IA en los ultimos <window>. Prueba una ventana mas larga: `/retro global 30d`" y detente.

### Paso Global 3: Ejecutar git log en cada repositorio descubierto

Para cada repositorio en el array `repos` del JSON de descubrimiento, encuentra la primera ruta valida en `paths[]` (directorio que existe con `.git/`). Si no existe una ruta valida, omite el repositorio y anotalo.

**Para repositorios solo locales** (donde `remote` comienza con `local:`): omite `git fetch` y usa la rama por defecto local. Usa `git log HEAD` en lugar de `git log origin/$DEFAULT`.

**Para repositorios con remotos:**

```bash
git -C <path> fetch origin --quiet 2>/dev/null
```

Detecta la rama por defecto para cada repositorio: primero intenta `git symbolic-ref refs/remotes/origin/HEAD`, luego verifica nombres de rama comunes (`main`, `master`), luego recurre a `git rev-parse --abbrev-ref HEAD`. Usa la rama detectada como `<default>` en los comandos siguientes.

```bash
# Commits with stats
git -C <path> log origin/$DEFAULT --since="<start_date>T00:00:00" --format="%H|%aN|%ai|%s" --shortstat

# Commit timestamps for session detection, streak, and context switching
git -C <path> log origin/$DEFAULT --since="<start_date>T00:00:00" --format="%at|%aN|%ai|%s" | sort -n

# Per-author commit counts
git -C <path> shortlog origin/$DEFAULT --since="<start_date>T00:00:00" -sn --no-merges

# PR numbers from commit messages
git -C <path> log origin/$DEFAULT --since="<start_date>T00:00:00" --format="%s" | grep -oE '#[0-9]+' | sort -n | uniq
```

Para repositorios que fallen (rutas eliminadas, errores de red): omite y nota "N repositorios no pudieron ser alcanzados."

### Paso Global 4: Calcular racha de envio global

Para cada repositorio, obtener fechas de commits (limitado a 365 dias):

```bash
git -C <path> log origin/$DEFAULT --since="365 days ago" --format="%ad" --date=format:"%Y-%m-%d" | sort -u
```

Unifica todas las fechas de todos los repositorios. Cuenta hacia atras desde hoy — cuantos dias consecutivos tienen al menos un commit en CUALQUIER repositorio? Si la racha llega a 365 dias, muestra como "365+ dias".

### Paso Global 5: Calcular metrica de cambio de contexto

A partir de las marcas temporales de commits recopiladas en el Paso 3, agrupa por fecha. Para cada fecha, cuenta cuantos repositorios distintos tuvieron commits ese dia. Reporta:
- Promedio de repositorios/dia
- Maximo de repositorios/dia
- Que dias fueron enfocados (1 repositorio) vs. fragmentados (3+ repositorios)

### Paso Global 6: Patrones de productividad por herramienta

A partir del JSON de descubrimiento, analiza los patrones de uso de herramientas:
- Que herramienta de IA se usa para que repositorios (exclusiva vs. compartida)
- Conteo de sesiones por herramienta
- Patrones de comportamiento (por ejemplo, "Codex usado exclusivamente para myapp, Claude Code para todo lo demas")

### Paso Global 7: Agregar y generar narrativa

Estructura la salida con la **tarjeta personal compartible primero**, luego el desglose
completo del equipo/proyecto debajo. La tarjeta personal esta disenada para ser facil de capturar en pantalla
— todo lo que alguien querria compartir en X/Twitter en un bloque limpio.

---

**Resumen tweeteable** (primera linea, antes de todo lo demas):
```
Week of Mar 14: 5 projects, 138 commits, 250k LOC across 5 repos | 48 AI sessions | Streak: 52d 🔥
```

## 🚀 Tu Semana: [nombre de usuario] — [rango de fechas]

Esta seccion es la **tarjeta personal compartible**. Contiene SOLO las estadisticas del
usuario actual — sin datos de equipo, sin desgloses de proyecto. Disenada para captura de pantalla y publicacion.

Usa la identidad del usuario de `git config user.name` para filtrar todos los datos de git por repositorio.
Agrega a traves de todos los repositorios para calcular totales personales.

Renderiza como un bloque unico visualmente limpio. Solo borde izquierdo — sin borde derecho (los LLMs
no pueden alinear bordes derechos de forma confiable). Rellena los nombres de repositorio hasta el nombre mas largo para que las columnas
se alineen limpiamente. Nunca truncar nombres de proyecto.

```
╔═══════════════════════════════════════════════════════════════
║  [USER NAME] — Week of [date]
╠═══════════════════════════════════════════════════════════════
║
║  [N] commits across [M] projects
║  +[X]k LOC added · [Y]k LOC deleted · [Z]k net
║  [N] AI coding sessions (CC: X, Codex: Y, Gemini: Z)
║  [N]-day shipping streak 🔥
║
║  PROJECTS
║  ─────────────────────────────────────────────────────────
║  [repo_name_full]        [N] commits    +[X]k LOC    [solo/team]
║  [repo_name_full]        [N] commits    +[X]k LOC    [solo/team]
║  [repo_name_full]        [N] commits    +[X]k LOC    [solo/team]
║
║  SHIP OF THE WEEK
║  [PR title] — [LOC] lines across [N] files
║
║  TOP WORK
║  • [1-line description of biggest theme]
║  • [1-line description of second theme]
║  • [1-line description of third theme]
║
║  Powered by gstack · github.com/garrytan/gstack
╚═══════════════════════════════════════════════════════════════
```

**Reglas para la tarjeta personal:**
- Solo mostrar repositorios donde el usuario tiene commits. Omitir repositorios con 0 commits.
- Ordenar repositorios por conteo de commits del usuario en orden descendente.
- **Nunca truncar nombres de repositorio.** Usar el nombre completo del repositorio (por ejemplo, `analyze_transcripts`
  no `analyze_trans`). Rellenar la columna del nombre hasta el nombre de repositorio mas largo para que todas las columnas
  se alineen. Si los nombres son largos, ampliar la caja — el ancho de la caja se adapta al contenido.
- Para LOC, usar formato "k" para miles (por ejemplo, "+64.0k" no "+64010").
- Rol: "solo" si el usuario es el unico contribuidor, "team" si otros contribuyeron.
- Envio de la Semana: el PR con mayor LOC del usuario a traves de TODOS los repositorios.
- Trabajo Principal: 3 vietas resumiendo los temas principales del usuario, inferidos de
  los mensajes de commit. No commits individuales — sintetizar en temas.
  Por ejemplo, "Construyo /retro global — retrospectiva entre proyectos con descubrimiento de sesiones de IA"
  no "feat: gstack-global-discover" + "feat: /retro global template".
- La tarjeta debe ser autocontenida. Alguien viendo SOLO este bloque deberia entender
  la semana del usuario sin ningun contexto circundante.
- NO incluir miembros del equipo, totales de proyecto, ni datos de cambio de contexto aqui.

**Racha personal:** Usa los commits propios del usuario a traves de todos los repositorios (filtrados por
`--author`) para calcular una racha personal, separada de la racha del equipo.

---

## Retro Global de Ingenieria: [rango de fechas]

Todo lo que sigue es el analisis completo — datos del equipo, desgloses por proyecto, patrones.
Este es el "analisis profundo" que sigue a la tarjeta compartible.

### Vista General de Todos los Proyectos
| Metrica | Valor |
|---------|-------|
| Proyectos activos | N |
| Commits totales (todos los repositorios, todos los contribuidores) | N |
| LOC totales | +N / -N |
| Sesiones de codificacion con IA | N (CC: X, Codex: Y, Gemini: Z) |
| Dias activos | N |
| Racha de envio global (cualquier contribuidor, cualquier repositorio) | N dias consecutivos |
| Cambios de contexto/dia | N promedio (max: M) |

### Desglose por Proyecto
Para cada repositorio (ordenado por commits en orden descendente):
- Nombre del repositorio (con % del total de commits)
- Commits, LOC, PRs fusionados, contribuidor principal
- Trabajo clave (inferido de los mensajes de commit)
- Sesiones de IA por herramienta

**Tus Contribuciones** (sub-seccion dentro de cada proyecto):
Para cada proyecto, agrega un bloque "Tus contribuciones" mostrando las estadisticas personales
del usuario actual dentro de ese repositorio. Usa la identidad del usuario de `git config user.name`
para filtrar. Incluye:
- Tus commits / commits totales (con %)
- Tus LOC (+inserciones / -eliminaciones)
- Tu trabajo clave (inferido SOLO de TUS mensajes de commit)
- Tu mezcla de tipos de commit (desglose feat/fix/refactor/chore/docs)
- Tu mayor envio en este repositorio (commit o PR con mayor LOC)

Si el usuario es el unico contribuidor, di "Proyecto individual — todos los commits son tuyos."
Si el usuario tiene 0 commits en un repositorio (proyecto de equipo que no toco en este periodo),
di "Sin commits en este periodo — solo [N] sesiones de IA." y omite el desglose.

Formato:
```
**Your contributions:** 47/244 commits (19%), +4.2k/-0.3k LOC
  Key work: Writer Chat, email blocking, security hardening
  Biggest ship: PR #605 — Writer Chat eats the admin bar (2,457 ins, 46 files)
  Mix: feat(3) fix(2) chore(1)
```

### Patrones entre Proyectos
- Asignacion de tiempo entre proyectos (desglose %, usa TUS commits no el total)
- Horas de maxima productividad agregadas de todos los repositorios
- Dias enfocados vs. fragmentados
- Tendencias de cambio de contexto

### Analisis de Uso de Herramientas
Desglose por herramienta con patrones de comportamiento:
- Claude Code: N sesiones en M repositorios — patrones observados
- Codex: N sesiones en M repositorios — patrones observados
- Gemini: N sesiones en M repositorios — patrones observados

### Envio de la Semana (Global)
PR de mayor impacto a traves de TODOS los proyectos. Identificar por LOC y mensajes de commit.

### 3 Ideas entre Proyectos
Lo que la vista global revela que ninguna retro de un solo repositorio podria mostrar.

### 3 Habitos para la Proxima Semana
Considerando el panorama completo entre proyectos.

---

### Paso Global 8: Cargar historial y comparar

```bash
ls -t ~/.gstack/retros/global-*.json 2>/dev/null | head -5
```

**Solo comparar contra una retro previa con el mismo valor de `window`** (por ejemplo, 7d vs 7d). Si la retro previa mas reciente tiene una ventana diferente, omite la comparacion y nota: "La retro global previa uso una ventana diferente — omitiendo comparacion."

Si existe una retro previa coincidente, cargala con la herramienta Read. Muestra una tabla de **Tendencias vs Ultima Retro Global** con deltas para metricas clave: commits totales, LOC, sesiones, racha, cambios de contexto/dia.

Si no existen retros globales previas, anade: "Primera retro global registrada — ejecuta de nuevo la proxima semana para ver tendencias."

### Paso Global 9: Guardar instantanea

```bash
mkdir -p ~/.gstack/retros
```

Determina el siguiente numero de secuencia para hoy:
```bash
today=$(date +%Y-%m-%d)
existing=$(ls ~/.gstack/retros/global-${today}-*.json 2>/dev/null | wc -l | tr -d ' ')
next=$((existing + 1))
```

Usa la herramienta Write para guardar el JSON en `~/.gstack/retros/global-${today}-${next}.json`:

```json
{
  "type": "global",
  "date": "2026-03-21",
  "window": "7d",
  "projects": [
    {
      "name": "gstack",
      "remote": "https://github.com/garrytan/gstack",
      "commits": 47,
      "insertions": 3200,
      "deletions": 800,
      "sessions": { "claude_code": 15, "codex": 3, "gemini": 0 }
    }
  ],
  "totals": {
    "commits": 182,
    "insertions": 15300,
    "deletions": 4200,
    "projects": 5,
    "active_days": 6,
    "sessions": { "claude_code": 48, "codex": 8, "gemini": 3 },
    "global_streak_days": 52,
    "avg_context_switches_per_day": 2.1
  },
  "tweetable": "Week of Mar 14: 5 projects, 182 commits, 15.3k LOC | CC: 48, Codex: 8, Gemini: 3 | Focus: gstack (58%) | Streak: 52d"
}
```

---

## Modo Comparacion

Cuando el usuario ejecuta `/retro compare` (o `/retro compare 14d`):

1. Calcula las metricas para la ventana actual (por defecto 7d) usando la fecha de inicio alineada a medianoche (misma logica que la retro principal — por ejemplo, si hoy es 2026-03-18 y la ventana es 7d, usa `--since="2026-03-11T00:00:00"`)
2. Calcula las metricas para la ventana inmediatamente anterior de la misma duracion usando tanto `--since` como `--until` con fechas alineadas a medianoche para evitar solapamiento (por ejemplo, para una ventana de 7d comenzando 2026-03-11: la ventana anterior es `--since="2026-03-04T00:00:00" --until="2026-03-11T00:00:00"`)
3. Muestra una tabla de comparacion lado a lado con deltas y flechas
4. Escribe una breve narrativa destacando las mayores mejoras y regresiones
5. Guarda solo la instantanea de la ventana actual en `.context/retros/` (igual que una ejecucion normal de retro); **no** persistas las metricas de la ventana anterior.

## Tono

- Alentador pero franco, sin condescendencia
- Especifico y concreto — siempre anclado en commits/codigo reales
- Omitir elogios genericos ("buen trabajo!") — di exactamente que fue bueno y por que
- Enmarcar las mejoras como subir de nivel, no como critica
- **Los elogios deben sentirse como algo que realmente dirias en un 1:1** — especificos, ganados, genuinos
- **Las sugerencias de crecimiento deben sentirse como consejos de inversion** — "esto vale tu tiempo porque..." no "fallaste en..."
- Nunca comparar companeros de equipo entre si de forma negativa. La seccion de cada persona se sostiene por si sola.
- Mantener la salida total en torno a 3000-4500 palabras (ligeramente mas larga para acomodar secciones de equipo)
- Usar tablas markdown y bloques de codigo para datos, prosa para la narrativa
- Enviar la salida directamente a la conversacion — NO escribir al sistema de archivos (excepto la instantanea JSON en `.context/retros/`)

## Reglas Importantes

- TODA la salida narrativa va directamente al usuario en la conversacion. El UNICO archivo escrito es la instantanea JSON en `.context/retros/`.
- Usar `origin/<default>` para todas las consultas de git (no main local que puede estar desactualizado)
- Mostrar todas las marcas temporales en la zona horaria local del usuario (no sobreescribir `TZ`)
- Si la ventana tiene cero commits, indicarlo y sugerir una ventana diferente
- Redondear LOC/hora al 50 mas cercano
- Tratar los merge commits como limites de PR
- No leer CLAUDE.md u otros documentos — esta skill es autocontenida
- En la primera ejecucion (sin retros previas), omitir secciones de comparacion de forma elegante
- **Modo global:** NO requiere estar dentro de un repositorio git. Guarda instantaneas en `~/.gstack/retros/` (no en `.context/retros/`). Omitir de forma elegante las herramientas de IA que no esten instaladas. Solo comparar contra retros globales previas con el mismo valor de ventana. Si la racha llega al limite de 365d, mostrar como "365+ dias".
