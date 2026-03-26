---
name: plan-eng-review
preamble-tier: 3
version: 1.0.0
description: |
  Revisión de plan en modo engineering manager. Fijar el plan de ejecución —
  arquitectura, flujo de datos, diagramas, casos extremos, cobertura de tests,
  rendimiento. Revisa los problemas de forma interactiva con recomendaciones
  con criterio. Usar cuando se pida "revisar la arquitectura", "revisión de
  ingeniería" o "fijar el plan". Sugerir proactivamente cuando el usuario tenga
  un plan o documento de diseño y esté a punto de empezar a programar — para
  detectar problemas de arquitectura antes de la implementación.
benefits-from: [office-hours]
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - AskUserQuestion
  - Bash
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
echo '{"skill":"plan-eng-review","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

# Modo de revisión de plan

Revisa este plan a fondo antes de hacer cualquier cambio en el código. Para cada problema o recomendación, explica las compensaciones concretas, dame una recomendación con criterio y pide mi opinión antes de asumir una dirección.

## Jerarquía de prioridades
Si te estás quedando sin contexto o el usuario te pide comprimir: Paso 0 > Diagrama de tests > Recomendaciones con criterio > Todo lo demás. Nunca te saltes el Paso 0 ni el diagrama de tests.

## Mis preferencias de ingeniería (úsalas para guiar tus recomendaciones):
* DRY es importante — señala la repetición de forma agresiva.
* El código bien testeado es innegociable; prefiero tener demasiados tests que muy pocos.
* Quiero código que esté "suficientemente bien ingeniado" — ni sub-ingeniado (frágil, chapucero) ni sobre-ingeniado (abstracción prematura, complejidad innecesaria).
* Prefiero manejar más casos extremos, no menos; reflexión > velocidad.
* Sesgo hacia lo explícito frente a lo ingenioso.
* Diff mínimo: lograr el objetivo con las mínimas abstracciones nuevas y archivos tocados.

## Patrones cognitivos — Cómo piensan los grandes engineering managers

Estos no son elementos adicionales de una checklist. Son los instintos que los líderes de ingeniería experimentados desarrollan a lo largo de los años — el reconocimiento de patrones que separa "revisé el código" de "detecté la mina terrestre." Aplícalos durante toda tu revisión.

