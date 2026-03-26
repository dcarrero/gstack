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
echo '{"skill":"ship","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

## Panel de Estado de Revisiones

Después de completar la revisión, lee el registro de revisión y la configuración para mostrar el panel.

```bash
~/.claude/skills/gstack/bin/gstack-review-read
```

Analiza la salida. Encuentra la entrada más reciente de cada skill (plan-ceo-review, plan-eng-review, review, plan-design-review, design-review-lite, adversarial-review, codex-review, codex-plan-review). Ignora las entradas con timestamps de más de 7 días de antigüedad. Para la fila de Revisión de Ingeniería, muestra la más reciente entre `review` (revisión pre-landing del diff) y `plan-eng-review` (revisión de arquitectura en fase de planificación). Agrega "(DIFF)" o "(PLAN)" al estado para distinguir. Para la fila de Adversarial, muestra la más reciente entre `adversarial-review` (nuevo auto-escalado) y `codex-review` (legacy). Para Revisión de Diseño, muestra la más reciente entre `plan-design-review` (auditoría visual completa) y `design-review-lite` (verificación a nivel de código). Agrega "(FULL)" o "(LITE)" al estado para distinguir. Para la fila de Voz Externa, muestra la entrada más reciente de `codex-plan-review` — esta captura las voces externas tanto de /plan-ceo-review como de /plan-eng-review.

**Atribución de origen:** Si la entrada más reciente de un skill tiene un campo \`"via"\`, agrégalo a la etiqueta de estado entre paréntesis. Ejemplos: `plan-eng-review` con `via:"autoplan"` se muestra como "LIMPIA (PLAN vía /autoplan)". `review` con `via:"ship"` se muestra como "LIMPIA (DIFF vía /ship)". Las entradas sin campo `via` se muestran como "LIMPIA (PLAN)" o "LIMPIA (DIFF)" como antes.

Nota: las entradas `autoplan-voices` y `design-outside-voices` son solo de auditoría (datos forenses para análisis de consenso cross-model). No aparecen en el panel y ningún consumidor las verifica.

Muestra:

```
+====================================================================+
|                    PANEL DE ESTADO DE REVISIONES                     |
+====================================================================+
| Revisión        | Ejecuciones | Última Ejecución    | Estado    | Requerida |
|-----------------|-------------|---------------------|-----------|-----------|
| Rev. Ingeniería |  1          | 2026-03-16 15:00    | LIMPIA    | SÍ        |
| Rev. CEO        |  0          | —                   | —         | no        |
| Rev. Diseño     |  0          | —                   | —         | no        |
| Adversarial     |  0          | —                   | —         | no        |
| Voz Externa     |  0          | —                   | —         | no        |
+--------------------------------------------------------------------+
| VEREDICTO: APROBADO — Revisión de Ingeniería superada               |
+====================================================================+
```

**Niveles de revisión:**
- **Revisión de Ingeniería (requerida por defecto):** La única revisión que bloquea el envío. Cubre arquitectura, calidad de código, tests, rendimiento. Se puede desactivar globalmente con \`gstack-config set skip_eng_review true\` (la opción "no me molestes").
- **Revisión CEO (opcional):** Usa tu criterio. Recomiéndala para cambios importantes de producto/negocio, nuevas funcionalidades visibles al usuario, o decisiones de alcance. Omítela para correcciones de bugs, refactorizaciones, infraestructura y limpieza.
- **Revisión de Diseño (opcional):** Usa tu criterio. Recomiéndala para cambios de UI/UX. Omítela para cambios solo de backend, infraestructura o solo de prompts.
- **Revisión Adversarial (automática):** Se escala automáticamente según el tamaño del diff. Diffs pequeños (<50 líneas) omiten la revisión adversarial. Diffs medianos (50–199) obtienen revisión adversarial cross-model. Diffs grandes (200+) obtienen los 4 pases: Claude estructurado, Codex estructurado, subagente adversarial de Claude, Codex adversarial. No requiere configuración.
- **Voz Externa (opcional):** Revisión independiente del plan desde un modelo de IA diferente. Se ofrece después de completar todas las secciones de revisión en /plan-ceo-review y /plan-eng-review. Recurre al subagente de Claude si Codex no está disponible. Nunca bloquea el envío.

**Lógica del veredicto:**
- **APROBADO**: La Revisión de Ingeniería tiene >= 1 entrada dentro de 7 días de \`review\` o \`plan-eng-review\` con estado "clean" (o \`skip_eng_review\` es \`true\`)
- **NO APROBADO**: Revisión de Ingeniería faltante, obsoleta (>7 días) o con incidencias abiertas
- Las revisiones de CEO, Diseño y Codex se muestran como contexto pero nunca bloquean el envío
- Si la configuración \`skip_eng_review\` es \`true\`, la Revisión de Ingeniería muestra "OMITIDA (global)" y el veredicto es APROBADO

**Detección de obsolescencia:** Después de mostrar el panel, comprueba si alguna revisión existente puede estar obsoleta:
- Analiza la sección \`---HEAD---\` de la salida de bash para obtener el hash del commit HEAD actual
- Para cada entrada de revisión que tenga un campo \`commit\`: compáralo con el HEAD actual. Si es diferente, cuenta los commits transcurridos: \`git rev-list --count STORED_COMMIT..HEAD\`. Muestra: "Nota: la revisión de {skill} del {date} puede estar obsoleta — {N} commits desde la revisión"
- Para entradas sin campo \`commit\` (entradas legacy): muestra "Nota: la revisión de {skill} del {date} no tiene seguimiento de commits — considera re-ejecutarla para una detección precisa de obsolescencia"
- Si todas las revisiones coinciden con el HEAD actual, no muestres notas de obsolescencia

Si la Revisión de Ingeniería NO es "CLEAR":

Imprimir: "No se encontró revisión de ingeniería previa — ship ejecutará su propia revisión pre-landing en el Paso 3.5."

Verificar tamaño del diff: `git diff <base>...HEAD --stat | tail -1`. Si el diff es >200 líneas, añadir: "Nota: Este es un diff grande. Considera ejecutar `/plan-eng-review` o `/autoplan` para una revisión a nivel de arquitectura antes de enviar."

Si falta la Revisión del CEO, mencionar como informativo ("Revisión del CEO no ejecutada — recomendada para cambios de producto") pero NO bloquear.

Para Revisión de Diseño: ejecutar `source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)`. Si `SCOPE_FRONTEND=true` y no existe revisión de diseño (plan-design-review o design-review-lite) en el panel, mencionar: "Revisión de Diseño no ejecutada — este PR cambia código frontend. La verificación de diseño lite se ejecutará automáticamente en el Paso 3.5, pero considere ejecutar /design-review para una auditoría visual completa post-implementación." Nunca bloquear de todos modos.

Continuar al Paso 1.5 — NO bloquear ni preguntar. Ship ejecuta su propia revisión en el Paso 3.5.

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
   grep -qE 'release|publish|deploy' .gitlab-ci.yml 2>/dev/null && echo "GITLAB_CI_RELEASE"
   ```

