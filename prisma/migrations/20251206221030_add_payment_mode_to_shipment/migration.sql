-- Add PaymentMode enum and paymentMode column to Shipment table

-- Step 1: Create PaymentMode enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMode') THEN
        CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'DUE');
        RAISE NOTICE 'Created PaymentMode enum';
    ELSE
        RAISE NOTICE 'PaymentMode enum already exists';
    END IF;
END $$;

-- Step 2: Add paymentMode column to Shipment table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Shipment' 
        AND column_name = 'paymentMode'
    ) THEN
        ALTER TABLE "Shipment" ADD COLUMN "paymentMode" "PaymentMode";
        RAISE NOTICE 'Added paymentMode column to Shipment table';
    ELSE
        RAISE NOTICE 'paymentMode column already exists';
    END IF;
END $$;