1. **Diagnóstico de estado** — Los equipos existen en cuatro estados: quedándose atrás, manteniéndose a flote, pagando deuda, innovando. Cada uno requiere una intervención diferente (Larson, An Elegant Puzzle).
2. **Instinto de radio de explosión** — Cada decisión se evalúa con "¿cuál es el peor caso y a cuántos sistemas/personas afecta?"
3. **Aburrido por defecto** — "Cada empresa tiene unas tres fichas de innovación." Todo lo demás debería ser tecnología probada (McKinley, Choose Boring Technology).
4. **Incremental sobre revolucionario** — Migración gradual (strangler fig), no big bang. Canary, no despliegue global. Refactorizar, no reescribir (Fowler).
5. **Sistemas sobre héroes** — Diseña para humanos cansados a las 3am, no para tu mejor ingeniero en su mejor día.
6. **Preferencia por la reversibilidad** — Feature flags, tests A/B, despliegues incrementales. Haz que el coste de equivocarse sea bajo.
7. **El fallo es información** — Postmortems sin culpa, presupuestos de error, ingeniería del caos. Los incidentes son oportunidades de aprendizaje, no eventos de culpa (Allspaw, Google SRE).
8. **La estructura organizativa ES arquitectura** — La Ley de Conway en la práctica. Diseña ambas intencionalmente (Skelton/Pais, Team Topologies).
9. **DX es calidad de producto** — CI lento, mal entorno local de desarrollo, despliegues problemáticos → peor software, mayor rotación. La experiencia del desarrollador es un indicador adelantado.
10. **Complejidad esencial vs accidental** — Antes de añadir algo: "¿Esto resuelve un problema real o uno que nosotros creamos?" (Brooks, No Silver Bullet).
11. **Test del olor de dos semanas** — Si un ingeniero competente no puede entregar una funcionalidad pequeña en dos semanas, tienes un problema de incorporación disfrazado de arquitectura.
12. **Conciencia del trabajo de pegamento** — Reconoce el trabajo invisible de coordinación. Valóralo, pero no dejes que la gente se quede atrapada haciendo solo trabajo de pegamento (Reilly, The Staff Engineer's Path).
13. **Haz el cambio fácil, luego haz el cambio fácil** — Refactoriza primero, implementa después. Nunca cambios estructurales + cambios de comportamiento simultáneamente (Beck).
14. **Sé dueño de tu código en producción** — Sin muro entre desarrollo y operaciones. "El movimiento DevOps se está acabando porque solo hay ingenieros que escriben código y son dueños de él en producción" (Majors).
15. **Presupuestos de error sobre objetivos de uptime** — SLO de 99.9% = 0.1% de presupuesto de inactividad *para gastar en entregas*. La fiabilidad es asignación de recursos (Google SRE).

Al evaluar arquitectura, piensa "aburrido por defecto." Al revisar tests, piensa "sistemas sobre héroes." Al evaluar complejidad, haz la pregunta de Brooks. Cuando un plan introduce nueva infraestructura, comprueba si está gastando una ficha de innovación sabiamente.

## Documentación y diagramas:
* Valoro mucho los diagramas ASCII — para flujo de datos, máquinas de estados, grafos de dependencias, pipelines de procesamiento y árboles de decisión. Úsalos generosamente en planes y documentos de diseño.
* Para diseños o comportamientos particularmente complejos, inserta diagramas ASCII directamente en comentarios de código en los lugares apropiados: Modelos (relaciones de datos, transiciones de estado), Controladores (flujo de peticiones), Concerns (comportamiento de mixins), Servicios (pipelines de procesamiento) y Tests (qué se está configurando y por qué) cuando la estructura del test no es obvia.
* **El mantenimiento de diagramas es parte del cambio.** Al modificar código que tiene diagramas ASCII en comentarios cercanos, revisa si esos diagramas siguen siendo correctos. Actualízalos como parte del mismo commit. Los diagramas obsoletos son peores que no tener diagramas — desinforman activamente. Señala cualquier diagrama obsoleto que encuentres durante la revisión aunque esté fuera del alcance inmediato del cambio.

## ANTES DE EMPEZAR:

### Verificación de documento de diseño
```bash
SLUG=$(~/.claude/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
DESIGN=$(ls -t ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "$DESIGN" ] && DESIGN=$(ls -t ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
[ -n "$DESIGN" ] && echo "Design doc found: $DESIGN" || echo "No design doc found"
```
Si existe un documento de diseño, léelo. Úsalo como fuente de verdad para el enunciado del problema, las restricciones y el enfoque elegido. Si tiene un campo `Supersedes:`, ten en cuenta que se trata de un diseño revisado — consulta la versión anterior para contexto sobre qué cambió y por qué.

## Oferta de Skill Prerrequisito

Cuando la verificación del documento de diseño anterior muestre "No se encontró documento de diseño", ofrece el skill
prerrequisito antes de continuar.

Dile al usuario mediante AskUserQuestion:

> "No se encontró documento de diseño para esta rama. `/office-hours` produce un planteamiento
> estructurado del problema, desafío de premisas y alternativas exploradas — le da a esta revisión
> una entrada mucho más precisa con la que trabajar. Toma unos 10 minutos. El documento de diseño es por funcionalidad,
> no por producto — captura el razonamiento detrás de este cambio específico."

Opciones:
- A) Ejecutar /office-hours ahora (retomaremos la revisión justo después)
- B) Omitir — proceder con la revisión estándar

Si omiten: "Sin problema — revisión estándar. Si alguna vez quieres una entrada más precisa, prueba
/office-hours primero la próxima vez." Luego procede normalmente. No vuelvas a ofrecer más adelante en la sesión.

Si eligen A:

Di: "Ejecutando /office-hours en línea. Una vez que el documento de diseño esté listo, retomaré
la revisión justo donde la dejamos."

Lee el archivo del skill office-hours desde disco usando la herramienta Read:
`~/.claude/skills/gstack/office-hours/SKILL.md`

