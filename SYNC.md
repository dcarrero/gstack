# Proceso de Sincronización con Upstream

Este documento define el proceso para incorporar actualizaciones del repositorio original [garrytan/gstack](https://github.com/garrytan/gstack) a nuestro fork en castellano.

## Estado actual

| Elemento | Valor |
|----------|-------|
| Fork | `dcarrero/gstack` |
| Upstream | `garrytan/gstack` |
| Versión actual | 0.11.21.0 |
| Última sincronización | 2026-03-26 |
| Instalación local | `~/.claude/skills/gstack/` |
| Repo de trabajo | `Desarrollos/gstack-es/` |

## Qué hacer cuando quieras comprobar si hay actualizaciones

Abre Claude Code en el directorio `gstack-es` y di:

> Comprueba si hay actualizaciones en upstream de gstack y sincroniza si las hay. Sigue el proceso de SYNC.md.

O hazlo manualmente siguiendo estos pasos:

## Paso 1: Comprobar si hay cambios

```bash
cd ~/ruta/a/gstack-es
git fetch upstream
git log HEAD...upstream/main --oneline
```

Si no aparece nada → estamos al día. Si aparecen commits → seguir al paso 2.

## Paso 2: Ver qué ha cambiado

```bash
# Resumen de archivos modificados
git diff HEAD...upstream/main --stat

# Ver los commits nuevos con detalle
git log HEAD...upstream/main --format="%h %s"

# Ver el CHANGELOG del upstream
git diff HEAD...upstream/main -- CHANGELOG.md
```

### Clasificar los cambios

| Tipo de archivo | Acción |
|----------------|--------|
| `VERSION`, `CHANGELOG.md`, `TODOS.md` | Aceptar directamente |
| `bin/*`, `browse/src/*`, `browse/dist/*` | Aceptar directamente (código, no se traduce) |
| `scripts/gen-skill-docs.ts` | Aceptar directamente (infraestructura) |
| `scripts/resolvers/*.ts` | Resolver conflictos: aceptar código nuevo, traducir texto nuevo en template literals |
| `*/SKILL.md.tmpl` | Resolver conflictos: aceptar cambios funcionales, traducir texto nuevo |
| `*/SKILL.md` (generados) | Ignorar — se regenerarán |
| `test/*` | Aceptar directamente |
| `README.md` | Mantener el nuestro, revisar si hay info nueva que añadir |
| `ETHOS.md` | Mantener el nuestro, revisar si hay contenido nuevo |
| `setup`, `package.json` | Aceptar directamente |

## Paso 3: Hacer el merge

```bash
# Crear rama temporal
git checkout -b sync/upstream-$(date +%Y-%m-%d)

# Merge
git merge upstream/main
```

Si hay conflictos, resolverlos según la tabla del paso 2.

## Paso 4: Resolver conflictos

### Resolvers (.ts) — El PREAMBLE compartido
- Abrir el archivo con conflicto
- Bloque `<<<<<<< HEAD` = nuestra versión en castellano
- Bloque `>>>>>>> upstream/main` = versión nueva en inglés
- **Acción:** Mantener nuestra traducción existente, añadir lo nuevo del upstream traducido al castellano
- **Cuidado:** No romper interpolaciones `${...}`, bloques bash ni estructura de código

### Plantillas (.tmpl) — Los skills
- Misma lógica: mantener castellano existente, traducir lo nuevo
- Los nombres de skills, variables `{{...}}` y código bash NO se tocan
- Solo se traduce el texto en prosa, headers e instrucciones

### SKILL.md generados
- Aceptar la versión de upstream: `git checkout --theirs */SKILL.md`
- Se sobrescribirán al regenerar

## Paso 5: Regenerar y verificar

```bash
# Instalar dependencias si hay nuevas
bun install

# Regenerar SKILL.md desde .tmpl + resolvers traducidos
bun run gen:skill-docs

# Verificar que no quedan conflictos
git diff --check

# Stage y commit
git add -A
git commit -m "merge: sincronizar con upstream vX.Y.Z — [descripción breve]"
```

## Paso 6: Actualizar README si procede

Si upstream ha añadido skills nuevos, funcionalidades importantes o cambios que afecten al usuario:
- Añadir la info al README.md en castellano
- Actualizar la guía rápida si hay skills nuevos: `docs/guia-rapida.html`
- Regenerar PDF: `bun run /tmp/gen-pdf.ts` (o con el script Playwright)

## Paso 7: Merge a main y publicar

```bash
git checkout main
git merge sync/upstream-$(date +%Y-%m-%d)
git push origin main
```

## Paso 8: Actualizar instalación local

```bash
cd ~/.claude/skills/gstack
git pull origin main
rm -f ~/.gstack/last-update-check
```

Verificar: `~/.claude/skills/gstack/bin/gstack-update-check` no debería devolver nada.

## Archivos que NUNCA se revierten al upstream

| Archivo | Motivo |
|---------|--------|
| `bin/gstack-update-check` | URL apunta a `dcarrero/gstack` |
| `README.md` | Nuestro README en castellano con créditos |
| `ETHOS.md` | Adaptado culturalmente (sin metáforas anglosajonas) |
| `ORIGIN.md` | Solo existe en nuestro fork |
| `SYNC.md` | Solo existe en nuestro fork |
| `TRADUCCION.md` | Solo existe en nuestro fork |
| `docs/guia-rapida.*` | Solo existen en nuestro fork |

## Qué hacer si upstream añade un skill nuevo

1. El nuevo directorio aparecerá sin conflicto en el merge
2. Su `.tmpl` estará en inglés → traducirlo al castellano
3. Regenerar con `bun run gen:skill-docs`
4. Añadir al README.md en la tabla de skills
5. Actualizar `TRADUCCION.md`
6. Actualizar `docs/guia-rapida.html` si es un skill relevante

## Frecuencia recomendada

El proyecto original se actualiza varias veces por semana. Recomendación:
- **Comprobar semanalmente** si hay cambios
- **Sincronizar** cuando hay cambios funcionales relevantes (nuevos skills, soporte de plataformas, fixes importantes)
- **No es necesario** sincronizar cada commit cosmético o de tests

## Historial de sincronizaciones

| Fecha | Versión upstream | Cambios principales |
|-------|-----------------|---------------------|
| 2026-03-26 | v0.11.19.0 | Fork inicial, traducción completa de 27 skills |
| 2026-03-26 | v0.11.21.0 | Soporte GitLab para /retro, /ship, /document-release + review log |
