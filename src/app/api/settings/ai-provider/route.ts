import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  getStoredAiProviderSettings,
  maskSecret,
  saveStoredAiProviderSettings,
  type AiProviderSettingsValues,
} from '@/lib/ai/provider-settings';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const aiProviderSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.string().trim().min(1).max(80).optional(),
  apiKey: z.string().optional(),
  chatCompletionsUrl: z.string().trim().url().optional(),
  modelsUrl: z.string().trim().url().optional(),
  model: z.string().trim().min(1).max(120).optional(),
  maxTokens: z.number().int().min(1).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }

  return session;
}

function toClientSettings(settings: AiProviderSettingsValues) {
  return {
    ...settings,
    apiKeyMasked: maskSecret(settings.apiKey),
    apiKeyConfigured: Boolean(settings.apiKey),
    apiKey: '',
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ settings: toClientSettings(await getStoredAiProviderSettings()) }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load AI provider settings.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const actorUserId = session.user.id as string;

    const payload = aiProviderSettingsSchema.parse(await request.json());
    const partial = { ...payload } satisfies Partial<AiProviderSettingsValues>;
    if (payload.apiKey === '') {
      delete partial.apiKey;
    }

    const settings = await saveStoredAiProviderSettings(partial);

    await createAuditLog(
      'SETTINGS',
      'ai-provider',
      'UPDATE',
      actorUserId,
      {
        summary: `Updated AI provider settings fields: ${Object.keys(payload).join(', ')}`,
        updatedFields: Object.keys(payload).filter((key) => key !== 'apiKey'),
        apiKeyUpdated: Object.prototype.hasOwnProperty.call(payload, 'apiKey') && Boolean(payload.apiKey),
      },
      request,
    );

    return NextResponse.json({ settings: toClientSettings(settings) }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid AI provider settings.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save AI provider settings.' },
      { status: 500 },
    );
  }
}
