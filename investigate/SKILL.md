---
name: investigate
preamble-tier: 2
version: 1.0.0
description: |
  Depuración sistemática con investigación de root cause. Cuatro fases: investigar,
  analizar, formular hypothesis, implementar. Ley de Hierro: no se corrige sin root cause.
  Usar cuando se pida "depura esto", "corrige este bug", "por qué está roto",
  "investiga este error" o "root cause analysis".
  Sugerir proactivamente cuando el usuario reporte errores, comportamiento inesperado o
  esté investigando por qué algo dejó de funcionar.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
  - WebSearch
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking debug scope boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking debug scope boundary..."
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
echo '{"skill":"investigate","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

# Depuración Sistemática

## Ley de Hierro

**NINGUNA CORRECCIÓN SIN INVESTIGACIÓN DE ROOT CAUSE PRIMERO.**

Corregir síntomas crea una depuración interminable. Cada corrección que no aborda el root cause hace que el siguiente bug sea más difícil de encontrar. Encuentra el root cause, luego corrígelo.

---

## Fase 1: Investigación de Root Cause

Recopila contexto antes de formular cualquier hypothesis.

1. **Recopilar síntomas:** Lee los mensajes de error, stacktrace y pasos de reproducción. Si el usuario no ha proporcionado suficiente contexto, haz UNA pregunta a la vez mediante AskUserQuestion.

2. **Leer el código:** Traza la ruta del código desde el síntoma hasta las causas potenciales. Usa Grep para encontrar todas las referencias, Read para entender la lógica.

3. **Revisar cambios recientes:**
   ```bash
   git log --oneline -20 -- <affected-files>
   ```
   ¿Funcionaba antes? ¿Qué cambió? Una regresión significa que el root cause está en el diff.

4. **Reproducir:** ¿Puedes provocar el bug de forma determinista? Si no, recopila más evidencia antes de continuar.

Resultado: **"Root cause hypothesis: ..."** — una afirmación específica y verificable sobre qué está mal y por qué.

---

## Bloqueo de Alcance

Después de formular tu root cause hypothesis, bloquea las ediciones al módulo afectado para evitar desviaciones de alcance.

```bash
[ -x "${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh" ] && echo "FREEZE_AVAILABLE" || echo "FREEZE_UNAVAILABLE"
```

**Si FREEZE_AVAILABLE:** Identifica el directorio más específico que contenga los archivos afectados. Escríbelo en el archivo de estado de freeze:

```bash
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
mkdir -p "$STATE_DIR"
echo "<detected-directory>/" > "$STATE_DIR/freeze-dir.txt"
echo "Debug scope locked to: <detected-directory>/"
```

Sustituye `<detected-directory>` con la ruta real del directorio (p. ej., `src/auth/`). Informa al usuario: "Las ediciones están restringidas a `<dir>/` durante esta sesión de debug. Esto evita cambios en código no relacionado. Ejecuta `/unfreeze` para eliminar la restricción."

Si el bug abarca todo el repositorio o el alcance es genuinamente incierto, omite el bloqueo y explica por qué.

**Si FREEZE_UNAVAILABLE:** Omite el bloqueo de alcance. Las ediciones no tienen restricción.

---

## Fase 2: Análisis de Patrones

Comprueba si este bug coincide con un patrón conocido:

| Patrón | Firma | Dónde buscar |
|--------|-------|--------------|
| Condición de carrera | Intermitente, dependiente del timing | Acceso concurrente a estado compartido |
| Propagación nil/null | NoMethodError, TypeError | Guards faltantes en valores opcionales |
| Corrupción de estado | Datos inconsistentes, actualizaciones parciales | Transacciones, callbacks, hooks |
| Fallo de integración | Timeout, respuesta inesperada | Llamadas a API externas, fronteras de servicio |
| Deriva de configuración | Funciona en local, falla en staging/prod | Variables de entorno, feature flags, estado de BD |
| Caché obsoleta | Muestra datos antiguos, se arregla al limpiar caché | Redis, CDN, caché del navegador, Turbo |

También revisa:
- `TODOS.md` para problemas conocidos relacionados
- `git log` para correcciones previas en la misma área — **bugs recurrentes en los mismos archivos son un olor arquitectónico**, no una coincidencia

**Búsqueda externa de patrones:** Si el bug no coincide con ningún patrón conocido de los anteriores, busca con WebSearch:
- "{framework} {tipo genérico de error}" — **sanitiza primero:** elimina hostnames, IPs, rutas de archivos, SQL, datos de clientes. Busca la categoría del error, no el mensaje sin procesar.
- "{librería} {componente} problemas conocidos"

