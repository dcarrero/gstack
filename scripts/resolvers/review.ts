import type { TemplateContext } from './types';

export function generateReviewDashboard(_ctx: TemplateContext): string {
  return `## Panel de Estado de Revisiones

Después de completar la revisión, lee el registro de revisión y la configuración para mostrar el panel.

\`\`\`bash
~/.claude/skills/gstack/bin/gstack-review-read
\`\`\`

Analiza la salida. Encuentra la entrada más reciente de cada skill (plan-ceo-review, plan-eng-review, review, plan-design-review, design-review-lite, adversarial-review, codex-review, codex-plan-review). Ignora las entradas con timestamps de más de 7 días de antigüedad. Para la fila de Revisión de Ingeniería, muestra la más reciente entre \`review\` (revisión pre-landing del diff) y \`plan-eng-review\` (revisión de arquitectura en fase de planificación). Agrega "(DIFF)" o "(PLAN)" al estado para distinguir. Para la fila de Adversarial, muestra la más reciente entre \`adversarial-review\` (nuevo auto-escalado) y \`codex-review\` (legacy). Para Revisión de Diseño, muestra la más reciente entre \`plan-design-review\` (auditoría visual completa) y \`design-review-lite\` (verificación a nivel de código). Agrega "(FULL)" o "(LITE)" al estado para distinguir. Para la fila de Voz Externa, muestra la entrada más reciente de \`codex-plan-review\` — esta captura las voces externas tanto de /plan-ceo-review como de /plan-eng-review.

**Atribución de origen:** Si la entrada más reciente de un skill tiene un campo \\\`"via"\\\`, agrégalo a la etiqueta de estado entre paréntesis. Ejemplos: \`plan-eng-review\` con \`via:"autoplan"\` se muestra como "LIMPIA (PLAN vía /autoplan)". \`review\` con \`via:"ship"\` se muestra como "LIMPIA (DIFF vía /ship)". Las entradas sin campo \`via\` se muestran como "LIMPIA (PLAN)" o "LIMPIA (DIFF)" como antes.

Nota: las entradas \`autoplan-voices\` y \`design-outside-voices\` son solo de auditoría (datos forenses para análisis de consenso cross-model). No aparecen en el panel y ningún consumidor las verifica.

Muestra:

\`\`\`
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
\`\`\`

**Niveles de revisión:**
- **Revisión de Ingeniería (requerida por defecto):** La única revisión que bloquea el envío. Cubre arquitectura, calidad de código, tests, rendimiento. Se puede desactivar globalmente con \\\`gstack-config set skip_eng_review true\\\` (la opción "no me molestes").
- **Revisión CEO (opcional):** Usa tu criterio. Recomiéndala para cambios importantes de producto/negocio, nuevas funcionalidades visibles al usuario, o decisiones de alcance. Omítela para correcciones de bugs, refactorizaciones, infraestructura y limpieza.
- **Revisión de Diseño (opcional):** Usa tu criterio. Recomiéndala para cambios de UI/UX. Omítela para cambios solo de backend, infraestructura o solo de prompts.
- **Revisión Adversarial (automática):** Se escala automáticamente según el tamaño del diff. Diffs pequeños (<50 líneas) omiten la revisión adversarial. Diffs medianos (50–199) obtienen revisión adversarial cross-model. Diffs grandes (200+) obtienen los 4 pases: Claude estructurado, Codex estructurado, subagente adversarial de Claude, Codex adversarial. No requiere configuración.
- **Voz Externa (opcional):** Revisión independiente del plan desde un modelo de IA diferente. Se ofrece después de completar todas las secciones de revisión en /plan-ceo-review y /plan-eng-review. Recurre al subagente de Claude si Codex no está disponible. Nunca bloquea el envío.

**Lógica del veredicto:**
- **APROBADO**: La Revisión de Ingeniería tiene >= 1 entrada dentro de 7 días de \\\`review\\\` o \\\`plan-eng-review\\\` con estado "clean" (o \\\`skip_eng_review\\\` es \\\`true\\\`)
- **NO APROBADO**: Revisión de Ingeniería faltante, obsoleta (>7 días) o con incidencias abiertas
- Las revisiones de CEO, Diseño y Codex se muestran como contexto pero nunca bloquean el envío
- Si la configuración \\\`skip_eng_review\\\` es \\\`true\\\`, la Revisión de Ingeniería muestra "OMITIDA (global)" y el veredicto es APROBADO

**Detección de obsolescencia:** Después de mostrar el panel, comprueba si alguna revisión existente puede estar obsoleta:
- Analiza la sección \\\`---HEAD---\\\` de la salida de bash para obtener el hash del commit HEAD actual
- Para cada entrada de revisión que tenga un campo \\\`commit\\\`: compáralo con el HEAD actual. Si es diferente, cuenta los commits transcurridos: \\\`git rev-list --count STORED_COMMIT..HEAD\\\`. Muestra: "Nota: la revisión de {skill} del {date} puede estar obsoleta — {N} commits desde la revisión"
- Para entradas sin campo \\\`commit\\\` (entradas legacy): muestra "Nota: la revisión de {skill} del {date} no tiene seguimiento de commits — considera re-ejecutarla para una detección precisa de obsolescencia"
- Si todas las revisiones coinciden con el HEAD actual, no muestres notas de obsolescencia`;
}

