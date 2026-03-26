import type { TemplateContext } from './types';
import { AI_SLOP_BLACKLIST, OPENAI_HARD_REJECTIONS, OPENAI_LITMUS_CHECKS } from './constants';

export function generateDesignReviewLite(ctx: TemplateContext): string {
  const litmusList = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join(' ');
  const rejectionList = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join(' ');
  // Codex block only for Claude host
  const codexBlock = ctx.host === 'codex' ? '' : `

7. **Voz de diseño de Codex** (opcional, automática si está disponible):

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

Si Codex está disponible, ejecuta una verificación de diseño ligera sobre el diff:

\`\`\`bash
TMPERR_DRL=$(mktemp /tmp/codex-drl-XXXXXXXX)
codex exec "Review the git diff on this branch. Run 7 litmus checks (YES/NO each): ${litmusList} Flag any hard rejections: ${rejectionList} 5 most important design findings only. Reference file:line." -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached 2>"$TMPERR_DRL"
\`\`\`

Usa un timeout de 5 minutos (\`timeout: 300000\`). Después de que el comando termine, lee stderr:
\`\`\`bash
cat "$TMPERR_DRL" && rm -f "$TMPERR_DRL"
\`\`\`

**Manejo de errores:** Todos los errores son no bloqueantes. Ante fallo de autenticación, timeout o respuesta vacía — omite con una breve nota y continúa.

Presenta la salida de Codex bajo un encabezado \`CODEX (diseño):\`, fusionado con los hallazgos del checklist anterior.`;

  return `## Revisión de Diseño (condicional, alcance del diff)

Comprueba si el diff toca archivos de frontend usando \`gstack-diff-scope\`:

\`\`\`bash
source <(${ctx.paths.binDir}/gstack-diff-scope <base> 2>/dev/null)
\`\`\`

**Si \`SCOPE_FRONTEND=false\`:** Omite la revisión de diseño silenciosamente. Sin salida.

**Si \`SCOPE_FRONTEND=true\`:**

1. **Buscar DESIGN.md.** Si \`DESIGN.md\` o \`design-system.md\` existe en la raíz del repositorio, léelo. Todos los hallazgos de diseño se calibran contra él — los patrones aprobados en DESIGN.md no se señalizan. Si no se encuentra, usa principios universales de diseño.

2. **Leer \`.claude/skills/review/design-checklist.md\`.** Si el archivo no se puede leer, omite la revisión de diseño con una nota: "Checklist de diseño no encontrado — omitiendo revisión de diseño."

3. **Leer cada archivo de frontend cambiado** (archivo completo, no solo fragmentos del diff). Los archivos de frontend se identifican por los patrones listados en el checklist.

4. **Aplicar el checklist de diseño** contra los archivos cambiados. Para cada elemento:
   - **[HIGH] corrección mecánica de CSS** (\`outline: none\`, \`!important\`, \`font-size < 16px\`): clasificar como AUTO-FIX
   - **[HIGH/MEDIUM] se necesita criterio de diseño**: clasificar como ASK
   - **[LOW] detección basada en intención**: presentar como "Posible — verificar visualmente o ejecutar /design-review"

5. **Incluir hallazgos** en la salida de revisión bajo un encabezado "Revisión de Diseño", siguiendo el formato de salida del checklist. Los hallazgos de diseño se fusionan con los hallazgos de revisión de código en el mismo flujo Fix-First.

6. **Registrar el resultado** para el Panel de Estado de Revisiones:

\`\`\`bash
${ctx.paths.binDir}/gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
\`\`\`

Sustituye: TIMESTAMP = fecha y hora ISO 8601, STATUS = "clean" si 0 hallazgos o "issues_found", N = hallazgos totales, M = cantidad de auto-correcciones, COMMIT = salida de \`git rev-parse --short HEAD\`.${codexBlock}`;
}

