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
echo '{"skill":"document-release","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

**Actualización del cuerpo del PR/MR (idempotente, segura ante concurrencia):**

1. Leer el cuerpo existente del PR/MR en un archivo temporal con PID único (usar la plataforma detectada en el Paso 0):

**If GitHub:**
```bash
gh pr view --json body -q .body > /tmp/gstack-pr-body-$$.md
```

**Si es GitLab:**
```bash
glab mr view -F json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" > /tmp/gstack-pr-body-$$.md
```

2. Si el archivo temporal ya contiene una sección `## Documentation`, reemplazar esa sección con el
   contenido actualizado. Si no contiene una, agregar una sección `## Documentation` al final.

3. La sección Documentation debe incluir una **vista previa del diff de documentación** — para cada archivo modificado,
   describir qué cambió específicamente (ej. "README.md: se agregó /document-release a la tabla de skills,
   se actualizó el conteo de skills de 9 a 10").

4. Escribir el cuerpo actualizado de vuelta:

**If GitHub:**
```bash
gh pr edit --body-file /tmp/gstack-pr-body-$$.md
```

**Si es GitLab:**
Leer el contenido de `/tmp/gstack-pr-body-$$.md` usando la herramienta Read, luego pasarlo a `glab mr update` usando un heredoc para evitar problemas con metacaracteres del shell:
```bash
glab mr update -d "$(cat <<'MRBODY'
<pegar el contenido del archivo aquí>
MRBODY
)"
```

5. Limpiar el archivo temporal:

```bash
rm -f /tmp/gstack-pr-body-$$.md
```

6. Si `gh pr view` / `glab mr view` falla (no existe PR/MR): omitir con el mensaje "No se encontró PR/MR — se omite la actualización del cuerpo."
7. Si `gh pr edit` / `glab mr update` falla: advertir "No se pudo actualizar el cuerpo del PR/MR — los cambios de documentación están en el
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
