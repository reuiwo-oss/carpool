-- CreateTable
CREATE TABLE "_LegacyRideMigration" (
    "legacyRideId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "tripRideId" TEXT NOT NULL,
    "migratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_LegacyRideMigration_pkey" PRIMARY KEY ("legacyRideId")
);

-- CreateIndex
CREATE UNIQUE INDEX "_LegacyRideMigration_tripId_key" ON "_LegacyRideMigration"("tripId");

-- AddForeignKey
ALTER TABLE "_LegacyRideMigration" ADD CONSTRAINT "_LegacyRideMigration_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
