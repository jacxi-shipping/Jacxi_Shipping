-- Create company type enum only if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyType') THEN
        CREATE TYPE "CompanyType" AS ENUM ('SHIPPING', 'TRANSIT');
    END IF;
END $$;

-- Add companyType column without rewriting existing data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Company'
          AND column_name = 'companyType'
    ) THEN
        ALTER TABLE "Company"
        ADD COLUMN "companyType" "CompanyType" NOT NULL DEFAULT 'SHIPPING';
    END IF;
END $$;

-- Backfill any unexpected NULL values safely
UPDATE "Company"
SET "companyType" = 'SHIPPING'
WHERE "companyType" IS NULL;

-- Add index if it does not exist
CREATE INDEX IF NOT EXISTS "Company_companyType_idx" ON "Company"("companyType");
