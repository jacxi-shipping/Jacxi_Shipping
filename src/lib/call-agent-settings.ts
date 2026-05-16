import { prisma } from './db';

export const DEFAULT_GEMINI_VOICE_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_LIVE_MODEL = 'gemini-3.1-flash-live-preview';

export type CallAgentSettingsValues = {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioApiKey: string;
  twilioApiSecret: string;
  twilioPhoneNumber: string;
  twilioPhoneNumberSid: string;
  geminiApiKey: string;
  geminiLiveApiKey: string;
  geminiVoiceModel: string;
  geminiLiveModel: string;
};

const CALL_AGENT_SETTINGS_SCOPE = 'default';

export const EMPTY_CALL_AGENT_SETTINGS: CallAgentSettingsValues = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioApiKey: '',
  twilioApiSecret: '',
  twilioPhoneNumber: '',
  twilioPhoneNumberSid: '',
  geminiApiKey: '',
  geminiLiveApiKey: '',
  geminiVoiceModel: DEFAULT_GEMINI_VOICE_MODEL,
  geminiLiveModel: DEFAULT_GEMINI_LIVE_MODEL,
};

export const CALL_AGENT_SETTING_KEYS = Object.keys(EMPTY_CALL_AGENT_SETTINGS) as Array<keyof CallAgentSettingsValues>;

function normalizeStoredValue(value: string | null | undefined, fallback = '') {
  return value?.trim() || fallback;
}

export function mapCallAgentSettings(
  record?: Partial<Record<keyof CallAgentSettingsValues, string | null>> | null,
): CallAgentSettingsValues {
  return {
    twilioAccountSid: normalizeStoredValue(record?.twilioAccountSid),
    twilioAuthToken: normalizeStoredValue(record?.twilioAuthToken),
    twilioApiKey: normalizeStoredValue(record?.twilioApiKey),
    twilioApiSecret: normalizeStoredValue(record?.twilioApiSecret),
    twilioPhoneNumber: normalizeStoredValue(record?.twilioPhoneNumber),
    twilioPhoneNumberSid: normalizeStoredValue(record?.twilioPhoneNumberSid),
    geminiApiKey: normalizeStoredValue(record?.geminiApiKey),
    geminiLiveApiKey: normalizeStoredValue(record?.geminiLiveApiKey),
    geminiVoiceModel: normalizeStoredValue(record?.geminiVoiceModel, DEFAULT_GEMINI_VOICE_MODEL),
    geminiLiveModel: normalizeStoredValue(record?.geminiLiveModel, DEFAULT_GEMINI_LIVE_MODEL),
  };
}

export function toPersistedCallAgentSettingsData(settings: CallAgentSettingsValues) {
  return {
    twilioAccountSid: settings.twilioAccountSid || null,
    twilioAuthToken: settings.twilioAuthToken || null,
    twilioApiKey: settings.twilioApiKey || null,
    twilioApiSecret: settings.twilioApiSecret || null,
    twilioPhoneNumber: settings.twilioPhoneNumber || null,
    twilioPhoneNumberSid: settings.twilioPhoneNumberSid || null,
    geminiApiKey: settings.geminiApiKey || null,
    geminiLiveApiKey: settings.geminiLiveApiKey || null,
    geminiVoiceModel: settings.geminiVoiceModel || null,
    geminiLiveModel: settings.geminiLiveModel || null,
  };
}

export async function getStoredCallAgentSettings() {
  const settings = await prisma.callAgentSettings.findUnique({
    where: { scope: CALL_AGENT_SETTINGS_SCOPE },
    select: {
      twilioAccountSid: true,
      twilioAuthToken: true,
      twilioApiKey: true,
      twilioApiSecret: true,
      twilioPhoneNumber: true,
      twilioPhoneNumberSid: true,
      geminiApiKey: true,
      geminiLiveApiKey: true,
      geminiVoiceModel: true,
      geminiLiveModel: true,
    },
  });

  return mapCallAgentSettings(settings);
}

export async function saveStoredCallAgentSettings(partial: Partial<CallAgentSettingsValues>) {
  const current = await getStoredCallAgentSettings();
  const next = {
    ...current,
    ...partial,
  } satisfies CallAgentSettingsValues;

  await prisma.callAgentSettings.upsert({
    where: { scope: CALL_AGENT_SETTINGS_SCOPE },
    create: {
      scope: CALL_AGENT_SETTINGS_SCOPE,
      ...toPersistedCallAgentSettingsData(next),
    },
    update: toPersistedCallAgentSettingsData(next),
  });

  return next;
}

export function getEffectiveGeminiApiKey(settings: CallAgentSettingsValues) {
  return settings.geminiApiKey.trim();
}

export function getEffectiveGeminiLiveApiKey(settings: CallAgentSettingsValues) {
  return (settings.geminiLiveApiKey || settings.geminiApiKey).trim();
}

export function getEffectiveGeminiVoiceModel(settings: CallAgentSettingsValues) {
  return (settings.geminiVoiceModel || DEFAULT_GEMINI_VOICE_MODEL).trim();
}

export function getEffectiveGeminiLiveModel(settings: CallAgentSettingsValues) {
  return (settings.geminiLiveModel || settings.geminiVoiceModel || DEFAULT_GEMINI_LIVE_MODEL).trim();
}