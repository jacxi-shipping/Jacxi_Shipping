import { ProxyAgent, fetch as undiciFetch } from 'undici';

const LOT_FETCH_PROXY_MODE = process.env.LOT_FETCH_PROXY_MODE;
const LOT_FETCH_PROXY_URL = process.env.LOT_FETCH_PROXY_URL;
const LOT_FETCH_PROXY_USERNAME = process.env.LOT_FETCH_PROXY_USERNAME;
const LOT_FETCH_PROXY_PASSWORD = process.env.LOT_FETCH_PROXY_PASSWORD;
const LOT_FETCH_PROXY_AUTH_TOKEN = process.env.LOT_FETCH_PROXY_AUTH_TOKEN;
const LOT_FETCH_PROXY_AUTH_HEADER = process.env.LOT_FETCH_PROXY_AUTH_HEADER;
const LOT_FETCH_PROXY_AUTH_SCHEME = process.env.LOT_FETCH_PROXY_AUTH_SCHEME;

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

type LotFetchProxyMode = 'template' | 'connect';

let cachedProxyAgent: ProxyAgent | null = null;

function resolveProxyMode(): LotFetchProxyMode | undefined {
  const explicitMode = normalizeEnvValue(LOT_FETCH_PROXY_MODE)?.toLowerCase();
  if (explicitMode === 'template') return 'template';
  if (explicitMode === 'connect') return 'connect';

  if (normalizeEnvValue(LOT_FETCH_PROXY_USERNAME) || normalizeEnvValue(LOT_FETCH_PROXY_PASSWORD)) {
    return 'connect';
  }

  if (normalizeEnvValue(LOT_FETCH_PROXY_AUTH_TOKEN)) {
    return 'template';
  }

  const proxyUrl = normalizeEnvValue(LOT_FETCH_PROXY_URL);
  if (!proxyUrl) return undefined;

  return proxyUrl.includes('{url}') ? 'template' : 'connect';
}

function buildProxyUrl(targetUrl: string) {
  const proxyUrl = normalizeEnvValue(LOT_FETCH_PROXY_URL);
  if (!proxyUrl) {
    throw new Error('LOT_FETCH_PROXY_URL is not configured.');
  }

  if (proxyUrl.includes('{url}')) {
    return proxyUrl.replaceAll('{url}', encodeURIComponent(targetUrl));
  }

  const separator = proxyUrl.includes('?') ? '&' : '?';
  return `${proxyUrl}${separator}url=${encodeURIComponent(targetUrl)}`;
}

function buildOutboundProxyUrl() {
  const proxyUrl = normalizeEnvValue(LOT_FETCH_PROXY_URL);
  if (!proxyUrl) {
    throw new Error('LOT_FETCH_PROXY_URL is not configured.');
  }

  const normalizedProxyUrl = /^[a-z]+:\/\//i.test(proxyUrl) ? proxyUrl : `http://${proxyUrl}`;
  const url = new URL(normalizedProxyUrl);

  const username = normalizeEnvValue(LOT_FETCH_PROXY_USERNAME);
  const password = normalizeEnvValue(LOT_FETCH_PROXY_PASSWORD);

  if (username) {
    url.username = username;
  }

  if (password) {
    url.password = password;
  }

  return url.toString();
}

function getProxyAgent() {
  if (!cachedProxyAgent) {
    cachedProxyAgent = new ProxyAgent(buildOutboundProxyUrl());
  }

  return cachedProxyAgent;
}

function applyProxyAuth(headers: Headers) {
  const token = normalizeEnvValue(LOT_FETCH_PROXY_AUTH_TOKEN);
  if (!token) return;

  const headerName = normalizeEnvValue(LOT_FETCH_PROXY_AUTH_HEADER) || 'authorization';
  const authScheme = LOT_FETCH_PROXY_AUTH_SCHEME === undefined ? 'Bearer' : LOT_FETCH_PROXY_AUTH_SCHEME.trim();
  const headerValue = authScheme ? `${authScheme} ${token}` : token;
  headers.set(headerName, headerValue);
}

export type LotFetchHtmlResult = {
  html: string;
  response: {
    ok: boolean;
    status: number;
  };
  viaProxy: boolean;
  requestUrl: string;
};

export function hasLotFetchProxy() {
  return Boolean(normalizeEnvValue(LOT_FETCH_PROXY_URL) && resolveProxyMode());
}

export async function fetchLotHtml(targetUrl: string, requestHeaders: HeadersInit, useProxy = false): Promise<LotFetchHtmlResult> {
  const headers = new Headers(requestHeaders);
  const proxyMode = useProxy ? resolveProxyMode() : undefined;
  const requestUrl = useProxy && proxyMode === 'template' ? buildProxyUrl(targetUrl) : targetUrl;

  if (useProxy && proxyMode === 'template') {
    applyProxyAuth(headers);
  }

  const response = proxyMode === 'connect'
    ? await undiciFetch(targetUrl, {
        headers,
        dispatcher: getProxyAgent(),
      })
    : await fetch(requestUrl, {
        headers,
        cache: 'no-store',
      });

  return {
    html: await response.text(),
    response: {
      ok: response.ok,
      status: response.status,
    },
    viaProxy: useProxy,
    requestUrl: targetUrl,
  };
}