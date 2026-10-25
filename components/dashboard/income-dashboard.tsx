"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClientApiError,
  createEntry,
  DashboardSummary,
  deleteEntry,
  EntryFilters,
  EntryInput,
  getDashboard,
  getEntry,
  IncomeEntry,
  listEntries,
  updateEntry,
} from "../../lib/client-api";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toPence(value: string) {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value)) return BigInt(0);
  const negative = value.startsWith("-");
  const [pounds, fraction = ""] = value.replace("-", "").split(".");
  const amount = BigInt(pounds) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return negative ? -amount : amount;
}

function money(value: string) {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value)) return "£—";
  const negative = value.startsWith("-");
  const [pounds, fraction = ""] = value.replace("-", "").split(".");
  const groupedPounds = new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(BigInt(pounds));
  return `${negative ? "−" : ""}£${groupedPounds}.${fraction.padEnd(2, "0")}`;
}

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function monthLabel(value: string, short = false) {
  const date = new Date(`${value}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  }).format(date);
}

function actionError(error: unknown) {
  return error instanceof ClientApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

type EntryFormProps = {
  entry?: IncomeEntry;
  categories: string[];
  pending: boolean;
  error: string;
  onCancel: () => void;
  onSave: (input: EntryInput) => Promise<void>;
};

function EntryForm({
  entry,
  categories,
  pending,
  error,
  onCancel,
  onSave,
}: EntryFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState(entry?.amount ?? "");
  const [receivedDate, setReceivedDate] = useState(entry?.receivedDate ?? today());
  const [source, setSource] = useState(entry?.source ?? "");
  const [category, setCategory] = useState(entry?.category ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [validation, setValidation] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAmount = amount.trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount) || toPence(normalizedAmount) <= BigInt(0)) {
      setValidation("Enter an amount greater than £0.00 with up to two decimal places.");
      return;
    }
    if (!receivedDate) {
      setValidation("Choose the date the income was received.");
      return;
    }
    if (!source.trim()) {
      setValidation("Enter the income source.");
      return;
    }
    if (!category.trim()) {
      setValidation("Enter a category.");
      return;
    }

    setValidation("");
    const [pounds, fraction = ""] = normalizedAmount.split(".");
    const canonicalAmount = `${BigInt(pounds)}.${fraction.padEnd(2, "0")}`;
    await onSave({
      amount: canonicalAmount,
      receivedDate,
      source: source.trim(),
      category: category.trim(),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="entry-dialog"
      aria-labelledby="entry-dialog-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div className="dialog-panel">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Income record</p>
            <h2 id="entry-dialog-title">{entry ? "Edit income" : "Add income"}</h2>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Close income form"
          >
            Close
          </button>
        </div>
        <p className="dialog-intro">
          Keep the amount, received date and source together for a clear record.
        </p>
        <form className="entry-form" onSubmit={submit} noValidate>
          <div className="form-grid">
            <label className="field">
              <span>Amount <span className="required-label">Required</span></span>
              <div className="amount-input-wrap">
                <span aria-hidden="true">£</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-describedby={validation ? "entry-form-error" : undefined}
                  aria-invalid={Boolean(validation)}
                  required
                />
              </div>
            </label>
            <label className="field">
              <span>Received date <span className="required-label">Required</span></span>
              <input
                type="date"
                value={receivedDate}
                onChange={(event) => setReceivedDate(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Source <span className="required-label">Required</span></span>
              <input
                type="text"
                maxLength={120}
                placeholder="e.g. Client or employer"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Category <span className="required-label">Required</span></span>
              <input
                type="text"
                maxLength={80}
                list="income-categories"
                placeholder="e.g. Freelance"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              />
              <datalist id="income-categories">
                {categories.map((name) => <option key={name} value={name} />)}
              </datalist>
            </label>
            <label className="field field-wide">
              <span>Notes <span className="optional-label">Optional</span></span>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Add a short note if it helps"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>
          {(validation || error) && (
            <p
              className="form-error"
              id="entry-form-error"
              role="alert"
            >
              {validation || error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={pending}>
              {pending ? "Saving…" : entry ? "Save changes" : "Save income"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

type TrendChartProps = { points: DashboardSummary["trend"] };

function TrendChart({ points }: TrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="chart-empty">
        <p>There isn’t enough income history to draw a trend yet.</p>
        <span>Your monthly totals will appear here as you add income.</span>
      </div>
    );
  }

  const values = points.map(({ total }) => toPence(total));
  const maximum = values.reduce((max, value) => value > max ? value : max, BigInt(0));
  const width = 620;
  const height = 178;
  const left = 10;
  const right = 610;
  const top = 16;
  const bottom = 150;
  const xStep = points.length > 1 ? (right - left) / (points.length - 1) : 0;
  const coordinates = values.map((value, index) => {
    const ratio = maximum > BigInt(0)
      ? Number(value * BigInt(10000) / maximum) / 10000
      : 0;
    return {
      x: left + xStep * index,
      y: bottom - ratio * (bottom - top),
    };
  });
  const path = coordinates
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const accessibleSummary = points
    .map((point) => `${monthLabel(point.month)}: ${money(point.total)}`)
    .join("; ");

  return (
    <div className="trend-chart">
      <div className="chart-summary">
        <span>Last {points.length} months</span>
        {points.length > 0 && (
          <span>
            Latest <strong>{money(points[points.length - 1].total)}</strong>
          </span>
        )}
      </div>
      <svg
        className="trend-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Monthly income trend. ${accessibleSummary}`}
        preserveAspectRatio="none"
      >
        {[0, 1, 2].map((line) => {
          const y = top + ((bottom - top) / 2) * line;
          return <line key={line} x1={left} y1={y} x2={right} y2={y} className="chart-gridline" />;
        })}
        {points.length > 1 && (
          <path
            d={`${path} L ${coordinates[coordinates.length - 1].x} ${bottom} L ${coordinates[0].x} ${bottom} Z`}
            className="chart-area"
          />
        )}
        <path d={path} className="chart-line" />
        {coordinates.map(({ x, y }, index) => (
          <circle
            key={`${points[index].month}-dot`}
            cx={x}
            cy={y}
            r="4"
            className="chart-dot"
          />
        ))}
      </svg>
      <div className="chart-labels" aria-hidden="true">
        {points.map((point) => (
          <span key={point.month}>{monthLabel(point.month, true)}</span>
        ))}
      </div>
    </div>
  );
}

