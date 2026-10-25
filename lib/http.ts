import type { ZodError } from "zod";
import { formatValidationDetails } from "./validation";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DATABASE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

export async function readJson(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: Response }
> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: jsonError(400, "VALIDATION_ERROR", "Request body must be valid JSON."),
    };
  }
}

export function validationError(error: ZodError) {
  return jsonError(
    422,
    "VALIDATION_ERROR",
    "Check the submitted fields and try again.",
    formatValidationDetails(error.issues),
  );
}

export function internalError() {
  return jsonError(
    500,
    "INTERNAL_ERROR",
    "The request could not be completed. Please try again.",
  );
}

export function notFoundError() {
  return jsonError(404, "NOT_FOUND", "Income record not found.");
}

export function databaseUnavailable() {
  return jsonError(
    503,
    "DATABASE_UNAVAILABLE",
    "The database is unavailable. Start the local PostgreSQL service and try again.",
  );
}

export function isMissingRecordError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}