export function generatePlanFileReviewReport(_ctx: TemplateContext): string {
  return `## Informe de Revisión del Archivo de Plan

Después de mostrar el Panel de Estado de Revisiones en la salida de la conversación, también actualiza
el **archivo de plan** para que el estado de la revisión sea visible para cualquiera que lea el plan.

### Detectar el archivo de plan

1. Comprueba si hay un archivo de plan activo en esta conversación (el host proporciona rutas
   de archivos de plan en mensajes del sistema — busca referencias a archivos de plan en el contexto de la conversación).
2. Si no se encuentra, omite esta sección silenciosamente — no todas las revisiones se ejecutan en modo plan.

### Generar el informe

Lee la salida del registro de revisión que ya tienes del paso del Panel de Estado de Revisiones anterior.
Analiza cada entrada JSONL. Cada skill registra campos diferentes:

- **plan-ceo-review**: \\\`status\\\`, \\\`unresolved\\\`, \\\`critical_gaps\\\`, \\\`mode\\\`, \\\`scope_proposed\\\`, \\\`scope_accepted\\\`, \\\`scope_deferred\\\`, \\\`commit\\\`
  → Hallazgos: "{scope_proposed} propuestas, {scope_accepted} aceptadas, {scope_deferred} diferidas"
  → Si los campos de scope son 0 o no existen (modo HOLD/REDUCTION): "modo: {mode}, {critical_gaps} brechas críticas"
- **plan-eng-review**: \\\`status\\\`, \\\`unresolved\\\`, \\\`critical_gaps\\\`, \\\`issues_found\\\`, \\\`mode\\\`, \\\`commit\\\`
  → Hallazgos: "{issues_found} incidencias, {critical_gaps} brechas críticas"
- **plan-design-review**: \\\`status\\\`, \\\`initial_score\\\`, \\\`overall_score\\\`, \\\`unresolved\\\`, \\\`decisions_made\\\`, \\\`commit\\\`
  → Hallazgos: "puntuación: {initial_score}/10 → {overall_score}/10, {decisions_made} decisiones"
- **codex-review**: \\\`status\\\`, \\\`gate\\\`, \\\`findings\\\`, \\\`findings_fixed\\\`
  → Hallazgos: "{findings} hallazgos, {findings_fixed}/{findings} corregidos"

Todos los campos necesarios para la columna de Hallazgos están ahora presentes en las entradas JSONL.
Para la revisión que acabas de completar, puedes usar detalles más ricos de tu propio Resumen
de Finalización. Para revisiones anteriores, usa los campos JSONL directamente — contienen todos los datos necesarios.

Genera esta tabla markdown:

\\\`\\\`\\\`markdown
## INFORME DE REVISIÓN GSTACK

| Revisión | Disparador | Por qué | Ejecuciones | Estado | Hallazgos |
|----------|------------|---------|-------------|--------|-----------|
| Rev. CEO | \\\`/plan-ceo-review\\\` | Alcance y estrategia | {runs} | {status} | {findings} |
| Rev. Codex | \\\`/codex review\\\` | 2.ª opinión independiente | {runs} | {status} | {findings} |
| Rev. Ingeniería | \\\`/plan-eng-review\\\` | Arquitectura y tests (requerida) | {runs} | {status} | {findings} |
| Rev. Diseño | \\\`/plan-design-review\\\` | Brechas de UI/UX | {runs} | {status} | {findings} |
\\\`\\\`\\\`

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

- Busca en el archivo de plan una sección \\\`## INFORME DE REVISIÓN GSTACK\\\` **en cualquier parte** del archivo
  (no solo al final — puede haberse agregado contenido después).
- Si se encuentra, **reemplázala** completamente usando la herramienta Edit. Busca desde \\\`## INFORME DE REVISIÓN GSTACK\\\`
  hasta el siguiente encabezado \\\`## \\\` o el final del archivo, lo que ocurra primero. Esto asegura que
  el contenido agregado después de la sección del informe se preserve, no se consuma. Si el Edit falla
  (ej.: una edición concurrente cambió el contenido), vuelve a leer el archivo de plan e intenta una vez más.
- Si no existe tal sección, **agrégala** al final del archivo de plan.
- Siempre colócala como la última sección del archivo de plan. Si se encontró a mitad del archivo,
  muévela: elimina la ubicación antigua y agrégala al final.`;
}

