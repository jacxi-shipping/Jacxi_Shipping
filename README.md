## Jacxi Shipping Platform

Jacxi Shipping is a Next.js 15 dashboard and customer portal for creating, monitoring, and closing out vehicle shipments. It includes protected admin tooling, shipment timelines, invoice exports, tracking pages, and secure media uploads for arrival/container photos.

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and sign in with an admin account to unlock shipment management features.

## Environment Variables

Copy `.env` or `.env.local` from `env.example` and fill in the values for auth, database, and integrations. For shipment photo uploads you must also configure a Vercel Blob token:

- `BLOB_READ_WRITE_TOKEN` – obtain via `vercel blob tokens create jacxi-shipments --rw`.

Without this token, `/api/upload` will return a configuration error.

## Shipment Photo Uploads

Arrival and container photos are uploaded via the `/api/upload` route, which now writes directly to [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob). Only authenticated admins can call this endpoint. Files are validated for type (JPEG, PNG, WebP) and size (<5 MB) before being persisted to a public `shipments/...` object key. The generated URL is saved on the shipment record and rendered in the dashboard gallery components.

## Scripts

- `npm run dev` – start the Next.js development server.
- `npm run build && npm run start` – create a production build and serve it.
- `npm run lint` – run ESLint across the project.

Additional database utilities live under the `scripts/` directory (see `QUICK_START.md` for the full list).

## Deployment

Deploy to Vercel for the best experience. Ensure the environment variables above (including `BLOB_READ_WRITE_TOKEN`) are configured in the project settings so uploads continue to work in production.
