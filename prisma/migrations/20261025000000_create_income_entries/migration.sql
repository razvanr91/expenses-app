CREATE TABLE "income_entries" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receivedDate" DATE NOT NULL,
    "source" VARCHAR(120) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "income_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "income_entries_amount_positive" CHECK ("amount" > 0)
);

CREATE INDEX "income_entries_receivedDate_idx" ON "income_entries"("receivedDate");

CREATE INDEX "income_entries_category_receivedDate_idx" ON "income_entries"("category", "receivedDate");

CREATE INDEX "income_entries_source_receivedDate_idx" ON "income_entries"("source", "receivedDate");