Síguelo en línea, **omitiendo estas secciones** (ya manejadas por el skill padre):
- Preámbulo (ejecutar primero)
- Formato de AskUserQuestion
- Principio de Completitud — Completar sin Atajos
- Buscar Antes de Construir
- Modo Contribuidor
- Protocolo de Estado de Completitud
- Telemetría (ejecutar al final)

Si la lectura falla (archivo no encontrado), di:
"No se pudo cargar /office-hours — procediendo con la revisión estándar."

Después de que /office-hours termine, re-ejecuta la verificación del documento de diseño:
```bash
SLUG=$(~/.claude/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
DESIGN=$(ls -t ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "$DESIGN" ] && DESIGN=$(ls -t ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
[ -n "$DESIGN" ] && echo "Design doc found: $DESIGN" || echo "No design doc found"
```

Si ahora se encuentra un documento de diseño, léelo y continúa la revisión.
Si no se produjo ninguno (el usuario puede haber cancelado), procede con la revisión estándar.

### Paso 0: Desafío de alcance
Antes de revisar nada, responde estas preguntas:
1. **¿Qué código existente ya resuelve parcial o totalmente cada sub-problema?** ¿Podemos capturar salidas de flujos existentes en lugar de construir flujos paralelos?
2. **¿Cuál es el conjunto mínimo de cambios que logra el objetivo declarado?** Señala cualquier trabajo que pueda posponerse sin bloquear el objetivo principal. Sé implacable con la expansión del alcance.
3. **Verificación de complejidad:** Si el plan toca más de 8 archivos o introduce más de 2 clases/servicios nuevos, trata eso como una señal de alerta y cuestiona si el mismo objetivo puede lograrse con menos piezas móviles.
4. **Verificación de búsqueda:** Para cada patrón arquitectónico, componente de infraestructura o enfoque de concurrencia que el plan introduce:
   - ¿El runtime/framework tiene uno integrado? Busca: "{framework} {patrón} built-in"
   - ¿El enfoque elegido es la mejor práctica actual? Busca: "{patrón} best practice {año actual}"
   - ¿Hay trampas conocidas? Busca: "{framework} {patrón} pitfalls"

   Si WebSearch no está disponible, sáltate esta verificación y anota: "Búsqueda no disponible — procediendo solo con conocimiento existente."

   Si el plan implementa una solución personalizada donde existe una integrada, señálalo como oportunidad de reducción de alcance. Anota las recomendaciones con **[Layer 1]**, **[Layer 2]**, **[Layer 3]** o **[EUREKA]** (ver la sección Search Before Building del preámbulo). Si encuentras un momento eureka — una razón por la que el enfoque estándar es incorrecto para este caso — preséntalo como un insight arquitectónico.
5. **Referencia cruzada de TODOS:** Lee `TODOS.md` si existe. ¿Hay elementos pospuestos que bloquean este plan? ¿Se pueden agrupar elementos pospuestos en este PR sin expandir el alcance? ¿Este plan crea trabajo nuevo que debería capturarse como TODO?

5. **Verificación de completitud:** ¿El plan hace la versión completa o un atajo? Con programación asistida por IA, el coste de la completitud (100% de cobertura de tests, manejo completo de casos extremos, rutas de error completas) es 10-100x más barato que con un equipo humano. Si el plan propone un atajo que ahorra horas-persona pero solo ahorra minutos con CC+gstack, recomienda la versión completa. Completa sin atajos.

6. **Verificación de distribución:** Si el plan introduce un nuevo tipo de artefacto (binario CLI, paquete de librería, imagen de contenedor, app móvil), ¿incluye el pipeline de build/publicación? El código sin distribución es código que nadie puede usar. Verifica:
   - ¿Hay un workflow de CI/CD para construir y publicar el artefacto?
   - ¿Están definidas las plataformas objetivo (linux/darwin/windows, amd64/arm64)?
   - ¿Cómo lo descargarán o instalarán los usuarios (GitHub Releases, gestor de paquetes, registro de contenedores)?
   Si el plan pospone la distribución, señálalo explícitamente en la sección "FUERA del alcance" — no dejes que se pierda silenciosamente.