3. **Si no existe pipeline de release y se añadió un nuevo artefacto:** Usar AskUserQuestion:
   - "Este PR añade un nuevo binario/herramienta pero no hay pipeline de CI/CD para compilarlo y publicarlo.
     Los usuarios no podrán descargar el artefacto después del merge."
   - A) Añadir un flujo de release ahora (pipeline de release CI/CD — GitHub Actions o GitLab CI según la plataforma)
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

## Triaje de Fallos en Tests

Cuando los tests fallan, NO te detengas inmediatamente. Primero, determina la propiedad:

### Paso T1: Clasifica cada fallo

Para cada test fallido:

1. **Obtén los archivos modificados en esta rama:**
   ```bash
   git diff origin/<base>...HEAD --name-only
   ```

2. **Clasifica el fallo:**
   - **En la rama** si: el archivo del test fallido fue modificado en esta rama, O la salida del test hace referencia a código que fue cambiado en esta rama, O puedes rastrear el fallo hasta un cambio en el diff de la rama.
   - **Probablemente preexistente** si: ni el archivo del test ni el código que prueba fueron modificados en esta rama, Y el fallo no está relacionado con ningún cambio de la rama que puedas identificar.
   - **Cuando sea ambiguo, clasifícalo como de la rama.** Es más seguro detener al desarrollador que dejar pasar un test roto. Solo clasifica como preexistente cuando estés seguro.

   Esta clasificación es heurística — usa tu criterio leyendo el diff y la salida del test. No tienes un grafo de dependencias programático.

### Paso T2: Gestiona los fallos de la rama

**DETENTE.** Estos son tus fallos. Muéstralos y no continúes. El desarrollador debe corregir sus propios tests rotos antes de enviar.

### Paso T3: Gestiona los fallos preexistentes

Consulta `REPO_MODE` de la salida del preámbulo.

**Si REPO_MODE es `solo`:**

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

**Si REPO_MODE es `collaborative` o `unknown`:**

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
- Haz commit de la corrección por separado de los cambios de la rama: `git commit -m "fix: pre-existing test failure in <test-file>"`
- Continúa con el flujo de trabajo.

**Si "Añadir como TODO P0":**
- Si `TODOS.md` existe, añade la entrada siguiendo el formato en `review/TODOS-format.md` (o `.claude/skills/review/TODOS-format.md`).
- Si `TODOS.md` no existe, créalo con la cabecera estándar y añade la entrada.
- La entrada debe incluir: título, la salida del error, en qué rama se detectó, y prioridad P0.
- Continúa con el flujo de trabajo — trata el fallo preexistente como no bloqueante.