Si WebSearch no está disponible, omite esta búsqueda y continúa con la verificación de hypothesis. Si aparece una solución documentada o un bug conocido de dependencia, preséntalo como hypothesis candidata en la Fase 3.

---

## Fase 3: Verificación de Hypothesis

Antes de escribir CUALQUIER corrección, verifica tu hypothesis.

1. **Confirmar la hypothesis:** Añade un log temporal, una aserción o una salida de debug en el root cause sospechado. Ejecuta la reproducción. ¿La evidencia coincide?

2. **Si la hypothesis es incorrecta:** Antes de formular la siguiente hypothesis, considera buscar el error. **Sanitiza primero** — elimina hostnames, IPs, rutas de archivos, fragmentos SQL, identificadores de clientes y cualquier dato interno/propietario del mensaje de error. Busca solo el tipo genérico de error y el contexto del framework: "{componente} {tipo de error sanitizado} {versión del framework}". Si el mensaje de error es demasiado específico para sanitizar de forma segura, omite la búsqueda. Si WebSearch no está disponible, omite y continúa. Luego vuelve a la Fase 1. Recopila más evidencia. No adivines.

3. **Regla de 3 intentos:** Si 3 hypothesis fallan, **DETENTE**. Usa AskUserQuestion:
   ```
   3 hypothesis probadas, ninguna coincide. Esto puede ser un problema
   arquitectónico en lugar de un bug simple.

   A) Continuar investigando — tengo una nueva hypothesis: [describir]
   B) Escalar para revisión humana — esto necesita a alguien que conozca el sistema
   C) Añadir logging y esperar — instrumentar el área y capturarlo la próxima vez
   ```

**Señales de alarma** — si ves alguna de estas, ve más despacio:
- "Corrección rápida por ahora" — no existe "por ahora." Corrígelo bien o escala.
- Proponer una corrección antes de trazar el flujo de datos — estás adivinando.
- Cada corrección revela un nuevo problema en otro lugar — capa incorrecta, no código incorrecto.

---

## Fase 4: Implementación

Una vez confirmado el root cause:

1. **Corrige el root cause, no el síntoma.** El cambio más pequeño que elimine el problema real.

2. **Diff mínimo:** Menos archivos tocados, menos líneas cambiadas. Resiste la tentación de refactorizar código adyacente.

3. **Escribe un test de regresión** que:
   - **Falle** sin la corrección (demuestra que el test es significativo)
   - **Pase** con la corrección (demuestra que la corrección funciona)

4. **Ejecuta la suite completa de tests.** Pega el resultado. No se permiten regresiones.

5. **Si la corrección toca >5 archivos:** Usa AskUserQuestion para señalar el radio de impacto:
   ```
   Esta corrección toca N archivos. Es un radio de impacto grande para una corrección de bug.
   A) Proceder — el root cause genuinamente abarca estos archivos
   B) Dividir — corregir la ruta crítica ahora, diferir el resto
   C) Replantear — quizás hay un enfoque más focalizado
   ```

---

## Fase 5: Verificación e Informe

**Verificación limpia:** Reproduce el escenario original del bug y confirma que está corregido. Esto no es opcional.

Ejecuta la suite de tests y pega el resultado.

Genera un informe estructurado de debug:
```
DEBUG REPORT
════════════════════════════════════════
Symptom:         [lo que el usuario observó]
Root cause:      [qué estaba realmente mal]
Fix:             [qué se cambió, con referencias archivo:línea]
Evidence:        [resultado de tests, intento de reproducción mostrando que la corrección funciona]
Regression test: [archivo:línea del nuevo test]
Related:         [elementos de TODOS.md, bugs previos en la misma área, notas arquitectónicas]
Status:          DONE | DONE_WITH_CONCERNS | BLOCKED
════════════════════════════════════════
```

---

## Reglas Importantes

- **3+ intentos fallidos de corrección → DETENTE y cuestiona la arquitectura.** Arquitectura incorrecta, no hypothesis fallida.
- **Nunca apliques una corrección que no puedas verificar.** Si no puedes reproducir y confirmar, no la despliegues.
- **Nunca digas "esto debería arreglarlo."** Verifica y demuéstralo. Ejecuta los tests.
- **Si la corrección toca >5 archivos → AskUserQuestion** sobre el radio de impacto antes de continuar.
- **Estado de finalización:**
  - DONE — root cause encontrado, corrección aplicada, test de regresión escrito, todos los tests pasan
  - DONE_WITH_CONCERNS — corregido pero no se puede verificar completamente (p. ej., bug intermitente, requiere staging)
  - BLOCKED — root cause no claro después de la investigación, escalado
