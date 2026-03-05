-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('DRAFT', 'COMMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceFilename" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_createdById_createdAt_idx" ON "ImportJob"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