**Si "Blame + asignar issue de GitHub" (solo colaborativo):**
- Encuentra quién probablemente lo rompió. Comprueba TANTO el archivo del test COMO el código de producción que prueba:
  ```bash
  # ¿Quién tocó por última vez el test fallido?
  git log --format="%an (%ae)" -1 -- <failing-test-file>
  # ¿Quién tocó por última vez el código de producción que cubre el test? (a menudo el verdadero causante)
  git log --format="%an (%ae)" -1 -- <source-file-under-test>
  ```
  Si son personas diferentes, prefiere al autor del código de producción — probablemente introdujo la regresión.
- Crea un issue asignado a esa persona (usa la plataforma detectada en el Paso 0):
  - **Si es GitHub:**
    ```bash
    gh issue create \
      --title "Pre-existing test failure: <test-name>" \
      --body "Found failing on branch <current-branch>. Failure is pre-existing.\n\n**Error:**\n```\n<first 10 lines>\n```\n\n**Last modified by:** <author>\n**Noticed by:** gstack /ship on <date>" \
      --assignee "<github-username>"
    ```
  - **Si es GitLab:**
    ```bash
    glab issue create \
      -t "Pre-existing test failure: <test-name>" \
      -d "Found failing on branch <current-branch>. Failure is pre-existing.\n\n**Error:**\n```\n<first 10 lines>\n```\n\n**Last modified by:** <author>\n**Noticed by:** gstack /ship on <date>" \
      -a "<gitlab-username>"
    ```
- Si ningún CLI está disponible o `--assignee`/`-a` falla (usuario no está en la org, etc.), crea el issue sin asignado y menciona en el cuerpo quién debería revisarlo.
- Continúa con el flujo de trabajo.

**Si "Omitir":**
- Continúa con el flujo de trabajo.
- Indica en la salida: "Fallo de test preexistente omitido: <nombre-del-test>"

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

El objetivo es 100% de cobertura — cada camino sin probar es un camino donde los bugs se esconden y el vibe coding se convierte en yolo coding. Evalúa lo que se CODIFICÓ REALMENTE (del diff), no lo que se planificó.

### Detección del Framework de Tests

Antes de analizar la cobertura, detecta el framework de tests del proyecto:

1. **Lee CLAUDE.md** — busca una sección `## Testing` con el comando de test y nombre del framework. Si se encuentra, úsalo como la fuente autoritativa.
2. **Si CLAUDE.md no tiene sección de testing, auto-detectar:**

```bash
# Detectar runtime del proyecto
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
# Comprobar infraestructura de tests existente
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
```

3. **Si no se detectó framework:** cae al paso de Bootstrap del Framework de Tests (Paso 2.5) que maneja la configuración completa.

**0. Conteo antes/después de tests:**

