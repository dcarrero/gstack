# Estrategia de Traducción gstack-es

## Estado actual

### Completado
- [x] README.md — traducido completamente
- [x] ETHOS.md — traducido completamente
- [x] ORIGIN.md — nuevo, referencias al proyecto original
- [x] office-hours/SKILL.md.tmpl — traducido completamente (skill insignia)

### Completado — Skills principales (prioridad alta)
- [x] review/SKILL.md.tmpl — revisión de código pre-merge
- [x] qa/SKILL.md.tmpl — QA con navegador real
- [x] ship/SKILL.md.tmpl — release engineering
- [x] plan-ceo-review/SKILL.md.tmpl — revisión de producto CEO
- [x] plan-eng-review/SKILL.md.tmpl — revisión de arquitectura
- [x] investigate/SKILL.md.tmpl — debugging sistemático

### Completado — Skills secundarios (prioridad media)
- [x] plan-design-review/SKILL.md.tmpl
- [x] design-consultation/SKILL.md.tmpl
- [x] design-review/SKILL.md.tmpl
- [x] cso/SKILL.md.tmpl — auditoría de seguridad
- [x] qa-only/SKILL.md.tmpl
- [x] land-and-deploy/SKILL.md.tmpl
- [x] retro/SKILL.md.tmpl

### Completado — Skills de utilidad
- [x] careful/SKILL.md.tmpl
- [x] freeze/SKILL.md.tmpl
- [x] guard/SKILL.md.tmpl
- [x] unfreeze/SKILL.md.tmpl
- [x] canary/SKILL.md.tmpl
- [x] benchmark/SKILL.md.tmpl
- [x] document-release/SKILL.md.tmpl
- [x] codex/SKILL.md.tmpl
- [x] autoplan/SKILL.md.tmpl
- [x] setup-browser-cookies/SKILL.md.tmpl
- [x] setup-deploy/SKILL.md.tmpl
- [x] gstack-upgrade/SKILL.md.tmpl

### Pendiente — Infraestructura compartida
- [ ] Resolvers en scripts/resolvers/ (generan el {{PREAMBLE}} compartido)
- [ ] SKILL.md.tmpl raíz (skill de browse)
- [ ] ARCHITECTURE.md
- [ ] BROWSER.md
- [ ] CONTRIBUTING.md

## Qué se traduce y qué no

### SE TRADUCE
- Mensajes que el agente muestra al usuario (AskUserQuestion, outputs)
- Descripciones de skills (frontmatter `description`)
- Nombres de fases, principios y conceptos
- Plantillas de documentos de diseño
- Documentación del proyecto (README, ETHOS, etc.)
- Nombres de opciones en AskUserQuestion (A, B, C)

### NO SE TRADUCE
- Nombres de skills (son comandos slash: /review, /qa, /ship)
- Código bash/TypeScript
- Nombres de archivos y rutas
- Variables de template ({{PREAMBLE}}, {{BROWSE_SETUP}})
- Términos técnicos sin equivalente (boilerplate, scaffolding, PR, CI/CD)
- Nombres de herramientas de Claude Code (Bash, Read, Edit, etc.)
- Estados de protocolo (DONE, BLOCKED, NEEDS_CONTEXT)

## Cómo sincronizar con upstream

Cuando se actualice el original:

```bash
git fetch upstream
git diff upstream/main -- <skill>/SKILL.md.tmpl  # Ver qué cambió
git merge upstream/main                            # Merge (habrá conflictos en archivos traducidos)
```

Los conflictos serán en los archivos .tmpl traducidos. Resolver manualmente integrando los cambios nuevos del original con nuestra traducción.

## Regenerar SKILL.md desde .tmpl

Después de traducir un .tmpl:
```bash
cd ~/.claude/skills/gstack && bun run gen:skill-docs
```

Nota: Los resolvers ({{PREAMBLE}} etc.) siguen en inglés hasta que se traduzcan.
