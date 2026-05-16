import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type TwilioAuthMode = 'auth-token' | 'api-key' | 'missing';

type TwilioPhoneRecord = {
  sid?: string | null;
  phone_number?: string | null;
  voice_url?: string | null;
  voice_method?: string | null;
  voice_fallback_url?: string | null;
  voice_application_sid?: string | null;
  status_callback?: string | null;
  trunk_sid?: string | null;
};

type TwilioInspection = {
  attempted: boolean;
  inspected: boolean;
  source: 'phone-number' | 'phone-sid' | 'single-number' | 'multiple-numbers' | 'missing-target' | 'missing-credentials';
  target: string | null;
  phoneNumber: string | null;
  sid: string | null;
  voiceUrl: string | null;
  voiceMethod: string | null;
  voiceFallbackUrl: string | null;
  voiceApplicationSid: string | null;
  statusCallback: string | null;
  trunkSid: string | null;
  matchesExpectedWebhook: boolean | null;
  error: string | null;
};

type StoredTwilioSettings = {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioApiKey: string;
  twilioApiSecret: string;
  twilioPhoneNumber: string;
  twilioPhoneNumberSid: string;
};

const EMPTY_TWILIO_SETTINGS: StoredTwilioSettings = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioApiKey: '',
  twilioApiSecret: '',
  twilioPhoneNumber: '',
  twilioPhoneNumberSid: '',
};

function normalizeBaseUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function isLocalBaseUrl(value: string) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

function getDetectedBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const requestUrl = new URL(request.url);
  const protocol = forwardedProto || requestUrl.protocol.replace(':', '');
  const host = forwardedHost || request.headers.get('host') || requestUrl.host;

  return `${protocol}://${host}`.replace(/\/$/, '');
}

function toWebsocketUrl(baseUrl: string) {
  return baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

function sanitizeStoredString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function mapStoredTwilioSettings(record?: Partial<Record<keyof StoredTwilioSettings, string | null>> | null): StoredTwilioSettings {
  return {
    twilioAccountSid: record?.twilioAccountSid?.trim() || '',
    twilioAuthToken: record?.twilioAuthToken?.trim() || '',
    twilioApiKey: record?.twilioApiKey?.trim() || '',
    twilioApiSecret: record?.twilioApiSecret?.trim() || '',
    twilioPhoneNumber: record?.twilioPhoneNumber?.trim() || '',
    twilioPhoneNumberSid: record?.twilioPhoneNumberSid?.trim() || '',
  };
}

function toPersistedTwilioData(settings: StoredTwilioSettings) {
  return {
    twilioAccountSid: settings.twilioAccountSid || null,
    twilioAuthToken: settings.twilioAuthToken || null,
    twilioApiKey: settings.twilioApiKey || null,
    twilioApiSecret: settings.twilioApiSecret || null,
    twilioPhoneNumber: settings.twilioPhoneNumber || null,
    twilioPhoneNumberSid: settings.twilioPhoneNumberSid || null,
  };
}

function getTwilioAuthMode(settings: StoredTwilioSettings): TwilioAuthMode {
  return settings.twilioAccountSid && settings.twilioAuthToken
    ? 'auth-token'
    : settings.twilioAccountSid && settings.twilioApiKey && settings.twilioApiSecret
      ? 'api-key'
      : 'missing';
}

async function getStoredTwilioSettings() {
  const settings = await prisma.callAgentSettings.findUnique({
    where: { scope: 'default' },
    select: {
      twilioAccountSid: true,
      twilioAuthToken: true,
      twilioApiKey: true,
      twilioApiSecret: true,
      twilioPhoneNumber: true,
      twilioPhoneNumberSid: true,
    },
  });

  return mapStoredTwilioSettings(settings);
}

function normalizeComparableUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const params = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    });
    const normalizedSearch = new URLSearchParams(params).toString();
    return `${url.origin}${url.pathname}${normalizedSearch ? `?${normalizedSearch}` : ''}`;
  } catch {
    return value.trim();
  }
}

