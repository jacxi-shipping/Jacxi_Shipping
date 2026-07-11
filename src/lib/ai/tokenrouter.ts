import { getEffectiveAiProviderSettings, isAiProviderConfigured } from '@/lib/ai/provider-settings';

type ChatMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: ChatMessageContent;
};

type ChatCompletionOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function isTokenRouterConfigured() {
  return isAiProviderConfigured(await getEffectiveAiProviderSettings());
}

export async function createTokenRouterChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
) {
  const settings = await getEffectiveAiProviderSettings();
  const apiKey = settings.apiKey.trim();
  const model = options.model ?? settings.model;

  if (!isAiProviderConfigured(settings)) {
    throw new Error('TokenRouter AI is not configured. Save an enabled API key and endpoint in Settings > AI.');
  }

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'X-API-Key': apiKey,
  };

  const response = await fetch(settings.chatCompletionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? settings.maxTokens,
      temperature: options.temperature ?? settings.temperature,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });

  const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;

  if (!response.ok) {
    const errorMessage = payload?.error?.message ?? `TokenRouter AI request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('TokenRouter AI returned an empty response.');
  }

  return {
    content,
    model,
  };
}