export default function IncomeDashboard() {
  const [month, setMonth] = useState("");
  const [draftFilters, setDraftFilters] = useState<EntryFilters>({
    from: "",
    to: "",
    category: "",
    source: "",
  });
  const [filters, setFilters] = useState<EntryFilters>({});
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesError, setEntriesError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [entryDialog, setEntryDialog] = useState<IncomeEntry | null | false>(false);
  const [formPending, setFormPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");

  const loadData = useCallback(async (showLoading = true) => {
    if (!month) return;
    if (showLoading) setLoading(true);
    setEntriesError("");
    setSummaryError("");
    const [summaryResult, entriesResult] = await Promise.allSettled([
      getDashboard(month),
      listEntries(filters),
    ]);
    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      setSummaryError(actionError(summaryResult.reason));
    }
    if (entriesResult.status === "fulfilled") {
      setEntries(
        [...entriesResult.value].sort((a, b) =>
          b.receivedDate.localeCompare(a.receivedDate),
        ),
      );
    } else {
      setEntriesError(actionError(entriesResult.reason));
    }
    setLoading(false);
  }, [filters, month]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setMonth((value) => value || currentMonth()),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const categories = useMemo(() => {
    return [...new Set([
      ...(summary?.categories.map((item) => item.category) ?? []),
      ...entries.map((entry) => entry.category),
    ])].sort((a, b) => a.localeCompare(b));
  }, [entries, summary]);

  async function saveEntry(input: EntryInput) {
    setFormPending(true);
    setFormError("");
    setActionMessage("");
    setActionErrorMessage("");
    try {
      if (entryDialog) {
        await updateEntry(entryDialog.id, input);
        setActionMessage("Income record updated.");
      } else {
        await createEntry(input);
        setActionMessage("Income record added.");
      }
      setEntryDialog(false);
      await loadData(false);
    } catch (error) {
      setFormError(actionError(error));
    } finally {
      setFormPending(false);
    }
  }

  async function editEntry(id: string) {
    setActionMessage("");
    setActionErrorMessage("");
    setFormError("");
    setActionMessage("Loading income record…");
    try {
      const entry = await getEntry(id);
      setActionMessage("");
      setEntryDialog(entry);
    } catch (error) {
      setActionMessage("");
      setActionErrorMessage(actionError(error));
    }
  }

  async function removeEntry(entry: IncomeEntry) {
    const confirmed = window.confirm(
      `Delete the £${entry.amount} income from ${entry.source} on ${displayDate(entry.receivedDate)}? This cannot be undone.`,
    );
    if (!confirmed) return;
    setPendingDelete(entry.id);
    setActionMessage("");
    setActionErrorMessage("");
    try {
      await deleteEntry(entry.id);
      setActionMessage("Income record deleted.");
      await loadData(false);
    } catch (error) {
      setActionErrorMessage(actionError(error));
    } finally {
      setPendingDelete(null);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ ...draftFilters });
  }

  function clearFilters() {
    setDraftFilters({ from: "", to: "", category: "", source: "" });
    setFilters({});
  }

  const categoryTotal = summary?.categories.reduce(
    (total, item) => total + toPence(item.total),
    BigInt(0),
  ) ?? BigInt(0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#overview" aria-label="Fieldnote income, dashboard">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span className="brand-name">fieldnote<span>income</span></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-link nav-link-active" href="#overview" aria-current="page">Overview</a>
          <a className="nav-link" href="#activity">Income</a>
          <a className="nav-link" href="#insights">Reports</a>
        </nav>
        <button
          className="button button-primary header-action"
          onClick={() => {
            setFormError("");
            setEntryDialog(null);
          }}
          type="button"
        >
          Add income <span aria-hidden="true">+</span>
        </button>
      </header>

      <main className="dashboard-main" id="overview">
        <div className="page-intro">
          <div>
            <p className="eyebrow">Your income, in perspective</p>
            <h1>A clearer view of what you earn.</h1>
            <p className="page-subtitle">A calm place to keep track of what’s coming in.</p>
          </div>
          <label className="month-picker">
            <span>Month overview</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value || currentMonth())}
              aria-label="Select month for overview"
            />
          </label>
        </div>

        {(actionMessage || actionErrorMessage) && (
          <div
            className={`status-banner ${actionErrorMessage ? "status-banner-error" : ""}`}
            role={actionErrorMessage ? "alert" : "status"}
          >
            <span>{actionErrorMessage || actionMessage}</span>
            {actionErrorMessage && (
              <button type="button" className="text-button" onClick={() => void loadData()}>
                Retry
              </button>
            )}
            <button
              type="button"
              className="banner-dismiss"
              aria-label="Dismiss message"
              onClick={() => {
                setActionMessage("");
                setActionErrorMessage("");
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="summary-grid" aria-label="Income summary">
          <article className="card total-card">
            <div className="card-heading">
              <span className="card-label">Total income</span>
              <span className="period-label">{month ? monthLabel(month) : "This month"}</span>
            </div>
            {summaryError ? (
              <div className="inline-error" role="alert">
                <span>{summaryError}</span>
                <button type="button" className="text-button" onClick={() => void loadData()}>
                  Retry
                </button>
              </div>
            ) : (
              <>
                <p className="total-amount" aria-live="polite">
                  {loading && !summary
                    ? <span className="skeleton-value">Loading total</span>
                    : money(summary?.total ?? "0.00")}
                </p>
                <p className="card-footnote">
                  {loading && !summary
                    ? "Getting your latest figures…"
                    : summary && toPence(summary.total) > BigInt(0)
                      ? "Received this month"
                      : "No income recorded for this month yet"}
                </p>
              </>
            )}
            <span className="total-accent" aria-hidden="true" />
          </article>

          <article className="card category-card" id="insights">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">At a glance</p>
                <h2>By category</h2>
              </div>
              {summary && (
                <span className="small-muted">
                  {summary.categories.length} {summary.categories.length === 1 ? "category" : "categories"}
                </span>
              )}
            </div>
            {summaryError ? (
              <div className="empty-inline" role="status">Category totals are unavailable.</div>
            ) : loading && !summary ? (
              <div className="loading-lines" role="status" aria-label="Loading categories">
                <span /><span /><span />
              </div>
            ) : !summary?.categories.length ? (
              <div className="empty-inline">
                <p>No categories to show just yet.</p>
                <span>Add an income record to see where it comes from.</span>
              </div>
            ) : (
              <ul className="category-list">
                {summary.categories.map((item, index) => {
                  const amount = toPence(item.total);
                  const proportion = categoryTotal > BigInt(0)
                    ? Number(amount * BigInt(10000) / categoryTotal) / 100
                    : 0;
                  return (
                    <li className="category-item" key={item.category}>
                      <div className="category-topline">
                        <span className="category-name">
                          <span className={`category-dot category-dot-${index % 4}`} aria-hidden="true" />
                          {item.category}
                        </span>
                        <strong>{money(item.total)}</strong>
                      </div>
                      <div
                        className="category-track"
                        role="img"
                        aria-label={`${item.category}: ${proportion.toFixed(1)} percent of income`}
                      >
                        <span
                          className={`category-fill category-fill-${index % 4}`}
                          style={{ width: `${proportion}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="card trend-card">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">The bigger picture</p>
                <h2>Monthly trend</h2>
              </div>
              <span className="small-muted">Income over time</span>
            </div>
            {summaryError ? (
              <div className="empty-inline" role="status">The income trend is unavailable.</div>
            ) : loading && !summary ? (
              <div className="chart-loading" role="status">Loading your trend…</div>
            ) : (
              <TrendChart points={summary?.trend ?? []} />
            )}
          </article>
        </section>

        <section className="activity-section" id="activity" aria-labelledby="activity-title">
          <div className="section-heading activity-heading">
            <div>
              <p className="eyebrow">The details</p>
              <h2 id="activity-title">Income activity</h2>
              <p className="section-description">Your records, newest first.</p>
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setFormError("");
                setEntryDialog(null);
              }}
            >
              Add income <span aria-hidden="true">+</span>
            </button>
          </div>

          <form className="filters" onSubmit={submitFilters} aria-label="Filter income records">
            <div className="filter-field">
              <label htmlFor="filter-from">Received from</label>
              <input
                id="filter-from"
                type="date"
                value={draftFilters.from ?? ""}
                onChange={(event) => setDraftFilters({ ...draftFilters, from: event.target.value })}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="filter-to">Received to</label>
              <input
                id="filter-to"
                type="date"
                value={draftFilters.to ?? ""}
                onChange={(event) => setDraftFilters({ ...draftFilters, to: event.target.value })}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="filter-category">Category</label>
              <select
                id="filter-category"
                value={draftFilters.category ?? ""}
                onChange={(event) => setDraftFilters({ ...draftFilters, category: event.target.value })}
              >
                <option value="">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="filter-field source-filter">
              <label htmlFor="filter-source">Source</label>
              <input
                id="filter-source"
                type="search"
                maxLength={120}
                placeholder="Search source"
                value={draftFilters.source ?? ""}
                onChange={(event) => setDraftFilters({ ...draftFilters, source: event.target.value })}
              />
            </div>
            <div className="filter-actions">
              <button className="button button-primary filter-apply" type="submit">Apply filters</button>
              <button className="text-button clear-filters" type="button" onClick={clearFilters}>Clear</button>
            </div>
          </form>

          {entriesError && (
            <div className="error-panel" role="alert">
              <div>
                <strong>Income records couldn’t be loaded.</strong>
                <p>{entriesError}</p>
              </div>
              <button type="button" className="button button-secondary" onClick={() => void loadData()}>
                Try again
              </button>
            </div>
          )}

          <div className="table-wrap">
            <table className="income-table">
              <caption className="visually-hidden">Income records matching your filters</caption>
              <thead>
                <tr>
                  <th scope="col">Received</th>
                  <th scope="col">Source</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="amount-cell">Amount</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {loading && entries.length === 0 && !entriesError ? (
                  <tr>
                    <td colSpan={5} className="table-message" role="status">Loading income records…</td>
                  </tr>
                ) : !entriesError && entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-message">
                      <div className="empty-activity">
                        <span className="empty-mark" aria-hidden="true">+</span>
                        <strong>{Object.values(filters).some(Boolean) ? "No records match these filters." : "Your income story starts here."}</strong>
                        <span>
                          {Object.values(filters).some(Boolean)
                            ? "Try a different date range, category or source."
                            : "When you add income, your recent records will appear here."}
                        </span>
                        {!Object.values(filters).some(Boolean) && (
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => {
                              setFormError("");
                              setEntryDialog(null);
                            }}
                          >
                            Add your first income record
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="date-cell">{displayDate(entry.receivedDate)}</td>
                    <td>
                      <span className="source-name">{entry.source}</span>
                      {entry.notes && <span className="entry-note">{entry.notes}</span>}
                    </td>
                    <td><span className="category-pill">{entry.category}</span></td>
                    <td className="amount-cell">{money(entry.amount)}</td>
                    <td className="row-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => void editEntry(entry.id)}
                        disabled={pendingDelete === entry.id}
                      >
                        Edit<span className="visually-hidden"> {entry.source}</span>
                      </button>
                      <button
                        className="text-button delete-button"
                        type="button"
                        onClick={() => void removeEntry(entry)}
                        disabled={pendingDelete === entry.id}
                      >
                        {pendingDelete === entry.id ? "Deleting…" : "Delete"}
                        <span className="visually-hidden"> {entry.source}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="list-footnote" aria-live="polite">
            {loading ? "Updating records…" : !entriesError && entries.length > 0
              ? `${entries.length} ${entries.length === 1 ? "record" : "records"}`
              : ""}
          </p>
        </section>

        <footer className="page-footer">
          <span>Made for a more mindful view of money.</span>
          <span>GBP · Private to this device</span>
        </footer>
      </main>

      {entryDialog !== false && (
        <EntryForm
          entry={entryDialog || undefined}
          categories={categories}
          pending={formPending}
          error={formError}
          onCancel={() => {
            if (!formPending) {
              setEntryDialog(false);
              setFormError("");
            }
          }}
          onSave={saveEntry}
        />
      )}
    </div>
  );
}
