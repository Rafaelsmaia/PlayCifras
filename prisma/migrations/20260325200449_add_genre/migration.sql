-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_songs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "genreId" TEXT,
    "key" TEXT,
    "tempo" INTEGER,
    "difficulty" TEXT,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "songs_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "songs_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_songs" ("artistId", "content", "createdAt", "difficulty", "id", "isPublic", "key", "likes", "slug", "tags", "tempo", "title", "updatedAt", "views") SELECT "artistId", "content", "createdAt", "difficulty", "id", "isPublic", "key", "likes", "slug", "tags", "tempo", "title", "updatedAt", "views" FROM "songs";
DROP TABLE "songs";
ALTER TABLE "new_songs" RENAME TO "songs";
CREATE UNIQUE INDEX "songs_slug_key" ON "songs"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");
