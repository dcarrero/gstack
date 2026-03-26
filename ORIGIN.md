# Origen del Proyecto

Este proyecto es un fork adaptado al castellano de **gstack**, creado por [Garry Tan](https://x.com/garrytan) (Presidente y CEO de [Y Combinator](https://www.ycombinator.com/)).

## Repositorio original

- **GitHub:** [garrytan/gstack](https://github.com/garrytan/gstack)
- **Licencia:** MIT
- **Versión base del fork:** 0.11.19.0

## Sincronización con upstream

Este fork mantiene el remote `upstream` apuntando al repositorio original para incorporar actualizaciones sin perder nuestros cambios.

### Procedimiento para actualizar desde el original

```bash
# 1. Traer cambios del original (no modifica nada local)
git fetch upstream

# 2. Ver qué ha cambiado desde nuestra última sincronización
git log upstream/main --oneline -20
git diff HEAD...upstream/main --stat

# 3. Crear rama temporal para la sincronización
git checkout -b sync/upstream-YYYY-MM-DD

# 4. Merge del original (habrá conflictos en archivos traducidos)
git merge upstream/main

# 5. Resolver conflictos — VER GUÍA ABAJO
# 6. Probar que compila
bun run gen:skill-docs

# 7. Si todo OK, merge a main
git checkout main
git merge sync/upstream-YYYY-MM-DD
git push origin main
```

### Cómo resolver conflictos de traducción

Los conflictos aparecerán en los archivos que hemos traducido. Tipos de conflicto:

**1. Archivos `.tmpl` (skills) — los más frecuentes**
- El original añade/modifica instrucciones en inglés
- Nosotros tenemos la versión en castellano
- **Acción:** Aceptar el cambio funcional del original y traducirlo al castellano
- **Ejemplo:** Si upstream añade un nuevo paso "Step 7: Verify deployment", aceptarlo y traducirlo como "Paso 7: Verificar despliegue"

**2. Archivos `scripts/resolvers/*.ts` — el preámbulo compartido**
- Cambios en la lógica del preámbulo afectan a todos los skills
- **Acción:** Aceptar el cambio de código, traducir solo el texto dentro de template literals
- **Cuidado:** No romper interpolaciones `${ctx.paths...}` ni bloques bash

**3. Documentación `.md` — README, ETHOS, ARCHITECTURE, etc.**
- **Acción:** Traducir el contenido nuevo manteniendo nuestra estructura

**4. Código `bin/*`, `browse/src/*` — infraestructura**
- **Acción:** Aceptar directamente (no se traduce código)
- **Excepción:** `bin/gstack-update-check` tiene la URL apuntando a `dcarrero/gstack` — no revertir

### Archivos con cambios propios que NO deben revertirse

Estos archivos contienen modificaciones nuestras que upstream no tiene:

| Archivo | Cambio propio | Motivo |
|---------|--------------|--------|
| `bin/gstack-update-check` | URL apunta a `dcarrero/gstack` | Evita falsos positivos de actualización |
| `README.md` | Traducido + bio David Carrero + recursos | Identidad del fork |
| `ETHOS.md` | "Completar sin Atajos" en vez de "Boil the Lake" | Adaptación cultural |
| `ORIGIN.md` | No existe en upstream | Documentación propia del fork |
| `TRADUCCION.md` | No existe en upstream | Documentación propia del fork |
| `docs/guia-rapida.*` | No existen en upstream | Documentación propia del fork |

### Qué hacer si upstream añade un skill nuevo

1. El nuevo directorio `nuevo-skill/SKILL.md.tmpl` aparecerá sin conflicto
2. Traducir el `.tmpl` al castellano
3. Regenerar con `bun run gen:skill-docs`
4. Añadirlo a `TRADUCCION.md`

### Qué hacer si upstream cambia resolvers

1. Los cambios en `scripts/resolvers/*.ts` afectan al `{{PREAMBLE}}` de todos los skills
2. Resolver conflictos en los template literals (texto → traducir, código → aceptar)
3. Regenerar con `bun run gen:skill-docs`
4. Verificar que los SKILL.md generados siguen en castellano

## Qué se ha adaptado

- **Documentación:** README, ETHOS, ARCHITECTURE, BROWSER, CONTRIBUTING traducidos
- **27 skills `.tmpl`:** Instrucciones y mensajes al usuario en castellano
- **7 resolvers:** Texto del preámbulo compartido en castellano
- **Guía rápida:** PDF imprimible en `docs/guia-rapida.pdf`
- **Anglicismos corregidos:** 65+ expresiones adaptadas al castellano natural (no traducciones literales)
- **Nombres de skills:** Se mantienen los nombres originales (son comandos slash)
- **Código:** El código TypeScript/Bash NO se traduce (es infraestructura)

## Filosofía de la adaptación

- Los nombres de los skills (`/review`, `/qa`, `/ship`) se mantienen en inglés porque son comandos
- Los mensajes que el agente muestra al usuario se traducen al castellano
- Los comentarios técnicos en el código se mantienen en inglés
- Se respeta la estructura original para facilitar merges con upstream
- Se pueden añadir skills propios en directorios adicionales
- Las metáforas y expresiones se adaptan culturalmente (no se traducen literalmente)

## Créditos

Todo el mérito del concepto, arquitectura y código original corresponde a **Garry Tan** y los contribuidores de [garrytan/gstack](https://github.com/garrytan/gstack). Esta adaptación se distribuye bajo la misma licencia MIT.

Adaptación al castellano por [David Carrero](https://carrero.es), cofundador de [Stackscale](https://www.stackscale.com).
