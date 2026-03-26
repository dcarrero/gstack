import type { TemplateContext } from './types';

export function generateSlugEval(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/gstack-slug 2>/dev/null)"`;
}

export function generateSlugSetup(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG`;
}

export function generateBaseBranchDetect(_ctx: TemplateContext): string {
  return `## Paso 0: Detectar plataforma y rama base

Primero, detecta la plataforma de alojamiento git desde la URL del remoto:

\`\`\`bash
git remote get-url origin 2>/dev/null
\`\`\`

- Si la URL contiene "github.com" → la plataforma es **GitHub**
- Si la URL contiene "gitlab" → la plataforma es **GitLab**
- De lo contrario, comprueba la disponibilidad del CLI:
  - \`gh auth status 2>/dev/null\` tiene éxito → la plataforma es **GitHub** (cubre GitHub Enterprise)
  - \`glab auth status 2>/dev/null\` tiene éxito → la plataforma es **GitLab** (cubre auto-alojado)
  - Ninguno → **desconocida** (usa solo comandos nativos de git)

Determina a qué rama apunta este PR/MR, o la rama por defecto del repositorio si no
existe PR/MR. Usa el resultado como "la rama base" en todos los pasos siguientes.

**Si es GitHub:**
1. \`gh pr view --json baseRefName -q .baseRefName\` — si tiene éxito, úsala
2. \`gh repo view --json defaultBranchRef -q .defaultBranchRef.name\` — si tiene éxito, úsala

**Si es GitLab:**
1. \`glab mr view -F json 2>/dev/null\` y extrae el campo \`target_branch\` — si tiene éxito, úsala
2. \`glab repo view -F json 2>/dev/null\` y extrae el campo \`default_branch\` — si tiene éxito, úsala

**Respaldo nativo de git (si la plataforma es desconocida o los comandos CLI fallan):**
1. \`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'\`
2. Si falla: \`git rev-parse --verify origin/main 2>/dev/null\` → usa \`main\`
3. Si falla: \`git rev-parse --verify origin/master 2>/dev/null\` → usa \`master\`

Si todo falla, recurre a \`main\`.

Imprime el nombre de la rama base detectada. En cada comando posterior de \`git diff\`, \`git log\`,
\`git fetch\`, \`git merge\` y creación de PR/MR, sustituye el nombre de rama detectado
donde las instrucciones digan "la rama base" o \`<default>\`.

---`;
}

export function generateDeployBootstrap(_ctx: TemplateContext): string {
  return `\`\`\`bash
# Comprobar configuración de deploy persistida en CLAUDE.md
DEPLOY_CONFIG=$(grep -A 20 "## Deploy Configuration" CLAUDE.md 2>/dev/null || echo "NO_CONFIG")
echo "$DEPLOY_CONFIG"

# Si existe configuración, analizarla
if [ "$DEPLOY_CONFIG" != "NO_CONFIG" ]; then
  PROD_URL=$(echo "$DEPLOY_CONFIG" | grep -i "production.*url" | head -1 | sed 's/.*: *//')
  PLATFORM=$(echo "$DEPLOY_CONFIG" | grep -i "platform" | head -1 | sed 's/.*: *//')
  echo "PERSISTED_PLATFORM:$PLATFORM"
  echo "PERSISTED_URL:$PROD_URL"
fi

# Auto-detectar plataforma desde archivos de configuración
[ -f fly.toml ] && echo "PLATFORM:fly"
[ -f render.yaml ] && echo "PLATFORM:render"
([ -f vercel.json ] || [ -d .vercel ]) && echo "PLATFORM:vercel"
[ -f netlify.toml ] && echo "PLATFORM:netlify"
[ -f Procfile ] && echo "PLATFORM:heroku"
([ -f railway.json ] || [ -f railway.toml ]) && echo "PLATFORM:railway"

# Detectar workflows de deploy
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$f" ] && grep -qiE "deploy|release|production|staging|cd" "$f" 2>/dev/null && echo "DEPLOY_WORKFLOW:$f"
done
\`\`\`

Si se encontraron \`PERSISTED_PLATFORM\` y \`PERSISTED_URL\` en CLAUDE.md, úsalos directamente
y omite la detección manual. Si no existe configuración persistida, usa la plataforma auto-detectada
para guiar la verificación del deploy. Si no se detecta nada, pregunta al usuario mediante AskUserQuestion
en el árbol de decisión a continuación.

Si quieres persistir la configuración de deploy para futuras ejecuciones, sugiere al usuario ejecutar \`/setup-deploy\`.`;
}

