# Fix: loginCode Column Does Not Exist Error

## Problem
You're seeing this error:
```
Error [PrismaClientKnownRequestError]: 
Invalid `prisma.user.findUnique()` invocation:
The column `User.loginCode` does not exist in the current database.
```

This happens because the database migrations haven't been applied yet, even though the `loginCode` field is defined in the Prisma schema.

## Solution

### Step 1: Set Up Environment Variables

Make sure your `.env.local` or `.env` file has the correct database URL variables. The Prisma schema uses custom variable names:

```env
# Database - REQUIRED: Use these exact variable names
# The Prisma schema requires jacxi_DATABASE_URL and jacxi_POSTGRES_URL (not just DATABASE_URL)
jacxi_DATABASE_URL="postgresql://username:password@localhost:5432/jacxi_shipping"
jacxi_POSTGRES_URL="postgresql://username:password@localhost:5432/jacxi_shipping"

# Optional: For compatibility with some utility scripts (e.g., migrate-vehicle-photos.js)
# These scripts check for DATABASE_URL but actually use jacxi_DATABASE_URL
DATABASE_URL="postgresql://username:password@localhost:5432/jacxi_shipping"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-generate-with-openssl-rand-base64-32"
```

**Important:** The schema.prisma file specifically uses `jacxi_DATABASE_URL` and `jacxi_POSTGRES_URL`, so make sure these are set!

### Step 2: Apply Database Migrations

Run the following commands to apply all pending migrations (including the one that adds the `loginCode` column):

```bash
# Generate the Prisma client with the latest schema
npm run db:generate

# Apply all pending migrations to the database
npx prisma migrate deploy
```

If you're in development and want to create/apply migrations interactively:
```bash
npx prisma migrate dev
```

### Step 3: Verify the Migration

You can verify that the `loginCode` column was added by checking the database:

```bash
# Open Prisma Studio to view the database
npm run db:studio
```

Or check using psql:
```sql
\d "User"  -- Should show loginCode column
```

### Step 4: Regenerate Prisma Client (if needed)

After applying migrations, make sure the Prisma client is regenerated:

```bash
npm run db:generate
```

### Step 5: Restart the Development Server

```bash
npm run dev
```

## What the loginCode Field Does

The `loginCode` field is a simple 8-character code that allows users to log in without remembering a password. It's used for easy customer access to the shipping portal.

## Migration Details

The migration file that adds this column is located at:
```
prisma/migrations/20260131223000_add_login_codes/migration.sql
```

It contains:
```sql
ALTER TABLE "User" ADD COLUMN "loginCode" TEXT;
CREATE UNIQUE INDEX "User_loginCode_key" ON "User"("loginCode");
```

## Troubleshooting

### Issue: "Environment variable not found"
- Make sure you're using `jacxi_DATABASE_URL` and `jacxi_POSTGRES_URL` (not just `DATABASE_URL`)
- Check that your `.env.local` or `.env` file is in the project root
- The variables should NOT have quotes around the values in the actual .env file

### Issue: Migration fails
- Make sure your database is running and accessible
- Check that the database user has permission to ALTER tables
- Try running `npx prisma migrate reset` to reset and reapply all migrations (⚠️ This will delete all data!)

### Issue: Still getting the error after migration
- Restart your development server
- Clear Next.js cache: `rm -rf .next`
- Regenerate Prisma client: `npm run db:generate`
- Build again: `npm run build`

## Quick Fix Script

Here's a one-liner to fix everything:

```bash
npm run db:generate && npx prisma migrate deploy && npm run dev
```

## For Production Deployment

When deploying to production (e.g., Vercel):

1. Set the environment variables in your hosting platform:
   - `jacxi_DATABASE_URL`
   - `jacxi_POSTGRES_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

2. Ensure migrations run during deployment:
   - Add a build command that includes: `npx prisma migrate deploy`
   - Or add it to your `package.json` build script

Example build script:
```json
{
  "scripts": {
    "build": "npx prisma generate && npx prisma migrate deploy && next build"
  }
}
```
