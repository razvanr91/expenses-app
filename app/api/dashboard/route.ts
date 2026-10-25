import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { internalError, jsonError } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { dashboardQuerySchema } from "../../../lib/validation";

function monthValue(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1));
}

export async function GET(request: NextRequest) {
  const monthParam = request.nextUrl.searchParams.get("month") ?? undefined;
  const parsed = dashboardQuerySchema.safeParse({ month: monthParam });
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Month must be in YYYY-MM format.",
      parsed.error.issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }

  const month = parsed.data.month ?? monthValue(new Date());
  const [year, monthNumber] = month.split("-").map(Number);
  const currentStart = monthStart(year, monthNumber);
  const nextStart = monthStart(year, monthNumber + 1);
  const trendStart = monthStart(year, monthNumber - 5);

  try {
    const [summary, categories, dailyTotals] = await Promise.all([
      prisma.incomeEntry.aggregate({
        where: {
          receivedDate: { gte: currentStart, lt: nextStart },
        },
        _sum: { amount: true },
      }),
      prisma.incomeEntry.groupBy({
        by: ["category"],
        where: {
          receivedDate: { gte: currentStart, lt: nextStart },
        },
        _sum: { amount: true },
      }),
      prisma.incomeEntry.groupBy({
        by: ["receivedDate"],
        where: {
          receivedDate: { gte: trendStart, lt: nextStart },
        },
        _sum: { amount: true },
      }),
    ]);

    const trendTotals = new Map<string, Prisma.Decimal>();
    for (let offset = 0; offset < 6; offset += 1) {
      trendTotals.set(
        monthValue(monthStart(year, monthNumber - 5 + offset)),
        new Prisma.Decimal(0),
      );
    }

    for (const item of dailyTotals) {
      const key = monthValue(item.receivedDate);
      const amount = item._sum.amount ?? new Prisma.Decimal(0);
      trendTotals.set(
        key,
        (trendTotals.get(key) ?? new Prisma.Decimal(0)).plus(amount),
      );
    }

    return Response.json({
      month,
      total: (summary._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      categories: categories
        .map((item) => ({
          category: item.category,
          total: (item._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        }))
        .sort((left, right) =>
          new Prisma.Decimal(right.total).comparedTo(left.total),
        ),
      trend: [...trendTotals.entries()].map(([trendMonth, total]) => ({
        month: trendMonth,
        total: total.toFixed(2),
      })),
    });
  } catch {
    return internalError();
  }
}
