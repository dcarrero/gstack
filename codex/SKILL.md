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
echo '{"skill":"codex","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"codex-review","timestamp":"TIMESTAMP","status":"STATUS","gate":"GATE","findings":N,"findings_fixed":N,"commit":"'"$(git rev-parse --short HEAD)"'"}'
```

Sustituir: TIMESTAMP (ISO 8601), STATUS ("clean" si PASS, "issues_found" si FAIL),
GATE ("pass" o "fail"), findings (conteo de marcadores [P1] + [P2]),
findings_fixed (conteo de hallazgos que fueron abordados/corregidos antes de publicar).

8. Limpiar archivos temporales:
```bash
rm -f "$TMPERR"
```

## Informe de Revisión del Archivo de Plan

Después de mostrar el Panel de Estado de Revisiones en la salida de la conversación, también actualiza
el **archivo de plan** para que el estado de la revisión sea visible para cualquiera que lea el plan.

### Detectar el archivo de plan

1. Comprueba si hay un archivo de plan activo en esta conversación (el host proporciona rutas
   de archivos de plan en mensajes del sistema — busca referencias a archivos de plan en el contexto de la conversación).
2. Si no se encuentra, omite esta sección silenciosamente — no todas las revisiones se ejecutan en modo plan.

### Generar el informe

Lee la salida del registro de revisión que ya tienes del paso del Panel de Estado de Revisiones anterior.
Analiza cada entrada JSONL. Cada skill registra campos diferentes:

- **plan-ceo-review**: \`status\`, \`unresolved\`, \`critical_gaps\`, \`mode\`, \`scope_proposed\`, \`scope_accepted\`, \`scope_deferred\`, \`commit\`
  → Hallazgos: "{scope_proposed} propuestas, {scope_accepted} aceptadas, {scope_deferred} diferidas"
  → Si los campos de scope son 0 o no existen (modo HOLD/REDUCTION): "modo: {mode}, {critical_gaps} brechas críticas"
- **plan-eng-review**: \`status\`, \`unresolved\`, \`critical_gaps\`, \`issues_found\`, \`mode\`, \`commit\`
  → Hallazgos: "{issues_found} incidencias, {critical_gaps} brechas críticas"
- **plan-design-review**: \`status\`, \`initial_score\`, \`overall_score\`, \`unresolved\`, \`decisions_made\`, \`commit\`
  → Hallazgos: "puntuación: {initial_score}/10 → {overall_score}/10, {decisions_made} decisiones"
- **codex-review**: \`status\`, \`gate\`, \`findings\`, \`findings_fixed\`
  → Hallazgos: "{findings} hallazgos, {findings_fixed}/{findings} corregidos"

Todos los campos necesarios para la columna de Hallazgos están ahora presentes en las entradas JSONL.
Para la revisión que acabas de completar, puedes usar detalles más ricos de tu propio Resumen
de Finalización. Para revisiones anteriores, usa los campos JSONL directamente — contienen todos los datos necesarios.

Genera esta tabla markdown:

\`\`\`markdown
## INFORME DE REVISIÓN GSTACK

| Revisión | Disparador | Por qué | Ejecuciones | Estado | Hallazgos |
|----------|------------|---------|-------------|--------|-----------|
| Rev. CEO | \`/plan-ceo-review\` | Alcance y estrategia | {runs} | {status} | {findings} |
| Rev. Codex | \`/codex review\` | 2.ª opinión independiente | {runs} | {status} | {findings} |
| Rev. Ingeniería | \`/plan-eng-review\` | Arquitectura y tests (requerida) | {runs} | {status} | {findings} |
| Rev. Diseño | \`/plan-design-review\` | Brechas de UI/UX | {runs} | {status} | {findings} |
\`\`\`

Debajo de la tabla, agrega estas líneas (omite las que estén vacías o no apliquen):

- **CODEX:** (solo si se ejecutó codex-review) — resumen en una línea de las correcciones de Codex
- **CROSS-MODEL:** (solo si existen revisiones tanto de Claude como de Codex) — análisis de solapamiento
- **SIN RESOLVER:** total de decisiones sin resolver en todas las revisiones
- **VEREDICTO:** lista las revisiones que están APROBADAS (ej.: "CEO + ING APROBADAS — listo para implementar").
  Si la Revisión de Ingeniería no está APROBADA y no está omitida globalmente, agrega "revisión de ingeniería requerida".

### Escribir en el archivo de plan

**EXCEPCIÓN DE MODO PLAN — EJECUTAR SIEMPRE:** Esto escribe en el archivo de plan, que es el único
archivo que se permite editar en modo plan. El informe de revisión del archivo de plan es parte del
estado vivo del plan.

- Busca en el archivo de plan una sección \`## INFORME DE REVISIÓN GSTACK\` **en cualquier parte** del archivo
  (no solo al final — puede haberse agregado contenido después).
- Si se encuentra, **reemplázala** completamente usando la herramienta Edit. Busca desde \`## INFORME DE REVISIÓN GSTACK\`
  hasta el siguiente encabezado \`## \` o el final del archivo, lo que ocurra primero. Esto asegura que
  el contenido agregado después de la sección del informe se preserve, no se consuma. Si el Edit falla
  (ej.: una edición concurrente cambió el contenido), vuelve a leer el archivo de plan e intenta una vez más.
- Si no existe tal sección, **agrégala** al final del archivo de plan.
- Siempre colócala como la última sección del archivo de plan. Si se encontró a mitad del archivo,
  muévela: elimina la ubicación antigua y agrégala al final.

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