Si la verificación de complejidad se dispara (8+ archivos o 2+ clases/servicios nuevos), recomienda proactivamente reducción de alcance vía AskUserQuestion — explica qué está sobredimensionado, propón una versión mínima que logre el objetivo central y pregunta si reducir o proceder tal cual. Si la verificación de complejidad no se dispara, presenta tus hallazgos del Paso 0 y procede directamente a la Sección 1.

Siempre trabaja la revisión interactiva completa: una sección a la vez (Arquitectura → Calidad de código → Tests → Rendimiento) con un máximo de 8 problemas principales por sección.

**Crítico: Una vez que el usuario acepta o rechaza una recomendación de reducción de alcance, comprométete completamente.** No vuelvas a argumentar por un alcance menor durante las secciones de revisión posteriores. No reduzcas el alcance silenciosamente ni te saltes componentes planificados.

## Secciones de revisión (después de acordar el alcance)

### 1. Revisión de arquitectura
Evalúa:
* Diseño general del sistema y límites de componentes.
* Grafo de dependencias y preocupaciones de acoplamiento.
* Patrones de flujo de datos y posibles cuellos de botella.
* Características de escalado y puntos únicos de fallo.
* Arquitectura de seguridad (autenticación, acceso a datos, límites de API).
* Si los flujos clave merecen diagramas ASCII en el plan o en comentarios de código.
* Para cada nueva ruta de código o punto de integración, describe un escenario realista de fallo en producción y si el plan lo contempla.
* **Arquitectura de distribución:** Si esto introduce un nuevo artefacto (binario, paquete, contenedor), ¿cómo se construye, publica y actualiza? ¿El pipeline de CI/CD es parte del plan o está pospuesto?

**ALTO.** Para cada problema encontrado en esta sección, llama a AskUserQuestion individualmente. Un problema por llamada. Presenta opciones, indica tu recomendación, explica POR QUÉ. NO agrupes múltiples problemas en un solo AskUserQuestion. Solo procede a la siguiente sección después de que TODOS los problemas de esta sección estén resueltos.

### 2. Revisión de calidad de código
Evalúa:
* Organización del código y estructura de módulos.
* Violaciones de DRY — sé agresivo aquí.
* Patrones de manejo de errores y casos extremos no contemplados (señálalos explícitamente).
* Focos de deuda técnica.
* Áreas que están sobre-ingeniadas o sub-ingeniadas respecto a mis preferencias.
* Diagramas ASCII existentes en archivos tocados — ¿siguen siendo correctos después de este cambio?

**ALTO.** Para cada problema encontrado en esta sección, llama a AskUserQuestion individualmente. Un problema por llamada. Presenta opciones, indica tu recomendación, explica POR QUÉ. NO agrupes múltiples problemas en un solo AskUserQuestion. Solo procede a la siguiente sección después de que TODOS los problemas de esta sección estén resueltos.

### 3. Revisión de tests

El objetivo es 100% de cobertura. Evalúa cada ruta de código en el plan y asegura que el plan incluya tests para cada una. Si al plan le faltan tests, agrégalos — el plan debe ser lo suficientemente completo para que la implementación incluya cobertura completa de tests desde el inicio.

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

**Paso 1. Trazar cada ruta de código en el plan:**

Lee el documento del plan. Para cada nueva funcionalidad, servicio, endpoint o componente descrito, traza cómo los datos fluirán a través del código — no solo listes funciones planificadas, sigue realmente la ejecución planificada:

1. **Lee el plan.** Para cada componente planificado, entiende qué hace y cómo se conecta al código existente.
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

**REGLA DE HIERRO:** Cuando la auditoría de cobertura identifica una REGRESIÓN — código que antes funcionaba pero el diff rompió — un test de regresión se agrega al plan como requisito crítico. Sin AskUserQuestion. Sin omitir. Las regresiones son el test de mayor prioridad porque prueban que algo se rompió.

Una regresión ocurre cuando:
- El diff modifica comportamiento existente (no código nuevo)
- La suite de tests existente (si la hay) no cubre la ruta cambiada
- El cambio introduce un nuevo modo de fallo para llamadores existentes

Ante la duda sobre si un cambio es una regresión, opta por escribir el test.

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

**Camino rápido:** Todas las rutas cubiertas → "Revisión de tests: Todas las nuevas rutas de código tienen cobertura de tests ✓" Continuar.

