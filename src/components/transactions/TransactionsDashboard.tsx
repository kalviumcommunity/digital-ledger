"use client";

/**
 * ============================================================================
 * TRANSACTIONS DASHBOARD (REACT CLIENT COMPONENT)
 * ============================================================================
 * 
 * HOW THE FRONTEND & BACKEND WORK TOGETHER HERE:
 * 1. Server-Side Pre-rendering & Hydration:
 *    The parent page (`app/transactions/page.tsx`) is a React Server Component.
 *    It queries Prisma on the server and passes `initialData` (transactions,
 *    pagination counts, aggregate financial metrics) into this client component.
 *    This gives users instantaneous initial page loads with zero layout shifts.
 * 2. URL-Driven State Synchronization:
 *    Filter states (search text, credit/debit toggles, date ranges, page numbers)
 *    are synchronized directly into the browser URL query string via `router.push()`.
 *    This allows users to bookmark searches, refresh the page, or use the browser's
 *    back/forward buttons without losing their active filter criteria.
 * 3. Client-Side Export:
 *    Clicking "Export CSV" calls the server action `exportTransactionsCsv()`,
 *    which generates standard RFC-compliant CSV text on the server and streams
 *    it to the browser for instant client-side file saving.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Layers,
  Wallet,
  X,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { exportTransactionsCsv } from "@/app/actions/transactions";
import { formatDateTime, formatINR } from "@/lib/format";
import type { CurrentUser, GlobalTransactionsResult } from "@/lib/types";

export interface DashboardFilters {
  search: string;
  type: "ALL" | "CREDIT" | "DEBIT";
  dateFrom: string;
  dateTo: string;
}

interface TransactionsDashboardProps {
  initialData: GlobalTransactionsResult;
  filters: DashboardFilters;
  page: number;
  user: CurrentUser;
}

export function TransactionsDashboard({
  initialData,
  filters,
  page,
  user,
}: TransactionsDashboardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(filters.search);
  const [typeFilter, setTypeFilter] = useState(filters.type);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { transactions, pagination, analytics } = initialData;

  const buildQuery = (
    nextPage: number,
    overrides: Partial<DashboardFilters> = {}
  ) => {
    const params = new URLSearchParams();
    const s = overrides.search ?? searchQuery;
    const t = overrides.type ?? typeFilter;
    const df = overrides.dateFrom ?? dateFrom;
    const dt = overrides.dateTo ?? dateTo;
    if (s.trim()) params.set("search", s.trim());
    if (t !== "ALL") params.set("type", t);
    if (df) params.set("dateFrom", df);
    if (dt) params.set("dateTo", dt);
    if (nextPage > 1) params.set("page", String(nextPage));
    return params;
  };

  const navigate = (nextPage: number, overrides?: Partial<DashboardFilters>) => {
    const qs = buildQuery(nextPage, overrides).toString();
    router.push(`/transactions${qs ? `?${qs}` : ""}`);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(1);
  };

  const handleClear = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setDateFrom("");
    setDateTo("");
    navigate(1, { search: "", type: "ALL", dateFrom: "", dateTo: "" });
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    const result = await exportTransactionsCsv({
      search: searchQuery || undefined,
      type: typeFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setExporting(false);

    if (!result.success) {
      setExportError(result.error);
      return;
    }

    const blob = new Blob([result.data.csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    typeFilter !== "ALL" ||
    dateFrom !== "" ||
    dateTo !== "";

  const pageNumbers = buildPageNumbers(pagination.totalPages, page);

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans antialiased text-slate-800">
      <AppHeader user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Transactions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {pagination.total} record{pagination.total === 1 ? "" : "s"} across
              all customers · credit, payments &amp; running totals
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || transactions.length === 0}
              className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-white hover:border-slate-400 bg-white/60 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 active:scale-95"
            >
              {exporting ? (
                <Download className="w-4 h-4 animate-bounce" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export CSV
            </button>
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
            >
              <ArrowDownLeft className="w-4 h-4" />
              New Entry
            </Link>
          </div>
        </div>

        {exportError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {exportError}
          </div>
        )}

        {/* Analytics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AnalyticsCard
            label="Total Business Credit"
            value={formatINR(analytics.totalBusinessCredit)}
            tone="rose"
            icon={<ArrowDownLeft className="w-4 h-4" />}
            hint="Money loaned to customers"
          />
          <AnalyticsCard
            label="Payments Received"
            value={formatINR(analytics.totalBusinessPaid)}
            tone="emerald"
            icon={<ArrowUpRight className="w-4 h-4" />}
            hint="Money collected back"
          />
          <AnalyticsCard
            label="Net Outstanding"
            value={formatINR(analytics.netOutstanding)}
            tone="rose"
            icon={<Wallet className="w-4 h-4" />}
            hint={`Across ${analytics.transactionCount} records`}
            emphasize
          />
        </div>

        {/* Filters */}
        <form
          onSubmit={handleApplyFilters}
          className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Filters
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="lg:col-span-2">
              <label
                htmlFor="tx-search"
                className="block text-[11px] font-semibold text-slate-500 mb-1"
              >
                Search customer or note
              </label>
              <input
                id="tx-search"
                type="text"
                placeholder="e.g. Aarav"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="tx-type"
                className="block text-[11px] font-semibold text-slate-500 mb-1"
              >
                Type
              </label>
              <select
                id="tx-type"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as "ALL" | "CREDIT" | "DEBIT")
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              >
                <option value="ALL">All types</option>
                <option value="CREDIT">Credit given</option>
                <option value="DEBIT">Payment received</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="tx-from"
                className="block text-[11px] font-semibold text-slate-500 mb-1"
              >
                From
              </label>
              <input
                id="tx-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="tx-to"
                className="block text-[11px] font-semibold text-slate-500 mb-1"
              >
                To
              </label>
              <input
                id="tx-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition active:scale-95"
            >
              Apply filters
            </button>
          </div>
        </form>

        {/* Transaction feed */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Live Feed</h2>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <Layers className="w-3.5 h-3.5" />
              Every transaction, newest first
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-300" />
              <p>{hasActiveFilters ? "No transactions match these filters." : "No transactions yet."}</p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-700 font-semibold hover:underline block mx-auto"
                >
                  Clear filters
                </button>
              ) : (
                <p className="text-xs text-slate-400">
                  Open a customer account to record your first entry.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === "CREDIT"
                          ? "bg-rose-50 text-rose-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {tx.type === "CREDIT" ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/customers/${tx.customerId}`}
                          className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition"
                        >
                          {tx.customerName}
                        </Link>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                            tx.type === "CREDIT"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {tx.type === "CREDIT" ? "Credit" : "Payment"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[420px]">
                        {tx.note || "No note"} · {tx.method} ·{" "}
                        {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      tx.type === "CREDIT" ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {tx.type === "CREDIT" ? "+" : "−"}
                    {formatINR(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && transactions.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-700">{page}</span> of{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.totalPages}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => navigate(page - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pageNumbers.map((item, index) =>
                  item === "..." ? (
                    <span key={`dots-${index}`} className="px-1 text-xs text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => navigate(item)}
                      className={`h-7 min-w-[28px] px-2 flex items-center justify-center rounded-lg text-xs font-medium transition ${
                        item === page
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => navigate(page + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  tone,
  icon,
  hint,
  emphasize = false,
}: {
  label: string;
  value: string;
  tone: "rose" | "emerald";
  icon: React.ReactNode;
  hint: string;
  emphasize?: boolean;
}) {
  const toneStyles =
    tone === "rose"
      ? { chip: "bg-rose-50 text-rose-600", value: "text-rose-600" }
      : { chip: "bg-emerald-50 text-emerald-600", value: "text-emerald-600" };

  return (
    <div
      className={`bg-white p-5 rounded-2xl border shadow-sm ${
        emphasize
          ? "border-rose-100 bg-gradient-to-br from-white to-rose-50/20"
          : "border-slate-200/80"
      }`}
    >
      <div className="flex items-center justify-between text-slate-400 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className={`w-7 h-7 rounded-lg ${toneStyles.chip} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold tracking-tight tabular-nums ${toneStyles.value}`}>
        {value}
      </p>
      <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

function buildPageNumbers(totalPages: number, current: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < totalPages - 2) pages.push("...");
  pages.push(totalPages);
  return pages;
}