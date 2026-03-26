---
name: unfreeze
version: 0.1.0
description: |
  Eliminar el límite de freeze establecido por /freeze, permitiendo ediciones en todos
  los directorios de nuevo. Usar cuando se quiera ampliar el alcance de edición sin
  finalizar la sesión. Usar cuando se pida "unfreeze", "desbloquear ediciones",
  "eliminar freeze" o "permitir todas las ediciones".
allowed-tools:
  - Bash
  - Read
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /unfreeze — Eliminar Límite de Freeze

Elimina la restricción de edición establecida por `/freeze`, permitiendo ediciones en todos los directorios.

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"unfreeze","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## Eliminar el límite

```bash
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
if [ -f "$STATE_DIR/freeze-dir.txt" ]; then
  PREV=$(cat "$STATE_DIR/freeze-dir.txt")
  rm -f "$STATE_DIR/freeze-dir.txt"
  echo "Freeze boundary cleared (was: $PREV). Edits are now allowed everywhere."
else
  echo "No freeze boundary was set."
fi
```

Informar al usuario del resultado. Ten en cuenta que los hooks de `/freeze` siguen registrados para
la sesión — simplemente permitirán todo ya que no existe archivo de estado. Para volver a congelar,
ejecuta `/freeze` de nuevo.