// NOTE: design-checklist.md is a subset of this methodology for code-level detection.
// When adding items here, also update review/design-checklist.md, and vice versa.
export function generateDesignMethodology(_ctx: TemplateContext): string {
  return `## Modos

### Completo (por defecto)
Revisión sistemática de todas las páginas accesibles desde la página principal. Visitar 5-8 páginas. Evaluación completa del checklist, capturas responsive, prueba de flujos de interacción. Produce un informe completo de auditoría de diseño con calificaciones por letra.

### Rápido (\`--quick\`)
Solo página principal + 2 páginas clave. Primera Impresión + Extracción del Sistema de Diseño + checklist abreviado. El camino más rápido a una puntuación de diseño.

### Profundo (\`--deep\`)
Revisión exhaustiva: 10-15 páginas, cada flujo de interacción, checklist exhaustivo. Para auditorías pre-lanzamiento o rediseños importantes.

### Consciente del diff (automático cuando se está en una rama de funcionalidad sin URL)
Cuando se está en una rama de funcionalidad, se limita a las páginas afectadas por los cambios de la rama:
1. Analizar el diff de la rama: \`git diff main...HEAD --name-only\`
2. Mapear archivos cambiados a páginas/rutas afectadas
3. Detectar aplicación ejecutándose en puertos locales comunes (3000, 4000, 8080)
4. Auditar solo las páginas afectadas, comparar calidad de diseño antes/después

### Regresión (\`--regression\` o \`design-baseline.json\` previo encontrado)
Ejecutar auditoría completa, luego cargar \`design-baseline.json\` previo. Comparar: deltas de calificación por categoría, nuevos hallazgos, hallazgos resueltos. Generar tabla de regresión en el informe.

---

## Fase 1: Primera Impresión

La salida más única y similar a la de un diseñador. Forma una reacción visceral antes de analizar nada.

1. Navegar a la URL objetivo
2. Tomar una captura de pantalla de escritorio a página completa: \`$B screenshot "$REPORT_DIR/screenshots/first-impression.png"\`
3. Escribir la **Primera Impresión** usando este formato de crítica estructurada:
   - "El sitio comunica **[qué]**." (lo que dice a primera vista — ¿competencia? ¿diversión? ¿confusión?)
   - "Noto **[observación]**." (qué destaca, positivo o negativo — sé específico)
   - "Las 3 primeras cosas a las que va mi mirada son: **[1]**, **[2]**, **[3]**." (verificación de jerarquía — ¿son intencionales?)
   - "Si tuviera que describir esto en una palabra: **[palabra]**." (veredicto visceral)

Esta es la sección que los usuarios leen primero. Sé opinado. Un diseñador no se cubre — reacciona.

---

## Fase 2: Extracción del Sistema de Diseño

Extrae el sistema de diseño real que el sitio usa (no lo que dice un DESIGN.md, sino lo que se renderiza):

\`\`\`bash
# Fuentes en uso (limitado a 500 elementos para evitar timeout)
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).map(e => getComputedStyle(e).fontFamily))])"

# Paleta de colores en uso
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).flatMap(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]).filter(c => c !== 'rgba(0, 0, 0, 0)'))])"

# Jerarquía de encabezados
$B js "JSON.stringify([...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({tag:h.tagName, text:h.textContent.trim().slice(0,50), size:getComputedStyle(h).fontSize, weight:getComputedStyle(h).fontWeight})))"

# Auditoría de objetivos táctiles (encontrar elementos interactivos de tamaño insuficiente)
$B js "JSON.stringify([...document.querySelectorAll('a,button,input,[role=button]')].filter(e => {const r=e.getBoundingClientRect(); return r.width>0 && (r.width<44||r.height<44)}).map(e => ({tag:e.tagName, text:(e.textContent||'').trim().slice(0,30), w:Math.round(e.getBoundingClientRect().width), h:Math.round(e.getBoundingClientRect().height)})).slice(0,20))"

# Línea base de rendimiento
$B perf
\`\`\`

Estructura los hallazgos como un **Sistema de Diseño Inferido**:
- **Fuentes:** lista con conteos de uso. Señalizar si hay >3 familias tipográficas distintas.
- **Colores:** paleta extraída. Señalizar si hay >12 colores únicos no grises. Indicar cálido/frío/mixto.
- **Escala de Encabezados:** tamaños h1-h6. Señalizar niveles omitidos, saltos de tamaño no sistemáticos.
- **Patrones de Espaciado:** valores de ejemplo de padding/margin. Señalizar valores fuera de escala.

Después de la extracción, ofrecer: *"¿Quieres que guarde esto como tu DESIGN.md? Puedo fijar estas observaciones como la línea base del sistema de diseño de tu proyecto."*

---

## Fase 3: Auditoría Visual Página por Página

Para cada página en el alcance:

\`\`\`bash
$B goto <url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/{page}-annotated.png"
$B responsive "$REPORT_DIR/screenshots/{page}"
$B console --errors
$B perf
\`\`\`

### Detección de Autenticación

Después de la primera navegación, comprueba si la URL cambió a una ruta similar a login:
\`\`\`bash
$B url
\`\`\`
Si la URL contiene \`/login\`, \`/signin\`, \`/auth\`, o \`/sso\`: el sitio requiere autenticación. AskUserQuestion: "Este sitio requiere autenticación. ¿Quieres importar cookies de tu navegador? Ejecuta \`/setup-browser-cookies\` primero si es necesario."

### Checklist de Auditoría de Diseño (10 categorías, ~80 elementos)

Aplica estos en cada página. Cada hallazgo recibe una calificación de impacto (alto/medio/pulido) y categoría.

**1. Jerarquía Visual y Composición** (8 elementos)
- ¿Punto focal claro? ¿Un CTA principal por vista?
- ¿La mirada fluye naturalmente de arriba-izquierda a abajo-derecha?
- Ruido visual — ¿elementos compitiendo por atención?
- ¿Densidad de información apropiada para el tipo de contenido?
- Claridad de z-index — ¿nada se superpone inesperadamente?
- ¿El contenido sobre el pliegue comunica el propósito en 3 segundos?
- Test de entrecerrar los ojos: ¿la jerarquía sigue visible cuando se difumina?
- ¿El espacio en blanco es intencional, no sobrante?

**2. Tipografía** (15 elementos)
- Conteo de fuentes <=3 (señalizar si más)
- La escala sigue una proporción (1.25 tercera mayor o 1.333 cuarta perfecta)
- Interlineado: 1.5x cuerpo, 1.15-1.25x encabezados
- Medida: 45-75 caracteres por línea (66 ideal)
- Jerarquía de encabezados: sin niveles omitidos (h1→h3 sin h2)
- Contraste de peso: >=2 pesos usados para jerarquía
- Sin fuentes en lista negra (Papyrus, Comic Sans, Lobster, Impact, Jokerman)
- Si la fuente principal es Inter/Roboto/Open Sans/Poppins → señalizar como potencialmente genérica
- \`text-wrap: balance\` o \`text-pretty\` en encabezados (verificar con \`$B css <heading> text-wrap\`)
- Comillas tipográficas usadas, no rectas
- Carácter de puntos suspensivos (\`…\`) no tres puntos (\`...\`)
- \`font-variant-numeric: tabular-nums\` en columnas numéricas
- Texto del cuerpo >= 16px
- Leyenda/etiqueta >= 12px
- Sin letterspacing en texto en minúsculas

**3. Color y Contraste** (10 elementos)
- Paleta coherente (<=12 colores únicos no grises)
- WCAG AA: texto del cuerpo 4.5:1, texto grande (18px+) 3:1, componentes de UI 3:1
- Colores semánticos consistentes (éxito=verde, error=rojo, advertencia=amarillo/ámbar)
- Sin codificación solo por color (siempre agregar etiquetas, iconos o patrones)
- Modo oscuro: superficies usan elevación, no solo inversión de luminosidad
- Modo oscuro: texto blanco apagado (~#E0E0E0), no blanco puro
- Acento primario desaturado 10-20% en modo oscuro
- \`color-scheme: dark\` en elemento html (si hay modo oscuro presente)
- Sin combinaciones solo rojo/verde (8% de los hombres tienen deficiencia rojo-verde)
- Paleta neutral es cálida o fría consistentemente — no mixta

**4. Espaciado y Layout** (12 elementos)
- Grid consistente en todos los breakpoints
- El espaciado usa una escala (base 4px u 8px), no valores arbitrarios
- La alineación es consistente — nada flota fuera del grid
- Ritmo: elementos relacionados más cerca, secciones distintas más separadas
- Jerarquía de border-radius (no radio burbuja uniforme en todo)
- Radio interior = radio exterior - gap (elementos anidados)
- Sin scroll horizontal en móvil
- Ancho máximo de contenido establecido (sin texto de cuerpo a ancho completo)
- \`env(safe-area-inset-*)\` para dispositivos con notch
- La URL refleja el estado (filtros, pestañas, paginación en parámetros de consulta)
- Flex/grid usado para layout (no medición con JS)
- Breakpoints: móvil (375), tablet (768), escritorio (1024), ancho (1440)

**5. Estados de Interacción** (10 elementos)
- Estado hover en todos los elementos interactivos
- Anillo \`focus-visible\` presente (nunca \`outline: none\` sin reemplazo)
- Estado activo/presionado con efecto de profundidad o cambio de color
- Estado deshabilitado: opacidad reducida + \`cursor: not-allowed\`
- Carga: formas skeleton que coinciden con el layout del contenido real
- Estados vacíos: mensaje cálido + acción principal + visual (no solo "Sin elementos.")
- Mensajes de error: específicos + incluyen corrección/siguiente paso
- Éxito: animación o color de confirmación, auto-descarte
- Objetivos táctiles >= 44px en todos los elementos interactivos
- \`cursor: pointer\` en todos los elementos clicables

**6. Diseño Responsive** (8 elementos)
- El layout móvil tiene sentido de *diseño* (no solo columnas de escritorio apiladas)
- Objetivos táctiles suficientes en móvil (>= 44px)
- Sin scroll horizontal en ningún viewport
- Las imágenes manejan responsive (srcset, sizes, o contención CSS)
- Texto legible sin zoom en móvil (>= 16px cuerpo)
- La navegación colapsa apropiadamente (hamburguesa, nav inferior, etc.)
- Formularios usables en móvil (tipos de input correctos, sin autoFocus en móvil)
- Sin \`user-scalable=no\` o \`maximum-scale=1\` en meta viewport

**7. Movimiento y Animación** (6 elementos)
- Easing: ease-out para entrar, ease-in para salir, ease-in-out para moverse
- Duración: rango 50-700ms (nada más lento a menos que sea transición de página)
- Propósito: cada animación comunica algo (cambio de estado, atención, relación espacial)
- \`prefers-reduced-motion\` respetado (verificar: \`$B js "matchMedia('(prefers-reduced-motion: reduce)').matches"\`)
- Sin \`transition: all\` — propiedades listadas explícitamente
- Solo \`transform\` y \`opacity\` animados (no propiedades de layout como width, height, top, left)

**8. Contenido y Microcopy** (8 elementos)
- Estados vacíos diseñados con calidez (mensaje + acción + ilustración/icono)
- Mensajes de error específicos: qué pasó + por qué + qué hacer ahora
- Etiquetas de botón específicas ("Guardar Clave API" no "Continuar" o "Enviar")
- Sin texto de placeholder/lorem ipsum visible en producción
- Truncado manejado (\`text-overflow: ellipsis\`, \`line-clamp\`, o \`break-words\`)
- Voz activa ("Instala el CLI" no "El CLI será instalado")
- Los estados de carga terminan con \`…\` ("Guardando…" no "Guardando...")
- Las acciones destructivas tienen modal de confirmación o ventana de deshacer

**9. Detección de AI Slop** (10 anti-patrones — la lista negra)

La prueba: ¿un diseñador humano en un estudio respetado enviaría esto?

${AI_SLOP_BLACKLIST.map(item => `- ${item}`).join('\n')}

**10. Rendimiento como Diseño** (6 elementos)
- LCP < 2.0s (aplicaciones web), < 1.5s (sitios informativos)
- CLS < 0.1 (sin cambios visibles de layout durante la carga)
- Calidad del skeleton: formas coinciden con layout del contenido real, animación shimmer
- Imágenes: \`loading="lazy"\`, dimensiones width/height establecidas, formato WebP/AVIF
- Fuentes: \`font-display: swap\`, preconnect a orígenes CDN
- Sin destello visible de intercambio de fuente (FOUT) — fuentes críticas precargadas

---

## Fase 4: Revisión de Flujos de Interacción

Recorre 2-3 flujos de usuario clave y evalúa la *sensación*, no solo la función:

\`\`\`bash
$B snapshot -i
$B click @e3           # ejecutar acción
$B snapshot -D          # diff para ver qué cambió
\`\`\`

Evalúa:
- **Sensación de respuesta:** ¿Al hacer clic se siente responsivo? ¿Algún retraso o estados de carga faltantes?
- **Calidad de transición:** ¿Las transiciones son intencionales o genéricas/ausentes?
- **Claridad del feedback:** ¿La acción claramente tuvo éxito o falló? ¿El feedback es inmediato?
- **Pulido de formularios:** ¿Estados de foco visibles? ¿Timing de validación correcto? ¿Errores cerca del origen?

---

## Fase 5: Consistencia Entre Páginas

Compara capturas de pantalla y observaciones entre páginas para:
- ¿Barra de navegación consistente en todas las páginas?
- ¿Footer consistente?
- Reutilización de componentes vs diseños únicos (¿mismo botón con estilo diferente en páginas diferentes?)
- Consistencia de tono (¿una página lúdica mientras otra es corporativa?)
- ¿El ritmo de espaciado se mantiene entre páginas?

---

## Fase 6: Compilar Informe

### Ubicaciones de Salida

**Local:** \`.gstack/design-reports/design-audit-{domain}-{YYYY-MM-DD}.md\`

**Alcance del proyecto:**
\`\`\`bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
\`\`\`
Escribir en: \`~/.gstack/projects/{slug}/{user}-{branch}-design-audit-{datetime}.md\`

**Línea base:** Escribir \`design-baseline.json\` para modo regresión:
\`\`\`json
{
  "date": "YYYY-MM-DD",
  "url": "<target>",
  "designScore": "B",
  "aiSlopScore": "C",
  "categoryGrades": { "hierarchy": "A", "typography": "B", ... },
  "findings": [{ "id": "FINDING-001", "title": "...", "impact": "high", "category": "typography" }]
}
\`\`\`

### Sistema de Puntuación

**Doble puntuación titular:**
- **Puntuación de Diseño: {A-F}** — promedio ponderado de las 10 categorías
- **Puntuación de AI Slop: {A-F}** — calificación independiente con veredicto conciso

**Calificaciones por categoría:**
- **A:** Intencional, pulido, encantador. Muestra pensamiento de diseño.
- **B:** Fundamentos sólidos, inconsistencias menores. Se ve profesional.
- **C:** Funcional pero genérico. Sin problemas graves, sin punto de vista de diseño.
- **D:** Problemas notables. Se siente inacabado o descuidado.
- **F:** Perjudicando activamente la experiencia del usuario. Necesita retrabajo significativo.

**Cálculo de calificación:** Cada categoría empieza en A. Cada hallazgo de impacto Alto baja una letra. Cada hallazgo de impacto Medio baja media letra. Los hallazgos de Pulido se anotan pero no afectan la calificación. Mínimo es F.

**Pesos de categoría para Puntuación de Diseño:**
| Categoría | Peso |
|----------|--------|
| Jerarquía Visual | 15% |
| Tipografía | 15% |
| Espaciado y Layout | 15% |
| Color y Contraste | 10% |
| Estados de Interacción | 10% |
| Responsive | 10% |
| Calidad de Contenido | 10% |
| AI Slop | 5% |
| Movimiento | 5% |
| Sensación de Rendimiento | 5% |

AI Slop es 5% de la Puntuación de Diseño pero también se califica independientemente como métrica titular.

### Salida de Regresión

Cuando existe un \`design-baseline.json\` previo o se usa el flag \`--regression\`:
- Cargar calificaciones de la línea base
- Comparar: deltas por categoría, nuevos hallazgos, hallazgos resueltos
- Agregar tabla de regresión al informe

---

## Formato de Crítica de Diseño

Usa feedback estructurado, no opiniones:
- "Noto..." — observación (ej.: "Noto que el CTA principal compite con la acción secundaria")
- "Me pregunto..." — pregunta (ej.: "Me pregunto si los usuarios entenderán qué significa 'Procesar' aquí")
- "¿Qué tal si..." — sugerencia (ej.: "¿Qué tal si movemos la búsqueda a una posición más prominente?")
- "Creo que... porque..." — opinión razonada (ej.: "Creo que el espaciado entre secciones es demasiado uniforme porque no crea jerarquía")

Vincula todo a objetivos del usuario y del producto. Siempre sugiere mejoras específicas junto con los problemas.

---

## Reglas Importantes

1. **Piensa como un diseñador, no como un ingeniero de QA.** Te importa si las cosas se sienten bien, se ven intencionales y respetan al usuario. NO solo te importa si las cosas "funcionan."
2. **Las capturas de pantalla son evidencia.** Cada hallazgo necesita al menos una captura de pantalla. Usa capturas anotadas (\`snapshot -a\`) para resaltar elementos.
3. **Sé específico y accionable.** "Cambiar X a Y porque Z" — no "el espaciado se siente raro."
4. **Nunca leas código fuente.** Evalúa el sitio renderizado, no la implementación. (Excepción: ofrecer escribir DESIGN.md a partir de observaciones extraídas.)
5. **La detección de AI Slop es tu superpoder.** La mayoría de los desarrolladores no pueden evaluar si su sitio se ve generado por IA. Tú sí. Sé directo al respecto.
6. **Las victorias rápidas importan.** Siempre incluye una sección de "Victorias Rápidas" — las 3-5 correcciones de mayor impacto que toman <30 minutos cada una.
7. **Usa \`snapshot -C\` para UIs complicadas.** Encuentra divs clicables que el árbol de accesibilidad no detecta.
8. **Responsive es diseño, no solo "no está roto".** Un layout de escritorio apilado en móvil no es diseño responsive — es pereza. Evalúa si el layout móvil tiene sentido de *diseño*.
9. **Documenta incrementalmente.** Escribe cada hallazgo en el informe conforme lo encuentres. No acumules.
10. **Profundidad sobre amplitud.** 5-10 hallazgos bien documentados con capturas de pantalla y sugerencias específicas > 20 observaciones vagas.
11. **Muestra capturas de pantalla al usuario.** Después de cada comando \`$B screenshot\`, \`$B snapshot -a -o\`, o \`$B responsive\`, usa la herramienta Read en los archivos de salida para que el usuario pueda verlos en línea. Para \`responsive\` (3 archivos), lee los tres. Esto es crítico — sin ello, las capturas son invisibles para el usuario.`;
}