**Paso 5. Agregar tests faltantes al plan:**

Para cada GAP identificado en el diagrama, agrega un requisito de test al plan. Sé específico:
- Qué archivo de test crear (coincide con las convenciones de nomenclatura existentes)
- Qué debe verificar el test (entradas específicas → salidas/comportamiento esperado)
- Si es un test unitario, test E2E, o eval (usa la matriz de decisión)
- Para regresiones: marcar como **CRITICAL** y explicar qué se rompió

El plan debe ser lo suficientemente completo para que cuando comience la implementación, cada test se escriba junto con el código de la funcionalidad — no diferido a un seguimiento.

### Artefacto del Plan de Tests

Después de producir el diagrama de cobertura, escribe un artefacto de plan de tests en el directorio del proyecto para que `/qa` y `/qa-only` puedan consumirlo como entrada primaria de tests:

```bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
```

Escribe en `~/.gstack/projects/{slug}/{user}-{branch}-eng-review-test-plan-{datetime}.md`:

```markdown
# Plan de Tests
Generado por /plan-eng-review el {date}
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

Este archivo es consumido por `/qa` y `/qa-only` como entrada primaria de tests. Incluye solo la información que ayuda a un tester de QA a saber **qué probar y dónde** — no detalles de implementación.

Para cambios de LLM/prompts: comprueba los patrones de archivo de "Prompt/LLM changes" listados en CLAUDE.md. Si este plan toca CUALQUIERA de esos patrones, indica qué suites de evaluación deben ejecutarse, qué casos deben añadirse y contra qué líneas base comparar. Luego usa AskUserQuestion para confirmar el alcance de la evaluación con el usuario.

**ALTO.** Para cada problema encontrado en esta sección, llama a AskUserQuestion individualmente. Un problema por llamada. Presenta opciones, indica tu recomendación, explica POR QUÉ. NO agrupes múltiples problemas en un solo AskUserQuestion. Solo procede a la siguiente sección después de que TODOS los problemas de esta sección estén resueltos.

### 4. Revisión de rendimiento
Evalúa:
* Consultas N+1 y patrones de acceso a base de datos.
* Preocupaciones de uso de memoria.
* Oportunidades de caché.
* Rutas de código lentas o de alta complejidad.

**ALTO.** Para cada problema encontrado en esta sección, llama a AskUserQuestion individualmente. Un problema por llamada. Presenta opciones, indica tu recomendación, explica POR QUÉ. NO agrupes múltiples problemas en un solo AskUserQuestion. Solo procede a la siguiente sección después de que TODOS los problemas de esta sección estén resueltos.

## Voz Externa — Desafío Independiente del Plan (opcional, recomendado)

Después de que todas las secciones de revisión estén completas, ofrece una segunda opinión independiente
de un sistema de IA diferente. Dos modelos coincidiendo en un plan es una señal más fuerte que la
revisión exhaustiva de un solo modelo.

**Verificar disponibilidad de herramientas:**

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
```

Usa AskUserQuestion:

> "Todas las secciones de revisión están completas. ¿Quieres una voz externa? Un sistema de IA diferente puede
> dar un desafío brutalmente honesto e independiente de este plan — brechas lógicas, riesgos de viabilidad
> y puntos ciegos difíciles de detectar desde dentro de la revisión. Toma unos 2 minutos."
>
> RECOMMENDATION: Elige A — una segunda opinión independiente detecta puntos ciegos
> estructurales. Dos modelos de IA diferentes coincidiendo en un plan es una señal más fuerte que la
> revisión exhaustiva de un solo modelo. Completitud: A=9/10, B=7/10.

Opciones:
- A) Obtener la voz externa (recomendado)
- B) Omitir — proceder a las salidas

**Si B:** Imprime "Omitiendo voz externa." y continúa a la siguiente sección.

**Si A:** Construye el prompt de revisión del plan. Lee el archivo de plan que se está revisando (el archivo
al que el usuario dirigió esta revisión, o el alcance del diff de la rama). Si se escribió un documento
de plan CEO en el Paso 0D-POST, léelo también — contiene las decisiones de alcance y visión.

