-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('PEAK', 'RANGE', 'PASS', 'TOWN', 'REGION');

-- AlterTable
ALTER TABLE "RideRequest" ADD COLUMN     "destinationPlaceId" TEXT;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "baseName" TEXT,
ADD COLUMN     "basePlaceId" TEXT,
ADD COLUMN     "destinationPlaceId" TEXT;

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNorm" TEXT NOT NULL,
    "type" "PlaceType" NOT NULL,
    "parentId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "elevation" INTEGER,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aliasesNorm" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Place_nameNorm_idx" ON "Place"("nameNorm");

-- CreateIndex
CREATE INDEX "Place_type_popularity_idx" ON "Place"("type", "popularity");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationPlaceId_fkey" FOREIGN KEY ("destinationPlaceId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_basePlaceId_fkey" FOREIGN KEY ("basePlaceId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_destinationPlaceId_fkey" FOREIGN KEY ("destinationPlaceId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
