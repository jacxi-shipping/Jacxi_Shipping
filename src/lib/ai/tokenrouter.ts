const ATOMESUS_API_BASE_URL = 'https://api.atomesus.com/v1';
const ATOMESUS_MODELS_URL = `${ATOMESUS_API_BASE_URL}/models`;
const ATOMESUS_CHAT_COMPLETIONS_URL = `${ATOMESUS_API_BASE_URL}/chat/completions`;

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

export function isTokenRouterConfigured() {
  return Boolean(process.env.TOKENROUTER_API_KEY?.trim());
}

export async function createTokenRouterChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
) {
  const apiKey = process.env.TOKENROUTER_API_KEY?.trim();
  const model = options.model ?? process.env.TOKENROUTER_MODEL ?? 'MiniMax-M3';

  if (!apiKey) {
    throw new Error('TokenRouter AI is not configured. Set TOKENROUTER_API_KEY to enable AI features.');
  }

  const modelsResponse = await fetch(ATOMESUS_MODELS_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });

  if (!modelsResponse.ok) {
    const modelsPayload = (await modelsResponse.json().catch(() => null)) as { error?: { message?: string } } | null;
    const errorMessage = modelsPayload?.error?.message ?? `Atomesus models endpoint returned status ${modelsResponse.status}`;
    throw new Error(errorMessage);
  }

  const response = await fetch(ATOMESUS_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 500,
      temperature: options.temperature ?? 0.3,
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