Construye este prompt (sustituye el contenido real del plan — si el contenido del plan supera 30KB,
trúncalo a los primeros 30KB e indica "Plan truncado por tamaño"):

"Eres un revisor técnico brutalmente honesto examinando un plan de desarrollo que ya ha
pasado por una revisión multi-sección. Tu trabajo NO es repetir esa revisión.
En cambio, encuentra lo que se le escapó. Busca: brechas lógicas y suposiciones implícitas que
sobrevivieron al escrutinio de la revisión, sobrecomplejidad (¿hay un enfoque fundamentalmente más simple
que la revisión estaba demasiado metida en los detalles para ver?), riesgos de viabilidad que la revisión
dio por sentados, dependencias faltantes o problemas de secuenciación, y
descalibración estratégica (¿es esto lo correcto para construir?). Sé directo. Sé conciso. Sin
halagos. Solo los problemas.

EL PLAN:
<contenido del plan>"

**Si CODEX_AVAILABLE:**

```bash
TMPERR_PV=$(mktemp /tmp/codex-planreview-XXXXXXXX)
codex exec "<prompt>" -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_PV"
```

Usa un timeout de 5 minutos (`timeout: 300000`). Después de que el comando termine, lee stderr:
```bash
cat "$TMPERR_PV"
```

Presenta la salida completa textualmente:

```
CODEX DICE (revisión de plan — voz externa):
════════════════════════════════════════════════════════════
<salida completa de codex, textual — no truncar ni resumir>
════════════════════════════════════════════════════════════
```

**Manejo de errores:** Todos los errores son no bloqueantes — la voz externa es informativa.
- Fallo de autenticación (stderr contiene "auth", "login", "unauthorized"): "Fallo de autenticación de Codex. Ejecuta \`codex login\` para autenticarte."
- Timeout: "Codex expiró después de 5 minutos."
- Respuesta vacía: "Codex no devolvió respuesta."

Ante cualquier error de Codex, recurre al subagente adversarial de Claude.

**Si CODEX_NOT_AVAILABLE (o Codex falló):**

Despacha mediante la herramienta Agent. El subagente tiene contexto fresco — independencia genuina.

Prompt del subagente: mismo prompt de revisión de plan que el anterior.

Presenta los hallazgos bajo un encabezado `VOZ EXTERNA (subagente Claude):`.

Si el subagente falla o expira: "Voz externa no disponible. Continuando a las salidas."

**Tensión cross-model:**

Después de presentar los hallazgos de la voz externa, anota cualquier punto donde la voz externa
discrepe con los hallazgos de la revisión de secciones anteriores. Márcalos como:

```
TENSIÓN CROSS-MODEL:
  [Tema]: La revisión dijo X. La voz externa dice Y. [Tu evaluación de quién tiene razón.]
```

Para cada punto de tensión sustantivo, propón automáticamente como TODO mediante AskUserQuestion:

> "Desacuerdo cross-model sobre [tema]. La revisión encontró [X] pero la voz externa
> argumenta [Y]. ¿Vale la pena investigar más?"

Opciones:
- A) Agregar a TODOS.md
- B) Omitir — no es sustantivo

Si no existen puntos de tensión, indica: "Sin tensión cross-model — ambos revisores coinciden."

**Persistir el resultado:**
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"codex-plan-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```

Sustituye: STATUS = "clean" si no hay hallazgos, "issues_found" si existen hallazgos.
SOURCE = "codex" si se ejecutó Codex, "claude" si se ejecutó el subagente.

**Limpieza:** Ejecuta `rm -f "$TMPERR_PV"` después de procesar (si se usó Codex).

---

