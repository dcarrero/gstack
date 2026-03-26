---
name: freeze
version: 0.1.0
description: |
  Restringe las ediciones de archivos a un directorio específico durante la sesión.
  Bloquea Edit y Write fuera de la ruta permitida. Úsalo al depurar para evitar
  "arreglar" código no relacionado accidentalmente, o cuando quieras limitar los
  cambios a un solo módulo. Úsalo cuando te pidan "congelar", "restringir ediciones",
  "solo editar esta carpeta" o "bloquear ediciones".
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "Checking freeze boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "Checking freeze boundary..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /freeze — Restringir ediciones a un directorio

Bloquea las ediciones de archivos a un directorio específico. Cualquier operación
Edit o Write dirigida a un archivo fuera de la ruta permitida será **bloqueada**
(no solo advertida).

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"freeze","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## Configuración

Pregunta al usuario a qué directorio desea restringir las ediciones. Usa AskUserQuestion:

- Pregunta: "¿A qué directorio debo restringir las ediciones? Los archivos fuera de esta ruta serán bloqueados para edición."
- Entrada de texto (no opción múltiple) — el usuario escribe una ruta.

Una vez que el usuario proporcione la ruta del directorio:

1. Resuélvela a una ruta absoluta:
```bash
FREEZE_DIR=$(cd "<user-provided-path>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. Asegura la barra final y guarda en el archivo de estado de congelación:
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
mkdir -p "$STATE_DIR"
echo "$FREEZE_DIR" > "$STATE_DIR/freeze-dir.txt"
echo "Freeze boundary set: $FREEZE_DIR"
```

Informa al usuario: "Las ediciones están ahora restringidas a `<path>/`. Cualquier
Edit o Write fuera de este directorio será bloqueado. Para cambiar el límite,
ejecuta `/freeze` de nuevo. Para eliminarlo, ejecuta `/unfreeze` o finaliza la sesión."

## Cómo funciona

El hook lee `file_path` del JSON de entrada de la herramienta Edit/Write, y luego
comprueba si la ruta comienza con el directorio congelado. Si no, devuelve
`permissionDecision: "deny"` para bloquear la operación.

El límite de congelación persiste durante la sesión mediante el archivo de estado.
El script del hook lo lee en cada invocación de Edit/Write.

## Notas

- La `/` final en el directorio congelado evita que `/src` coincida con `/src-old`
- La congelación se aplica solo a las herramientas Edit y Write — Read, Bash, Glob, Grep no se ven afectadas
- Esto previene ediciones accidentales, no es un límite de seguridad — comandos Bash como `sed` aún pueden modificar archivos fuera del límite
- Para desactivar, ejecuta `/unfreeze` o finaliza la conversación
