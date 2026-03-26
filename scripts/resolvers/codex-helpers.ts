import type { Host } from './types';

const OPENAI_SHORT_DESCRIPTION_LIMIT = 120;

export function extractNameAndDescription(content: string): { name: string; description: string } {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return { name: '', description: '' };
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return { name: '', description: '' };

  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  let description = '';
  const lines = frontmatter.split('\n');
  let inDescription = false;
  const descLines: string[] = [];
  for (const line of lines) {
    if (line.match(/^description:\s*\|?\s*$/)) {
      inDescription = true;
      continue;
    }
    if (line.match(/^description:\s*\S/)) {
      description = line.replace(/^description:\s*/, '').trim();
      break;
    }
    if (inDescription) {
      if (line === '' || line.match(/^\s/)) {
        descLines.push(line.replace(/^  /, ''));
      } else {
        break;
      }
    }
  }
  if (descLines.length > 0) {
    description = descLines.join('\n').trim();
  }

  return { name, description };
}

export function condenseOpenAIShortDescription(description: string): string {
  const firstParagraph = description.split(/\n\s*\n/)[0] || description;
  const collapsed = firstParagraph.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= OPENAI_SHORT_DESCRIPTION_LIMIT) return collapsed;

  const truncated = collapsed.slice(0, OPENAI_SHORT_DESCRIPTION_LIMIT - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  const safe = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe}...`;
}

export function generateOpenAIYaml(displayName: string, shortDescription: string): string {
  return `interface:
  display_name: ${JSON.stringify(displayName)}
  short_description: ${JSON.stringify(shortDescription)}
  default_prompt: ${JSON.stringify(`Usa ${displayName} para esta tarea.`)}
policy:
  allow_implicit_invocation: true
`;
}

export function codexSkillName(skillDir: string): string {
  if (skillDir === '.' || skillDir === '') return 'gstack';
  // Don't double-prefix: gstack-upgrade → gstack-upgrade (not gstack-gstack-upgrade)
  if (skillDir.startsWith('gstack-')) return skillDir;
  return `gstack-${skillDir}`;
}

/**
 * Transform frontmatter for Codex: keep only name + description.
 * Strips allowed-tools, hooks, version, and all other fields.
 * Handles multiline block scalar descriptions (YAML | syntax).
 */
export function transformFrontmatter(content: string, host: Host): string {
  if (host === 'claude') return content;

  // Find frontmatter boundaries
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return content; // frontmatter must be at the start
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return content;

  const body = content.slice(fmEnd + 4); // includes the leading \n after ---
  const { name, description } = extractNameAndDescription(content);

  // Codex 1024-char description limit — fail build, don't ship broken skills
  const MAX_DESC = 1024;
  if (description.length > MAX_DESC) {
    throw new Error(
      `La descripción de Codex para "${name}" tiene ${description.length} caracteres (máximo ${MAX_DESC}). ` +
      `Comprime la descripción en el archivo .tmpl.`
    );
  }

  // Re-emit Codex frontmatter (name + description only)
  const indentedDesc = description.split('\n').map(l => `  ${l}`).join('\n');
  const codexFm = `---\nname: ${name}\ndescription: |\n${indentedDesc}\n---`;
  return codexFm + body;
}

/**
 * Extract hook descriptions from frontmatter for inline safety prose.
 * Returns a description of what the hooks do, or null if no hooks.
 */
export function extractHookSafetyProse(tmplContent: string): string | null {
  if (!tmplContent.match(/^hooks:/m)) return null;

  // Parse the hook matchers to build a human-readable safety description
  const matchers: string[] = [];
  const matcherRegex = /matcher:\s*"(\w+)"/g;
  let m;
  while ((m = matcherRegex.exec(tmplContent)) !== null) {
    if (!matchers.includes(m[1])) matchers.push(m[1]);
  }

  if (matchers.length === 0) return null;

  // Build safety prose based on what tools are hooked
  const toolDescriptions: Record<string, string> = {
    Bash: 'verificar que los comandos bash no contengan operaciones destructivas (rm -rf, DROP TABLE, force-push, git reset --hard, etc.) antes de ejecutarlos',
    Edit: 'verificar que las ediciones de archivos estén dentro del límite de alcance permitido antes de aplicarlas',
    Write: 'verificar que las escrituras de archivos estén dentro del límite de alcance permitido antes de aplicarlas',
  };

  const safetyChecks = matchers
    .map(t => toolDescriptions[t] || `verificar las operaciones de ${t} por seguridad`)
    .join(', y ');

  return `> **Aviso de Seguridad:** Este skill incluye verificaciones de seguridad que ${safetyChecks}. Al usar este skill, siempre detente y verifica antes de ejecutar operaciones potencialmente destructivas. Si no estás seguro de la seguridad de un comando, pide confirmación al usuario antes de proceder.`;
}
