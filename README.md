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

## Shipment Photo Uploads

Arrival and container photos are uploaded via the `/api/upload` route, which now writes directly to [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob). Only authenticated admins can call this endpoint. Files are validated for type (JPEG, PNG, WebP) and size (<5 MB) before being persisted to a public `shipments/...` object key. The generated URL is saved on the shipment record and rendered in the dashboard gallery components.

## Scripts

- `npm run dev` – start the Next.js development server.
- `npm run build && npm run start` – create a production build and serve it.
- `npm run lint` – run ESLint across the project.

Additional database utilities live under the `scripts/` directory (see `QUICK_START.md` for the full list).

## Deployment

Deploy to Vercel for the best experience. Ensure the environment variables above (including `BLOB_READ_WRITE_TOKEN`) are configured in the project settings so uploads continue to work in production.

If lot-number auto-fill works locally but fails after deployment, the usual cause is Copart or IAAI blocking Vercel serverless requests. For Copart, prefer the Oxylabs data API by setting `OXYLABS_DATA_API_USERNAME`, `OXYLABS_DATA_API_PASSWORD`, and optionally `OXYLABS_COPART_PARSER_PRESET`. Keep the proxy variables only as fallback. Also set `IAAI_API_URL`/`IAAI_API_KEY` if you use an approved IAAI provider.