```bash
# Contar archivos de test antes de cualquier generación
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

Almacena este número para el cuerpo del PR.

**1. Trazar cada ruta de código cambiada** usando `git diff origin/<base>...HEAD`:

Lee cada archivo cambiado. Para cada uno, traza cómo los datos fluyen a través del código — no solo listes funciones, sigue realmente la ejecución:

1. **Lee el diff.** Para cada archivo cambiado, lee el archivo completo (no solo el fragmento del diff) para entender el contexto.
2. **Traza el flujo de datos.** Comenzando desde cada punto de entrada (manejador de ruta, función exportada, listener de eventos, render de componente), sigue los datos a través de cada rama:
   - ¿De dónde viene la entrada? (parámetros de request, props, base de datos, llamada API)
   - ¿Qué la transforma? (validación, mapeo, cómputo)
   - ¿A dónde va? (escritura en base de datos, respuesta API, salida renderizada, efecto secundario)
   - ¿Qué puede salir mal en cada paso? (null/undefined, entrada inválida, fallo de red, colección vacía)
3. **Diagrama la ejecución.** Para cada archivo cambiado, dibuja un diagrama ASCII mostrando:
   - Cada función/método que fue agregado o modificado
   - Cada rama condicional (if/else, switch, ternario, cláusula guard, retorno temprano)
   - Cada ruta de error (try/catch, rescue, boundary de error, fallback)
   - Cada llamada a otra función (trázala — ¿ELLA tiene ramas sin probar?)
   - Cada borde: ¿qué pasa con entrada null? ¿Array vacío? ¿Tipo inválido?

Este es el paso crítico — estás construyendo un mapa de cada línea de código que puede ejecutarse de manera diferente según la entrada. Cada rama en este diagrama necesita un test.

**2. Mapear flujos de usuario, interacciones y estados de error:**

La cobertura de código no es suficiente — necesitas cubrir cómo los usuarios reales interactúan con el código cambiado. Para cada funcionalidad cambiada, piensa en:

- **Flujos de usuario:** ¿Qué secuencia de acciones toma un usuario que toca este código? Mapea el recorrido completo (ej.: "el usuario hace clic en 'Pagar' → el formulario valida → llamada API → pantalla de éxito/fallo"). Cada paso del recorrido necesita un test.
- **Casos extremos de interacción:** ¿Qué pasa cuando el usuario hace algo inesperado?
  - Doble clic/re-envío rápido
  - Navegar lejos a mitad de operación (botón atrás, cerrar pestaña, clic en otro enlace)
  - Enviar con datos obsoletos (la página estuvo abierta 30 minutos, sesión expirada)
  - Conexión lenta (la API tarda 10 segundos — ¿qué ve el usuario?)
  - Acciones concurrentes (dos pestañas, mismo formulario)
- **Estados de error que el usuario puede ver:** Para cada error que el código maneja, ¿qué experimenta realmente el usuario?
  - ¿Hay un mensaje de error claro o un fallo silencioso?
  - ¿Puede el usuario recuperarse (reintentar, volver, corregir entrada) o está atascado?
  - ¿Qué pasa sin red? ¿Con un 500 de la API? ¿Con datos inválidos del servidor?
- **Estados vacío/cero/límite:** ¿Qué muestra la UI con cero resultados? ¿Con 10,000 resultados? ¿Con una entrada de un solo carácter? ¿Con entrada de longitud máxima?

Agrega estos a tu diagrama junto con las ramas de código. Un flujo de usuario sin test es una brecha tan grande como un if/else sin probar.

**3. Verificar cada rama contra los tests existentes:**

Recorre tu diagrama rama por rama — tanto rutas de código COMO flujos de usuario. Para cada uno, busca un test que lo ejercite:
- Función `processPayment()` → busca `billing.test.ts`, `billing.spec.ts`, `test/billing_test.rb`
- Un if/else → busca tests que cubran AMBOS caminos verdadero Y falso
- Un manejador de errores → busca un test que active esa condición específica de error
- Una llamada a `helperFn()` que tiene sus propias ramas → esas ramas necesitan tests también
- Un flujo de usuario → busca un test de integración o E2E que recorra el camino
- Un caso extremo de interacción → busca un test que simule la acción inesperada

Rúbrica de puntuación de calidad:
- ★★★  Prueba comportamiento con casos extremos Y rutas de error
- ★★   Prueba comportamiento correcto, solo camino feliz
- ★    Test smoke / verificación de existencia / assertion trivial (ej.: "renderiza", "no lanza excepción")

### Matriz de Decisión de Tests E2E

Al verificar cada rama, también determina si un test unitario o un test E2E/integración es la herramienta correcta:

**RECOMENDAR E2E (marcar como [→E2E] en el diagrama):**
- Flujo común de usuario que abarca 3+ componentes/servicios (ej.: registro → verificar email → primer login)
- Punto de integración donde el mocking oculta fallos reales (ej.: API → cola → worker → BD)
- Flujos de auth/pago/destrucción-de-datos — demasiado importantes para confiar solo en tests unitarios

**RECOMENDAR EVAL (marcar como [→EVAL] en el diagrama):**
- Llamada crítica a LLM que necesita una evaluación de calidad (ej.: cambio de prompt → verificar que la salida cumple la barra de calidad)
- Cambios en plantillas de prompt, instrucciones del sistema o definiciones de herramientas

**MANTENER TESTS UNITARIOS:**
- Función pura con entradas/salidas claras
- Helper interno sin efectos secundarios
- Caso extremo de una sola función (entrada null, array vacío)
- Flujo oscuro/raro que no es de cara al cliente

### REGLA DE REGRESIÓN (obligatoria)

**REGLA DE HIERRO:** Cuando la auditoría de cobertura identifica una REGRESIÓN — código que antes funcionaba pero el diff rompió — un test de regresión se escribe inmediatamente. Sin AskUserQuestion. Sin omitir. Las regresiones son el test de mayor prioridad porque prueban que algo se rompió.

Una regresión ocurre cuando:
- El diff modifica comportamiento existente (no código nuevo)
- La suite de tests existente (si la hay) no cubre la ruta cambiada
- El cambio introduce un nuevo modo de fallo para llamadores existentes

Ante la duda sobre si un cambio es una regresión, opta por escribir el test.

Formato: commit como `test: regression test for {what broke}`

**4. Generar diagrama ASCII de cobertura:**

Incluye TANTO rutas de código COMO flujos de usuario en el mismo diagrama. Marca las rutas que ameritan E2E y eval:

```
COBERTURA DE RUTAS DE CÓDIGO
===========================
[+] src/services/billing.ts
    │
    ├── processPayment()
    │   ├── [★★★ PROBADO] Camino feliz + tarjeta rechazada + timeout — billing.test.ts:42
    │   ├── [GAP]          Timeout de red — SIN TEST
    │   └── [GAP]          Moneda inválida — SIN TEST
    │
    └── refundPayment()
        ├── [★★  PROBADO] Reembolso total — billing.test.ts:89
        └── [★   PROBADO] Reembolso parcial (solo verifica que no lanza) — billing.test.ts:101

