-- CreateTable
CREATE TABLE "chord_dictionary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instrument" TEXT NOT NULL DEFAULT 'guitar',
    "frets" TEXT NOT NULL,
    "fingering" TEXT NOT NULL,
    "barre" BOOLEAN NOT NULL DEFAULT false,
    "barreFret" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chord_dictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chord_dictionary_name_instrument_key" ON "chord_dictionary"("name", "instrument");
