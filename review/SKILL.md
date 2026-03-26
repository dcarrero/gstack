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
echo '{"skill":"review","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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
- Comprueba si existe una solución integrada en versiones más recientes antes de recomendar una solución alternativa
- Verifica las firmas de la API contra la documentación actual (las APIs cambian entre versiones)

Toma segundos, previene recomendar patrones obsoletos. Si WebSearch no está disponible, indícalo y continúa con el conocimiento disponible.

Sigue el formato de salida especificado en el checklist. Respeta las supresiones — NO marques elementos listados en la sección "DO NOT flag".

---

## Paso 4.5: Revisión de diseño (condicional)

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

Incluye cualquier hallazgo de diseño junto con los hallazgos del Paso 4. Siguen el mismo flujo Fix-First del Paso 5 — AUTO-FIX para correcciones mecánicas de CSS, ASK para todo lo demás.

---

## Paso 4.75: Diagrama de cobertura de tests

El objetivo es 100% de cobertura. Evalúa cada ruta de código cambiada en el diff e identifica brechas de tests. Las brechas se convierten en hallazgos INFORMATIONAL que siguen el flujo Fix-First.

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

3. **Si no se detectó framework:** igualmente produce el diagrama de cobertura, pero omite la generación de tests.

**Paso 1. Trazar cada ruta de código cambiada** usando `git diff origin/<base>...HEAD`:

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

**Paso 2. Mapear flujos de usuario, interacciones y estados de error:**

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

**Paso 3. Verificar cada rama contra los tests existentes:**

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

**Paso 4. Generar diagrama ASCII de cobertura:**

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

**Camino rápido:** Todas las rutas cubiertas → "Paso 4.75: Todas las nuevas rutas de código tienen cobertura de tests ✓" Continuar.

**Paso 5. Generar tests para brechas (Fix-First):**

Si se detectó un framework de tests y se identificaron brechas:
- Clasifica cada brecha como AUTO-FIX o ASK según la Heurística Fix-First:
  - **AUTO-FIX:** Tests unitarios simples para funciones puras, casos extremos de funciones ya probadas
  - **ASK:** Tests E2E, tests que requieren nueva infraestructura de testing, tests para comportamiento ambiguo
- Para brechas AUTO-FIX: genera el test, ejecútalo, commit como `test: coverage for {feature}`
- Para brechas ASK: incluye en la pregunta batch Fix-First con los otros hallazgos de la revisión
- Para rutas marcadas [→E2E]: siempre ASK (los tests E2E son de mayor esfuerzo y necesitan confirmación del usuario)
- Para rutas marcadas [→EVAL]: siempre ASK (los tests eval necesitan confirmación del usuario sobre criterios de calidad)

Si no se detectó framework de tests → incluye brechas como hallazgos solo INFORMATIONAL, sin generación.

**El diff solo contiene cambios de tests:** Omite el Paso 4.75 por completo: "Sin nuevas rutas de código de aplicación para auditar."

### Advertencia de Cobertura

Después de producir el diagrama de cobertura, revisa el porcentaje de cobertura. Lee CLAUDE.md buscando una sección `## Test Coverage` con un campo `Minimum:`. Si no se encuentra, usa el default: 60%.

Si la cobertura está debajo del umbral mínimo, genera una advertencia prominente **antes** de los hallazgos regulares de la revisión:

```
⚠️ ADVERTENCIA DE COBERTURA: La cobertura evaluada por IA es {X}%. {N} rutas de código sin probar.
Considera escribir tests antes de ejecutar /ship.
```

Esto es INFORMATIONAL — no bloquea /review. Pero hace visible la baja cobertura tempranamente para que el desarrollador pueda abordarla antes de llegar al gate de cobertura de /ship.

Si el porcentaje de cobertura no puede determinarse, omite la advertencia silenciosamente.

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

## Paso 5.7: Revisión adversarial (auto-escalada)

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

Si A: aborda los hallazgos. Re-ejecuta `codex review` para verificar.

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