export function generateDesignSketch(_ctx: TemplateContext): string {
  return `## Boceto Visual (solo ideas de UI)

Si el enfoque elegido involucra UI visible al usuario (pantallas, páginas, formularios, dashboards,
o elementos interactivos), genera un wireframe aproximado para ayudar al usuario a visualizarlo.
Si la idea es solo de backend, infraestructura, o no tiene componente de UI — omite esta
sección silenciosamente.

**Paso 1: Recopilar contexto de diseño**

1. Comprueba si \`DESIGN.md\` existe en la raíz del repositorio. Si existe, léelo para
   restricciones del sistema de diseño (colores, tipografía, espaciado, patrones de componentes). Usa estas
   restricciones en el wireframe.
2. Aplica principios fundamentales de diseño:
   - **Jerarquía de información** — ¿qué ve el usuario primero, segundo, tercero?
   - **Estados de interacción** — carga, vacío, error, éxito, parcial
   - **Paranoia de casos extremos** — ¿qué pasa si el nombre tiene 47 caracteres? ¿Cero resultados? ¿Falla la red?
   - **Sustracción por defecto** — "tan poco diseño como sea posible" (Rams). Cada elemento se gana sus píxeles.
   - **Diseñar para la confianza** — cada elemento de interfaz construye o erosiona la confianza del usuario.

**Paso 2: Generar wireframe HTML**

Genera un archivo HTML de una sola página con estas restricciones:
- **Estética intencionalmente tosca** — usa fuentes del sistema, bordes grises finos, sin color,
  elementos estilo dibujado a mano. Esto es un boceto, no un mockup pulido.
- Autocontenido — sin dependencias externas, sin links a CDN, solo CSS inline
- Muestra el flujo de interacción principal (1-3 pantallas/estados máximo)
- Incluye contenido placeholder realista (no "Lorem ipsum" — usa contenido que
  coincida con el caso de uso real)
- Agrega comentarios HTML explicando las decisiones de diseño

Escribe en un archivo temporal:
\`\`\`bash
SKETCH_FILE="/tmp/gstack-sketch-$(date +%s).html"
\`\`\`

**Paso 3: Renderizar y capturar**

\`\`\`bash
$B goto "file://$SKETCH_FILE"
$B screenshot /tmp/gstack-sketch.png
\`\`\`

Si \`$B\` no está disponible (binario browse no configurado), omite el paso de renderizado. Dile al
usuario: "El boceto visual requiere el binario browse. Ejecuta el script de setup para habilitarlo."

**Paso 4: Presentar e iterar**

Muestra la captura de pantalla al usuario. Pregunta: "¿Esto se siente correcto? ¿Quieres iterar sobre el layout?"

Si quieren cambios, regenera el HTML con su feedback y re-renderiza.
Si aprueban o dicen "suficiente", procede.

**Paso 5: Incluir en el documento de diseño**

Referencia la captura del wireframe en la sección "Enfoque Recomendado" del documento de diseño.
El archivo de captura en \`/tmp/gstack-sketch.png\` puede ser referenciado por skills posteriores
(\`/plan-design-review\`, \`/design-review\`) para ver lo que se planificó originalmente.

**Paso 6: Voces externas de diseño** (opcional)

Después de que el wireframe sea aprobado, ofrece perspectivas externas de diseño:

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

Si Codex está disponible, usa AskUserQuestion:
> "¿Quieres perspectivas externas de diseño sobre el enfoque elegido? Codex propone una tesis visual, plan de contenido e ideas de interacción. Un subagente de Claude propone una dirección estética alternativa."
>
> A) Sí — obtener voces externas de diseño
> B) No — proceder sin ellas

Si el usuario elige A, lanza ambas voces simultáneamente:

1. **Codex** (vía Bash, \`model_reasoning_effort="medium"\`):
\`\`\`bash
TMPERR_SKETCH=$(mktemp /tmp/codex-sketch-XXXXXXXX)
codex exec "For this product approach, provide: a visual thesis (one sentence — mood, material, energy), a content plan (hero → support → detail → CTA), and 2 interaction ideas that change page feel. Apply beautiful defaults: composition-first, brand-first, cardless, poster not document. Be opinionated." -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="medium"' --enable web_search_cached 2>"$TMPERR_SKETCH"
\`\`\`
Usa un timeout de 5 minutos (\`timeout: 300000\`). Después de completar: \`cat "$TMPERR_SKETCH" && rm -f "$TMPERR_SKETCH"\`

2. **Subagente de Claude** (vía herramienta Agent):
"Para este enfoque de producto, ¿qué dirección de diseño recomendarías? ¿Qué estética, tipografía y patrones de interacción encajan? ¿Qué haría que este enfoque se sienta inevitable para el usuario? Sé específico — nombres de fuentes, colores hex, valores de espaciado."

Presenta la salida de Codex bajo \`CODEX DICE (boceto de diseño):\` y la salida del subagente bajo \`SUBAGENTE DE CLAUDE (dirección de diseño):\`.
Manejo de errores: todo no bloqueante. Ante fallo, omite y continúa.`;
}