export function generateSpecReviewLoop(_ctx: TemplateContext): string {
  return `## Bucle de Revisión de Especificación

Antes de presentar el documento al usuario para su aprobación, ejecuta una revisión adversarial.

**Paso 1: Despachar subagente revisor**

Usa la herramienta Agent para despachar un revisor independiente. El revisor tiene contexto fresco
y no puede ver la conversación de brainstorming — solo el documento. Esto asegura una independencia
adversarial genuina.

Instruye al subagente con:
- La ruta del archivo del documento recién escrito
- "Lee este documento y revísalo en 5 dimensiones. Para cada dimensión, indica PASS o
  lista incidencias específicas con correcciones sugeridas. Al final, emite una puntuación de calidad (1-10)
  en todas las dimensiones."

**Dimensiones:**
1. **Completitud** — ¿Se abordan todos los requisitos? ¿Faltan casos extremos?
2. **Consistencia** — ¿Las partes del documento concuerdan entre sí? ¿Contradicciones?
3. **Claridad** — ¿Podría un ingeniero implementar esto sin hacer preguntas? ¿Lenguaje ambiguo?
4. **Alcance** — ¿El documento se expande más allá del problema original? ¿Violaciones de YAGNI?
5. **Viabilidad** — ¿Se puede construir realmente con el enfoque planteado? ¿Complejidad oculta?

El subagente debe devolver:
- Una puntuación de calidad (1-10)
- PASS si no hay incidencias, o una lista numerada de incidencias con dimensión, descripción y corrección

**Paso 2: Corregir y re-despachar**

Si el revisor devuelve incidencias:
1. Corrige cada incidencia en el documento en disco (usa la herramienta Edit)
2. Re-despacha el subagente revisor con el documento actualizado
3. Máximo 3 iteraciones en total

**Guarda de convergencia:** Si el revisor devuelve las mismas incidencias en iteraciones consecutivas
(la corrección no las resolvió o el revisor no está de acuerdo con la corrección), detén el bucle
y persiste esas incidencias como "Preocupaciones del Revisor" en el documento en lugar de seguir iterando.

Si el subagente falla, expira o no está disponible — omite el bucle de revisión por completo.
Dile al usuario: "Revisión de especificación no disponible — presentando documento sin revisar." El documento ya
está escrito en disco; la revisión es un bonus de calidad, no una puerta de paso.

**Paso 3: Informar y persistir métricas**

Después de que el bucle termine (PASS, iteraciones máximas, o guarda de convergencia):

1. Informa al usuario del resultado — resumen por defecto:
   "Tu documento sobrevivió N rondas de revisión adversarial. M incidencias encontradas y corregidas.
   Puntuación de calidad: X/10."
   Si preguntan "¿qué encontró el revisor?", muestra la salida completa del revisor.

2. Si quedan incidencias después de las iteraciones máximas o convergencia, agrega una sección "## Preocupaciones del Revisor"
   al documento listando cada incidencia sin resolver. Los skills posteriores lo verán.

3. Agrega métricas:
\`\`\`bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"${_ctx.skillName}","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","iterations":ITERATIONS,"issues_found":FOUND,"issues_fixed":FIXED,"remaining":REMAINING,"quality_score":SCORE}' >> ~/.gstack/analytics/spec-review.jsonl 2>/dev/null || true
\`\`\`
Reemplaza ITERATIONS, FOUND, FIXED, REMAINING, SCORE con los valores reales de la revisión.`;
}

export function generateBenefitsFrom(ctx: TemplateContext): string {
  if (!ctx.benefitsFrom || ctx.benefitsFrom.length === 0) return '';

  const skillList = ctx.benefitsFrom.map(s => `\`/${s}\``).join(' o ');
  const first = ctx.benefitsFrom[0];

  return `## Oferta de Skill Prerrequisito

Cuando la verificación del documento de diseño anterior muestre "No se encontró documento de diseño", ofrece el skill
prerrequisito antes de continuar.

Dile al usuario mediante AskUserQuestion:

> "No se encontró documento de diseño para esta rama. ${skillList} produce un planteamiento
> estructurado del problema, desafío de premisas y alternativas exploradas — le da a esta revisión
> una entrada mucho más precisa con la que trabajar. Toma unos 10 minutos. El documento de diseño es por funcionalidad,
> no por producto — captura el razonamiento detrás de este cambio específico."

Opciones:
- A) Ejecutar /${first} ahora (retomaremos la revisión justo después)
- B) Omitir — proceder con la revisión estándar

Si omiten: "Sin problema — revisión estándar. Si alguna vez quieres una entrada más precisa, prueba
/${first} primero la próxima vez." Luego procede normalmente. No vuelvas a ofrecer más adelante en la sesión.

Si eligen A:

Di: "Ejecutando /${first} en línea. Una vez que el documento de diseño esté listo, retomaré
la revisión justo donde la dejamos."

Lee el archivo del skill ${first} desde disco usando la herramienta Read:
\`~/.claude/skills/gstack/${first}/SKILL.md\`

Síguelo en línea, **omitiendo estas secciones** (ya manejadas por el skill padre):
- Preámbulo (ejecutar primero)
- Formato de AskUserQuestion
- Principio de Completitud — Completar sin Atajos
- Buscar Antes de Construir
- Modo Contribuidor
- Protocolo de Estado de Completitud
- Telemetría (ejecutar al final)

Si la lectura falla (archivo no encontrado), di:
"No se pudo cargar /${first} — procediendo con la revisión estándar."

Después de que /${first} termine, re-ejecuta la verificación del documento de diseño:
\`\`\`bash
SLUG=$(~/.claude/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
DESIGN=$(ls -t ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "$DESIGN" ] && DESIGN=$(ls -t ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
[ -n "$DESIGN" ] && echo "Design doc found: $DESIGN" || echo "No design doc found"
\`\`\`

Si ahora se encuentra un documento de diseño, léelo y continúa la revisión.
Si no se produjo ninguno (el usuario puede haber cancelado), procede con la revisión estándar.`;
}

