export type IncomeEntry = {
  id: string;
  amount: string;
  receivedDate: string;
  source: string;
  category: string;
  notes?: string | null;
};

export type CategoryTotal = {
  category: string;
  total: string;
};

export type TrendPoint = {
  month: string;
  total: string;
};

export type DashboardSummary = {
  month: string;
  total: string;
  categories: CategoryTotal[];
  trend: TrendPoint[];
};

export type EntryInput = {
  amount: string;
  receivedDate: string;
  source: string;
  category: string;
  notes?: string;
};

export type EntryFilters = {
  from?: string;
  to?: string;
  category?: string;
  source?: string;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ClientApiError extends Error {
  code?: string;
  details?: unknown;
  status: number;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ClientApiError(
      "The server could not be reached. Check that the app is running, then try again.",
      0,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiErrorPayload
    | T
    | null;

  if (!response.ok) {
    const error = (payload as ApiErrorPayload | null)?.error;
    throw new ClientApiError(
      error?.message || "Something went wrong. Please try again.",
      response.status,
      error?.code,
      error?.details,
    );
  }

  if (!payload) {
    throw new ClientApiError("The server returned an empty response.", response.status);
  }
  return payload as T;
}

export async function listEntries(filters: EntryFilters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value?.trim()) query.set(key, value.trim());
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  const result = await request<{ entries: IncomeEntry[] }>(
    `/api/entries${suffix}`,
  );
  return result.entries;
}

export async function getDashboard(month: string) {
  const query = new URLSearchParams({ month });
  return request<DashboardSummary>(`/api/dashboard?${query.toString()}`);
}

export async function getEntry(id: string) {
  const result = await request<{ entry: IncomeEntry }>(
    `/api/entries/${encodeURIComponent(id)}`,
  );
  return result.entry;
}

export async function createEntry(input: EntryInput) {
  const result = await request<{ entry: IncomeEntry }>("/api/entries", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.entry;
}

export async function updateEntry(id: string, input: EntryInput) {
  const result = await request<{ entry: IncomeEntry }>(
    `/api/entries/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
  return result.entry;
}

export function deleteEntry(id: string) {
  return request<{ deleted: true }>(
    `/api/entries/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