export function generateQAMethodology(_ctx: TemplateContext): string {
  return `## Modos

### Consciente del diff (automático cuando se está en una rama de funcionalidad sin URL)

Este es el **modo principal** para desarrolladores que verifican su trabajo. Cuando el usuario dice \`/qa\` sin URL y el repositorio está en una rama de funcionalidad, automáticamente:

1. **Analizar el diff de la rama** para entender qué cambió:
   \`\`\`bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   \`\`\`

2. **Identificar páginas/rutas afectadas** a partir de los archivos cambiados:
   - Archivos de controlador/ruta → qué rutas URL sirven
   - Archivos de vista/plantilla/componente → qué páginas los renderizan
   - Archivos de modelo/servicio → qué páginas usan esos modelos (verificar controladores que los referencian)
   - Archivos CSS/estilos → qué páginas incluyen esas hojas de estilo
   - Endpoints de API → probarlos directamente con \`$B js "await fetch('/api/...')"\`
   - Páginas estáticas (markdown, HTML) → navegar a ellas directamente

   **Si no se identifican páginas/rutas obvias del diff:** No omitas las pruebas de navegador. El usuario invocó /qa porque quiere verificación basada en navegador. Recurre al modo Rápido — navega a la página principal, sigue los 5 principales objetivos de navegación, verifica la consola en busca de errores y prueba cualquier elemento interactivo encontrado. Los cambios de backend, configuración e infraestructura afectan el comportamiento de la app — siempre verifica que la app siga funcionando.

3. **Detectar la app en ejecución** — comprobar puertos locales de desarrollo comunes:
   \`\`\`bash
   $B goto http://localhost:3000 2>/dev/null && echo "Found app on :3000" || \\
   $B goto http://localhost:4000 2>/dev/null && echo "Found app on :4000" || \\
   $B goto http://localhost:8080 2>/dev/null && echo "Found app on :8080"
   \`\`\`
   Si no se encuentra app local, busca una URL de staging/preview en el PR o entorno. Si nada funciona, pregunta al usuario por la URL.

4. **Probar cada página/ruta afectada:**
   - Navega a la página
   - Toma una captura de pantalla
   - Revisa la consola en busca de errores
   - Si el cambio fue interactivo (formularios, botones, flujos), prueba la interacción de extremo a extremo
   - Usa \`snapshot -D\` antes y después de acciones para verificar que el cambio tuvo el efecto esperado

5. **Cruzar con mensajes de commit y descripción del PR** para entender la *intención* — ¿qué debería hacer el cambio? Verifica que realmente lo hace.

6. **Verificar TODOS.md** (si existe) buscando bugs conocidos o incidencias relacionadas con los archivos cambiados. Si un TODO describe un bug que esta rama debería corregir, agrégalo a tu plan de pruebas. Si encuentras un nuevo bug durante el QA que no está en TODOS.md, anótalo en el informe.

7. **Informar hallazgos** limitados a los cambios de la rama:
   - "Cambios probados: N páginas/rutas afectadas por esta rama"
   - Para cada una: ¿funciona? Evidencia en capturas de pantalla.
   - ¿Alguna regresión en páginas adyacentes?

**Si el usuario proporciona una URL en modo consciente del diff:** Usa esa URL como base pero sigue limitando las pruebas a los archivos cambiados.

### Completo (por defecto cuando se proporciona URL)
Exploración sistemática. Visitar cada página accesible. Documentar 5-10 incidencias bien evidenciadas. Producir puntuación de salud. Toma 5-15 minutos dependiendo del tamaño de la app.

### Rápido (\`--quick\`)
Test smoke de 30 segundos. Visitar página principal + 5 principales objetivos de navegación. Verificar: ¿carga la página? ¿Errores en consola? ¿Enlaces rotos? Producir puntuación de salud. Sin documentación detallada de incidencias.

### Regresión (\`--regression <baseline>\`)
Ejecutar modo completo, luego cargar \`baseline.json\` de una ejecución anterior. Diff: ¿qué incidencias se corrigieron? ¿Cuáles son nuevas? ¿Cuál es el delta de puntuación? Agregar sección de regresión al informe.

---

## Flujo de Trabajo

### Fase 1: Inicializar

1. Encontrar el binario browse (ver Setup arriba)
2. Crear directorios de salida
3. Copiar plantilla de informe de \`qa/templates/qa-report-template.md\` al directorio de salida
4. Iniciar temporizador para seguimiento de duración

### Fase 2: Autenticar (si es necesario)

**Si el usuario especificó credenciales de autenticación:**

\`\`\`bash
$B goto <login-url>
$B snapshot -i                    # encontrar el formulario de login
$B fill @e3 "user@example.com"
$B fill @e4 "[REDACTED]"         # NUNCA incluir contraseñas reales en el informe
$B click @e5                      # enviar
$B snapshot -D                    # verificar que el login fue exitoso
\`\`\`

**Si el usuario proporcionó un archivo de cookies:**

\`\`\`bash
$B cookie-import cookies.json
$B goto <target-url>
\`\`\`

**Si se requiere 2FA/OTP:** Pregunta al usuario por el código y espera.

**Si un CAPTCHA te bloquea:** Dile al usuario: "Por favor completa el CAPTCHA en el navegador, luego dime que continúe."

### Fase 3: Orientar

Obtener un mapa de la aplicación:

\`\`\`bash
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links                          # mapear estructura de navegación
$B console --errors               # ¿errores al llegar?
\`\`\`

**Detectar framework** (anotar en metadatos del informe):
- \`__next\` en HTML o requests a \`_next/data\` → Next.js
- Meta tag \`csrf-token\` → Rails
- \`wp-content\` en URLs → WordPress
- Enrutamiento client-side sin recarga de página → SPA

**Para SPAs:** El comando \`links\` puede devolver pocos resultados porque la navegación es client-side. Usa \`snapshot -i\` para encontrar elementos de navegación (botones, elementos de menú) en su lugar.

### Fase 4: Explorar

Visitar páginas sistemáticamente. En cada página:

\`\`\`bash
$B goto <page-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/page-name.png"
$B console --errors
\`\`\`

Luego sigue el **checklist de exploración por página** (ver \`qa/references/issue-taxonomy.md\`):

1. **Escaneo visual** — Mira la captura anotada buscando problemas de layout
2. **Elementos interactivos** — Clic en botones, enlaces, controles. ¿Funcionan?
3. **Formularios** — Rellenar y enviar. Probar vacío, inválido, casos extremos
4. **Navegación** — Verificar todas las rutas de entrada y salida
5. **Estados** — Estado vacío, cargando, error, desbordamiento
6. **Consola** — ¿Nuevos errores JS después de las interacciones?
7. **Responsividad** — Verificar viewport móvil si es relevante:
   \`\`\`bash
   $B viewport 375x812
   $B screenshot "$REPORT_DIR/screenshots/page-mobile.png"
   $B viewport 1280x720
   \`\`\`

**Criterio de profundidad:** Dedica más tiempo a funcionalidades principales (página principal, dashboard, checkout, búsqueda) y menos a páginas secundarias (acerca de, términos, privacidad).

**Modo rápido:** Solo visita la página principal + los 5 principales objetivos de navegación de la fase de Orientación. Omite el checklist por página — solo verifica: ¿carga? ¿Errores en consola? ¿Enlaces rotos visibles?

### Fase 5: Documentar

Documenta cada incidencia **inmediatamente cuando se encuentre** — no las acumules.

**Dos niveles de evidencia:**

**Bugs interactivos** (flujos rotos, botones muertos, fallos de formulario):
1. Toma una captura de pantalla antes de la acción
2. Realiza la acción
3. Toma una captura de pantalla mostrando el resultado
4. Usa \`snapshot -D\` para mostrar qué cambió
5. Escribe pasos de reproducción referenciando las capturas

\`\`\`bash
$B screenshot "$REPORT_DIR/screenshots/issue-001-step-1.png"
$B click @e5
$B screenshot "$REPORT_DIR/screenshots/issue-001-result.png"
$B snapshot -D
\`\`\`

**Bugs estáticos** (erratas, problemas de layout, imágenes faltantes):
1. Toma una sola captura anotada mostrando el problema
2. Describe qué está mal

\`\`\`bash
$B snapshot -i -a -o "$REPORT_DIR/screenshots/issue-002.png"
\`\`\`

**Escribe cada incidencia en el informe inmediatamente** usando el formato de plantilla de \`qa/templates/qa-report-template.md\`.

### Fase 6: Cierre

1. **Calcular puntuación de salud** usando la rúbrica a continuación
2. **Escribir "Top 3 Cosas a Corregir"** — las 3 incidencias de mayor severidad
3. **Escribir resumen de salud de consola** — agregar todos los errores de consola vistos en todas las páginas
4. **Actualizar conteos de severidad** en la tabla resumen
5. **Rellenar metadatos del informe** — fecha, duración, páginas visitadas, conteo de capturas, framework
6. **Guardar línea base** — escribir \`baseline.json\` con:
   \`\`\`json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   \`\`\`

**Modo regresión:** Después de escribir el informe, carga el archivo de línea base. Compara:
- Delta de puntuación de salud
- Incidencias corregidas (en la línea base pero no en el actual)
- Nuevas incidencias (en el actual pero no en la línea base)
- Agrega la sección de regresión al informe

---

## Rúbrica de Puntuación de Salud

Calcula la puntuación de cada categoría (0-100), luego toma el promedio ponderado.

### Consola (peso: 15%)
- 0 errores → 100
- 1-3 errores → 70
- 4-10 errores → 40
- 10+ errores → 10

### Enlaces (peso: 10%)
- 0 rotos → 100
- Cada enlace roto → -15 (mínimo 0)

### Puntuación por Categoría (Visual, Funcional, UX, Contenido, Rendimiento, Accesibilidad)
Cada categoría empieza en 100. Deducción por hallazgo:
- Incidencia crítica → -25
- Incidencia alta → -15
- Incidencia media → -8
- Incidencia baja → -3
Mínimo 0 por categoría.

### Pesos
| Categoría | Peso |
|-----------|------|
| Consola | 15% |
| Enlaces | 10% |
| Visual | 10% |
| Funcional | 20% |
| UX | 15% |
| Rendimiento | 10% |
| Contenido | 5% |
| Accesibilidad | 15% |

### Puntuación Final
\`score = Σ (puntuación_categoría × peso)\`

---

## Guía Específica por Framework

### Next.js
- Verificar consola en busca de errores de hidratación (\`Hydration failed\`, \`Text content did not match\`)
- Monitorear requests a \`_next/data\` en la red — los 404 indican fetching de datos roto
- Probar navegación client-side (clic en enlaces, no solo \`goto\`) — detecta problemas de enrutamiento
- Verificar CLS (Cumulative Layout Shift) en páginas con contenido dinámico

### Rails
- Verificar advertencias de queries N+1 en consola (si está en modo desarrollo)
- Verificar presencia de token CSRF en formularios
- Probar integración Turbo/Stimulus — ¿las transiciones de página funcionan suavemente?
- Verificar que los mensajes flash aparecen y se descartan correctamente

### WordPress
- Verificar conflictos de plugins (errores JS de diferentes plugins)
- Verificar visibilidad de la barra de admin para usuarios logueados
- Probar endpoints de la API REST (\`/wp-json/\`)
- Verificar advertencias de contenido mixto (común con WP)

### SPA General (React, Vue, Angular)
- Usar \`snapshot -i\` para navegación — el comando \`links\` no detecta rutas client-side
- Verificar estado obsoleto (navegar lejos y volver — ¿se refrescan los datos?)
- Probar botón atrás/adelante del navegador — ¿la app maneja el historial correctamente?
- Verificar fugas de memoria (monitorear consola después de uso prolongado)

---

## Reglas Importantes

1. **La reproducción es todo.** Cada incidencia necesita al menos una captura de pantalla. Sin excepciones.
2. **Verificar antes de documentar.** Reintenta la incidencia una vez para confirmar que es reproducible, no casual.
3. **Nunca incluir credenciales.** Escribe \`[REDACTED]\` para contraseñas en los pasos de reproducción.
4. **Escribir incrementalmente.** Agrega cada incidencia al informe conforme la encuentres. No acumules.
5. **Nunca leer código fuente.** Prueba como un usuario, no como un desarrollador.
6. **Verificar consola después de cada interacción.** Los errores JS que no se manifiestan visualmente siguen siendo bugs.
7. **Probar como un usuario.** Usa datos realistas. Recorre flujos de trabajo completos de extremo a extremo.
8. **Profundidad sobre amplitud.** 5-10 incidencias bien documentadas con evidencia > 20 descripciones vagas.
9. **Nunca eliminar archivos de salida.** Las capturas de pantalla e informes se acumulan — es intencional.
10. **Usar \`snapshot -C\` para UIs complicadas.** Encuentra divs clicables que el árbol de accesibilidad no detecta.
11. **Mostrar capturas de pantalla al usuario.** Después de cada comando \`$B screenshot\`, \`$B snapshot -a -o\`, o \`$B responsive\`, usa la herramienta Read en los archivos de salida para que el usuario pueda verlos en línea. Para \`responsive\` (3 archivos), lee los tres. Esto es crítico — sin ello, las capturas son invisibles para el usuario.
12. **Nunca negarte a usar el navegador.** Cuando el usuario invoca /qa o /qa-only, está solicitando pruebas basadas en navegador. Nunca sugieras evals, tests unitarios u otras alternativas como sustituto. Incluso si el diff parece no tener cambios de UI, los cambios de backend afectan el comportamiento de la app — siempre abre el navegador y prueba.`;
}