export function generateCodexSecondOpinion(ctx: TemplateContext): string {
  // Codex host: strip entirely — Codex should never invoke itself
  if (ctx.host === 'codex') return '';

  return `## Fase 3.5: Segunda Opinión Cross-Model (opcional)

**Verificación binaria primero — sin pregunta si no está disponible:**

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

Si \`CODEX_NOT_AVAILABLE\`: omite la Fase 3.5 por completo — sin mensaje, sin AskUserQuestion. Procede directamente a la Fase 4.

Si \`CODEX_AVAILABLE\`: usa AskUserQuestion:

> ¿Quieres una segunda opinión de un modelo de IA diferente? Codex revisará independientemente tu planteamiento del problema, respuestas clave, premisas y hallazgos del landscape de esta sesión. No ha visto esta conversación — recibe un resumen estructurado. Suele tardar 2-5 minutos.
> A) Sí, obtener una segunda opinión
> B) No, proceder a las alternativas

Si B: omite la Fase 3.5 por completo. Recuerda que Codex NO se ejecutó (afecta al documento de diseño, señales del fundador y la Fase 4 a continuación).

**Si A: Ejecutar la lectura en frío de Codex.**

1. Ensambla un bloque de contexto estructurado de las Fases 1-3:
   - Modo (Startup o Builder)
   - Planteamiento del problema (de la Fase 1)
   - Respuestas clave de la Fase 2A/2B (resume cada P&R en 1-2 oraciones, incluye citas textuales del usuario)
   - Hallazgos del landscape (de la Fase 2.75, si se ejecutó la búsqueda)
   - Premisas acordadas (de la Fase 3)
   - Contexto del codebase (nombre del proyecto, lenguajes, actividad reciente)

2. **Escribe el prompt ensamblado en un archivo temporal** (evita inyección shell desde contenido derivado del usuario):

\`\`\`bash
CODEX_PROMPT_FILE=$(mktemp /tmp/gstack-codex-oh-XXXXXXXX.txt)
\`\`\`

Escribe el prompt completo (bloque de contexto + instrucciones) en este archivo. Usa la variante apropiada para el modo:

**Instrucciones modo Startup:** "Eres un asesor técnico independiente leyendo la transcripción de una sesión de brainstorming de startup. [BLOQUE DE CONTEXTO AQUÍ]. Tu trabajo: 1) ¿Cuál es la versión MÁS FUERTE de lo que esta persona intenta construir? Refuérzala en 2-3 oraciones. 2) ¿Cuál es la ÚNICA cosa de sus respuestas que más revela sobre lo que realmente debería construir? Cítala y explica por qué. 3) Nombra UNA premisa acordada que crees que es incorrecta, y qué evidencia te daría la razón. 4) Si tuvieras 48 horas y un ingeniero para construir un prototipo, ¿qué construirías? Sé específico — stack tecnológico, funcionalidades, qué omitirías. Sé directo. Sé conciso. Sin preámbulos."

**Instrucciones modo Builder:** "Eres un asesor técnico independiente leyendo la transcripción de una sesión de brainstorming de builder. [BLOQUE DE CONTEXTO AQUÍ]. Tu trabajo: 1) ¿Cuál es la versión MÁS GENIAL de esto que no han considerado? 2) ¿Cuál es la ÚNICA cosa de sus respuestas que revela qué les entusiasma más? Cítala. 3) ¿Qué proyecto de código abierto o herramienta existente les lleva al 50% del camino — y cuál es el 50% que necesitarían construir? 4) Si tuvieras un fin de semana para construir esto, ¿qué construirías primero? Sé específico. Sé directo. Sin preámbulos."

3. Ejecuta Codex:

\`\`\`bash
TMPERR_OH=$(mktemp /tmp/codex-oh-err-XXXXXXXX)
codex exec "$(cat "$CODEX_PROMPT_FILE")" -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_OH"
\`\`\`

Usa un timeout de 5 minutos (\`timeout: 300000\`). Después de que el comando termine, lee stderr:
\`\`\`bash
cat "$TMPERR_OH"
rm -f "$TMPERR_OH" "$CODEX_PROMPT_FILE"
\`\`\`

**Manejo de errores:** Todos los errores son no bloqueantes — la segunda opinión de Codex es una mejora de calidad, no un prerrequisito.
- **Fallo de autenticación:** Si stderr contiene "auth", "login", "unauthorized" o "API key": "Fallo de autenticación de Codex. Ejecuta \\\`codex login\\\` para autenticarte. Omitiendo segunda opinión."
- **Timeout:** "Codex expiró después de 5 minutos. Omitiendo segunda opinión."
- **Respuesta vacía:** "Codex no devolvió respuesta. Stderr: <pegar error relevante>. Omitiendo segunda opinión."

Ante cualquier error, procede a la Fase 4 — NO recurras a un subagente de Claude (esto es brainstorming, no revisión adversarial).

4. **Presentación:**

\`\`\`
SEGUNDA OPINIÓN (Codex):
════════════════════════════════════════════════════════════
<salida completa de codex, textual — no truncar ni resumir>
════════════════════════════════════════════════════════════
\`\`\`

5. **Síntesis cross-model:** Después de presentar la salida de Codex, proporciona una síntesis de 3-5 puntos:
   - Donde Claude coincide con Codex
   - Donde Claude discrepa y por qué
   - Si la premisa cuestionada por Codex cambia la recomendación de Claude

6. **Verificación de revisión de premisas:** Si Codex cuestionó una premisa acordada, usa AskUserQuestion:

> Codex cuestionó la premisa #{N}: "{texto de la premisa}". Su argumento: "{razonamiento}".
> A) Revisar esta premisa basándose en la aportación de Codex
> B) Mantener la premisa original — proceder a las alternativas

Si A: revisa la premisa y anota la revisión. Si B: procede (y anota que el usuario defendió esta premisa con razonamiento — esto es una señal de fundador si articulan POR QUÉ no están de acuerdo, no solo desestiman).`;
}