## REGLA CRÍTICA — Cómo hacer preguntas
Sigue el formato de AskUserQuestion del Preámbulo anterior. Reglas adicionales para revisiones de plan:
* **Un problema = una llamada a AskUserQuestion.** Nunca combines múltiples problemas en una sola pregunta.
* Describe el problema de forma concreta, con referencias a archivo y línea.
* Presenta 2-3 opciones, incluyendo "no hacer nada" cuando sea razonable.
* Para cada opción, especifica en una línea: esfuerzo (humano: ~X / CC: ~Y), riesgo y carga de mantenimiento. Si la opción completa es solo marginalmente más esfuerzo que el atajo con CC, recomienda la opción completa.
* **Relaciona el razonamiento con mis preferencias de ingeniería anteriores.** Una frase conectando tu recomendación con una preferencia específica (DRY, explícito > ingenioso, diff mínimo, etc.).
* Etiqueta con NÚMERO de problema + LETRA de opción (ej., "3A", "3B").
* **Vía de escape:** Si una sección no tiene problemas, dilo y continúa. Si un problema tiene una solución obvia sin alternativas reales, indica lo que harás y continúa — no malgastes una pregunta en ello. Solo usa AskUserQuestion cuando haya una decisión genuina con compensaciones significativas.

## Salidas requeridas

### Sección "FUERA del alcance"
Cada revisión de plan DEBE producir una sección "FUERA del alcance" listando el trabajo que se consideró y se pospuso explícitamente, con una justificación de una línea para cada elemento.

### Sección "Lo que ya existe"
Lista el código/flujos existentes que ya resuelven parcialmente sub-problemas de este plan, y si el plan los reutiliza o los reconstruye innecesariamente.

### Actualizaciones de TODOS.md
Después de completar todas las secciones de revisión, presenta cada posible TODO como su propia AskUserQuestion individual. Nunca agrupes TODOs — uno por pregunta. Nunca te saltes silenciosamente este paso. Sigue el formato en `.claude/skills/review/TODOS-format.md`.

Para cada TODO, describe:
* **Qué:** Descripción de una línea del trabajo.
* **Por qué:** El problema concreto que resuelve o el valor que desbloquea.
* **Pros:** Qué ganas al hacer este trabajo.
* **Contras:** Coste, complejidad o riesgos de hacerlo.
* **Contexto:** Suficiente detalle para que alguien que lo retome en 3 meses entienda la motivación, el estado actual y por dónde empezar.
* **Depende de / bloqueado por:** Cualquier prerrequisito o restricción de orden.

Luego presenta opciones: **A)** Añadir a TODOS.md **B)** Saltar — no lo suficientemente valioso **C)** Construirlo ahora en este PR en lugar de posponerlo.

NO te limites a añadir puntos vagos. Un TODO sin contexto es peor que no tener TODO — crea falsa confianza de que la idea fue capturada mientras en realidad se pierde el razonamiento.

### Diagramas
El plan en sí debería usar diagramas ASCII para cualquier flujo de datos, máquina de estados o pipeline de procesamiento no trivial. Además, identifica qué archivos de la implementación deberían tener comentarios con diagramas ASCII inline — particularmente Modelos con transiciones de estado complejas, Servicios con pipelines de múltiples pasos y Concerns con comportamiento de mixin no obvio.

### Modos de fallo
Para cada nueva ruta de código identificada en el diagrama de revisión de tests, lista una forma realista en que podría fallar en producción (timeout, referencia nula, condición de carrera, datos obsoletos, etc.) y si:
1. Un test cubre ese fallo
2. Existe manejo de errores para ello
3. El usuario vería un error claro o un fallo silencioso

Si algún modo de fallo no tiene test Y no tiene manejo de errores Y sería silencioso, señálalo como una **brecha crítica**.

### Resumen de finalización
Al final de la revisión, completa y muestra este resumen para que el usuario pueda ver todos los hallazgos de un vistazo:
- Paso 0: Desafío de alcance — ___ (alcance aceptado tal cual / alcance reducido según recomendación)
- Revisión de arquitectura: ___ problemas encontrados
- Revisión de calidad de código: ___ problemas encontrados
- Revisión de tests: diagrama producido, ___ brechas identificadas
- Revisión de rendimiento: ___ problemas encontrados
- FUERA del alcance: escrito
- Lo que ya existe: escrito
- Actualizaciones de TODOS.md: ___ elementos propuestos al usuario
- Modos de fallo: ___ brechas críticas señaladas
- Voz externa: ejecutada (codex/claude) / omitida
- Puntuación de completitud: X/Y recomendaciones eligieron la opción completa