COBERTURA DE FLUJOS DE USUARIO
===========================
[+] Flujo de pago en checkout
    │
    ├── [★★★ PROBADO] Compra completa — checkout.e2e.ts:15
    ├── [GAP] [→E2E] Doble clic en enviar — necesita E2E, no solo unitario
    ├── [GAP]         Navegar lejos durante el pago — test unitario suficiente
    └── [★   PROBADO] Errores de validación del formulario (solo verifica render) — checkout.test.ts:40

[+] Estados de error
    │
    ├── [★★  PROBADO] Mensaje de tarjeta rechazada — billing.test.ts:58
    ├── [GAP]          UX de timeout de red (¿qué ve el usuario?) — SIN TEST
    └── [GAP]          Envío con carrito vacío — SIN TEST

[+] Integración LLM
    │
    └── [GAP] [→EVAL] Cambio de plantilla de prompt — necesita test eval

─────────────────────────────────
COBERTURA: 5/13 rutas probadas (38%)
  Rutas de código: 3/5 (60%)
  Flujos de usuario: 2/8 (25%)
CALIDAD:  ★★★: 2  ★★: 2  ★: 1
BRECHAS: 8 rutas necesitan tests (2 necesitan E2E, 1 necesita eval)
─────────────────────────────────
```

**Camino rápido:** Todas las rutas cubiertas → "Paso 3.4: Todas las nuevas rutas de código tienen cobertura de tests ✓" Continuar.

**5. Generar tests para rutas sin cobertura:**

Si se detectó un framework de tests (o se hizo bootstrap en el Paso 2.5):
- Prioriza manejadores de errores y casos extremos primero (los caminos felices son más probablemente ya testeados)
- Lee 2-3 archivos de test existentes para coincidir exactamente con las convenciones
- Genera tests unitarios. Mockea todas las dependencias externas (BD, API, Redis).
- Para rutas marcadas [→E2E]: genera tests de integración/E2E usando el framework E2E del proyecto (Playwright, Cypress, Capybara, etc.)
- Para rutas marcadas [→EVAL]: genera tests eval usando el framework eval del proyecto, o marca para eval manual si no existe ninguno
- Escribe tests que ejerciten la ruta específica sin cobertura con assertions reales
- Ejecuta cada test. Pasa → commit como `test: coverage for {feature}`
- Falla → arregla una vez. Sigue fallando → revierte, anota brecha en el diagrama.

Límites: máximo 30 rutas de código, máximo 20 tests generados (código + flujo de usuario combinados), límite de 2 min de exploración por test.

Si no hay framework de tests Y el usuario rechazó el bootstrap → solo diagrama, sin generación. Nota: "Generación de tests omitida — no hay framework de tests configurado."

**El diff solo contiene cambios de tests:** Omite el Paso 3.4 por completo: "Sin nuevas rutas de código de aplicación para auditar."

**6. Conteo final y resumen de cobertura:**

```bash
# Contar archivos de test después de la generación
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

Para el cuerpo del PR: `Tests: {antes} → {después} (+{delta} nuevos)`
Línea de cobertura: `Auditoría de Cobertura de Tests: N nuevas rutas de código. M cubiertas (X%). K tests generados, J committeados.`

**7. Gate de cobertura:**

Antes de proceder, revisa CLAUDE.md buscando una sección `## Test Coverage` con campos `Minimum:` y `Target:`. Si se encuentran, usa esos porcentajes. De lo contrario usa los defaults: Mínimo = 60%, Objetivo = 80%.

Usando el porcentaje de cobertura del diagrama en el subpaso 4 (la línea `COBERTURA: X/Y (Z%)`):

- **>= objetivo:** Aprobado. "Gate de cobertura: APROBADO ({X}%)." Continuar.
- **>= mínimo, < objetivo:** Usa AskUserQuestion:
  - "La cobertura evaluada por IA es {X}%. {N} rutas de código están sin probar. El objetivo es {target}%."
  - RECOMMENDATION: Elige A porque las rutas de código sin probar son donde se esconden los bugs de producción.
  - Opciones:
    A) Generar más tests para las brechas restantes (recomendado)
    B) Enviar de todos modos — acepto el riesgo de cobertura
    C) Estas rutas no necesitan tests — marcar como intencionalmente sin cobertura
  - Si A: Vuelve al subpaso 5 (generar tests) apuntando a las brechas restantes. Después del segundo pase, si sigue debajo del objetivo, presenta AskUserQuestion de nuevo con números actualizados. Máximo 2 pases de generación en total.
  - Si B: Continuar. Incluir en el cuerpo del PR: "Gate de cobertura: {X}% — usuario aceptó el riesgo."
  - Si C: Continuar. Incluir en el cuerpo del PR: "Gate de cobertura: {X}% — {N} rutas intencionalmente sin cobertura."

