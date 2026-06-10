import { toPng } from 'html-to-image';
import { GraphNode, GraphEdge, PathStep } from '@/lib/types';

/* ── Markdown export ─────────────────────────────────────────────── */

function nodeSection(node: GraphNode, childLabels: string[]): string {
  const lines: string[] = [];
  lines.push(`### ${node.data.label}`);

  const meta: string[] = [];
  meta.push(`source: ${node.data.source}`);
  if (node.data.tags.length > 0) meta.push(`tags: ${node.data.tags.join(', ')}`);
  lines.push(`*${meta.join(' · ')}*`);
  lines.push('');

  if (node.data.summary) {
    lines.push(node.data.summary.trim());
    lines.push('');
  }

  if (node.data.url) {
    lines.push(`[Source](${node.data.url})`);
    lines.push('');
  }

  const approved = node.data.conversations.filter((c) => c.approved);
  if (approved.length > 0) {
    lines.push('**Notes & Q&A**');
    lines.push('');
    for (const qa of approved) {
      lines.push(`> **Q: ${qa.question}**`);
      // Strip [[wiki-link]] brackets for clean reading
      const cleanAnswer = qa.answer.replace(/\[\[([^\]]+)\]\]/g, '$1');
      lines.push(`> ${cleanAnswer.replace(/\n/g, '\n> ')}`);
      lines.push('');
    }
  }

  if (childLabels.length > 0) {
    lines.push(`*Connections: ${childLabels.join(' · ')}*`);
    lines.push('');
  }

  return lines.join('\n');
}

export function mapToMarkdown(
  title: string,
  seedTerm: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  path: PathStep[]
): string {
  const lines: string[] = [];
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  lines.push(`# ${title || seedTerm || 'Untitled Map'}`);
  lines.push('');
  lines.push(`*Exported from Nodemap · ${date} · ${nodes.length} nodes*`);
  lines.push('');

  if (path.length > 0) {
    const uniquePath: string[] = [];
    const seen = new Set<string>();
    for (const step of path) {
      if (!seen.has(step.label)) {
        seen.add(step.label);
        uniquePath.push(step.label);
      }
    }
    lines.push(`**Exploration path:** ${uniquePath.join(' → ')}`);
    lines.push('');
  }

  // Group nodes by depth
  const byDepth = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const d = node.data.depth;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(node);
  }
  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);

  // Pre-compute children per node for the connections line
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    const target = nodes.find((n) => n.id === edge.target);
    if (!target) continue;
    if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
    childrenOf.get(edge.source)!.push(target.data.label);
  }

  for (const depth of depths) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${depth === 0 ? 'Origin' : `Depth ${depth}`}`);
    lines.push('');
    for (const node of byDepth.get(depth)!) {
      lines.push(nodeSection(node, childrenOf.get(node.id) || []));
    }
  }

  // Reference list — all source URLs in one place
  const refs = nodes.filter((n) => n.data.url);
  if (refs.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## References');
    lines.push('');
    for (const node of refs) {
      lines.push(`- [${node.data.label}](${node.data.url})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/* ── Download helpers ────────────────────────────────────────────── */

function sanitizeFilename(name: string): string {
  return (name || 'nodemap').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMarkdown(
  title: string,
  seedTerm: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  path: PathStep[]
) {
  const md = mapToMarkdown(title, seedTerm, nodes, edges, path);
  downloadText(`${sanitizeFilename(title || seedTerm)}.md`, md);
}

/* ── Image export — snapshots the current view ───────────────────── */

export async function exportViewAsPng(element: HTMLElement, name: string) {
  const dataUrl = await toPng(element, {
    backgroundColor: '#fafaf9', // surface-0
    pixelRatio: 2,
    filter: (node) => {
      // Skip UI chrome marked as non-exportable (nav buttons etc.)
      if (node instanceof HTMLElement && node.dataset?.noExport === 'true') return false;
      return true;
    },
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${sanitizeFilename(name)}.png`;
  a.click();
}
