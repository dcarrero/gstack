---
name: careful
version: 0.1.0
description: |
  Medidas de seguridad para comandos destructivos. Advierte antes de rm -rf, DROP TABLE,
  force-push, git reset --hard, kubectl delete y operaciones destructivas similares.
  El usuario puede anular cada advertencia. Úsalo al trabajar en producción, depurar sistemas
  en vivo o trabajar en un entorno compartido. Úsalo cuando te pidan "be careful", "safety mode",
  "prod mode" o "careful mode".
allowed-tools:
  - Bash
  - Read
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-careful.sh"
          statusMessage: "Checking for destructive commands..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /careful — Protección contra comandos destructivos

El modo de seguridad está ahora **activo**. Cada comando bash será verificado en busca de
patrones destructivos antes de ejecutarse. Si se detecta un comando destructivo, se te
advertirá y podrás elegir continuar o cancelar.

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"careful","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## Qué está protegido

| Patrón | Ejemplo | Riesgo |
|--------|---------|--------|
| `rm -rf` / `rm -r` / `rm --recursive` | `rm -rf /var/data` | Eliminación recursiva |
| `DROP TABLE` / `DROP DATABASE` | `DROP TABLE users;` | Pérdida de datos |
| `TRUNCATE` | `TRUNCATE orders;` | Pérdida de datos |
| `git push --force` / `-f` | `git push -f origin main` | Reescritura de historial |
| `git reset --hard` | `git reset --hard HEAD~3` | Pérdida de trabajo no confirmado |
| `git checkout .` / `git restore .` | `git checkout .` | Pérdida de trabajo no confirmado |
| `kubectl delete` | `kubectl delete pod` | Impacto en producción |
| `docker rm -f` / `docker system prune` | `docker system prune -a` | Pérdida de contenedores/imágenes |

## Excepciones seguras

Estos patrones se permiten sin advertencia:
- `rm -rf node_modules` / `.next` / `dist` / `__pycache__` / `.cache` / `build` / `.turbo` / `coverage`

## Cómo funciona

El hook lee el comando desde el JSON de entrada de la herramienta, lo compara con los
patrones anteriores y devuelve `permissionDecision: "ask"` con un mensaje de advertencia
si encuentra una coincidencia. Siempre puedes anular la advertencia y continuar.

Para desactivar, finaliza la conversación o inicia una nueva. Los hooks tienen alcance de sesión.