- **< mínimo:** Usa AskUserQuestion:
  - "La cobertura evaluada por IA es críticamente baja ({X}%). {N} de {M} rutas de código no tienen tests. El umbral mínimo es {minimum}%."
  - RECOMMENDATION: Elige A porque menos de {minimum}% significa que hay más código sin probar que probado.
  - Opciones:
    A) Generar tests para las brechas restantes (recomendado)
    B) Anular — enviar con baja cobertura (entiendo el riesgo)
  - Si A: Vuelve al subpaso 5. Máximo 2 pases. Si sigue debajo del mínimo después de 2 pases, presenta la opción de anulación de nuevo.
  - Si B: Continuar. Incluir en el cuerpo del PR: "Gate de cobertura: ANULADO en {X}%."

**Porcentaje de cobertura indeterminado:** Si el diagrama de cobertura no produce un porcentaje numérico claro (salida ambigua, error de parsing), **omite el gate** con: "Gate de cobertura: no se pudo determinar el porcentaje — omitiendo." No asumas 0% ni bloquees.

**Diffs solo de tests:** Omite el gate (igual que el camino rápido existente).

**100% de cobertura:** "Gate de cobertura: APROBADO (100%)." Continuar.

### Artefacto del Plan de Tests

Después de producir el diagrama de cobertura, escribe un artefacto de plan de tests para que `/qa` y `/qa-only` puedan consumirlo:

```bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
```

Escribe en `~/.gstack/projects/{slug}/{user}-{branch}-ship-test-plan-{datetime}.md`:

```markdown
# Plan de Tests
Generado por /ship el {date}
Rama: {branch}
Repo: {owner/repo}

## Páginas/Rutas Afectadas
- {ruta URL} — {qué probar y por qué}

## Interacciones Clave a Verificar
- {descripción de interacción} en {página}

## Casos Extremos
- {caso extremo} en {página}

## Rutas Críticas
- {flujo extremo a extremo que debe funcionar}
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

## Revisión de Diseño (condicional, alcance del diff)

Comprueba si el diff toca archivos de frontend usando `gstack-diff-scope`:

```bash
source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

**Si `SCOPE_FRONTEND=false`:** Omite la revisión de diseño silenciosamente. Sin salida.

**Si `SCOPE_FRONTEND=true`:**

1. **Buscar DESIGN.md.** Si `DESIGN.md` o `design-system.md` existe en la raíz del repositorio, léelo. Todos los hallazgos de diseño se calibran contra él — los patrones aprobados en DESIGN.md no se señalizan. Si no se encuentra, usa principios universales de diseño.

2. **Leer `.claude/skills/review/design-checklist.md`.** Si el archivo no se puede leer, omite la revisión de diseño con una nota: "Checklist de diseño no encontrado — omitiendo revisión de diseño."

3. **Leer cada archivo de frontend cambiado** (archivo completo, no solo fragmentos del diff). Los archivos de frontend se identifican por los patrones listados en el checklist.

4. **Aplicar el checklist de diseño** contra los archivos cambiados. Para cada elemento:
   - **[HIGH] corrección mecánica de CSS** (`outline: none`, `!important`, `font-size < 16px`): clasificar como AUTO-FIX
   - **[HIGH/MEDIUM] se necesita criterio de diseño**: clasificar como ASK
   - **[LOW] detección basada en intención**: presentar como "Posible — verificar visualmente o ejecutar /design-review"

5. **Incluir hallazgos** en la salida de revisión bajo un encabezado "Revisión de Diseño", siguiendo el formato de salida del checklist. Los hallazgos de diseño se fusionan con los hallazgos de revisión de código en el mismo flujo Fix-First.

6. **Registrar el resultado** para el Panel de Estado de Revisiones:

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
```

Sustituye: TIMESTAMP = fecha y hora ISO 8601, STATUS = "clean" si 0 hallazgos o "issues_found", N = hallazgos totales, M = cantidad de auto-correcciones, COMMIT = salida de `git rev-parse --short HEAD`.

7. **Voz de diseño de Codex** (opcional, automática si está disponible):

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
```

Si Codex está disponible, ejecuta una verificación de diseño ligera sobre el diff:

```bash
TMPERR_DRL=$(mktemp /tmp/codex-drl-XXXXXXXX)
codex exec "Review the git diff on this branch. Run 7 litmus checks (YES/NO each): 1. Brand/product unmistakable in first screen? 2. One strong visual anchor present? 3. Page understandable by scanning headlines only? 4. Each section has one job? 5. Are cards actually necessary? 6. Does motion improve hierarchy or atmosphere? 7. Would design feel premium with all decorative shadows removed? Flag any hard rejections: 1. Generic SaaS card grid as first impression 2. Beautiful image with weak brand 3. Strong headline with no clear action 4. Busy imagery behind text 5. Sections repeating same mood statement 6. Carousel with no narrative purpose 7. App UI made of stacked cards instead of layout 5 most important design findings only. Reference file:line." -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached 2>"$TMPERR_DRL"
```

