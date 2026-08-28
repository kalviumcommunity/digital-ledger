'use client';

import React, { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import type { DashboardTransaction, FilterState, PaginationMeta } from '@/app/dashboard/types';
import { formatDateGroup } from '@/app/dashboard/mockData';
import TransactionRow from './TransactionRow';
import Pagination from './Pagination';

interface TransactionHistoryProps {
  transactions: DashboardTransaction[];
  initialSearch?: string;
  onAddTransaction: () => void;
  onEditTransaction: (tx: DashboardTransaction) => void;
  onDeleteTransaction: (tx: DashboardTransaction) => void;
}

const PAGE_SIZE = 10;

export default function TransactionHistory({
  transactions,
  initialSearch = '',
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionHistoryProps) {
  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<FilterState>({ type: 'ALL' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        !search ||
        tx.customerName.toLowerCase().includes(search.toLowerCase()) ||
        tx.customerPhone.includes(search) ||
        (tx.description ?? '').toLowerCase().includes(search.toLowerCase());

      const matchType =
        filter.type === 'ALL' || tx.type === filter.type;

      return matchSearch && matchType;
    });
  }, [transactions, search, filter]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const paginationMeta: PaginationMeta = {
    page: safePage,
    limit: PAGE_SIZE,
    total: filtered.length,
    totalPages,
  };

  // ── Date grouping ─────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: { date: string; items: DashboardTransaction[] }[] = [];
    paginated.forEach((tx) => {
      const dateLabel = formatDateGroup(tx.createdAt);
      const existing = groups.find((g) => g.date === dateLabel);
      if (existing) {
        existing.items.push(tx);
      } else {
        groups.push({ date: dateLabel, items: [tx] });
      }
    });
    return groups;
  }, [paginated]);

  const handleInvoice = (tx: DashboardTransaction) => {
    alert(`Downloading invoice for Transaction #${tx.id} — ${tx.customerName}`);
  };

  const handleAuditTrail = (tx: DashboardTransaction) => {
    alert(`Audit Trail for Transaction #${tx.id}\n(Person 3 owns the full Audit Trail — available on Customer Ledger page)`);
  };

  return (
    <div className="border border-gray-400 rounded-2xl bg-white p-4 flex flex-col h-full overflow-hidden shadow-sm">
      {/* ── Heading + Controls ──────────────────────────────────────────────── */}
      <div className="pb-3 flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Transaction History</h2>
          <button
            id="add-transaction-btn"
            type="button"
            onClick={onAddTransaction}
            className="flex items-center gap-1.5 h-8 px-3 border border-gray-400 rounded-md text-xs font-semibold text-gray-800 bg-white hover:bg-gray-50 transition"
          >
            <Plus size={13} />
            Add Transaction
          </button>
        </div>

        {/* Search + Filter By row */}
        <div className="flex items-end gap-3 ml-auto">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="transaction-search"
              type="text"
              placeholder="Name or Phone Number"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-7 pr-7 h-8 w-56 border border-gray-400 rounded-md text-xs text-gray-800 placeholder-gray-400 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Filter By */}
          <div className="relative">
            <p className="text-[10px] font-bold text-gray-700 mb-1">Filter By:</p>
            <button
              id="transaction-filter-btn"
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-400 rounded-md text-xs font-semibold text-gray-800 bg-white hover:bg-gray-50 transition"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {filter.type === 'ALL'
                ? 'Select'
                : filter.type === 'PAYMENT_RECEIVED'
                ? 'Payment Received'
                : 'Credit Given'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-[54px] z-30 bg-white border border-gray-300 rounded-lg shadow-lg py-1 w-44">
                {(['ALL', 'PAYMENT_RECEIVED', 'CREDIT_GIVEN'] as const).map((t) => (
                  <button
                    key={t}
                    id={`filter-type-${t}`}
                    type="button"
                    onClick={() => {
                      setFilter({ type: t });
                      setPage(1);
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition ${
                      filter.type === t
                        ? 'bg-gray-100 font-bold text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'ALL' ? 'All Transactions' : t === 'PAYMENT_RECEIVED' ? 'Payment Received' : 'Credit Given'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Transaction list — scrollable ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 -mr-1">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm text-gray-400 font-medium">No transactions found</p>
            {search && (
              <p className="text-xs text-gray-300 mt-1">No results for &quot;{search}&quot;</p>
            )}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Date group header */}
              <div className="border border-gray-400 rounded-xl px-4 py-2 bg-white font-extrabold text-sm text-gray-900 shadow-xs">
                {group.date}
              </div>

              {/* Transaction rows */}
              {group.items.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  onEdit={onEditTransaction}
                  onDelete={onDeleteTransaction}
                  onInvoice={handleInvoice}
                  onAuditTrail={handleAuditTrail}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {filtered.length > PAGE_SIZE && (
        <div className="pt-2 border-t border-gray-100">
          <Pagination meta={paginationMeta} onPageChange={(p) => setPage(p)} />
        </div>
      )}
    </div>
  );
}
