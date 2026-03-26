# Estrategia de Traducción gstack-es

## Estado actual

### Completado
- [x] README.md — traducido completamente
- [x] ETHOS.md — traducido completamente
- [x] ORIGIN.md — nuevo, referencias al proyecto original
- [x] office-hours/SKILL.md.tmpl — traducido completamente (skill insignia)

### Pendiente — Skills principales (prioridad alta)
- [ ] review/SKILL.md.tmpl — revisión de código pre-merge
- [ ] qa/SKILL.md.tmpl — QA con navegador real
- [ ] ship/SKILL.md.tmpl — release engineering
- [ ] plan-ceo-review/SKILL.md.tmpl — revisión de producto CEO
- [ ] plan-eng-review/SKILL.md.tmpl — revisión de arquitectura
- [ ] investigate/SKILL.md.tmpl — debugging sistemático

### Pendiente — Skills secundarios (prioridad media)
- [ ] plan-design-review/SKILL.md.tmpl
- [ ] design-consultation/SKILL.md.tmpl
- [ ] design-review/SKILL.md.tmpl
- [ ] cso/SKILL.md.tmpl — auditoría de seguridad
- [ ] qa-only/SKILL.md.tmpl
- [ ] land-and-deploy/SKILL.md.tmpl
- [ ] retro/SKILL.md.tmpl

### Pendiente — Skills de utilidad (prioridad baja)
- [ ] careful/SKILL.md.tmpl
- [ ] freeze/SKILL.md.tmpl
- [ ] guard/SKILL.md.tmpl
- [ ] unfreeze/SKILL.md.tmpl
- [ ] canary/SKILL.md.tmpl
- [ ] benchmark/SKILL.md.tmpl
- [ ] document-release/SKILL.md.tmpl
- [ ] codex/SKILL.md.tmpl
- [ ] autoplan/SKILL.md.tmpl
- [ ] setup-browser-cookies/SKILL.md.tmpl
- [ ] setup-deploy/SKILL.md.tmpl
- [ ] gstack-upgrade/SKILL.md.tmpl

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