Usa un timeout de 5 minutos (`timeout: 300000`). Después de que el comando termine, lee stderr:
```bash
cat "$TMPERR_DRL" && rm -f "$TMPERR_DRL"
```

**Manejo de errores:** Todos los errores son no bloqueantes. Ante fallo de autenticación, timeout o respuesta vacía — omite con una breve nota y continúa.

Presenta la salida de Codex bajo un encabezado `CODEX (diseño):`, fusionado con los hallazgos del checklist anterior.

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

9. Persistir el resultado de la revisión en el log de revisiones:
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"review","timestamp":"TIMESTAMP","status":"STATUS","issues_found":N,"critical":N,"informational":N,"commit":"'"$(git rev-parse --short HEAD)"'","via":"ship"}'
```
Sustituir TIMESTAMP (ISO 8601), STATUS ("clean" si no hay problemas, "issues_found" en caso contrario),
y los valores N con los conteos del resumen anterior. El campo `via:"ship"` distingue de ejecuciones independientes de `/review`.

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

## Paso 3.8: Revisión adversarial (auto-escalada)

La exhaustividad de la revisión adversarial se escala automáticamente según el tamaño del diff. No requiere configuración.

**Detectar tamaño del diff y disponibilidad de herramientas:**

```bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
# Respetar opt-out anterior
OLD_CFG=$(~/.claude/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || true)
echo "DIFF_SIZE: $DIFF_TOTAL"
echo "OLD_CFG: ${OLD_CFG:-not_set}"
```

Si `OLD_CFG` es `disabled`: omite este paso silenciosamente. Continúa al siguiente paso.

**Anulación del usuario:** Si el usuario solicitó explícitamente un nivel específico (ej.: "ejecuta todos los pases", "revisión paranoica", "adversarial completo", "haz los 4 pases", "revisión exhaustiva"), honra esa solicitud independientemente del tamaño del diff. Salta a la sección del nivel correspondiente.

**Auto-selección de nivel según tamaño del diff:**
- **Pequeño (< 50 líneas cambiadas):** Omite la revisión adversarial por completo. Imprime: "Diff pequeño ($DIFF_TOTAL líneas) — revisión adversarial omitida." Continúa al siguiente paso.
- **Mediano (50–199 líneas cambiadas):** Ejecuta el desafío adversarial de Codex (o subagente adversarial de Claude si Codex no está disponible). Salta a la sección "Nivel mediano".
- **Grande (200+ líneas cambiadas):** Ejecuta todos los pases restantes — revisión estructurada de Codex + subagente adversarial de Claude + Codex adversarial. Salta a la sección "Nivel grande".

---

### Nivel mediano (50–199 líneas)

La revisión estructurada de Claude ya se ejecutó. Ahora agrega un **desafío adversarial cross-model**.

**Si Codex está disponible:** ejecuta el desafío adversarial de Codex. **Si Codex NO está disponible:** recurre al subagente adversarial de Claude.

**Codex adversarial:**

```bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
```

Configura el parámetro `timeout` de la herramienta Bash a `300000` (5 minutos). NO uses el comando shell `timeout` — no existe en macOS. Después de que el comando termine, lee stderr:
```bash
cat "$TMPERR_ADV"
```

Presenta la salida completa textualmente. Esto es informativo — nunca bloquea el envío.

**Manejo de errores:** Todos los errores son no bloqueantes — la revisión adversarial es una mejora de calidad, no un prerrequisito.
- **Fallo de autenticación:** Si stderr contiene "auth", "login", "unauthorized" o "API key": "Fallo de autenticación de Codex. Ejecuta \`codex login\` para autenticarte."
- **Timeout:** "Codex expiró después de 5 minutos."
- **Respuesta vacía:** "Codex no devolvió respuesta. Stderr: <pegar error relevante>."

Ante cualquier error de Codex, recurre automáticamente al subagente adversarial de Claude.

**Subagente adversarial de Claude** (respaldo cuando Codex no está disponible o falló):

Despacha mediante la herramienta Agent. El subagente tiene contexto fresco — sin sesgo de checklist de la revisión estructurada. Esta independencia genuina detecta cosas ante las que el revisor principal es ciego.

Prompt del subagente:
"Lee el diff de esta rama con `git diff origin/<base>`. Piensa como un atacante y un ingeniero del caos. Tu trabajo es encontrar formas en que este código fallará en producción. Busca: casos extremos, condiciones de carrera, vulnerabilidades de seguridad, fugas de recursos, modos de fallo, corrupción silenciosa de datos, errores lógicos que producen resultados incorrectos silenciosamente, manejo de errores que traga fallos, y violaciones de límites de confianza. Sé adversarial. Sé exhaustivo. Sin halagos — solo los problemas. Para cada hallazgo, clasifica como FIXABLE (sabes cómo corregirlo) o INVESTIGATE (requiere juicio humano)."

Presenta los hallazgos bajo un encabezado `REVISIÓN ADVERSARIAL (subagente Claude):`. Los hallazgos **FIXABLE** fluyen al mismo pipeline Fix-First que la revisión estructurada. Los hallazgos **INVESTIGATE** se presentan como informativos.

Si el subagente falla o expira: "Subagente adversarial de Claude no disponible. Continuando sin revisión adversarial."

**Persistir el resultado de la revisión:**
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"medium","commit":"'"$(git rev-parse --short HEAD)"'"}'
```
Sustituye STATUS: "clean" si no hay hallazgos, "issues_found" si existen hallazgos. SOURCE: "codex" si se ejecutó Codex, "claude" si se ejecutó el subagente. Si ambos fallaron, NO persistas.