export function generateAdversarialStep(ctx: TemplateContext): string {
  // Codex host: strip entirely — Codex should never invoke itself
  if (ctx.host === 'codex') return '';

  const isShip = ctx.skillName === 'ship';
  const stepNum = isShip ? '3.8' : '5.7';

  return `## Paso ${stepNum}: Revisión adversarial (auto-escalada)

La exhaustividad de la revisión adversarial se escala automáticamente según el tamaño del diff. No requiere configuración.

**Detectar tamaño del diff y disponibilidad de herramientas:**

\`\`\`bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
# Respetar opt-out anterior
OLD_CFG=$(~/.claude/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || true)
echo "DIFF_SIZE: $DIFF_TOTAL"
echo "OLD_CFG: \${OLD_CFG:-not_set}"
\`\`\`

Si \`OLD_CFG\` es \`disabled\`: omite este paso silenciosamente. Continúa al siguiente paso.

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

\`\`\`bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
\`\`\`

Configura el parámetro \`timeout\` de la herramienta Bash a \`300000\` (5 minutos). NO uses el comando shell \`timeout\` — no existe en macOS. Después de que el comando termine, lee stderr:
\`\`\`bash
cat "$TMPERR_ADV"
\`\`\`

Presenta la salida completa textualmente. Esto es informativo — nunca bloquea el envío.

**Manejo de errores:** Todos los errores son no bloqueantes — la revisión adversarial es una mejora de calidad, no un prerrequisito.
- **Fallo de autenticación:** Si stderr contiene "auth", "login", "unauthorized" o "API key": "Fallo de autenticación de Codex. Ejecuta \\\`codex login\\\` para autenticarte."
- **Timeout:** "Codex expiró después de 5 minutos."
- **Respuesta vacía:** "Codex no devolvió respuesta. Stderr: <pegar error relevante>."

Ante cualquier error de Codex, recurre automáticamente al subagente adversarial de Claude.

**Subagente adversarial de Claude** (respaldo cuando Codex no está disponible o falló):

Despacha mediante la herramienta Agent. El subagente tiene contexto fresco — sin sesgo de checklist de la revisión estructurada. Esta independencia genuina detecta cosas ante las que el revisor principal es ciego.

Prompt del subagente:
"Lee el diff de esta rama con \`git diff origin/<base>\`. Piensa como un atacante y un ingeniero del caos. Tu trabajo es encontrar formas en que este código fallará en producción. Busca: casos extremos, condiciones de carrera, vulnerabilidades de seguridad, fugas de recursos, modos de fallo, corrupción silenciosa de datos, errores lógicos que producen resultados incorrectos silenciosamente, manejo de errores que traga fallos, y violaciones de límites de confianza. Sé adversarial. Sé exhaustivo. Sin halagos — solo los problemas. Para cada hallazgo, clasifica como FIXABLE (sabes cómo corregirlo) o INVESTIGATE (requiere juicio humano)."

Presenta los hallazgos bajo un encabezado \`REVISIÓN ADVERSARIAL (subagente Claude):\`. Los hallazgos **FIXABLE** fluyen al mismo pipeline Fix-First que la revisión estructurada. Los hallazgos **INVESTIGATE** se presentan como informativos.

Si el subagente falla o expira: "Subagente adversarial de Claude no disponible. Continuando sin revisión adversarial."

**Persistir el resultado de la revisión:**
\`\`\`bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"medium","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`
Sustituye STATUS: "clean" si no hay hallazgos, "issues_found" si existen hallazgos. SOURCE: "codex" si se ejecutó Codex, "claude" si se ejecutó el subagente. Si ambos fallaron, NO persistas.

**Limpieza:** Ejecuta \`rm -f "$TMPERR_ADV"\` después de procesar (si se usó Codex).

---

### Nivel grande (200+ líneas)

La revisión estructurada de Claude ya se ejecutó. Ahora ejecuta **los tres pases restantes** para máxima cobertura:

**1. Revisión estructurada de Codex (si está disponible):**
\`\`\`bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
\`\`\`

Configura el parámetro \`timeout\` de la herramienta Bash a \`300000\` (5 minutos). NO uses el comando shell \`timeout\` — no existe en macOS. Presenta la salida bajo el encabezado \`CODEX DICE (revisión de código):\`.
Busca marcadores \`[P1]\`: encontrados → \`GATE: FAIL\`, no encontrados → \`GATE: PASS\`.

Si GATE es FAIL, usa AskUserQuestion:
\`\`\`
Codex encontró N incidencias críticas en el diff.

A) Investigar y corregir ahora (recomendado)
B) Continuar — la revisión seguirá completándose
\`\`\`

Si A: aborda los hallazgos${isShip ? '. Después de corregir, re-ejecuta los tests (Paso 3) ya que el código ha cambiado' : ''}. Re-ejecuta \`codex review\` para verificar.

Lee stderr para errores (mismo manejo de errores que el nivel mediano).

Después de stderr: \`rm -f "$TMPERR"\`

**2. Subagente adversarial de Claude:** Despacha un subagente con el prompt adversarial (mismo prompt que el nivel mediano). Esto siempre se ejecuta independientemente de la disponibilidad de Codex.

**3. Desafío adversarial de Codex (si está disponible):** Ejecuta \`codex exec\` con el prompt adversarial (mismo que el nivel mediano).

Si Codex no está disponible para los pasos 1 y 3, informa al usuario: "CLI de Codex no encontrado — la revisión de diff grande ejecutó Claude estructurado + Claude adversarial (2 de 4 pases). Instala Codex para cobertura completa de 4 pases: \`npm install -g @openai/codex\`"

**Persistir el resultado de la revisión DESPUÉS de que todos los pases terminen** (no después de cada sub-paso):
\`\`\`bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"large","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`
Sustituye: STATUS = "clean" si no hay hallazgos en TODOS los pases, "issues_found" si algún pase encontró incidencias. SOURCE = "both" si se ejecutó Codex, "claude" si solo se ejecutó el subagente de Claude. GATE = resultado del gate de la revisión estructurada de Codex ("pass"/"fail"), o "informational" si Codex no estaba disponible. Si todos los pases fallaron, NO persistas.

---

### Síntesis cross-model (niveles mediano y grande)

Después de que todos los pases terminen, sintetiza los hallazgos de todas las fuentes:

\`\`\`
SÍNTESIS DE REVISIÓN ADVERSARIAL (auto: NIVEL, N líneas):
════════════════════════════════════════════════════════════
  Alta confianza (encontrado por múltiples fuentes): [hallazgos acordados por >1 pase]
  Único de la revisión estructurada de Claude: [del paso anterior]
  Único del adversarial de Claude: [del subagente, si se ejecutó]
  Único de Codex: [del adversarial de codex o revisión de código, si se ejecutó]
  Modelos usados: Claude estructurado ✓  Claude adversarial ✓/✗  Codex ✓/✗
════════════════════════════════════════════════════════════
\`\`\`

Los hallazgos de alta confianza (acordados por múltiples fuentes) deben priorizarse para corrección.

---`;
}

