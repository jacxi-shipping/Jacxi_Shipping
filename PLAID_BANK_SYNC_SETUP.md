# Plaid Bank Sync Setup

This project now supports automatic bank transaction sync into the user ledger through Plaid.

## Required environment variables

Set these before using the Banking page auto-sync flow:

```env
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
PLAID_ENCRYPTION_KEY=a-long-random-secret-used-to-encrypt-access-tokens
NEXT_PUBLIC_APP_URL=https://your-app-url
CRON_SECRET=your-cron-secret
```

For Prisma schema changes and migrations in this repo, these database env vars must also exist:

```env
jacxi_PRISMA_DATABASE_URL=postgresql://...
jacxi_POSTGRES_URL=postgresql://...
```

## Database step

After pulling the code, create and apply the Prisma migration:

```bash
npm run db:migrate -- --name add_plaid_bank_sync
npm run db:generate
```

## Runtime behavior

- Banking page manual sync endpoint: `/api/plaid/sync`
- Banking page connection bootstrap: `/api/plaid/link-token`
- Scheduled background sync endpoint: `/api/cron/sync-bank-transactions`

The cron endpoint requires:

```http
Authorization: Bearer $CRON_SECRET
```

## Notes

- Plaid transactions are imported into the existing user ledger.
- Imported Plaid rows are marked with `importSource = PLAID_TRANSACTIONS` in ledger metadata.
- The Banking page still supports CSV upload as a fallback.