## Jacxi Shipping Platform

Jacxi Shipping is a Next.js 15 dashboard and customer portal for creating, monitoring, and closing out vehicle shipments. It includes protected admin tooling, shipment timelines, invoice exports, tracking pages, and secure media uploads for arrival/container photos.

## Getting Started

### Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (see below)
cp .env.example .env.local

# 3. Generate Prisma client
npm run db:generate

# 4. Apply database migrations (MUST be done before building)
npm run db:migrate:deploy

# 5. Build the application
npm run build

# 6. Start development server
npm run dev
```

Visit `http://localhost:3000` and sign in with an admin account to unlock shipment management features.

**⚠️ Important:** If you see an error about `User.loginCode` column not existing, see [FIX_LOGINCODE_ERROR.md](./FIX_LOGINCODE_ERROR.md) for the solution.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values. **Important:** Use the exact variable names shown:

```env
# Database - REQUIRED: Use these exact names
jacxi_DATABASE_URL="postgresql://..."
jacxi_POSTGRES_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

For shipment photo uploads you must also configure a Vercel Blob token:

- `BLOB_READ_WRITE_TOKEN` – obtain via `vercel blob tokens create jacxi-shipments --rw`.

Without this token, `/api/upload` will return a configuration error.

For auction lot auto-fill in production, public Copart or IAAI pages may block Vercel serverless IPs. If that happens, configure one of these server-side fallbacks:

- `OXYLABS_DATA_API_USERNAME` and `OXYLABS_DATA_API_PASSWORD` – preferred Copart provider when you have Oxylabs Web Scraper API access.
- `OXYLABS_COPART_PARSER_PRESET` – optional Copart parser preset for Oxylabs. Defaults to `shkrcopart`.

- `LOT_FETCH_PROXY_MODE` – `connect` for a real outbound proxy such as Oxylabs, or `template` for a fetch endpoint that accepts a target URL.
- `LOT_FETCH_PROXY_URL` – proxy address. For Oxylabs, use the proxy server URL such as `http://dc.oxylabs.io:8000`. For template mode, use a URL containing `{url}` or an endpoint that accepts `?url=`.
- `LOT_FETCH_PROXY_USERNAME` and `LOT_FETCH_PROXY_PASSWORD` – proxy credentials for `connect` mode.
- `LOT_FETCH_PROXY_AUTH_TOKEN` – optional token for `template` mode.
- `LOT_FETCH_PROXY_AUTH_HEADER` – optional header name for the template-mode auth token. Defaults to `authorization`.
- `LOT_FETCH_PROXY_AUTH_SCHEME` – optional auth scheme for template mode. Defaults to `Bearer`. Set it to an empty string if your proxy expects the raw token.
- `IAAI_API_URL` and `IAAI_API_KEY` – optional approved JSON provider for IAAI if public page scraping is blocked.

For the call agent service, configure these server-side variables:

- `VOICE_WEBHOOK_TOKEN` – shared secret appended to the inbound voice webhook URL, for example `/api/voice?token=...`.
- `GEMINI_API_KEY` – Gemini API key for the non-live phone assistant path. `GOOGLE_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` are also accepted as fallbacks.
- `GEMINI_LIVE_API_KEY` – optional dedicated Gemini API key for the live audio bridge. If omitted, live mode falls back to `GEMINI_API_KEY`.
- `GEMINI_VOICE_MODEL` – optional Gemini model override. Defaults to `gemini-2.5-flash`.
- `GEMINI_LIVE_MODEL` – optional Gemini Live model override for real-time audio. Defaults to `gemini-3.1-flash-live-preview`.

## Shipment Photo Uploads

Arrival and container photos are uploaded via the `/api/upload` route, which now writes directly to [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob). Only authenticated admins can call this endpoint. Files are validated for type (JPEG, PNG, WebP) and size (<5 MB) before being persisted to a public `shipments/...` object key. The generated URL is saved on the shipment record and rendered in the dashboard gallery components.

## Scripts

- `npm run dev` – start the Next.js development server.
- `npm run build && npm run start` – create a production build and serve it.
- `npm run lint` – run ESLint across the project.

Additional database utilities live under the `scripts/` directory (see `QUICK_START.md` for the full list).

## Deployment

Deploy to Vercel for the standard dashboard experience. Ensure the environment variables above (including `BLOB_READ_WRITE_TOKEN`) are configured in the project settings so uploads continue to work in production.

## Voice Call Agent

The project now includes a Twilio-compatible inbound voice webhook at `/api/voice`. The call flow asks for an 8-character access code, then offers shipment tracking, finance summary, recent shipments, and a live Gemini-backed voice assistant.

Set your phone number webhook to `POST https://your-domain/api/voice?token=YOUR_VOICE_WEBHOOK_TOKEN` and make sure the same token is configured in `VOICE_WEBHOOK_TOKEN`.

Keypad entry works best when the caller's 8-character login code is numeric. Existing alphanumeric login codes are still supported through spoken input, so callers can say the code if needed.

Option 4 now uses a bidirectional Twilio Media Streams bridge to Gemini Live over WebSockets. That requires a long-running Node server with WebSocket upgrade support, so it is compatible with the included Docker/container deployment and other VM-style hosts, but not with Vercel serverless routing.

The app now starts through the custom [server.ts](./server.ts) entrypoint so the dashboard HTTP traffic and `/api/voice/live` WebSocket traffic share the same host.

If lot-number auto-fill works locally but fails after deployment, the usual cause is Copart or IAAI blocking Vercel serverless requests. For Copart, prefer the Oxylabs data API by setting `OXYLABS_DATA_API_USERNAME`, `OXYLABS_DATA_API_PASSWORD`, and optionally `OXYLABS_COPART_PARSER_PRESET`. Keep the proxy variables only as fallback. Also set `IAAI_API_URL`/`IAAI_API_KEY` if you use an approved IAAI provider.