export function generateCodexPlanReview(ctx: TemplateContext): string {
  // Codex host: strip entirely — Codex should never invoke itself
  if (ctx.host === 'codex') return '';

  return `## Voz Externa — Desafío Independiente del Plan (opcional, recomendado)

Después de que todas las secciones de revisión estén completas, ofrece una segunda opinión independiente
de un sistema de IA diferente. Dos modelos coincidiendo en un plan es una señal más fuerte que la
revisión exhaustiva de un solo modelo.

**Verificar disponibilidad de herramientas:**

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

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

\`\`\`bash
TMPERR_PV=$(mktemp /tmp/codex-planreview-XXXXXXXX)
codex exec "<prompt>" -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_PV"
\`\`\`

Usa un timeout de 5 minutos (\`timeout: 300000\`). Después de que el comando termine, lee stderr:
\`\`\`bash
cat "$TMPERR_PV"
\`\`\`

Presenta la salida completa textualmente:

\`\`\`
CODEX DICE (revisión de plan — voz externa):
════════════════════════════════════════════════════════════
<salida completa de codex, textual — no truncar ni resumir>
════════════════════════════════════════════════════════════
\`\`\`

**Manejo de errores:** Todos los errores son no bloqueantes — la voz externa es informativa.
- Fallo de autenticación (stderr contiene "auth", "login", "unauthorized"): "Fallo de autenticación de Codex. Ejecuta \\\`codex login\\\` para autenticarte."
- Timeout: "Codex expiró después de 5 minutos."
- Respuesta vacía: "Codex no devolvió respuesta."

Ante cualquier error de Codex, recurre al subagente adversarial de Claude.

**Si CODEX_NOT_AVAILABLE (o Codex falló):**

Despacha mediante la herramienta Agent. El subagente tiene contexto fresco — independencia genuina.

Prompt del subagente: mismo prompt de revisión de plan que el anterior.

Presenta los hallazgos bajo un encabezado \`VOZ EXTERNA (subagente Claude):\`.

Si el subagente falla o expira: "Voz externa no disponible. Continuando a las salidas."

**Tensión cross-model:**

Después de presentar los hallazgos de la voz externa, anota cualquier punto donde la voz externa
discrepe con los hallazgos de la revisión de secciones anteriores. Márcalos como:

\`\`\`
TENSIÓN CROSS-MODEL:
  [Tema]: La revisión dijo X. La voz externa dice Y. [Tu evaluación de quién tiene razón.]
\`\`\`

Para cada punto de tensión sustantivo, propón automáticamente como TODO mediante AskUserQuestion:

> "Desacuerdo cross-model sobre [tema]. La revisión encontró [X] pero la voz externa
> argumenta [Y]. ¿Vale la pena investigar más?"

Opciones:
- A) Agregar a TODOS.md
- B) Omitir — no es sustantivo

Si no existen puntos de tensión, indica: "Sin tensión cross-model — ambos revisores coinciden."

**Persistir el resultado:**
\`\`\`bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"codex-plan-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`

Sustituye: STATUS = "clean" si no hay hallazgos, "issues_found" si existen hallazgos.
SOURCE = "codex" si se ejecutó Codex, "claude" si se ejecutó el subagente.

**Limpieza:** Ejecuta \`rm -f "$TMPERR_PV"\` después de procesar (si se usó Codex).

---`;
}

