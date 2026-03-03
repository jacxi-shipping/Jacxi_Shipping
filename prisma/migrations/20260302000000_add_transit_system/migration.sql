-- CreateEnum
CREATE TYPE "TransitStatus" AS ENUM ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED');

-- AlterEnum: Add IN_TRANSIT_TO_DESTINATION to ShipmentSimpleStatus
ALTER TYPE "ShipmentSimpleStatus" ADD VALUE 'IN_TRANSIT_TO_DESTINATION';

-- AlterTable: Add transitId to Shipment
ALTER TABLE "Shipment" ADD COLUMN "transitId" TEXT;

-- CreateTable: Transit
CREATE TABLE "Transit" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'Dubai, UAE',
    "destination" TEXT NOT NULL DEFAULT 'Kabul, Afghanistan',
    "status" "TransitStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchDate" TIMESTAMP(3),
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transit_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransitEvent
CREATE TABLE "TransitEvent" (
    "id" TEXT NOT NULL,
    "transitId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransitExpense
CREATE TABLE "TransitExpense" (
    "id" TEXT NOT NULL,
    "transitId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransitExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transit_referenceNumber_key" ON "Transit"("referenceNumber");
CREATE INDEX "Transit_companyId_idx" ON "Transit"("companyId");
CREATE INDEX "Transit_status_idx" ON "Transit"("status");
CREATE INDEX "TransitEvent_transitId_idx" ON "TransitEvent"("transitId");
CREATE INDEX "TransitEvent_eventDate_idx" ON "TransitEvent"("eventDate");
CREATE INDEX "TransitExpense_transitId_idx" ON "TransitExpense"("transitId");
CREATE INDEX "TransitExpense_shipmentId_idx" ON "TransitExpense"("shipmentId");
CREATE INDEX "Shipment_transitId_idx" ON "Shipment"("transitId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_transitId_fkey" FOREIGN KEY ("transitId") REFERENCES "Transit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transit" ADD CONSTRAINT "Transit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON UPDATE CASCADE;
ALTER TABLE "TransitEvent" ADD CONSTRAINT "TransitEvent_transitId_fkey" FOREIGN KEY ("transitId") REFERENCES "Transit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransitExpense" ADD CONSTRAINT "TransitExpense_transitId_fkey" FOREIGN KEY ("transitId") REFERENCES "Transit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransitExpense" ADD CONSTRAINT "TransitExpense_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
