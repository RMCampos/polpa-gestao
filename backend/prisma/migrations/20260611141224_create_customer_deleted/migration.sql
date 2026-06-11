-- CreateTable
CREATE TABLE "CustomerDeleted" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "personName" VARCHAR(30),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDeleted_pkey" PRIMARY KEY ("id")
);
