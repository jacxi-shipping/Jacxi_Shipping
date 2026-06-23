const TOKENROUTER_AI_URL = 'https://api.tokenrouter.com/v1/chat/completions';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

  const response = await fetch(TOKENROUTER_AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
