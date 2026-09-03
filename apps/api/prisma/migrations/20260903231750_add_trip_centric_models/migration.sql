-- CreateEnum
CREATE TYPE "TripVisibility" AS ENUM ('PUBLIC', 'LINK_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('OPEN', 'CONFIRMED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LegDirection" AS ENUM ('OUTBOUND', 'RETURN');

-- CreateEnum
CREATE TYPE "ReservationLegs" AS ENUM ('BOTH', 'OUTBOUND_ONLY', 'RETURN_ONLY');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'FULFILLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "tripId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "interior" TEXT NOT NULL DEFAULT 'sedan',
    "seatLayout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "visibility" "TripVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "TripStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripParticipant" (
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripParticipant_pkey" PRIMARY KEY ("tripId","userId")
);

-- CreateTable
CREATE TABLE "TripRide" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "seatLayoutSnapshot" JSONB NOT NULL,
    "interior" TEXT NOT NULL DEFAULT 'sedan',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripRide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRideLeg" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "direction" "LegDirection" NOT NULL,
    "origin" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "arrivalAt" TIMESTAMP(3),

    CONSTRAINT "TripRideLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSeatReservation" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "legs" "ReservationLegs" NOT NULL DEFAULT 'BOTH',
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripSeatReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "seatsNeeded" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripRide_tripId_driverId_key" ON "TripRide"("tripId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "TripRideLeg_rideId_direction_key" ON "TripRideLeg"("rideId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "TripSeatReservation_rideId_seatId_key" ON "TripSeatReservation"("rideId", "seatId");

-- CreateIndex
CREATE UNIQUE INDEX "TripSeatReservation_rideId_userId_key" ON "TripSeatReservation"("rideId", "userId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRide" ADD CONSTRAINT "TripRide_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRide" ADD CONSTRAINT "TripRide_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRide" ADD CONSTRAINT "TripRide_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRideLeg" ADD CONSTRAINT "TripRideLeg_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "TripRide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSeatReservation" ADD CONSTRAINT "TripSeatReservation_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "TripRide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSeatReservation" ADD CONSTRAINT "TripSeatReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
