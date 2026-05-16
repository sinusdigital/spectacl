-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "checkRunId" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "sentiment" DOUBLE PRECISION,
    "position" INTEGER,
    "mentioned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES "CheckRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
