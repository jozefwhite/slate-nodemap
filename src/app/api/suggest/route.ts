import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter — resets on server restart
let callCount = 0;
let resetTime = Date.now() + 24 * 60 * 60 * 1000;
const MAX_CALLS_PER_DAY = 200;

/**
 * Claude-powered connection suggestions.
 * Used as a fallback when Wikipedia/Are.na return no links for a topic.
 * Returns an array of related topic names that would make good graph connections.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [] });
  }

  // Rate limiting
  if (Date.now() > resetTime) {
    callCount = 0;
    resetTime = Date.now() + 24 * 60 * 60 * 1000;
  }
  if (callCount >= MAX_CALLS_PER_DAY) {
    return NextResponse.json({ suggestions: [] });
  }
  callCount++;

  let body: { topic: string; context?: string; existingNodes?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ suggestions: [] });
  }

  if (!body.topic) {
    return NextResponse.json({ suggestions: [] });
  }

  const existingList = body.existingNodes?.length
    ? `\n\nAlready on the map (do NOT repeat these): ${body.existingNodes.join(', ')}`
    : '';

  const systemPrompt = `You suggest related topics for a knowledge exploration graph. Given a topic, return 5-8 related topics that would be interesting to explore as connected nodes. Each topic should be a real, specific thing — a person, brand, concept, movement, place, work, or event. Prefer concrete and specific over generic. Mix obvious connections with surprising lateral ones.${
    body.context ? `\nThe user started their exploration from "${body.context}".` : ''
  }${existingList}

Return ONLY a JSON array of strings, nothing else. Example: ["Topic One", "Topic Two", "Topic Three"]`;

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
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Suggest connections for: ${body.topic}` }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '[]';

    // Parse JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]) as string[];
      return NextResponse.json({
        suggestions: suggestions.filter((s) => typeof s === 'string' && s.length > 0).slice(0, 8),
      });
    }

    return NextResponse.json({ suggestions: [] });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
