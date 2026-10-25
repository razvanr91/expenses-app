import { PrismaClient } from "@prisma/client";

const prismaGlobal = globalThis as typeof globalThis & {
  incomeTrackerPrisma?: PrismaClient;
};

export const prisma =
  prismaGlobal.incomeTrackerPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.incomeTrackerPrisma = prisma;
}
