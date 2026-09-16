"use client";

/**
 * ============================================================================
 * CUSTOMERS DIRECTORY (REACT CLIENT COMPONENT)
 * ============================================================================
 * 
 * HOW THE FRONTEND DISPLAYS AND MANAGES CUSTOMERS:
 * 1. Financial Overview Cards:
 *    Displays aggregate metrics calculated on the server:
 *    - Total Net Receivable (Total credit given minus total paid across all customers).
 *    - Total Customers count.
 *    - Number of customers who currently owe money (in debt).
 * 2. Instant Search & Pagination:
 *    The search bar updates URL search parameters via `router.push()`, triggering
 *    Next.js server-side re-fetching of filtered customer cards.
 * 3. Customer Creation Workflow:
 *    Toggling `showAddModal` opens the `AddCustomerModal`. Submitting triggers
 *    the `createCustomer()` server action which creates both the Customer and
 *    their Ledger in PostgreSQL, then automatically refreshes the directory.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { formatINR, formatDate } from "@/lib/format";
import type { CurrentUser, CustomersResult } from "@/lib/types";

interface CustomersDirectoryProps {
  initialData: CustomersResult;
  search: string;
  page: number;
  user: CurrentUser;
}

export function CustomersDirectory({
  initialData,
  search,
  page,
  user,
}: CustomersDirectoryProps) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(search);

  const { customers, pagination, aggregate } = initialData;
  const totalPages = pagination.totalPages;

  const goToPage = (nextPage: number, nextSearch: string = search) => {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(`/customers${qs ? `?${qs}` : ""}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = searchQuery.trim();
    const params = new URLSearchParams();
    if (value) params.set("search", value);
    const qs = params.toString();
    router.push(`/customers${qs ? `?${qs}` : ""}`);
  };

  const pageNumbers = buildPageNumbers(totalPages, page);

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans antialiased text-slate-800">
      <AppHeader user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 print:py-0">
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Accounts
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {pagination.total}{" "}
              {pagination.total === 1 ? "customer" : "customers"} · manage balances
              and ledgers
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Add Customer
          </button>
        </div>

        {/* Aggregate cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Credit Given"
            value={formatINR(aggregate.totalCredit)}
            tone="rose"
            icon={<ArrowDownLeft className="w-4 h-4" />}
          />
          <StatCard
            label="Total Payments Received"
            value={formatINR(aggregate.totalPaid)}
            tone="emerald"
            icon={<ArrowUpRight className="w-4 h-4" />}
          />
          <StatCard
            label="Net Outstanding"
            value={formatINR(aggregate.netOutstanding)}
            tone="rose"
            icon={<Wallet className="w-4 h-4" />}
            emphasize
          />
        </div>

        {/* Directory */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">All Customers</h2>

            <form onSubmit={handleSearch} className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 w-full sm:w-64"
              />
            </form>
          </div>

          {customers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              {search ? (
                <>
                  No customers match &quot;{search}&quot;.
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      goToPage(1, "");
                    }}
                    className="block mx-auto mt-2 text-slate-600 font-semibold hover:underline"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                "No customers yet. Click Add Customer to create your first ledger."
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customers.map((customer) => {
                const balance = customer.balance;
                return (
                  <Link
                    key={customer.id}
                    href={`/customers/${customer.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition group gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {customer.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {customer.phone ? (
                            <span className="font-mono">{customer.phone}</span>
                          ) : (
                            "No phone on file"
                          )}
                          <span className="mx-1.5 text-slate-300">·</span>
                          {customer.transactionCount}{" "}
                          {customer.transactionCount === 1 ? "transaction" : "transactions"}
                          {customer.lastActivityAt && (
                            <>
                              <span className="mx-1.5 text-slate-300">·</span>
                              Active {formatDate(customer.lastActivityAt)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                          Balance
                        </p>
                        <p
                          className={`text-sm font-bold tabular-nums mt-0.5 ${
                            balance > 0
                              ? "text-rose-600"
                              : balance < 0
                              ? "text-emerald-600"
                              : "text-slate-600"
                          }`}
                        >
                          {formatINR(balance)}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:border-slate-300 transition">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && customers.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {(page - 1) * pagination.pageSize + 1}–
                  {Math.min(page * pagination.pageSize, pagination.total)}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{pagination.total}</span> customers
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
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
                      onClick={() => goToPage(item)}
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
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* funnel hint */}
        {search && (
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl">
            <ChevronsUpDown className="w-3.5 h-3.5" />
            Filtered by &quot;{search}&quot;
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                goToPage(1, "");
              }}
              className="font-semibold text-slate-800 hover:underline"
            >
              Reset
            </button>
          </div>
        )}
      </main>

      {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
  emphasize = false,
}: {
  label: string;
  value: string;
  tone: "rose" | "emerald";
  icon: React.ReactNode;
  emphasize?: boolean;
}) {
  const toneStyles =
    tone === "rose"
      ? { chip: "bg-rose-50 text-rose-600", value: "text-rose-600" }
      : { chip: "bg-emerald-50 text-emerald-600", value: "text-emerald-600" };

  return (
    <div
      className={`bg-white p-5 rounded-2xl border shadow-sm ${
        emphasize ? "border-rose-100 bg-gradient-to-br from-white to-rose-50/20" : "border-slate-200/80"
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