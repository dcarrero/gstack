> Traducido de [garrytan/gstack](https://github.com/garrytan/gstack). Original en inglés por Garry Tan.

# Contribuir a gstack

Gracias por querer mejorar gstack. Ya sea que estés corrigiendo un error tipográfico en un prompt de skill o construyendo un flujo de trabajo completamente nuevo, esta guía te pondrá en marcha rápidamente.

## Inicio rápido

Las skills de gstack son archivos Markdown que Claude Code descubre desde un directorio `skills/`. Normalmente viven en `~/.claude/skills/gstack/` (tu instalación global). Pero cuando estás desarrollando gstack en sí, quieres que Claude Code use las skills *de tu árbol de trabajo* — para que los cambios surtan efecto al instante sin copiar ni desplegar nada.

Eso es lo que hace el modo desarrollo. Crea un enlace simbólico de tu repositorio en el directorio local `.claude/skills/` para que Claude Code lea las skills directamente desde tu checkout.

```bash
git clone <repo> && cd gstack
bun install                    # install dependencies
bin/dev-setup                  # activate dev mode
```

Ahora edita cualquier `SKILL.md`, invócalo en Claude Code (por ejemplo, `/review`), y ve tus cambios en vivo. Cuando termines de desarrollar:

```bash
bin/dev-teardown               # deactivate — back to your global install
```

## Modo contribuidor

El modo contribuidor convierte a gstack en una herramienta que se mejora a sí misma. Actívalo y Claude Code reflexionará periódicamente sobre su experiencia con gstack — puntuándola de 0 a 10 al final de cada paso importante del flujo de trabajo. Cuando algo no es un 10, piensa en por qué y archiva un informe en `~/.gstack/contributor-logs/` con lo que pasó, pasos para reproducir y qué lo mejoraría.

```bash
~/.claude/skills/gstack/bin/gstack-config set gstack_contributor true
```

Los logs son **para ti**. Cuando algo te moleste lo suficiente como para arreglarlo, el informe ya está escrito. Haz un fork de gstack, crea un enlace simbólico de tu fork en el proyecto donde encontraste el problema, corrígelo y abre un PR.

### El flujo de trabajo del contribuidor

1. **Usa gstack normalmente** — el modo contribuidor reflexiona y registra problemas automáticamente
2. **Revisa tus logs:** `ls ~/.gstack/contributor-logs/`
3. **Haz fork y clona gstack** (si aún no lo has hecho)
4. **Crea un enlace simbólico de tu fork en el proyecto donde encontraste el bug:**
   ```bash
   # In your core project (the one where gstack annoyed you)
   ln -sfn /path/to/your/gstack-fork .claude/skills/gstack
   cd .claude/skills/gstack && bun install && bun run build
   ```
5. **Corrige el problema** — tus cambios están activos inmediatamente en este proyecto
6. **Prueba usando gstack realmente** — haz lo que te molestó, verifica que está corregido
7. **Abre un PR desde tu fork**

Esta es la mejor forma de contribuir: arregla gstack mientras haces tu trabajo real, en el proyecto donde realmente experimentaste el problema.

### Consciencia de sesiones

Cuando tienes 3+ sesiones de gstack abiertas simultáneamente, cada pregunta te dice qué proyecto, qué rama y qué está pasando. No más quedarte mirando una pregunta pensando "espera, ¿en qué ventana estoy?" El formato es consistente en todas las skills.

## Trabajar en gstack dentro del propio repositorio de gstack

Cuando estás editando skills de gstack y quieres probarlas usándolas realmente en el mismo repositorio, `bin/dev-setup` lo configura. Crea enlaces simbólicos en `.claude/skills/` (en gitignore) que apuntan de vuelta a tu árbol de trabajo, para que Claude Code use tus ediciones locales en lugar de la instalación global.

```
gstack/                          <- your working tree
├── .claude/skills/              <- created by dev-setup (gitignored)
│   ├── gstack -> ../../         <- symlink back to repo root
│   ├── review -> gstack/review
│   ├── ship -> gstack/ship
│   └── ...                      <- one symlink per skill
├── review/
│   └── SKILL.md                 <- edit this, test with /review
├── ship/
│   └── SKILL.md
├── browse/
│   ├── src/                     <- TypeScript source
│   └── dist/                    <- compiled binary (gitignored)
└── ...
```

## Flujo de trabajo diario

```bash
# 1. Enter dev mode
bin/dev-setup

# 2. Edit a skill
vim review/SKILL.md

# 3. Test it in Claude Code — changes are live
#    > /review

# 4. Editing browse source? Rebuild the binary
bun run build

# 5. Done for the day? Tear down
bin/dev-teardown
```

## Tests y evaluaciones

### Configuración

```bash
# 1. Copy .env.example and add your API key
cp .env.example .env
# Edit .env → set ANTHROPIC_API_KEY=sk-ant-...

# 2. Install deps (if you haven't already)
bun install
```

Bun carga automáticamente `.env` — sin configuración extra. Los workspaces de Conductor heredan `.env` del worktree principal automáticamente (ver "Workspaces de Conductor" más abajo).

### Niveles de pruebas

| Nivel | Comando | Coste | Qué prueba |
|-------|---------|-------|------------|
| 1 — Estático | `bun test` | Gratis | Validación de comandos, flags de snapshot, corrección de SKILL.md, refs de TODOS-format.md, tests unitarios de observabilidad |
| 2 — E2E | `bun run test:e2e` | ~$3.85 | Ejecución completa de skills mediante subproceso `claude -p` |
| 3 — Eval con LLM | `bun run test:evals` | ~$0.15 individual | LLM como juez puntuando la documentación de SKILL.md generada |
| 2+3 | `bun run test:evals` | ~$4 combinado | E2E + LLM como juez (ejecuta ambos) |

```bash
bun test                     # Tier 1 only (runs on every commit, <5s)
bun run test:e2e             # Tier 2: E2E only (needs EVALS=1, can't run inside Claude Code)
bun run test:evals           # Tier 2 + 3 combined (~$4/run)
```

### Nivel 1: Validación estática (gratis)

Se ejecuta automáticamente con `bun test`. No se necesitan claves de API.

- **Tests del parser de skills** (`test/skill-parser.test.ts`) — Extrae cada comando `$B` de los bloques de código bash de SKILL.md y los valida contra el registro de comandos en `browse/src/commands.ts`. Captura errores tipográficos, comandos eliminados y flags de snapshot inválidos.
- **Tests de validación de skills** (`test/skill-validation.test.ts`) — Valida que los archivos SKILL.md referencien solo comandos y flags reales, y que las descripciones de comandos cumplan umbrales de calidad.
- **Tests del generador** (`test/gen-skill-docs.test.ts`) — Prueba el sistema de plantillas: verifica que los placeholders se resuelvan correctamente, que la salida incluya pistas de valor para flags (por ejemplo, `-d <N>` no solo `-d`), descripciones enriquecidas para comandos clave (por ejemplo, `is` lista estados válidos, `press` lista ejemplos de teclas).

### Nivel 2: E2E via `claude -p` (~$3.85/ejecución)

Lanza `claude -p` como subproceso con `--output-format stream-json --verbose`, transmite NDJSON para progreso en tiempo real, y busca errores de navegación. Esto es lo más cercano a "¿esta skill realmente funciona de extremo a extremo?"

```bash
# Must run from a plain terminal — can't nest inside Claude Code or Conductor
EVALS=1 bun test test/skill-e2e-*.test.ts
```

- Protegido por la variable de entorno `EVALS=1` (previene ejecuciones costosas accidentales)
- Se salta automáticamente si se ejecuta dentro de Claude Code (`claude -p` no puede anidarse)
- Verificación previa de conectividad con la API — falla rápido con ConnectionRefused antes de gastar presupuesto
- Progreso en tiempo real a stderr: `[Ns] turn T tool #C: Name(...)`
- Guarda transcripciones NDJSON completas y JSON de fallos para depuración
- Los tests están en `test/skill-e2e-*.test.ts` (divididos por categoría), la lógica del runner en `test/helpers/session-runner.ts`

### Observabilidad E2E

Cuando los tests E2E se ejecutan, producen artefactos legibles por máquina en `~/.gstack-dev/`:

| Artefacto | Ruta | Propósito |
|-----------|------|-----------|
| Heartbeat | `e2e-live.json` | Estado actual del test (actualizado por llamada a herramienta) |
| Resultados parciales | `evals/_partial-e2e.json` | Tests completados (sobrevive a kills) |
| Log de progreso | `e2e-runs/{runId}/progress.log` | Log de texto solo-escritura-incremental |
| Transcripciones NDJSON | `e2e-runs/{runId}/{test}.ndjson` | Salida bruta de `claude -p` por test |
| JSON de fallos | `e2e-runs/{runId}/{test}-failure.json` | Datos de diagnóstico en caso de fallo |

**Dashboard en vivo:** Ejecuta `bun run eval:watch` en una segunda terminal para ver un dashboard en vivo mostrando tests completados, el test en ejecución actual y el coste. Usa `--tail` para ver también las últimas 10 líneas de progress.log.

**Herramientas del historial de evaluaciones:**

```bash
bun run eval:list            # list all eval runs (turns, duration, cost per run)
bun run eval:compare         # compare two runs — shows per-test deltas + Takeaway commentary
bun run eval:summary         # aggregate stats + per-test efficiency averages across runs
```

**Comentario de comparación de evaluaciones:** `eval:compare` genera secciones de resumen en lenguaje natural interpretando qué cambió entre ejecuciones — señalando regresiones, anotando mejoras, destacando ganancias de eficiencia (menos turnos, más rápido, más barato) y produciendo un resumen general. Esto se gestiona mediante `generateCommentary()` en `eval-store.ts`.

Los artefactos nunca se limpian — se acumulan en `~/.gstack-dev/` para depuración post-mortem y análisis de tendencias.

### Nivel 3: LLM como juez (~$0.15/ejecución)

Usa Claude Sonnet para puntuar la documentación generada de SKILL.md en tres dimensiones:

- **Claridad** — ¿Puede un agente de IA entender las instrucciones sin ambigüedad?
- **Completitud** — ¿Están documentados todos los comandos, flags y patrones de uso?
- **Accionabilidad** — ¿Puede el agente ejecutar tareas usando solo la información del documento?

Cada dimensión se puntúa de 1 a 5. Umbral: cada dimensión debe puntuar **>= 4**. También hay un test de regresión que compara la documentación generada contra la línea base mantenida manualmente desde `origin/main` — la generada debe puntuar igual o más alto.

```bash
# Needs ANTHROPIC_API_KEY in .env — included in bun run test:evals
```

- Usa `claude-sonnet-4-6` para estabilidad en las puntuaciones
- Los tests están en `test/skill-llm-eval.test.ts`
- Llama a la API de Anthropic directamente (no `claude -p`), así que funciona desde cualquier lugar incluyendo dentro de Claude Code

### CI

Una GitHub Action (`.github/workflows/skill-docs.yml`) ejecuta `bun run gen:skill-docs --dry-run` en cada push y PR. Si los archivos SKILL.md generados difieren de lo que está commiteado, CI falla. Esto captura documentación obsoleta antes del merge.

Los tests se ejecutan contra el binario de browse directamente — no requieren modo desarrollo.

## Editar archivos SKILL.md

Los archivos SKILL.md son **generados** a partir de plantillas `.tmpl`. No edites el `.md` directamente — tus cambios se sobrescribirán en el siguiente build.

```bash
# 1. Edit the template
vim SKILL.md.tmpl              # or browse/SKILL.md.tmpl

# 2. Regenerate for both hosts
bun run gen:skill-docs
bun run gen:skill-docs --host codex

# 3. Check health (reports both Claude and Codex)
bun run skill:check

# Or use watch mode — auto-regenerates on save
bun run dev:skill
```

Para las mejores prácticas de autoría de plantillas (lenguaje natural en lugar de bash-ismos, detección dinámica de rama, uso de `{{BASE_BRANCH_DETECT}}`), consulta la sección "Writing SKILL templates" de CLAUDE.md.

Para añadir un comando de browse, añádelo a `browse/src/commands.ts`. Para añadir un flag de snapshot, añádelo a `SNAPSHOT_FLAGS` en `browse/src/snapshot.ts`. Luego recompila.

## Desarrollo dual-host (Claude + Codex)

gstack genera archivos SKILL.md para dos hosts: **Claude** (`.claude/skills/`) y **Codex** (`.agents/skills/`). Cada cambio en las plantillas debe generarse para ambos.

### Generar para ambos hosts

```bash
# Generate Claude output (default)
bun run gen:skill-docs

# Generate Codex output
bun run gen:skill-docs --host codex
# --host agents is an alias for --host codex

# Or use build, which does both + compiles binaries
bun run build
```

### Qué cambia entre hosts

| Aspecto | Claude | Codex |
|---------|--------|-------|
| Directorio de salida | `{skill}/SKILL.md` | `.agents/skills/gstack-{skill}/SKILL.md` (generado en la configuración, en gitignore) |
| Frontmatter | Completo (name, description, allowed-tools, hooks, version) | Mínimo (solo name + description) |
| Rutas | `~/.claude/skills/gstack` | `$GSTACK_ROOT` (`.agents/skills/gstack` en un repo, de lo contrario `~/.codex/skills/gstack`) |
| Skills de hook | Frontmatter `hooks:` (forzado por Claude) | Texto de aviso de seguridad en línea (solo consultivo) |
| Skill `/codex` | Incluida (Claude envuelve la ejecución de codex) | Excluida (auto-referencial) |

### Probar la salida de Codex

```bash
# Run all static tests (includes Codex validation)
bun test

# Check freshness for both hosts
bun run gen:skill-docs --dry-run
bun run gen:skill-docs --host codex --dry-run

# Health dashboard covers both hosts
bun run skill:check
```

### Configuración de desarrollo para .agents/

Cuando ejecutas `bin/dev-setup`, crea enlaces simbólicos tanto en `.claude/skills/` como en `.agents/skills/` (si aplica), para que los agentes compatibles con Codex también puedan descubrir tus skills de desarrollo. El directorio `.agents/` se genera en el momento de la configuración a partir de las plantillas `.tmpl` — está en gitignore y no se commitea.

### Añadir una nueva skill

Cuando añades una nueva plantilla de skill, ambos hosts la obtienen automáticamente:
1. Crea `{skill}/SKILL.md.tmpl`
2. Ejecuta `bun run gen:skill-docs` (salida Claude) y `bun run gen:skill-docs --host codex` (salida Codex)
3. El descubrimiento dinámico de plantillas la recoge — no hay una lista estática que actualizar
4. Commitea `{skill}/SKILL.md` — `.agents/` se genera en el momento de la configuración y está en gitignore

## Workspaces de Conductor

Si usas [Conductor](https://conductor.build) para ejecutar múltiples sesiones de Claude Code en paralelo, `conductor.json` configura automáticamente el ciclo de vida de los workspaces:

| Hook | Script | Qué hace |
|------|--------|----------|
| `setup` | `bin/dev-setup` | Copia `.env` del worktree principal, instala dependencias, crea enlaces simbólicos de skills |
| `archive` | `bin/dev-teardown` | Elimina enlaces simbólicos de skills, limpia el directorio `.claude/` |

Cuando Conductor crea un nuevo workspace, `bin/dev-setup` se ejecuta automáticamente. Detecta el worktree principal (mediante `git worktree list`), copia tu `.env` para que las claves de API se propaguen, y configura el modo desarrollo — sin pasos manuales necesarios.

**Primera configuración:** Pon tu `ANTHROPIC_API_KEY` en `.env` en el repositorio principal (consulta `.env.example`). Cada workspace de Conductor la hereda automáticamente.

## Cosas que debes saber

- **Los archivos SKILL.md son generados.** Edita la plantilla `.tmpl`, no el `.md`. Ejecuta `bun run gen:skill-docs` para regenerar.
- **TODOS.md es el backlog unificado.** Organizado por skill/componente con prioridades P0-P4. `/ship` auto-detecta los ítems completados. Todas las skills de planificación/revisión/retro lo leen para obtener contexto.
- **Los cambios en el código fuente de browse necesitan recompilación.** Si tocas `browse/src/*.ts`, ejecuta `bun run build`.
- **El modo desarrollo oculta tu instalación global.** Las skills locales del proyecto tienen prioridad sobre `~/.claude/skills/gstack`. `bin/dev-teardown` restaura la global.
- **Los workspaces de Conductor son independientes.** Cada workspace es su propio worktree de git. `bin/dev-setup` se ejecuta automáticamente mediante `conductor.json`.
- **`.env` se propaga entre worktrees.** Configúralo una vez en el repositorio principal, todos los workspaces de Conductor lo obtienen.
- **`.claude/skills/` está en gitignore.** Los enlaces simbólicos nunca se commitean.

## Probar tus cambios en un proyecto real

**Esta es la forma recomendada de desarrollar gstack.** Crea un enlace simbólico de tu checkout de gstack en el proyecto donde realmente lo usas, para que tus cambios estén activos mientras haces trabajo real:

```bash
# In your core project
ln -sfn /path/to/your/gstack-checkout .claude/skills/gstack
cd .claude/skills/gstack && bun install && bun run build
```

Ahora cada invocación de una skill de gstack en este proyecto usa tu árbol de trabajo. Edita una plantilla, ejecuta `bun run gen:skill-docs`, y la siguiente llamada a `/review` o `/qa` lo recoge inmediatamente.

**Para volver a la instalación global estable**, simplemente elimina el enlace simbólico:

```bash
rm .claude/skills/gstack
```

Claude Code recurre automáticamente a `~/.claude/skills/gstack/`.

### Alternativa: apuntar tu instalación global a una rama

Si no quieres enlaces simbólicos por proyecto, puedes cambiar la instalación global:

```bash
cd ~/.claude/skills/gstack
git fetch origin
git checkout origin/<branch>
bun install && bun run build
```

Esto afecta a todos los proyectos. Para revertir: `git checkout main && git pull && bun run build`.

## Triaje de PR de la comunidad (proceso por oleadas)

Cuando los PR de la comunidad se acumulan, agrúpalos en oleadas temáticas:

1. **Categorizar** — agrupar por tema (seguridad, funcionalidades, infraestructura, documentación)
2. **Deduplicar** — si dos PR arreglan lo mismo, elige el que cambia menos líneas. Cierra el otro con una nota apuntando al ganador.
3. **Rama colectora** — crea `pr-wave-N`, mergea los PR limpios, resuelve conflictos de los sucios, verifica con `bun test && bun run build`
4. **Cerrar con contexto** — cada PR cerrado recibe un comentario explicando por qué y qué (si algo) lo reemplaza. Los contribuidores hicieron trabajo real; respeta eso con comunicación clara.
5. **Enviar como un solo PR** — un único PR a main con todas las atribuciones preservadas en los merge commits. Incluye una tabla resumen de lo que se mergeó y lo que se cerró.

Consulta [PR #205](../../pull/205) (v0.8.3) como ejemplo de la primera oleada.

## Enviar tus cambios

Cuando estés satisfecho con tus ediciones de skills:

```bash
/ship
```

Esto ejecuta tests, revisa el diff, triagea los comentarios de Greptile (con escalación de 2 niveles), gestiona TODOS.md, incrementa la versión y abre un PR. Consulta `ship/SKILL.md` para el flujo de trabajo completo.
