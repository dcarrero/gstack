import type { TemplateContext } from './types';

export function generateTestBootstrap(_ctx: TemplateContext): string {
  return `## Bootstrap del Framework de Tests

**Detectar el framework de tests existente y el runtime del proyecto:**

\`\`\`bash
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
\`\`\`

**Si se detectó un framework de tests** (archivos de configuración o directorios de tests encontrados):
Imprime "Framework de tests detectado: {nombre} ({N} tests existentes). Omitiendo bootstrap."
Lee 2-3 archivos de test existentes para aprender convenciones (nomenclatura, imports, estilo de assertions, patrones de setup).
Almacena las convenciones como contexto en prosa para usar en la Fase 8e.5 o Paso 3.4. **Omite el resto del bootstrap.**

**Si aparece BOOTSTRAP_DECLINED**: Imprime "Bootstrap de tests previamente rechazado — omitiendo." **Omite el resto del bootstrap.**

**Si NO se detectó runtime** (sin archivos de configuración encontrados): Usa AskUserQuestion:
"No pude detectar el lenguaje de tu proyecto. ¿Qué runtime estás usando?"
Opciones: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) Este proyecto no necesita tests.
Si el usuario elige H → escribe \`.gstack/no-test-bootstrap\` y continúa sin tests.

**Si se detectó runtime pero no framework de tests — hacer bootstrap:**

### B2. Investigar mejores prácticas

Usa WebSearch para encontrar las mejores prácticas actuales para el runtime detectado:
- \`"[runtime] best test framework 2025 2026"\`
- \`"[framework A] vs [framework B] comparison"\`

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

Si el usuario elige C → escribe \`.gstack/no-test-bootstrap\`. Dile al usuario: "Si cambias de opinión después, elimina \`.gstack/no-test-bootstrap\` y vuelve a ejecutar." Continúa sin tests.

Si se detectaron múltiples runtimes (monorepo) → pregunta qué runtime configurar primero, con opción de hacer ambos secuencialmente.

### B4. Instalar y configurar

1. Instala los paquetes elegidos (npm/bun/gem/pip/etc.)
2. Crea un archivo de configuración mínimo
3. Crea la estructura de directorios (test/, spec/, etc.)
4. Crea un test de ejemplo que coincida con el código del proyecto para verificar que el setup funciona

Si la instalación de paquetes falla → depura una vez. Si sigue fallando → revierte con \`git checkout -- package.json package-lock.json\` (o equivalente para el runtime). Avisa al usuario y continúa sin tests.

### B4.5. Primeros tests reales

Genera 3-5 tests reales para código existente:

1. **Encontrar archivos cambiados recientemente:** \`git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10\`
2. **Priorizar por riesgo:** Manejadores de errores > lógica de negocio con condicionales > endpoints de API > funciones puras
3. **Para cada archivo:** Escribe un test que pruebe comportamiento real con assertions significativas. Nunca \`expect(x).toBeDefined()\` — prueba lo que el código HACE.
4. Ejecuta cada test. Pasa → conservar. Falla → arreglar una vez. Sigue fallando → eliminar silenciosamente.
5. Genera al menos 1 test, máximo 5.

Nunca importes secretos, claves API o credenciales en archivos de test. Usa variables de entorno o fixtures de test.

### B5. Verificar

\`\`\`bash
# Ejecutar la suite completa de tests para confirmar que todo funciona
{detected test command}
\`\`\`

Si los tests fallan → depura una vez. Si siguen fallando → revierte todos los cambios del bootstrap y avisa al usuario.

### B5.5. Pipeline CI/CD

\`\`\`bash
# Comprobar proveedor de CI
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
\`\`\`

Si \`.github/\` existe (o no se detectó CI — usar GitHub Actions por defecto):
Crea \`.github/workflows/test.yml\` con:
- \`runs-on: ubuntu-latest\`
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

Primero verifica: Si CLAUDE.md ya tiene una sección \`## Testing\` → omite. No dupliques.

Agrega una sección \`## Testing\`:
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

\`\`\`bash
git status --porcelain
\`\`\`

Solo haz commit si hay cambios. Agrega al staging todos los archivos del bootstrap (config, directorio de tests, TESTING.md, CLAUDE.md, .github/workflows/test.yml si se creó):
\`git commit -m "chore: bootstrap test framework ({framework name})"\`

---`;
}