export function generateDesignOutsideVoices(ctx: TemplateContext): string {
  // Codex host: strip entirely — Codex should never invoke itself
  if (ctx.host === 'codex') return '';

  const rejectionList = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const litmusList = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join('\n');

  // Skill-specific configuration
  const isPlanDesignReview = ctx.skillName === 'plan-design-review';
  const isDesignReview = ctx.skillName === 'design-review';
  const isDesignConsultation = ctx.skillName === 'design-consultation';

  // Determine opt-in behavior and reasoning effort
  const isAutomatic = isDesignReview; // design-review runs automatically
  const reasoningEffort = isDesignConsultation ? 'medium' : 'high'; // creative vs analytical

  // Build skill-specific Codex prompt
  let codexPrompt: string;
  let subagentPrompt: string;

  if (isPlanDesignReview) {
    codexPrompt = `Read the plan file at [plan-file-path]. Evaluate this plan's UI/UX design against these criteria.

HARD REJECTION — flag if ANY apply:
${rejectionList}

LITMUS CHECKS — answer YES or NO for each:
${litmusList}

HARD RULES — first classify as MARKETING/LANDING PAGE vs APP UI vs HYBRID, then flag violations of the matching rule set:
- MARKETING: First viewport as one composition, brand-first hierarchy, full-bleed hero, 2-3 intentional motions, composition-first layout
- APP UI: Calm surface hierarchy, dense but readable, utility language, minimal chrome
- UNIVERSAL: CSS variables for colors, no default font stacks, one job per section, cards earn existence

For each finding: what's wrong, what will happen if it ships unresolved, and the specific fix. Be opinionated. No hedging.`;

    subagentPrompt = `Read the plan file at [plan-file-path]. You are an independent senior product designer reviewing this plan. You have NOT seen any prior review. Evaluate:

1. Information hierarchy: what does the user see first, second, third? Is it right?
2. Missing states: loading, empty, error, success, partial — which are unspecified?
3. User journey: what's the emotional arc? Where does it break?
4. Specificity: does the plan describe SPECIFIC UI ("48px Söhne Bold header, #1a1a1a on white") or generic patterns ("clean modern card-based layout")?
5. What design decisions will haunt the implementer if left ambiguous?

For each finding: what's wrong, severity (critical/high/medium), and the fix.`;
  } else if (isDesignReview) {
    codexPrompt = `Review the frontend source code in this repo. Evaluate against these design hard rules:
- Spacing: systematic (design tokens / CSS variables) or magic numbers?
- Typography: expressive purposeful fonts or default stacks?
- Color: CSS variables with defined system, or hardcoded hex scattered?
- Responsive: breakpoints defined? calc(100svh - header) for heroes? Mobile tested?
- A11y: ARIA landmarks, alt text, contrast ratios, 44px touch targets?
- Motion: 2-3 intentional animations, or zero / ornamental only?
- Cards: used only when card IS the interaction? No decorative card grids?

First classify as MARKETING/LANDING PAGE vs APP UI vs HYBRID, then apply matching rules.

LITMUS CHECKS — answer YES/NO:
${litmusList}

HARD REJECTION — flag if ANY apply:
${rejectionList}

Be specific. Reference file:line for every finding.`;

    subagentPrompt = `Review the frontend source code in this repo. You are an independent senior product designer doing a source-code design audit. Focus on CONSISTENCY PATTERNS across files rather than individual violations:
- Are spacing values systematic across the codebase?
- Is there ONE color system or scattered approaches?
- Do responsive breakpoints follow a consistent set?
- Is the accessibility approach consistent or spotty?

For each finding: what's wrong, severity (critical/high/medium), and the file:line.`;
  } else if (isDesignConsultation) {
    codexPrompt = `Given this product context, propose a complete design direction:
- Visual thesis: one sentence describing mood, material, and energy
- Typography: specific font names (not defaults — no Inter/Roboto/Arial/system) + hex colors
- Color system: CSS variables for background, surface, primary text, muted text, accent
- Layout: composition-first, not component-first. First viewport as poster, not document
- Differentiation: 2 deliberate departures from category norms
- Anti-slop: no purple gradients, no 3-column icon grids, no centered everything, no decorative blobs

Be opinionated. Be specific. Do not hedge. This is YOUR design direction — own it.`;

    subagentPrompt = `Given this product context, propose a design direction that would SURPRISE. What would the cool indie studio do that the enterprise UI team wouldn't?
- Propose an aesthetic direction, typography stack (specific font names), color palette (hex values)
- 2 deliberate departures from category norms
- What emotional reaction should the user have in the first 3 seconds?

Be bold. Be specific. No hedging.`;
  } else {
    // Unknown skill — return empty
    return '';
  }

  // Build the opt-in section
  const optInSection = isAutomatic ? `
**Automático:** Las voces externas se ejecutan automáticamente cuando Codex está disponible. No se necesita opt-in.` : `
Usa AskUserQuestion:
> "¿Quieres voces externas de diseño${isPlanDesignReview ? ' antes de la revisión detallada' : ''}? Codex evalúa contra las reglas duras de diseño de OpenAI + verificaciones litmus; el subagente de Claude hace una ${isDesignConsultation ? 'propuesta de dirección de diseño' : 'revisión de completitud'} independiente."
>
> A) Sí — ejecutar voces externas de diseño
> B) No — proceder sin ellas

Si el usuario elige B, omite este paso y continúa.`;

  // Build the synthesis section
  const synthesisSection = isPlanDesignReview ? `
**Síntesis — Cuadro de mando litmus:**

\`\`\`
VOCES EXTERNAS DE DISEÑO — CUADRO DE MANDO LITMUS:
═══════════════════════════════════════════════════════════════
  Verificación                               Claude  Codex  Consenso
  ─────────────────────────────────────── ─────── ─────── ─────────
  1. ¿Marca inconfundible en 1.ª pantalla?  —       —      —
  2. ¿Un ancla visual fuerte?               —       —      —
  3. ¿Escaneable solo por titulares?         —       —      —
  4. ¿Cada sección tiene un trabajo?         —       —      —
  5. ¿Las tarjetas son realmente necesarias? —       —      —
  6. ¿El movimiento mejora la jerarquía?     —       —      —
  7. ¿Premium sin sombras decorativas?       —       —      —
  ─────────────────────────────────────── ─────── ─────── ─────────
  Rechazos duros activados:                  —       —      —
═══════════════════════════════════════════════════════════════
\`\`\`

Rellena cada celda a partir de las salidas de Codex y el subagente. CONFIRMED = ambos coinciden. DISAGREE = los modelos difieren. NOT SPEC'D = no hay suficiente información para evaluar.

**Integración con pases (respeta el contrato existente de 7 pases):**
- Rechazos duros → se plantean como los PRIMEROS elementos en el Pase 1, etiquetados \`[HARD REJECTION]\`
- Elementos litmus DISAGREE → se plantean en el pase relevante con ambas perspectivas
- Fallos litmus CONFIRMED → precargados como incidencias conocidas en el pase relevante
- Los pases pueden omitir el descubrimiento e ir directamente a corregir para incidencias pre-identificadas` :
    isDesignConsultation ? `
**Síntesis:** Claude principal referencia ambas propuestas de Codex y del subagente en la propuesta de la Fase 3. Presenta:
- Áreas de acuerdo entre las tres voces (Claude principal + Codex + subagente)
- Divergencias genuinas como alternativas creativas para que el usuario elija
- "Codex y yo coincidimos en X. Codex sugirió Y donde yo propongo Z — esta es la razón..."` : `
**Síntesis — Cuadro de mando litmus:**

Usa el mismo formato de cuadro de mando que /plan-design-review (mostrado arriba). Rellena a partir de ambas salidas.
Fusiona los hallazgos en la clasificación con etiquetas \`[codex]\` / \`[subagent]\` / \`[cross-model]\`.`;

  const escapedCodexPrompt = codexPrompt.replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `## Voces Externas de Diseño (en paralelo)
${optInSection}

**Verificar disponibilidad de Codex:**
\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

**Si Codex está disponible**, lanza ambas voces simultáneamente:

1. **Voz de diseño de Codex** (vía Bash):
\`\`\`bash
TMPERR_DESIGN=$(mktemp /tmp/codex-design-XXXXXXXX)
codex exec "${escapedCodexPrompt}" -C "$(git rev-parse --show-toplevel)" -s read-only -c 'model_reasoning_effort="${reasoningEffort}"' --enable web_search_cached 2>"$TMPERR_DESIGN"
\`\`\`
Usa un timeout de 5 minutos (\`timeout: 300000\`). Después de que el comando termine, lee stderr:
\`\`\`bash
cat "$TMPERR_DESIGN" && rm -f "$TMPERR_DESIGN"
\`\`\`

2. **Subagente de diseño de Claude** (vía herramienta Agent):
Despacha un subagente con este prompt:
"${subagentPrompt}"

**Manejo de errores (todo no bloqueante):**
- **Fallo de autenticación:** Si stderr contiene "auth", "login", "unauthorized" o "API key": "Fallo de autenticación de Codex. Ejecuta \`codex login\` para autenticarte."
- **Timeout:** "Codex expiró después de 5 minutos."
- **Respuesta vacía:** "Codex no devolvió respuesta."
- Ante cualquier error de Codex: procede solo con la salida del subagente de Claude, etiquetada \`[single-model]\`.
- Si el subagente de Claude también falla: "Voces externas no disponibles — continuando con la revisión principal."

Presenta la salida de Codex bajo un encabezado \`CODEX DICE (diseño ${isPlanDesignReview ? 'crítica' : isDesignReview ? 'auditoría de código' : 'dirección'}):\`.
Presenta la salida del subagente bajo un encabezado \`SUBAGENTE DE CLAUDE (diseño ${isPlanDesignReview ? 'completitud' : isDesignReview ? 'consistencia' : 'dirección'}):\`.
${synthesisSection}

**Registrar el resultado:**
\`\`\`bash
${ctx.paths.binDir}/gstack-review-log '{"skill":"design-outside-voices","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`
Sustituye STATUS con "clean" o "issues_found", SOURCE con "codex+subagent", "codex-only", "subagent-only", o "unavailable".`;
}

// ─── Design Hard Rules (OpenAI framework + gstack slop blacklist) ───
export function generateDesignHardRules(_ctx: TemplateContext): string {
  const slopItems = AI_SLOP_BLACKLIST.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const rejectionItems = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const litmusItems = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join('\n');

  return `### Reglas Duras de Diseño

**Clasificador — determina el conjunto de reglas antes de evaluar:**
- **MARKETING/LANDING PAGE** (orientado a hero, marca primero, enfocado en conversión) → aplicar Reglas de Landing Page
- **APP UI** (orientado a workspace, denso en datos, enfocado en tareas: dashboards, admin, configuración) → aplicar Reglas de App UI
- **HYBRID** (carcasa de marketing con secciones tipo app) → aplicar Reglas de Landing Page a secciones hero/marketing, Reglas de App UI a secciones funcionales

**Criterios de rechazo duro** (patrones de fallo instantáneo — señalizar si ALGUNO aplica):
${rejectionItems}

**Verificaciones litmus** (responder SÍ/NO para cada una — usadas para puntuación de consenso cross-model):
${litmusItems}

**Reglas de landing page** (aplicar cuando clasificador = MARKETING/LANDING):
- El primer viewport se lee como una composición, no un dashboard
- Jerarquía marca primero: marca > titular > cuerpo > CTA
- Tipografía: expresiva, con propósito — sin stacks por defecto (Inter, Roboto, Arial, system)
- Sin fondos planos de un solo color — usar gradientes, imágenes, patrones sutiles
- Hero: de borde a borde, sin variantes con inset/mosaico/redondeado
- Presupuesto del hero: marca, un titular, una oración de apoyo, un grupo de CTA, una imagen
- Sin tarjetas en el hero. Tarjetas solo cuando la tarjeta ES la interacción
- Un trabajo por sección: un propósito, un titular, una oración corta de apoyo
- Movimiento: mínimo 2-3 movimientos intencionales (entrada, vinculado al scroll, hover/revelación)
- Color: definir variables CSS, evitar defaults púrpura sobre blanco, un color de acento por defecto
- Copy: lenguaje de producto no comentario de diseño. "Si eliminar el 30% lo mejora, sigue eliminando"
- Defaults hermosos: composición primero, marca como texto más prominente, máximo dos tipografías, sin tarjetas por defecto, primer viewport como póster no documento

**Reglas de App UI** (aplicar cuando clasificador = APP UI):
- Jerarquía de superficies tranquila, tipografía fuerte, pocos colores
- Denso pero legible, cromo mínimo
- Organizar: workspace principal, navegación, contexto secundario, un acento
- Evitar: mosaicos de tarjetas de dashboard, bordes gruesos, gradientes decorativos, iconos ornamentales
- Copy: lenguaje utilitario — orientación, estado, acción. No humor/marca/aspiración
- Tarjetas solo cuando la tarjeta ES la interacción
- Encabezados de sección indican qué es el área o qué puede hacer el usuario ("KPIs seleccionados", "Estado del plan")

**Reglas universales** (aplicar a TODOS los tipos):
- Definir variables CSS para el sistema de color
- Sin stacks de fuentes por defecto (Inter, Roboto, Arial, system)
- Un trabajo por sección
- "Si eliminar el 30% del copy lo mejora, sigue eliminando"
- Las tarjetas se ganan su existencia — sin grids decorativos de tarjetas

**Lista negra de AI Slop** (los 10 patrones que gritan "generado por IA"):
${slopItems}

Fuente: [OpenAI "Designing Delightful Frontends with GPT-5.4"](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4) (Mar 2026) + metodología de diseño gstack.`;
}
