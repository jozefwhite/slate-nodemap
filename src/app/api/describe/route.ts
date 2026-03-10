import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter — resets on server restart
let callCount = 0;
let resetTime = Date.now() + 24 * 60 * 60 * 1000;
const MAX_CALLS_PER_DAY = 150;

/**
 * Claude-powered topic description endpoint.
 * Used as a fallback when Wikipedia has no page for a topic.
 * Returns a brief, factual 2-3 sentence description.
 */
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
    return NextResponse.json({ error: 'Daily limit reached' }, { status: 429 });
  }
  callCount++;

  let body: { topic: string; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.topic) {
    return NextResponse.json({ error: 'Topic required' }, { status: 400 });
  }

  const systemPrompt = `You are a concise encyclopedia. Given a topic, write a brief factual description (2-3 sentences, under 100 words). Cover what it is, why it matters, and any key facts. Be specific — include names, dates, and details when you know them. If you're not sure about something, omit it rather than guessing.${
    body.context ? `\n\nContext: the user is exploring "${body.context}" and encountered this topic along the way.` : ''
  }`;

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
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Describe: ${body.topic}` }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Anthropic API error:', err);
      return NextResponse.json({ error: 'Description failed' }, { status: 502 });
    }

    const data = await res.json();
    const description = data.content?.[0]?.text || '';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Describe API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