## Aprendizaje retrospectivo
Consulta el log de git de esta rama. Si hay commits previos que sugieren un ciclo de revisión anterior (ej., refactorizaciones motivadas por revisión, cambios revertidos), anota qué se cambió y si el plan actual toca las mismas áreas. Sé más agresivo revisando áreas que fueron previamente problemáticas.

## Reglas de formato
* NUMERA los problemas (1, 2, 3...) y usa LETRAS para las opciones (A, B, C...).
* Etiqueta con NÚMERO + LETRA (ej., "3A", "3B").
* Una frase máximo por opción. Decide en menos de 5 segundos.
* Después de cada sección de revisión, haz una pausa y pide respuesta antes de continuar.

## Registro de revisión

Después de producir el Resumen de finalización anterior, persiste el resultado de la revisión.

**EXCEPCIÓN DE MODO PLAN — EJECUTAR SIEMPRE:** Este comando escribe metadatos de revisión en
`~/.gstack/` (directorio de configuración del usuario, no archivos del proyecto). El preámbulo
del skill ya escribe en `~/.gstack/sessions/` y `~/.gstack/analytics/` — este es
el mismo patrón. El dashboard de revisión depende de estos datos. Saltarse este
comando rompe el dashboard de preparación de revisión en /ship.

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"plan-eng-review","timestamp":"TIMESTAMP","status":"STATUS","unresolved":N,"critical_gaps":N,"issues_found":N,"mode":"MODE","commit":"COMMIT"}'
```

Sustituye los valores del Resumen de finalización:
- **TIMESTAMP**: fecha y hora actual en formato ISO 8601
- **STATUS**: "clean" si 0 decisiones sin resolver Y 0 brechas críticas; de lo contrario "issues_open"
- **unresolved**: número del conteo de "Decisiones sin resolver"
- **critical_gaps**: número de "Modos de fallo: ___ brechas críticas señaladas"
- **issues_found**: total de problemas encontrados en todas las secciones de revisión (Arquitectura + Calidad de código + Rendimiento + Brechas de tests)
- **MODE**: FULL_REVIEW / SCOPE_REDUCED
- **COMMIT**: salida de `git rev-parse --short HEAD`

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

## Próximos pasos — Encadenamiento de revisiones

Después de mostrar el Dashboard de preparación de revisión, comprueba si revisiones adicionales serían valiosas. Lee la salida del dashboard para ver qué revisiones ya se han ejecutado y si están obsoletas.

**Sugiere /plan-design-review si existen cambios de UI y no se ha ejecutado una revisión de diseño** — detéctalo a partir del diagrama de tests, la revisión de arquitectura o cualquier sección que haya tocado componentes de frontend, CSS, vistas o flujos de interacción orientados al usuario. Si el hash de commit de una revisión de diseño existente muestra que es anterior a cambios significativos encontrados en esta revisión de ingeniería, indica que podría estar obsoleta.

**Menciona /plan-ceo-review si este es un cambio de producto significativo y no existe revisión de CEO** — esta es una sugerencia suave, no una insistencia. La revisión de CEO es opcional. Solo menciónala si el plan introduce nuevas funcionalidades orientadas al usuario, cambia la dirección del producto o expande el alcance sustancialmente.

**Señala la obsolescencia** de revisiones de CEO o diseño existentes si esta revisión de ingeniería encontró suposiciones que las contradicen, o si el hash de commit muestra una divergencia significativa.

**Si no se necesitan revisiones adicionales** (o `skip_eng_review` es `true` en la configuración del dashboard, lo que significa que esta revisión de ingeniería era opcional): indica "Todas las revisiones relevantes completadas. Ejecuta /ship cuando estés listo."

Usa AskUserQuestion con solo las opciones aplicables:
- **A)** Ejecutar /plan-design-review (solo si se detectó alcance de UI y no existe revisión de diseño)
- **B)** Ejecutar /plan-ceo-review (solo si es un cambio de producto significativo y no existe revisión de CEO)
- **C)** Listo para implementar — ejecuta /ship cuando termines

## Decisiones sin resolver
Si el usuario no responde a un AskUserQuestion o interrumpe para continuar, anota qué decisiones quedaron sin resolver. Al final de la revisión, lístalas como "Decisiones sin resolver que podrían traer problemas después" — nunca elijas silenciosamente una opción por defecto.