function createTwilioAuthHeader(authMode: TwilioAuthMode, settings: StoredTwilioSettings) {
  if (authMode === 'auth-token') {
    const username = settings.twilioAccountSid;
    const password = settings.twilioAuthToken;
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  if (authMode === 'api-key') {
    const username = settings.twilioApiKey;
    const password = settings.twilioApiSecret;
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  return null;
}

async function fetchTwilioJson(pathname: string, authHeader: string, accountSid: string) {
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}${pathname}`, {
    headers: {
      Authorization: authHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Twilio API request failed with status ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function buildTwilioInspection(record: TwilioPhoneRecord, source: TwilioInspection['source'], target: string | null, expectedWebhookUrl: string) {
  const voiceUrl = record.voice_url?.trim() || null;
  const voiceMethod = record.voice_method?.trim() || null;
  const matchesExpectedWebhook = voiceUrl
    ? normalizeComparableUrl(voiceUrl) === normalizeComparableUrl(expectedWebhookUrl) && (voiceMethod || '').toUpperCase() === 'POST'
    : null;

  return {
    attempted: true,
    inspected: true,
    source,
    target,
    phoneNumber: record.phone_number?.trim() || null,
    sid: record.sid?.trim() || null,
    voiceUrl,
    voiceMethod,
    voiceFallbackUrl: record.voice_fallback_url?.trim() || null,
    voiceApplicationSid: record.voice_application_sid?.trim() || null,
    statusCallback: record.status_callback?.trim() || null,
    trunkSid: record.trunk_sid?.trim() || null,
    matchesExpectedWebhook,
    error: null,
  } satisfies TwilioInspection;
}

async function buildCallAgentResponse(request: NextRequest, twilioSettings: StoredTwilioSettings) {
  const configuredBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  const detectedBaseUrl = getDetectedBaseUrl(request);
  const preferredBaseUrl = configuredBaseUrl && !isLocalBaseUrl(configuredBaseUrl)
    ? configuredBaseUrl
    : detectedBaseUrl;
  const voiceWebhookToken = process.env.VOICE_WEBHOOK_TOKEN?.trim() || '';

  const webhookUrl = new URL('/api/voice', preferredBaseUrl);
  const websocketUrl = new URL('/api/voice/live', toWebsocketUrl(preferredBaseUrl));

  if (voiceWebhookToken) {
    webhookUrl.searchParams.set('token', voiceWebhookToken);
    websocketUrl.searchParams.set('token', voiceWebhookToken);
  }

  const geminiStandardConfigured = Boolean(
    (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      ''
    ).trim(),
  );
  const geminiLiveConfigured = Boolean(
    (process.env.GEMINI_LIVE_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
  );
  const twilioAccountSidConfigured = Boolean(twilioSettings.twilioAccountSid);
  const twilioAuthTokenConfigured = Boolean(twilioSettings.twilioAuthToken);
  const twilioApiKeyConfigured = Boolean(twilioSettings.twilioApiKey);
  const twilioApiSecretConfigured = Boolean(twilioSettings.twilioApiSecret);
  const twilioPhoneNumberConfigured = Boolean(twilioSettings.twilioPhoneNumber);
  const twilioPhoneNumberSidConfigured = Boolean(twilioSettings.twilioPhoneNumberSid);
  const twilioAuthMode = getTwilioAuthMode(twilioSettings);

  let twilioInspection: TwilioInspection = {
    attempted: false,
    inspected: false,
    source: twilioAuthMode === 'missing' ? 'missing-credentials' : 'missing-target',
    target: twilioSettings.twilioPhoneNumberSid || twilioSettings.twilioPhoneNumber || null,
    phoneNumber: null,
    sid: null,
    voiceUrl: null,
    voiceMethod: null,
    voiceFallbackUrl: null,
    voiceApplicationSid: null,
    statusCallback: null,
    trunkSid: null,
    matchesExpectedWebhook: null,
    error: twilioAuthMode === 'missing'
      ? 'Twilio API credentials are not configured in Call Agent settings.'
      : 'Save TWILIO_PHONE_NUMBER or TWILIO_PHONE_NUMBER_SID on this page to inspect a specific number, or keep only one number on the Twilio account.',
  };

  if (twilioAuthMode !== 'missing') {
    const authHeader = createTwilioAuthHeader(twilioAuthMode, twilioSettings);

    if (authHeader) {
      try {
        if (twilioSettings.twilioPhoneNumberSid) {
          const record = (await fetchTwilioJson(`/IncomingPhoneNumbers/${encodeURIComponent(twilioSettings.twilioPhoneNumberSid)}.json`, authHeader, twilioSettings.twilioAccountSid)) as TwilioPhoneRecord;
          twilioInspection = buildTwilioInspection(record, 'phone-sid', twilioSettings.twilioPhoneNumberSid, webhookUrl.toString());
        } else {
          const query = new URLSearchParams({ PageSize: '20' });
          if (twilioSettings.twilioPhoneNumber) {
            query.set('PhoneNumber', twilioSettings.twilioPhoneNumber);
          }

          const payload = await fetchTwilioJson(`/IncomingPhoneNumbers.json?${query.toString()}`, authHeader, twilioSettings.twilioAccountSid);
          const numbers = Array.isArray(payload.incoming_phone_numbers)
            ? (payload.incoming_phone_numbers as TwilioPhoneRecord[])
            : [];

          if (numbers.length === 1) {
            twilioInspection = buildTwilioInspection(
              numbers[0],
              twilioSettings.twilioPhoneNumber ? 'phone-number' : 'single-number',
              twilioSettings.twilioPhoneNumber || numbers[0].phone_number || null,
              webhookUrl.toString(),
            );
          } else if (numbers.length > 1) {
            twilioInspection = {
              ...twilioInspection,
              attempted: true,
              source: 'multiple-numbers',
              error: 'Multiple Twilio phone numbers are on this account. Save TWILIO_PHONE_NUMBER or TWILIO_PHONE_NUMBER_SID on this page to inspect the correct number.',
            };
          } else {
            twilioInspection = {
              ...twilioInspection,
              attempted: true,
              source: twilioSettings.twilioPhoneNumber ? 'phone-number' : 'missing-target',
              error: twilioSettings.twilioPhoneNumber
                ? 'No Twilio number matched the saved TWILIO_PHONE_NUMBER.'
                : 'No incoming Twilio phone numbers were found on this account.',
            };
          }
        }
      } catch (twilioError) {
        twilioInspection = {
          ...twilioInspection,
          attempted: true,
          error: twilioError instanceof Error ? twilioError.message : 'Failed to inspect Twilio phone number configuration.',
        };
      }
    }
  }

  return {
    urls: {
      preferredBaseUrl,
      configuredBaseUrl,
      detectedBaseUrl,
      source: preferredBaseUrl === configuredBaseUrl ? 'NEXT_PUBLIC_APP_URL' : 'request',
      webhookUrl: webhookUrl.toString(),
      websocketUrl: websocketUrl.toString(),
      webhookMethod: 'POST' as const,
    },
    status: {
      voiceWebhookTokenConfigured: Boolean(voiceWebhookToken),
      geminiStandardConfigured,
      geminiLiveConfigured,
      geminiVoiceModel: (process.env.GEMINI_VOICE_MODEL || 'gemini-2.5-flash').trim(),
      geminiLiveModel: (process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview').trim(),
      twilioAccountSidConfigured,
      twilioAuthTokenConfigured,
      twilioApiKeyConfigured,
      twilioApiSecretConfigured,
      twilioAuthMode,
      twilioConfigured: twilioAuthMode !== 'missing',
      twilioPhoneNumberConfigured,
      twilioPhoneNumberSidConfigured,
    },
    twilioValues: twilioSettings,
    twilioInspection,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const twilioSettings = await getStoredTwilioSettings();

    return NextResponse.json(await buildCallAgentResponse(request, twilioSettings), { status: 200 });
  } catch (error) {
    console.error('Error fetching call agent settings:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json() as Record<string, unknown>;
    const twilioSettings: StoredTwilioSettings = {
      twilioAccountSid: sanitizeStoredString(payload.twilioAccountSid),
      twilioAuthToken: sanitizeStoredString(payload.twilioAuthToken),
      twilioApiKey: sanitizeStoredString(payload.twilioApiKey),
      twilioApiSecret: sanitizeStoredString(payload.twilioApiSecret),
      twilioPhoneNumber: sanitizeStoredString(payload.twilioPhoneNumber),
      twilioPhoneNumberSid: sanitizeStoredString(payload.twilioPhoneNumberSid),
    };

    await prisma.callAgentSettings.upsert({
      where: { scope: 'default' },
      create: {
        scope: 'default',
        ...toPersistedTwilioData(twilioSettings),
      },
      update: toPersistedTwilioData(twilioSettings),
    });

    return NextResponse.json(await buildCallAgentResponse(request, twilioSettings), { status: 200 });
  } catch (error) {
    console.error('Error updating call agent settings:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}