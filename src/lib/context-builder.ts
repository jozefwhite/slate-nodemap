import { AskContext, GraphNode, PathStep, NodeSource } from '@/lib/types';

export function buildAskContext(
  targetNodeId: string,
  question: string,
  nodes: GraphNode[],
  path: PathStep[]
): AskContext {
  const targetNode = nodes.find((n) => n.id === targetNodeId);
  if (!targetNode) {
    return {
      question,
      currentNode: {
        label: 'Unknown',
        source: 'user' as NodeSource,
        conversations: [],
      },
      journeyPath: [],
    };
  }

  // Build journey path: deduplicate by nodeId, keep last 15
  const seen = new Set<string>();
  const uniquePath: PathStep[] = [];
  for (const step of path) {
    if (!seen.has(step.nodeId)) {
      seen.add(step.nodeId);
      uniquePath.push(step);
    }
  }
  const recentPath = uniquePath.slice(-15);

  const journeyPath = recentPath.map((step) => {
    const node = nodes.find((n) => n.id === step.nodeId);
    if (!node) return { label: step.label, context: '' };

    const summary = node.data.summary?.slice(0, 120) || '';
    const enriched = node.data.enrichedContent?.slice(0, 200) || '';
    const context = [summary, enriched].filter(Boolean).join(' | ');

    return { label: step.label, context };
  });

  // Build current node context
  const approvedConversations = targetNode.data.conversations
    .filter((c) => c.approved)
    .slice(-5)
    .map((c) => ({
      question: c.question,
      answer: c.answer.slice(0, 200),
    }));

  return {
    question,
    currentNode: {
      label: targetNode.data.label,
      source: targetNode.data.source,
      summary: targetNode.data.summary?.slice(0, 300),
      enrichedContent: targetNode.data.enrichedContent?.slice(0, 500),
      conversations: approvedConversations,
    },
    journeyPath,
  };
}

export function formatSystemPrompt(ctx: AskContext): string {
  let prompt = `You are a knowledgeable research assistant embedded in Nodemap, a knowledge exploration tool. The user is exploring the topic "${ctx.currentNode.label}".

Answer their question using your full knowledge — be informative, specific, and direct. The node context below is background, not a limitation. You know far more than what's written there, so bring in real facts, names, dates, and details that a curious researcher would find valuable.

Keep answers under 200 words. If the answer connects to concepts in their exploration journey, mention those connections.

IMPORTANT: When mentioning key explorable concepts in your answer, wrap them in [[double brackets]] like wiki-links. For example: "The iconic fragrance is [[Chanel No. 5]], created by [[Ernest Beaux]]." Use this for specific people, places, movements, brands, events, and other searchable concepts — 3 to 6 per answer. Do NOT add a separate topics section at the end. The [[bracketed terms]] within your answer ARE the suggested topics.

## Topic: ${ctx.currentNode.label}`;

  if (ctx.currentNode.summary) {
    prompt += `\n${ctx.currentNode.summary}`;
  }

  if (ctx.currentNode.enrichedContent) {
    prompt += `\n\n## Prior knowledge on this node\n${ctx.currentNode.enrichedContent}`;
  }

  if (ctx.currentNode.conversations.length > 0) {
    prompt += `\n\n## Previous Q&A on this node`;
    for (const qa of ctx.currentNode.conversations) {
      prompt += `\nQ: ${qa.question}\nA: ${qa.answer}`;
    }
  }

  if (ctx.journeyPath.length > 0) {
    prompt += `\n\n## User exploration journey (most recent last)`;
    ctx.journeyPath.forEach((step, i) => {
      prompt += `\n${i + 1}. ${step.label}${step.context ? ` — ${step.context}` : ''}`;
    });
  }

  return prompt;
}
