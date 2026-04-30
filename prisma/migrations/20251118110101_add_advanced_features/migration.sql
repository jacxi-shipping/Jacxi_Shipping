/*
  Warnings:

  - The `status` column on the `Container` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[vehicleVIN]` on the table `Shipment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DeliveryAlertStatus" AS ENUM ('ON_TIME', 'WARNING', 'OVERDUE', 'DELIVERED');

-- CreateEnum
CREATE TYPE "QualityCheckType" AS ENUM ('INITIAL_INSPECTION', 'PRE_LOADING', 'POST_LOADING', 'DELIVERY_INSPECTION', 'DAMAGE_ASSESSMENT');

-- CreateEnum
CREATE TYPE "QualityCheckStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'REQUIRES_ATTENTION');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('INVOICE', 'BILL_OF_LADING', 'CUSTOMS', 'INSURANCE', 'TITLE', 'INSPECTION_REPORT', 'PHOTO', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OPTIMIZING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('EMPTY', 'PARTIAL', 'FULL', 'SHIPPED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Container" ADD COLUMN     "currentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxCapacity" INTEGER NOT NULL DEFAULT 4,
DROP COLUMN "status",
ADD COLUMN     "status" "ContainerStatus" NOT NULL DEFAULT 'EMPTY';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "autoStatusUpdate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deliveryAlertStatus" "DeliveryAlertStatus" NOT NULL DEFAULT 'ON_TIME',
ADD COLUMN     "lastStatusSync" TIMESTAMP(3),
ADD COLUMN     "routeId" TEXT;

-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "itemId" TEXT,
    "checkType" "QualityCheckType" NOT NULL,
    "status" "QualityCheckStatus" NOT NULL DEFAULT 'PENDING',
    "inspector" TEXT,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "shipmentId" TEXT,
    "userId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "waypoints" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "distance" DOUBLE PRECISION,
    "estimatedTime" INTEGER,
    "cost" DOUBLE PRECISION,
    "status" "RouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_vehicleVIN_key" ON "Shipment"("vehicleVIN");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
