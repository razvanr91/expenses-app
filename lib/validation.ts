import { z } from "zod";

const validDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const receivedDateSchema = z
  .string()
  .refine(validDate, "Use a valid date in YYYY-MM-DD format.");

const amountSchema = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
    "Enter a positive amount with up to two decimal places.",
  )
  .refine((value) => {
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) return true;
    const [pounds, pence = ""] = value.split(".");
    return (
      BigInt(pounds) * BigInt(100) + BigInt(pence.padEnd(2, "0")) >
      BigInt(0)
    );
  }, "Amount must be greater than zero.")
  .transform((value) => {
    const [pounds, pence = ""] = value.split(".");
    return `${pounds}.${pence.padEnd(2, "0")}`;
  });

const sourceSchema = z
  .string()
  .trim()
  .min(1, "Enter a source.")
  .max(120, "Source must be 120 characters or fewer.");

const categorySchema = z
  .string()
  .trim()
  .min(1, "Enter a category.")
  .max(80, "Category must be 80 characters or fewer.");

const notesSchema = z
  .string()
  .trim()
  .max(1000, "Notes must be 1,000 characters or fewer.")
  .optional()
  .transform((value) => (value ? value : undefined));

export const createEntrySchema = z
  .object({
    amount: amountSchema,
    receivedDate: receivedDateSchema,
    source: sourceSchema,
    category: categorySchema,
    notes: notesSchema,
  })
  .strict();

export const updateEntrySchema = z
  .object({
    amount: amountSchema.optional(),
    receivedDate: receivedDateSchema.optional(),
    source: sourceSchema.optional(),
    category: categorySchema.optional(),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must be 1,000 characters or fewer.")
      .nullable()
      .optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one field to update.",
  });

export const entryIdSchema = z.string().uuid();

export const entryFiltersSchema = z
  .object({
    from: receivedDateSchema.optional(),
    to: receivedDateSchema.optional(),
    category: z.string().trim().max(80).optional(),
    source: z.string().trim().max(120).optional(),
  })
  .strict()
  .refine(
    ({ from, to }) => !from || !to || from <= to,
    "The start date must be on or before the end date.",
  );

export const dashboardQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM for the month.")
      .optional(),
  })
  .strict();

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

export function formatValidationDetails(
  issues: readonly {
    path: PropertyKey[];
    message: string;
  }[],
) {
  return issues.map((issue) => ({
    field: issue.path.map(String).join("."),
    message: issue.message,
  }));
}
