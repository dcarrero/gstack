import type { TemplateContext } from './types';
import { COMMAND_DESCRIPTIONS } from '../../browse/src/commands';
import { SNAPSHOT_FLAGS } from '../../browse/src/snapshot';

export function generateCommandReference(_ctx: TemplateContext): string {
  // Group commands by category
  const groups = new Map<string, Array<{ command: string; description: string; usage?: string }>>();
  for (const [cmd, meta] of Object.entries(COMMAND_DESCRIPTIONS)) {
    const list = groups.get(meta.category) || [];
    list.push({ command: cmd, description: meta.description, usage: meta.usage });
    groups.set(meta.category, list);
  }

  // Category display order
  const categoryOrder = [
    'Navigation', 'Reading', 'Interaction', 'Inspection',
    'Visual', 'Snapshot', 'Meta', 'Tabs', 'Server',
  ];

  const sections: string[] = [];
  for (const category of categoryOrder) {
    const commands = groups.get(category);
    if (!commands || commands.length === 0) continue;

    // Sort alphabetically within category
    commands.sort((a, b) => a.command.localeCompare(b.command));

    sections.push(`### ${category}`);
    sections.push('| Comando | Descripción |');
    sections.push('|---------|-------------|');
    for (const cmd of commands) {
      const display = cmd.usage ? `\`${cmd.usage}\`` : `\`${cmd.command}\``;
      sections.push(`| ${display} | ${cmd.description} |`);
    }
    sections.push('');
  }

  return sections.join('\n').trimEnd();
}

export function generateSnapshotFlags(_ctx: TemplateContext): string {
  const lines: string[] = [
    'El snapshot es tu herramienta principal para entender e interactuar con las páginas.',
    '',
    '```',
  ];

  for (const flag of SNAPSHOT_FLAGS) {
    const label = flag.valueHint ? `${flag.short} ${flag.valueHint}` : flag.short;
    lines.push(`${label.padEnd(10)}${flag.long.padEnd(24)}${flag.description}`);
  }

  lines.push('```');
  lines.push('');
  lines.push('Todos los flags se pueden combinar libremente. `-o` solo aplica cuando `-a` también se usa.');
  lines.push('Ejemplo: `$B snapshot -i -a -C -o /tmp/annotated.png`');
  lines.push('');
  lines.push('**Numeración de refs:** Las refs @e se asignan secuencialmente (@e1, @e2, ...) en orden de árbol.');
  lines.push('Las refs @c de `-C` se numeran por separado (@c1, @c2, ...).');
  lines.push('');
  lines.push('Después del snapshot, usa @refs como selectores en cualquier comando:');
  lines.push('```bash');
  lines.push('$B click @e3       $B fill @e4 "value"     $B hover @e1');
  lines.push('$B html @e2        $B css @e5 "color"      $B attrs @e6');
  lines.push('$B click @c1       # ref interactiva por cursor (de -C)');
  lines.push('```');
  lines.push('');
  lines.push('**Formato de salida:** árbol de accesibilidad indentado con IDs @ref, un elemento por línea.');
  lines.push('```');
  lines.push('  @e1 [heading] "Welcome" [level=1]');
  lines.push('  @e2 [textbox] "Email"');
  lines.push('  @e3 [button] "Submit"');
  lines.push('```');
  lines.push('');
  lines.push('Las refs se invalidan al navegar — ejecuta `snapshot` de nuevo después de `goto`.');

  return lines.join('\n');
}

export function generateBrowseSetup(ctx: TemplateContext): string {
  return `## SETUP (ejecuta esta verificación ANTES de cualquier comando browse)

\`\`\`bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/${ctx.paths.localSkillRoot}/browse/dist/browse" ] && B="$_ROOT/${ctx.paths.localSkillRoot}/browse/dist/browse"
[ -z "$B" ] && B=${ctx.paths.browseDir}/browse
if [ -x "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP"
fi
\`\`\`

Si \`NEEDS_SETUP\`:
1. Dile al usuario: "gstack browse necesita una compilación inicial (~10 segundos). ¿Proceder?" Luego DETENTE y espera.
2. Ejecuta: \`cd <SKILL_DIR> && ./setup\`
3. Si \`bun\` no está instalado: \`curl -fsSL https://bun.sh/install | bash\``;
}