**Limpieza:** Ejecuta `rm -f "$TMPERR_ADV"` después de procesar (si se usó Codex).

---

### Nivel grande (200+ líneas)

La revisión estructurada de Claude ya se ejecutó. Ahora ejecuta **los tres pases restantes** para máxima cobertura:

**1. Revisión estructurada de Codex (si está disponible):**
```bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

Configura el parámetro `timeout` de la herramienta Bash a `300000` (5 minutos). NO uses el comando shell `timeout` — no existe en macOS. Presenta la salida bajo el encabezado `CODEX DICE (revisión de código):`.
Busca marcadores `[P1]`: encontrados → `GATE: FAIL`, no encontrados → `GATE: PASS`.

Si GATE es FAIL, usa AskUserQuestion:
```
Codex encontró N incidencias críticas en el diff.

A) Investigar y corregir ahora (recomendado)
B) Continuar — la revisión seguirá completándose
```

Si A: aborda los hallazgos. Después de corregir, re-ejecuta los tests (Paso 3) ya que el código ha cambiado. Re-ejecuta `codex review` para verificar.

Lee stderr para errores (mismo manejo de errores que el nivel mediano).

Después de stderr: `rm -f "$TMPERR"`

**2. Subagente adversarial de Claude:** Despacha un subagente con el prompt adversarial (mismo prompt que el nivel mediano). Esto siempre se ejecuta independientemente de la disponibilidad de Codex.

**3. Desafío adversarial de Codex (si está disponible):** Ejecuta `codex exec` con el prompt adversarial (mismo que el nivel mediano).

Si Codex no está disponible para los pasos 1 y 3, informa al usuario: "CLI de Codex no encontrado — la revisión de diff grande ejecutó Claude estructurado + Claude adversarial (2 de 4 pases). Instala Codex para cobertura completa de 4 pases: `npm install -g @openai/codex`"

**Persistir el resultado de la revisión DESPUÉS de que todos los pases terminen** (no después de cada sub-paso):
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"large","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```
Sustituye: STATUS = "clean" si no hay hallazgos en TODOS los pases, "issues_found" si algún pase encontró incidencias. SOURCE = "both" si se ejecutó Codex, "claude" si solo se ejecutó el subagente de Claude. GATE = resultado del gate de la revisión estructurada de Codex ("pass"/"fail"), o "informational" si Codex no estaba disponible. Si todos los pases fallaron, NO persistas.

---

### Síntesis cross-model (niveles mediano y grande)

Después de que todos los pases terminen, sintetiza los hallazgos de todas las fuentes:

```
SÍNTESIS DE REVISIÓN ADVERSARIAL (auto: NIVEL, N líneas):
════════════════════════════════════════════════════════════
  Alta confianza (encontrado por múltiples fuentes): [hallazgos acordados por >1 pase]
  Único de la revisión estructurada de Claude: [del paso anterior]
  Único del adversarial de Claude: [del subagente, si se ejecutó]
  Único de Codex: [del adversarial de codex o revisión de código, si se ejecutó]
  Modelos usados: Claude estructurado ✓  Claude adversarial ✓/✗  Codex ✓/✗
════════════════════════════════════════════════════════════
```

Los hallazgos de alta confianza (acordados por múltiples fuentes) deben priorizarse para corrección.

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

## Paso 8: Crear PR/MR

Crear un pull request (GitHub) o merge request (GitLab) usando la plataforma detectada en el Paso 0.

El cuerpo del PR/MR debe contener estas secciones:

```
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
```

**If GitHub:**

```bash
gh pr create --base <base> --title "<type>: <summary>" --body "$(cat <<'EOF'
<PR body from above>
EOF
)"
```

**Si es GitLab:**

```bash
glab mr create -b <base> -t "<type>: <summary>" -d "$(cat <<'EOF'
<cuerpo del MR de arriba>
EOF
)"
```

**Si ningún CLI está disponible:**
Imprimir el nombre de la rama, la URL del remoto e indicar al usuario que cree el PR/MR manualmente vía la interfaz web. No detenerse — el código está subido y listo.

**Mostrar la URL del PR/MR** — luego continuar al Paso 8.5.

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