// ─── Plan File Discovery (shared helper) ──────────────────────────────

function generatePlanFileDiscovery(): string {
  return `### Descubrimiento del Archivo de Plan

1. **Contexto de la conversación (primario):** Comprueba si hay un archivo de plan activo en esta conversación — los mensajes del sistema de Claude Code incluyen rutas de archivos de plan cuando está en modo plan. Busca referencias como \`~/.claude/plans/*.md\` en los mensajes del sistema. Si se encuentra, úsalo directamente — esta es la señal más fiable.

2. **Búsqueda por contenido (respaldo):** Si no se hace referencia a un archivo de plan en el contexto de la conversación, busca por contenido:

\`\`\`bash
BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-')
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)")
# Intentar primero coincidencia por nombre de rama (más específico)
PLAN=$(ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$BRANCH" 2>/dev/null | head -1)
# Recurrir a coincidencia por nombre de repo
[ -z "$PLAN" ] && PLAN=$(ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$REPO" 2>/dev/null | head -1)
# Último recurso: plan más reciente modificado en las últimas 24 horas
[ -z "$PLAN" ] && PLAN=$(find ~/.claude/plans -name '*.md' -mmin -1440 -maxdepth 1 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
[ -n "$PLAN" ] && echo "PLAN_FILE: $PLAN" || echo "NO_PLAN_FILE"
\`\`\`

3. **Validación:** Si se encontró un archivo de plan mediante búsqueda por contenido (no por contexto de conversación), lee las primeras 20 líneas y verifica que es relevante para el trabajo de la rama actual. Si parece ser de un proyecto o funcionalidad diferente, trata como "archivo de plan no encontrado."

**Manejo de errores:**
- Archivo de plan no encontrado → omite con "Archivo de plan no detectado — omitiendo."
- Archivo de plan encontrado pero ilegible (permisos, codificación) → omite con "Archivo de plan encontrado pero ilegible — omitiendo."`;
}

// ─── Plan Completion Audit ────────────────────────────────────────────

type PlanCompletionMode = 'ship' | 'review';

