import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { createDigitalOceanChatCompletion } from '@/lib/ai/digitalocean';
import {
  buildDashboardAssistantPrompt,
  buildHeuristicDashboardAssistantBrief,
  dashboardAssistantRequestSchema,
} from '@/lib/ai/dashboard-assistant';
import { z } from 'zod';

function getRequestIdentifier(request: NextRequest, userId: string) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  return `ai-dashboard:${userId}:${ip}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(getRequestIdentifier(request, session.user.id));
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'AI request limit exceeded. Please wait before trying again.' },
        { status: 429 },
      );
    }

    const parsedRequest = dashboardAssistantRequestSchema.parse(await request.json());
    const prompt = buildDashboardAssistantPrompt(parsedRequest);

    if (!process.env.DO_AI_API_KEY) {
      return NextResponse.json({
        brief: buildHeuristicDashboardAssistantBrief(parsedRequest),
        mode: parsedRequest.mode,
        source: 'rules',
        model: 'deterministic-ops-fallback',
        generatedAt: new Date().toISOString(),
      });
    }

    try {
      const completion = await createDigitalOceanChatCompletion(
        [
          {
            role: 'system',
            content:
              'You summarize shipping operations for internal staff. Be concise, factual, and operationally useful.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          maxTokens: 520,
          temperature: 0.2,
        },
      );

      return NextResponse.json({
        brief: completion.content,
        mode: parsedRequest.mode,
        source: 'digitalocean-ai',
        model: completion.model,
        generatedAt: new Date().toISOString(),
        remainingRequests: rateLimit.remaining,
      });
    } catch {
      return NextResponse.json({
        brief: buildHeuristicDashboardAssistantBrief(parsedRequest),
        mode: parsedRequest.mode,
        source: 'rules',
        model: 'deterministic-ops-fallback',
        generatedAt: new Date().toISOString(),
        remainingRequests: rateLimit.remaining,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid dashboard assistant request.', details: error.issues },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to generate dashboard brief.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}