// ─── Test Coverage Audit ────────────────────────────────────────────────
//
// Shared methodology for codepath tracing, ASCII diagrams, and test gap analysis.
// Three modes, three placeholders, one inner function:
//
//   {{TEST_COVERAGE_AUDIT_PLAN}}   → plan-eng-review: adds missing tests to the plan
//   {{TEST_COVERAGE_AUDIT_SHIP}}   → ship: auto-generates tests, coverage summary
//   {{TEST_COVERAGE_AUDIT_REVIEW}} → review: generates tests via Fix-First (ASK)
//
//   ┌────────────────────────────────────────────────┐
//   │  generateTestCoverageAuditInner(mode)          │
//   │                                                │
//   │  SHARED: framework detect, codepath trace,     │
//   │    ASCII diagram, quality rubric, E2E matrix,  │
//   │    regression rule                             │
//   │                                                │
//   │  plan:   edit plan file, write artifact        │
//   │  ship:   auto-generate tests, write artifact   │
//   │  review: Fix-First ASK, INFORMATIONAL gaps     │
//   └────────────────────────────────────────────────┘

type CoverageAuditMode = 'plan' | 'ship' | 'review';

function generateTestCoverageAuditInner(mode: CoverageAuditMode): string {
  const sections: string[] = [];

  // ── Intro (mode-specific) ──
  if (mode === 'ship') {
    sections.push(`El objetivo es 100% de cobertura — cada camino sin probar es un camino donde los bugs se esconden y el vibe coding se convierte en yolo coding. Evalúa lo que se CODIFICÓ REALMENTE (del diff), no lo que se planificó.`);
  } else if (mode === 'plan') {
    sections.push(`El objetivo es 100% de cobertura. Evalúa cada ruta de código en el plan y asegura que el plan incluya tests para cada una. Si al plan le faltan tests, agrégalos — el plan debe ser lo suficientemente completo para que la implementación incluya cobertura completa de tests desde el inicio.`);
  } else {
    sections.push(`El objetivo es 100% de cobertura. Evalúa cada ruta de código cambiada en el diff e identifica brechas de tests. Las brechas se convierten en hallazgos INFORMATIONAL que siguen el flujo Fix-First.`);
  }

  // ── Test framework detection (shared) ──
  sections.push(`
### Detección del Framework de Tests

Antes de analizar la cobertura, detecta el framework de tests del proyecto:

1. **Lee CLAUDE.md** — busca una sección \`## Testing\` con el comando de test y nombre del framework. Si se encuentra, úsalo como la fuente autoritativa.
2. **Si CLAUDE.md no tiene sección de testing, auto-detectar:**

\`\`\`bash
# Detectar runtime del proyecto
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
# Comprobar infraestructura de tests existente
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
\`\`\`

3. **Si no se detectó framework:**${mode === 'ship' ? ' cae al paso de Bootstrap del Framework de Tests (Paso 2.5) que maneja la configuración completa.' : ' igualmente produce el diagrama de cobertura, pero omite la generación de tests.'}`);

  // ── Before/after count (ship only) ──
  if (mode === 'ship') {
    sections.push(`
**0. Conteo antes/después de tests:**

\`\`\`bash
# Contar archivos de test antes de cualquier generación
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

Almacena este número para el cuerpo del PR.`);
  }

  // ── Codepath tracing methodology (shared, with mode-specific source) ──
  const traceSource = mode === 'plan'
    ? `**Paso 1. Trazar cada ruta de código en el plan:**

Lee el documento del plan. Para cada nueva funcionalidad, servicio, endpoint o componente descrito, traza cómo los datos fluirán a través del código — no solo listes funciones planificadas, sigue realmente la ejecución planificada:`
    : `**${mode === 'ship' ? '1' : 'Paso 1'}. Trazar cada ruta de código cambiada** usando \`git diff origin/<base>...HEAD\`:

Lee cada archivo cambiado. Para cada uno, traza cómo los datos fluyen a través del código — no solo listes funciones, sigue realmente la ejecución:`;

  const traceStep1 = mode === 'plan'
    ? `1. **Lee el plan.** Para cada componente planificado, entiende qué hace y cómo se conecta al código existente.`
    : `1. **Lee el diff.** Para cada archivo cambiado, lee el archivo completo (no solo el fragmento del diff) para entender el contexto.`;

  sections.push(`
${traceSource}

${traceStep1}
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

Este es el paso crítico — estás construyendo un mapa de cada línea de código que puede ejecutarse de manera diferente según la entrada. Cada rama en este diagrama necesita un test.`);

  // ── User flow coverage (shared) ──
  sections.push(`
**${mode === 'ship' ? '2' : 'Paso 2'}. Mapear flujos de usuario, interacciones y estados de error:**

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

Agrega estos a tu diagrama junto con las ramas de código. Un flujo de usuario sin test es una brecha tan grande como un if/else sin probar.`);

  // ── Check branches against tests + quality rubric (shared) ──
  sections.push(`
**${mode === 'ship' ? '3' : 'Paso 3'}. Verificar cada rama contra los tests existentes:**

Recorre tu diagrama rama por rama — tanto rutas de código COMO flujos de usuario. Para cada uno, busca un test que lo ejercite:
- Función \`processPayment()\` → busca \`billing.test.ts\`, \`billing.spec.ts\`, \`test/billing_test.rb\`
- Un if/else → busca tests que cubran AMBOS caminos verdadero Y falso
- Un manejador de errores → busca un test que active esa condición específica de error
- Una llamada a \`helperFn()\` que tiene sus propias ramas → esas ramas necesitan tests también
- Un flujo de usuario → busca un test de integración o E2E que recorra el camino
- Un caso extremo de interacción → busca un test que simule la acción inesperada

Rúbrica de puntuación de calidad:
- ★★★  Prueba comportamiento con casos extremos Y rutas de error
- ★★   Prueba comportamiento correcto, solo camino feliz
- ★    Test smoke / verificación de existencia / assertion trivial (ej.: "renderiza", "no lanza excepción")`);

  // ── E2E test decision matrix (shared) ──
  sections.push(`
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
- Flujo oscuro/raro que no es de cara al cliente`);

  // ── Regression rule (shared) ──
  sections.push(`
### REGLA DE REGRESIÓN (obligatoria)

**REGLA DE HIERRO:** Cuando la auditoría de cobertura identifica una REGRESIÓN — código que antes funcionaba pero el diff rompió — un test de regresión se ${mode === 'plan' ? 'agrega al plan como requisito crítico' : 'escribe inmediatamente'}. Sin AskUserQuestion. Sin omitir. Las regresiones son el test de mayor prioridad porque prueban que algo se rompió.

Una regresión ocurre cuando:
- El diff modifica comportamiento existente (no código nuevo)
- La suite de tests existente (si la hay) no cubre la ruta cambiada
- El cambio introduce un nuevo modo de fallo para llamadores existentes

Ante la duda sobre si un cambio es una regresión, opta por escribir el test.${mode !== 'plan' ? '\n\nFormato: commit como `test: regression test for {what broke}`' : ''}`);

  // ── ASCII coverage diagram (shared) ──
  sections.push(`
**${mode === 'ship' ? '4' : 'Paso 4'}. Generar diagrama ASCII de cobertura:**

Incluye TANTO rutas de código COMO flujos de usuario en el mismo diagrama. Marca las rutas que ameritan E2E y eval:

\`\`\`
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
\`\`\`

**Camino rápido:** Todas las rutas cubiertas → "${mode === 'ship' ? 'Paso 3.4' : mode === 'review' ? 'Paso 4.75' : 'Revisión de tests'}: Todas las nuevas rutas de código tienen cobertura de tests ✓" Continuar.`);

  // ── Mode-specific action section ──
  if (mode === 'plan') {
    sections.push(`
**Paso 5. Agregar tests faltantes al plan:**

Para cada GAP identificado en el diagrama, agrega un requisito de test al plan. Sé específico:
- Qué archivo de test crear (coincide con las convenciones de nomenclatura existentes)
- Qué debe verificar el test (entradas específicas → salidas/comportamiento esperado)
- Si es un test unitario, test E2E, o eval (usa la matriz de decisión)
- Para regresiones: marcar como **CRITICAL** y explicar qué se rompió

El plan debe ser lo suficientemente completo para que cuando comience la implementación, cada test se escriba junto con el código de la funcionalidad — no diferido a un seguimiento.`);

    // ── Test plan artifact (plan + ship) ──
    sections.push(`
### Artefacto del Plan de Tests

Después de producir el diagrama de cobertura, escribe un artefacto de plan de tests en el directorio del proyecto para que \`/qa\` y \`/qa-only\` puedan consumirlo como entrada primaria de tests:

\`\`\`bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
\`\`\`

Escribe en \`~/.gstack/projects/{slug}/{user}-{branch}-eng-review-test-plan-{datetime}.md\`:

\`\`\`markdown
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
\`\`\`

Este archivo es consumido por \`/qa\` y \`/qa-only\` como entrada primaria de tests. Incluye solo la información que ayuda a un tester de QA a saber **qué probar y dónde** — no detalles de implementación.`);
  } else if (mode === 'ship') {
    sections.push(`
**5. Generar tests para rutas sin cobertura:**

Si se detectó un framework de tests (o se hizo bootstrap en el Paso 2.5):
- Prioriza manejadores de errores y casos extremos primero (los caminos felices son más probablemente ya testeados)
- Lee 2-3 archivos de test existentes para coincidir exactamente con las convenciones
- Genera tests unitarios. Mockea todas las dependencias externas (BD, API, Redis).
- Para rutas marcadas [→E2E]: genera tests de integración/E2E usando el framework E2E del proyecto (Playwright, Cypress, Capybara, etc.)
- Para rutas marcadas [→EVAL]: genera tests eval usando el framework eval del proyecto, o marca para eval manual si no existe ninguno
- Escribe tests que ejerciten la ruta específica sin cobertura con assertions reales
- Ejecuta cada test. Pasa → commit como \`test: coverage for {feature}\`
- Falla → arregla una vez. Sigue fallando → revierte, anota brecha en el diagrama.

Límites: máximo 30 rutas de código, máximo 20 tests generados (código + flujo de usuario combinados), límite de 2 min de exploración por test.

Si no hay framework de tests Y el usuario rechazó el bootstrap → solo diagrama, sin generación. Nota: "Generación de tests omitida — no hay framework de tests configurado."

**El diff solo contiene cambios de tests:** Omite el Paso 3.4 por completo: "Sin nuevas rutas de código de aplicación para auditar."

**6. Conteo final y resumen de cobertura:**

\`\`\`bash
# Contar archivos de test después de la generación
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

Para el cuerpo del PR: \`Tests: {antes} → {después} (+{delta} nuevos)\`
Línea de cobertura: \`Auditoría de Cobertura de Tests: N nuevas rutas de código. M cubiertas (X%). K tests generados, J committeados.\`

**7. Gate de cobertura:**

Antes de proceder, revisa CLAUDE.md buscando una sección \`## Test Coverage\` con campos \`Minimum:\` y \`Target:\`. Si se encuentran, usa esos porcentajes. De lo contrario usa los defaults: Mínimo = 60%, Objetivo = 80%.

Usando el porcentaje de cobertura del diagrama en el subpaso 4 (la línea \`COBERTURA: X/Y (Z%)\`):

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

**100% de cobertura:** "Gate de cobertura: APROBADO (100%)." Continuar.`);

    // ── Test plan artifact (ship mode) ──
    sections.push(`
### Artefacto del Plan de Tests

Después de producir el diagrama de cobertura, escribe un artefacto de plan de tests para que \`/qa\` y \`/qa-only\` puedan consumirlo:

\`\`\`bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
\`\`\`

Escribe en \`~/.gstack/projects/{slug}/{user}-{branch}-ship-test-plan-{datetime}.md\`:

\`\`\`markdown
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
\`\`\``);
  } else {
    // review mode
    sections.push(`
**Paso 5. Generar tests para brechas (Fix-First):**

Si se detectó un framework de tests y se identificaron brechas:
- Clasifica cada brecha como AUTO-FIX o ASK según la Heurística Fix-First:
  - **AUTO-FIX:** Tests unitarios simples para funciones puras, casos extremos de funciones ya probadas
  - **ASK:** Tests E2E, tests que requieren nueva infraestructura de testing, tests para comportamiento ambiguo
- Para brechas AUTO-FIX: genera el test, ejecútalo, commit como \`test: coverage for {feature}\`
- Para brechas ASK: incluye en la pregunta batch Fix-First con los otros hallazgos de la revisión
- Para rutas marcadas [→E2E]: siempre ASK (los tests E2E son de mayor esfuerzo y necesitan confirmación del usuario)
- Para rutas marcadas [→EVAL]: siempre ASK (los tests eval necesitan confirmación del usuario sobre criterios de calidad)

Si no se detectó framework de tests → incluye brechas como hallazgos solo INFORMATIONAL, sin generación.

**El diff solo contiene cambios de tests:** Omite el Paso 4.75 por completo: "Sin nuevas rutas de código de aplicación para auditar."

### Advertencia de Cobertura

Después de producir el diagrama de cobertura, revisa el porcentaje de cobertura. Lee CLAUDE.md buscando una sección \`## Test Coverage\` con un campo \`Minimum:\`. Si no se encuentra, usa el default: 60%.

Si la cobertura está debajo del umbral mínimo, genera una advertencia prominente **antes** de los hallazgos regulares de la revisión:

\`\`\`
⚠️ ADVERTENCIA DE COBERTURA: La cobertura evaluada por IA es {X}%. {N} rutas de código sin probar.
Considera escribir tests antes de ejecutar /ship.
\`\`\`

Esto es INFORMATIONAL — no bloquea /review. Pero hace visible la baja cobertura tempranamente para que el desarrollador pueda abordarla antes de llegar al gate de cobertura de /ship.

Si el porcentaje de cobertura no puede determinarse, omite la advertencia silenciosamente.`);
  }

  return sections.join('\n');
}

export function generateTestCoverageAuditPlan(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('plan');
}

export function generateTestCoverageAuditShip(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('ship');
}

export function generateTestCoverageAuditReview(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('review');
}
