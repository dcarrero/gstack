# gstack-es

> Traducción al castellano con adaptaciones de [David Carrero](https://carrero.es) del proyecto [garrytan/gstack](https://github.com/garrytan/gstack) — la fábrica de software open source de Garry Tan (CEO de Y Combinator).

> "No creo que haya escrito ni una línea de código probablemente desde diciembre, lo cual es un cambio enorme." — [Andrej Karpathy](https://fortune.com/2026/03/21/andrej-karpathy-openai-cofounder-ai-agents-coding-state-of-psychosis-openclaw/), No Priors podcast, marzo 2026

Una persona con las herramientas adecuadas puede avanzar más rápido que un equipo tradicional. Peter Steinberger construyó [OpenClaw](https://github.com/openclaw/openclaw) — 247K estrellas en GitHub — esencialmente solo con agentes IA. La revolución está aquí.

**gstack convierte Claude Code en un equipo virtual de ingeniería** — un CEO que replantea el producto, un jefe de ingeniería que fija la arquitectura, un diseñador que detecta errores de IA, un revisor que encuentra bugs de producción, un QA lead que abre un navegador real, un responsable de seguridad que ejecuta auditorías OWASP + STRIDE, y un release engineer que envía el PR. Veinte especialistas y ocho herramientas avanzadas, todo en comandos slash, todo en Markdown, todo gratis, licencia MIT.

**Para quién es:**
- **Fundadores y CEOs** — especialmente técnicos que quieren seguir entregando código
- **Usuarios nuevos de Claude Code** — roles estructurados en vez de un prompt en blanco
- **Tech leads e ingenieros senior** — revisión rigurosa, QA y automatización de releases en cada PR

## Inicio rápido

1. Instala gstack (30 segundos — ver abajo)
2. Ejecuta `/office-hours` — describe lo que estás construyendo
3. Ejecuta `/plan-ceo-review` sobre cualquier idea de feature
4. Ejecuta `/review` en cualquier rama con cambios
5. Ejecuta `/qa` sobre tu URL de staging
6. Para ahí. Sabrás si esto es para ti.

## Instalación — 30 segundos

**Requisitos:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+, [Node.js](https://nodejs.org/) (solo Windows)

### Paso 1: Instalar en tu máquina

Abre Claude Code y pega esto. Claude hace el resto.

> Instala gstack-es: ejecuta **`git clone https://github.com/dcarrero/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`** y después añade una sección "gstack" al CLAUDE.md que diga usar el skill /browse de gstack para toda navegación web, nunca usar herramientas mcp\_\_claude-in-chrome\_\_\*, y liste los skills disponibles: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade.

### Paso 2: Añadir al repo para que el equipo lo tenga (opcional)

> Añade gstack a este proyecto: ejecuta **`cp -Rf ~/.claude/skills/gstack .claude/skills/gstack && rm -rf .claude/skills/gstack/.git && cd .claude/skills/gstack && ./setup`** y añade una sección "gstack" al CLAUDE.md del proyecto.

Los archivos reales se hacen commit en tu repo (no es un submódulo), así que `git clone` simplemente funciona. Todo vive dentro de `.claude/`. Nada toca tu PATH ni corre en segundo plano.

### Codex, Gemini CLI o Cursor

gstack funciona en cualquier agente que soporte el [estándar SKILL.md](https://github.com/anthropics/claude-code).

```bash
# Instalar en un repo:
git clone https://github.com/dcarrero/gstack.git .agents/skills/gstack
cd .agents/skills/gstack && ./setup --host codex

# Instalar globalmente:
git clone https://github.com/dcarrero/gstack.git ~/gstack
cd ~/gstack && ./setup --host codex

# Auto-detectar agentes instalados:
git clone https://github.com/dcarrero/gstack.git ~/gstack
cd ~/gstack && ./setup --host auto
```

## Míralo en acción

```
Tú:     Quiero construir una app de briefing diario para mi calendario.
Tú:     /office-hours
Claude: [pregunta sobre el dolor — ejemplos específicos, no hipotéticos]

Tú:     Múltiples calendarios de Google, eventos con info obsoleta,
        ubicaciones incorrectas. Preparar todo tarda una eternidad
        y los resultados no son suficientemente buenos...

Claude: Voy a cuestionar el planteamiento. Dijiste "app de briefing
        diario." Pero lo que realmente describes es un asistente
        personal con IA.
        [extrae 5 capacidades que no sabías que estabas describiendo]
        [cuestiona 4 premisas — aceptas, rechazas o ajustas]
        [genera 3 enfoques de implementación con estimaciones]
        RECOMENDACIÓN: Lanza la versión más reducida mañana, aprende
        del uso real. La visión completa es un proyecto de 3 meses —
        empieza con el briefing diario que realmente funcione.
        [escribe doc de diseño → alimenta los skills posteriores]

Tú:     /plan-ceo-review
        [lee el doc de diseño, cuestiona el alcance, ejecuta revisión de 10 secciones]

Tú:     /plan-eng-review
        [diagramas ASCII de flujo de datos, máquinas de estado, rutas de error]
        [matriz de tests, modos de fallo, preocupaciones de seguridad]

Tú:     Aprobar plan. Salir del modo plan.
        [escribe 2.400 líneas en 11 archivos. ~8 minutos.]

Tú:     /review
        [AUTO-CORREGIDO] 2 issues. [CONSULTA] Condición de carrera → apruebas el fix.

Tú:     /qa https://staging.myapp.com
        [abre navegador real, navega los flujos, encuentra y corrige un bug]

Tú:     /ship
        Tests: 42 → 51 (+9 nuevos). PR: github.com/you/app/pull/42
```

Dijiste "app de briefing diario." El agente dijo "estás construyendo un asistente personal con IA" — porque escuchó tu dolor, no tu petición de feature. Ocho comandos, de principio a fin. Eso no es un copiloto. Es un equipo.

## El sprint

gstack es un proceso, no una colección de herramientas. Los skills se ejecutan en el orden en que se ejecuta un sprint:

**Pensar → Planificar → Construir → Revisar → Probar → Entregar → Reflexionar**

Cada skill alimenta al siguiente. `/office-hours` escribe un doc de diseño que `/plan-ceo-review` lee. `/plan-eng-review` escribe un plan de tests que `/qa` recoge. `/review` encuentra bugs que `/ship` verifica que estén corregidos.

| Skill | Tu especialista | Qué hace |
|-------|----------------|----------|
| `/office-hours` | **Office Hours (estilo YC)** | Empieza aquí. Seis preguntas que replantean tu producto antes de escribir código. Cuestiona premisas, genera alternativas de implementación. |
| `/plan-ceo-review` | **CEO / Fundador** | Replantea el problema. Encuentra el producto 10 estrellas escondido en la petición. Cuatro modos: Expansión, Expansión Selectiva, Mantener Alcance, Reducción. |
| `/plan-eng-review` | **Jefe de Ingeniería** | Fija arquitectura, flujo de datos, diagramas, casos límite y tests. Saca a la luz las suposiciones ocultas. |
| `/plan-design-review` | **Diseñador Senior** | Puntúa cada dimensión de diseño 0-10, explica cómo sería un 10, y edita el plan. Detección de "AI Slop". |
| `/design-consultation` | **Socio de Diseño** | Construye un sistema de diseño completo desde cero. Investiga el panorama, propone riesgos creativos, genera mockups. |
| `/review` | **Ingeniero Staff** | Encuentra bugs que pasan CI pero explotan en producción. Auto-corrige los obvios. Señala gaps de completitud. |
| `/investigate` | **Debugger** | Debugging sistemático con análisis de causa raíz. Regla de hierro: no hay fixes sin investigación. |
| `/design-review` | **Diseñador que Programa** | Misma auditoría que /plan-design-review, y además corrige lo que encuentra. Commits atómicos. |
| `/qa` | **QA Lead** | Prueba tu app, encuentra bugs, los corrige con commits atómicos, re-verifica. Auto-genera tests de regresión. |
| `/qa-only` | **QA Reporter** | Misma metodología que /qa pero solo reporta. Informe de bugs puro sin cambios de código. |
| `/cso` | **Chief Security Officer** | OWASP Top 10 + modelo de amenazas STRIDE. Cero ruido: 17 exclusiones de falsos positivos. |
| `/ship` | **Release Engineer** | Sincroniza main, ejecuta tests, audita cobertura, hace push, abre PR. |
| `/land-and-deploy` | **Release Engineer** | Merge del PR, espera CI y deploy, verifica salud en producción. |
| `/canary` | **SRE** | Monitorización post-deploy. Vigila errores de consola, regresiones de rendimiento y fallos de página. |
| `/benchmark` | **Ingeniero de Rendimiento** | Mide tiempos de carga, Core Web Vitals y tamaños de recursos. Compara antes/después en cada PR. |
| `/document-release` | **Technical Writer** | Actualiza toda la documentación del proyecto para reflejar lo que acabas de entregar. |
| `/retro` | **Jefe de Ingeniería** | Retrospectiva semanal. Desglose por persona, rachas de entregas, salud de tests. `/retro global` cruza todos tus proyectos. |
| `/browse` | **Ingeniero QA** | Navegador Chromium real, clicks reales, capturas reales. ~100ms por comando. |
| `/setup-browser-cookies` | **Gestor de Sesiones** | Importa cookies de tu navegador real al headless. Prueba páginas autenticadas. |
| `/autoplan` | **Pipeline de Revisión** | Un comando, plan completamente revisado. Ejecuta CEO → diseño → ingeniería automáticamente. |

### Herramientas avanzadas

| Skill | Qué hace |
|-------|----------|
| `/codex` | **Segunda Opinión** — revisión independiente desde OpenAI Codex CLI. Tres modos: revisión, desafío adversarial y consulta abierta. |
| `/careful` | **Guardarrailes de Seguridad** — avisa antes de comandos destructivos (rm -rf, DROP TABLE, force-push). |
| `/freeze` | **Bloqueo de Edición** — restringe ediciones a un directorio. Previene cambios accidentales fuera del alcance. |
| `/guard` | **Seguridad Completa** — `/careful` + `/freeze` en un solo comando. |
| `/unfreeze` | **Desbloquear** — elimina el límite de `/freeze`. |
| `/setup-deploy` | **Configurador de Deploy** — setup único para `/land-and-deploy`. |
| `/gstack-upgrade` | **Auto-actualizador** — actualiza gstack a la última versión. |

## Sprints paralelos

gstack funciona bien con un sprint. Se pone interesante con diez ejecutándose a la vez.

[Conductor](https://conductor.build) ejecuta múltiples sesiones de Claude Code en paralelo — cada una en su propio workspace aislado. La estructura del sprint es lo que hace que el paralelismo funcione — sin proceso, diez agentes son diez fuentes de caos.

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| [Origen del proyecto](ORIGIN.md) | Créditos, sincronización con upstream y filosofía de la adaptación |
| [Filosofía del Constructor](ETHOS.md) | Filosofía: Hervir el Lago, Buscar Antes de Construir |
| [Arquitectura](ARCHITECTURE.md) | Decisiones de diseño e internos del sistema |
| [Referencia del Navegador](BROWSER.md) | Referencia completa de comandos de `/browse` |
| [Contribuir](CONTRIBUTING.md) | Setup de desarrollo, testing y modo contribuidor |
| [Changelog](CHANGELOG.md) | Novedades de cada versión |

## Privacidad y Telemetría

gstack incluye telemetría de uso **opt-in** para mejorar el proyecto:

- **Por defecto está desactivada.** No se envía nada a ningún sitio salvo que digas que sí explícitamente.
- **En la primera ejecución,** gstack pregunta si quieres compartir datos de uso anónimos. Puedes decir que no.
- **Qué se envía (si aceptas):** nombre del skill, duración, éxito/fallo, versión de gstack, SO. Nada más.
- **Qué no se envía nunca:** código, rutas de archivos, nombres de repos, ramas, prompts ni contenido generado.
- **Cambia cuando quieras:** `gstack-config set telemetry off` desactiva todo al instante.

## Solución de problemas

**¿El skill no aparece?** `cd ~/.claude/skills/gstack && ./setup`

**¿`/browse` falla?** `cd ~/.claude/skills/gstack && bun install && bun run build`

**¿Instalación obsoleta?** Ejecuta `/gstack-upgrade` — o configura `auto_upgrade: true` en `~/.gstack/config.yaml`

**¿Claude dice que no ve los skills?** Asegúrate de que el `CLAUDE.md` de tu proyecto tiene una sección gstack:

```
## gstack
Usa /browse de gstack para toda navegación web. Nunca uses herramientas mcp__claude-in-chrome__*.
Skills disponibles: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse,
/qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro,
/investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard,
/unfreeze, /gstack-upgrade.
```

## Licencia

MIT. Gratis para siempre. Ve a construir algo.

---

> **Proyecto original:** [garrytan/gstack](https://github.com/garrytan/gstack) por Garry Tan.
> Traducción al castellano con adaptaciones por [David Carrero](https://carrero.es). Ver [ORIGIN.md](ORIGIN.md) para detalles.
