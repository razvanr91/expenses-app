import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { internalError, jsonError, readJson, validationError } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { createEntrySchema, entryFiltersSchema } from "../../../lib/validation";

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function serializeEntry(entry: {
  id: string;
  amount: Prisma.Decimal;
  receivedDate: Date;
  source: string;
  category: string;
  notes: string | null;
}) {
  return {
    id: entry.id,
    amount: entry.amount.toFixed(2),
    receivedDate: entry.receivedDate.toISOString().slice(0, 10),
    source: entry.source,
    category: entry.category,
    notes: entry.notes,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = entryFiltersSchema.safeParse({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    category: params.get("category") ?? undefined,
    source: params.get("source") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "One or more filters are invalid.",
      parsed.error.issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }

  const { from, to, category, source } = parsed.data;
  const receivedDate: Prisma.DateTimeFilter<"IncomeEntry"> = {};
  if (from) receivedDate.gte = toDate(from);
  if (to) receivedDate.lt = new Date(toDate(to).getTime() + 86_400_000);

  try {
    const entries = await prisma.incomeEntry.findMany({
      where: {
        ...(from || to ? { receivedDate } : {}),
        ...(category ? { category } : {}),
        ...(source ? { source: { contains: source, mode: "insensitive" } } : {}),
      },
      orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
    });

    return Response.json({ entries: entries.map(serializeEntry) });
  } catch {
    return internalError();
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body.ok) return body.response;

  const parsed = createEntrySchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const entry = await prisma.incomeEntry.create({
      data: {
        amount: new Prisma.Decimal(parsed.data.amount),
        receivedDate: toDate(parsed.data.receivedDate),
        source: parsed.data.source,
        category: parsed.data.category,
        notes: parsed.data.notes,
      },
    });
    return Response.json({ entry: serializeEntry(entry) }, { status: 201 });
  } catch {
    return internalError();
  }
}
