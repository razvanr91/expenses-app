import { Prisma } from "@prisma/client";
import {
  internalError,
  isMissingRecordError,
  jsonError,
  notFoundError,
  readJson,
  validationError,
} from "../../../../lib/http";
import { prisma } from "../../../../lib/prisma";
import { entryIdSchema, updateEntrySchema } from "../../../../lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

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

async function parseId(context: RouteContext) {
  const { id } = await context.params;
  const parsed = entryIdSchema.safeParse(id);
  return parsed.success
    ? { id: parsed.data }
    : {
        response: jsonError(
          400,
          "VALIDATION_ERROR",
          "Income record ID must be a valid UUID.",
        ),
      };
}

export async function GET(_request: Request, context: RouteContext) {
  const result = await parseId(context);
  if ("response" in result) return result.response;

  try {
    const entry = await prisma.incomeEntry.findUnique({
      where: { id: result.id },
    });
    return entry
      ? Response.json({ entry: serializeEntry(entry) })
      : notFoundError();
  } catch {
    return internalError();
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const result = await parseId(context);
  if ("response" in result) return result.response;

  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = updateEntrySchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  const data = {
    ...(parsed.data.amount !== undefined
      ? { amount: new Prisma.Decimal(parsed.data.amount) }
      : {}),
    ...(parsed.data.receivedDate !== undefined
      ? { receivedDate: toDate(parsed.data.receivedDate) }
      : {}),
    ...(parsed.data.source !== undefined ? { source: parsed.data.source } : {}),
    ...(parsed.data.category !== undefined
      ? { category: parsed.data.category }
      : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
  };

  try {
    const entry = await prisma.incomeEntry.update({
      where: { id: result.id },
      data,
    });
    return Response.json({ entry: serializeEntry(entry) });
  } catch (error) {
    return isMissingRecordError(error) ? notFoundError() : internalError();
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const result = await parseId(context);
  if ("response" in result) return result.response;

  try {
    await prisma.incomeEntry.delete({ where: { id: result.id } });
    return Response.json({ deleted: true });
  } catch (error) {
    return isMissingRecordError(error) ? notFoundError() : internalError();
  }
}