function generatePlanCompletionAuditInner(mode: PlanCompletionMode): string {
  const sections: string[] = [];

  // ── Plan file discovery (shared) ──
  sections.push(generatePlanFileDiscovery());

  // ── Item extraction ──
  sections.push(`
### Extracción de Elementos Accionables

Lee el archivo de plan. Extrae cada elemento accionable — cualquier cosa que describa trabajo por hacer. Busca:

- **Elementos checkbox:** \`- [ ] ...\` o \`- [x] ...\`
- **Pasos numerados** bajo encabezados de implementación: "1. Crear ...", "2. Agregar ...", "3. Modificar ..."
- **Declaraciones imperativas:** "Agregar X a Y", "Crear un servicio Z", "Modificar el controlador W"
- **Especificaciones a nivel de archivo:** "Nuevo archivo: ruta/al/archivo.ts", "Modificar ruta/al/existente.rb"
- **Requisitos de tests:** "Probar que X", "Agregar test para Y", "Verificar Z"
- **Cambios de modelo de datos:** "Agregar columna X a tabla Y", "Crear migración para Z"

**Ignorar:**
- Secciones de contexto/antecedentes (\`## Contexto\`, \`## Antecedentes\`, \`## Problema\`)
- Preguntas y elementos abiertos (marcados con ?, "TBD", "TODO: decidir")
- Secciones de informe de revisión (\`## INFORME DE REVISIÓN GSTACK\`)
- Elementos explícitamente diferidos ("Futuro:", "Fuera de alcance:", "NO en alcance:", "P2:", "P3:", "P4:")
- Secciones de Decisiones de Revisión CEO (registran decisiones, no elementos de trabajo)

**Límite:** Extrae como máximo 50 elementos. Si el plan tiene más, indica: "Mostrando los 50 principales de N elementos del plan — lista completa en el archivo de plan."

**Sin elementos encontrados:** Si el plan no contiene elementos accionables extraíbles, omite con: "El archivo de plan no contiene elementos accionables — omitiendo auditoría de completitud."

Para cada elemento, anota:
- El texto del elemento (textual o resumen conciso)
- Su categoría: CODE | TEST | MIGRATION | CONFIG | DOCS`);

  // ── Cross-reference against diff ──
  sections.push(`
### Cruce con el Diff

Ejecuta \`git diff origin/<base>...HEAD\` y \`git log origin/<base>..HEAD --oneline\` para entender qué se implementó.

Para cada elemento del plan extraído, revisa el diff y clasifica:

- **DONE** — Evidencia clara en el diff de que este elemento fue implementado. Cita los archivos específicos cambiados.
- **PARTIAL** — Existe algo de trabajo hacia este elemento en el diff pero está incompleto (ej.: modelo creado pero falta el controlador, función existe pero no se manejan casos extremos).
- **NOT DONE** — Sin evidencia en el diff de que este elemento fue abordado.
- **CHANGED** — El elemento fue implementado usando un enfoque diferente al descrito en el plan, pero se logra el mismo objetivo. Anota la diferencia.

**Sé conservador con DONE** — requiere evidencia clara en el diff. Que un archivo se haya tocado no es suficiente; la funcionalidad específica descrita debe estar presente.
**Sé generoso con CHANGED** — si el objetivo se cumple por medios diferentes, cuenta como abordado.`);

  // ── Output format ──
  sections.push(`
### Formato de Salida

\`\`\`
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
\`\`\``);

  // ── Gate logic (mode-specific) ──
  if (mode === 'ship') {
    sections.push(`
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

**Incluir en el cuerpo del PR (Paso 8):** Agrega una sección \`## Completitud del Plan\` con el resumen de la checklist.`);
  } else {
    // review mode
    sections.push(`
### Integración con Detección de Desviación de Alcance

Los resultados de completitud del plan complementan la Detección de Desviación de Alcance existente. Si se encuentra un archivo de plan:

- Los elementos **NOT DONE** se convierten en evidencia adicional para **REQUISITOS FALTANTES** en el informe de desviación de alcance.
- Los **elementos en el diff que no coinciden con ningún elemento del plan** se convierten en evidencia para detección de **SCOPE CREEP**.

Esto es **INFORMATIONAL** — no bloquea la revisión (consistente con el comportamiento existente de desviación de alcance).

Actualiza la salida de desviación de alcance para incluir contexto del archivo de plan:

\`\`\`
Verificación de Alcance: [LIMPIO / DESVIACIÓN DETECTADA / REQUISITOS FALTANTES]
Intención: <del archivo de plan — resumen en 1 línea>
Plan: <ruta del archivo de plan>
Entregado: <resumen en 1 línea de lo que el diff realmente hace>
Elementos del plan: N DONE, M PARTIAL, K NOT DONE
[Si NOT DONE: lista cada elemento faltante]
[Si scope creep: lista cada cambio fuera de alcance que no está en el plan]
\`\`\`

**Archivo de plan no encontrado:** Recurre al comportamiento existente de desviación de alcance (verificar solo TODOS.md y descripción del PR).`);
  }

  return sections.join('\n');
}

export function generatePlanCompletionAuditShip(_ctx: TemplateContext): string {
  return generatePlanCompletionAuditInner('ship');
}

export function generatePlanCompletionAuditReview(_ctx: TemplateContext): string {
  return generatePlanCompletionAuditInner('review');
}

// ─── Plan Verification Execution ──────────────────────────────────────

export function generatePlanVerificationExec(_ctx: TemplateContext): string {
  return `## Paso 3.47: Verificación del Plan

Verifica automáticamente los pasos de testing/verificación del plan usando el skill \`/qa-only\`.

### 1. Verificar si existe sección de verificación

Usando el archivo de plan ya descubierto en el Paso 3.45, busca una sección de verificación. Coincide con cualquiera de estos encabezados: \`## Verificación\`, \`## Plan de tests\`, \`## Testing\`, \`## Cómo probar\`, \`## Testing manual\`, o cualquier sección con elementos con sabor a verificación (URLs a visitar, cosas a verificar visualmente, interacciones a probar).

**Si no se encuentra sección de verificación:** Omite con "No se encontraron pasos de verificación en el plan — omitiendo auto-verificación."
**Si no se encontró archivo de plan en el Paso 3.45:** Omite (ya manejado).

### 2. Verificar si hay servidor de desarrollo ejecutándose

Antes de invocar verificación basada en navegador, comprueba si un servidor de desarrollo es accesible:

\`\`\`bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:8080 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:4000 2>/dev/null || echo "NO_SERVER"
\`\`\`

**Si NO_SERVER:** Omite con "No se detectó servidor de desarrollo — omitiendo verificación del plan. Ejecuta /qa por separado después de desplegar."

### 3. Invocar /qa-only en línea

Lee el skill \`/qa-only\` desde disco:

\`\`\`bash
cat \${CLAUDE_SKILL_DIR}/../qa-only/SKILL.md
\`\`\`

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

Agrega una sección \`## Resultados de Verificación\` al cuerpo del PR (Paso 8):
- Si la verificación se ejecutó: resumen de resultados (N PASS, M FAIL, K OMITIDOS)
- Si se omitió: razón de la omisión (sin plan, sin servidor, sin sección de verificación)`;
}
