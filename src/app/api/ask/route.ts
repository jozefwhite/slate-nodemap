import { NextRequest, NextResponse } from 'next/server';
import { AskContext } from '@/lib/types';
import { formatSystemPrompt } from '@/lib/context-builder';

// Simple in-memory rate limiter — resets on server restart
let callCount = 0;
let resetTime = Date.now() + 24 * 60 * 60 * 1000;
const MAX_CALLS_PER_DAY = 100;

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

  let context: AskContext;
  try {
    context = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!context.question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  const systemPrompt = formatSystemPrompt(context);

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
        max_tokens: 768,
        system: systemPrompt,
        messages: [{ role: 'user', content: context.question }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Anthropic API error:', err);
      return NextResponse.json({ error: 'LLM request failed' }, { status: 502 });
    }

    const data = await res.json();
    const answer = data.content?.[0]?.text || 'No response generated.';

    return NextResponse.json({
      answer,
      model: data.model,
      usage: data.usage,
    });
  } catch (error) {
    console.error('Ask API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
