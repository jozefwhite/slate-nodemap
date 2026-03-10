import { NextRequest, NextResponse } from 'next/server';
import { ClassifyRequest, ClassifyResponse } from '@/lib/types';

// Simple in-memory rate limiter — resets on server restart
let callCount = 0;
let resetTime = Date.now() + 24 * 60 * 60 * 1000;
const MAX_CALLS_PER_DAY = 100;

function detectMediaType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('R0lGO')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg'; // default
}

function buildClassifyPrompt(req: ClassifyRequest): string {
  if (req.mode === 'analyze' && req.journeyContext) {
    const recentList = req.journeyContext.recentNodes
      .map((n) => `- ${n.label}${n.summary ? `: ${n.summary.slice(0, 80)}` : ''}`)
      .join('\n');

    return `You are a classification engine for Nodemap, a knowledge exploration tool. The user is on a journey exploring "${req.journeyContext.seedTerm}" and has visited these nodes:
${recentList}

They are now capturing new content to add to their journey. Analyze what they've shared and explain how it connects.

${req.userNotes ? `The user says: "${req.userNotes}". Factor their perspective into your analysis.` : ''}

Respond in this exact JSON format (no other text):
{
  "description": "1-2 sentence description of what this content is",
  "analysis": "1-2 sentences explaining how this connects to their ${req.journeyContext.seedTerm} exploration journey",
  "tags": ["tag1", "tag2", "tag3"],
  "relatedConcepts": ["Wikipedia Article Title 1", "Wikipedia Article Title 2", "Wikipedia Article Title 3"]
}

Tags should bridge the capture and the journey. Related concepts should be specific, explorable topics — these can be well-known subjects with Wikipedia pages OR niche topics (specific brands, people, techniques, etc.) that may not have a Wikipedia page but are worth exploring. Prioritize specificity and relevance over whether a Wikipedia page exists. Return 3-5 tags and 2-4 related concepts.`;
  }

  return `You are a classification engine for Nodemap, a knowledge exploration tool. Analyze the content provided and classify it.

${req.userNotes ? `The user says: "${req.userNotes}". Factor their perspective into your analysis.` : ''}

Respond in this exact JSON format (no other text):
{
  "description": "1-2 sentence description of what this content is",
  "analysis": null,
  "tags": ["tag1", "tag2", "tag3"],
  "relatedConcepts": ["Wikipedia Article Title 1", "Wikipedia Article Title 2", "Wikipedia Article Title 3"]
}

Tags should be conceptual categories. Related concepts should be specific, explorable topics — well-known subjects with Wikipedia pages OR niche topics (brands, people, techniques) worth exploring. Prioritize specificity and relevance. Return 3-5 tags and 2-4 related concepts.`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  // Rate limiting
  if (Date.now() > resetTime) {
    callCount = 0;
    resetTime = Date.now() + 24 * 60 * 60 * 1000;
  }
  if (callCount >= MAX_CALLS_PER_DAY) {
    return NextResponse.json({ error: 'Daily API limit reached. Try again tomorrow.' }, { status: 429 });
  }
  callCount++;

  let req: ClassifyRequest;
  try {
    req = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!req.text && !req.imageBase64) {
    return NextResponse.json({ error: 'Text or image required' }, { status: 400 });
  }

  const systemPrompt = buildClassifyPrompt(req);

  // Build message content
  const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

  if (req.imageBase64) {
    const mediaType = detectMediaType(req.imageBase64);
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: req.imageBase64,
      },
    });
  }

  if (req.text) {
    content.push({ type: 'text', text: req.text });
  } else if (!req.imageBase64) {
    content.push({ type: 'text', text: 'Classify this content.' });
  } else {
    content.push({ type: 'text', text: 'Analyze this image.' });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Anthropic API error:', err);
      return NextResponse.json({ error: 'Classification failed' }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // Parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const result: ClassifyResponse = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({
        description: text.slice(0, 200),
        analysis: null,
        tags: [],
        relatedConcepts: [],
      } as ClassifyResponse);
    }
  } catch (error) {
    console.error('Classify API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
