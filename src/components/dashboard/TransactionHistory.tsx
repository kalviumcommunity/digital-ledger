'use client';

import React, { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import type { DashboardTransaction, PaginationMeta } from '@/app/dashboard/types';
import { formatDateGroup } from '@/app/dashboard/mockData';
import { downloadTransactionInvoice } from '@/lib/api/invoiceClient';
import TransactionRow from './TransactionRow';
import Pagination from './Pagination';

interface TransactionHistoryProps {
  transactions: DashboardTransaction[];
  initialSearch?: string;
  filterType?: 'ALL' | 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN';
  onFilterChange?: (t: 'ALL' | 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN') => void;
  onSearchChange?: (s: string) => void;
  onClearFilters?: () => void;
  onPageChange?: (p: number) => void;
  meta?: PaginationMeta;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAddTransaction: () => void;
  onEditTransaction: (tx: DashboardTransaction) => void;
  onDeleteTransaction: (tx: DashboardTransaction) => void;
}

const PAGE_SIZE = 10;

export default function TransactionHistory({
  transactions,
  initialSearch = '',
  filterType: controlledFilterType,
  onFilterChange,
  onSearchChange,
  onClearFilters,
  onPageChange: controlledOnPageChange,
  meta: controlledMeta,
  isLoading = false,
  error = null,
  onRetry,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionHistoryProps) {
  const [internalSearch, setInternalSearch] = useState(initialSearch);
  const [internalFilterType, setInternalFilterType] = useState<'ALL' | 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN'>('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [internalPage, setInternalPage] = useState(1);
  const [downloadingTxId, setDownloadingTxId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const search = onSearchChange ? initialSearch : internalSearch;
  const activeFilterType = controlledFilterType !== undefined ? controlledFilterType : internalFilterType;

  const handleSearchInput = (val: string) => {
    setInternalSearch(val);
    onSearchChange?.(val);
  };

  const handleFilterSelect = (type: 'ALL' | 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN') => {
    setInternalFilterType(type);
    onFilterChange?.(type);
    setFilterOpen(false);
  };

  const handlePageSelect = (p: number) => {
    setInternalPage(p);
    controlledOnPageChange?.(p);
  };

  // ── Date grouping ─────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: { date: string; items: DashboardTransaction[] }[] = [];
    transactions.forEach((tx) => {
      const dateLabel = formatDateGroup(tx.createdAt);
      const existing = groups.find((g) => g.date === dateLabel);
      if (existing) {
        existing.items.push(tx);
      } else {
        groups.push({ date: dateLabel, items: [tx] });
      }
    });
    return groups;
  }, [transactions]);

  const fallbackPaginationMeta: PaginationMeta = {
    page: internalPage,
    limit: PAGE_SIZE,
    total: transactions.length,
    totalPages: Math.max(1, Math.ceil(transactions.length / PAGE_SIZE)),
  };

  const paginationMeta = controlledMeta || fallbackPaginationMeta;

  const handleInvoice = async (tx: DashboardTransaction) => {
    try {
      setInvoiceError(null);
      setDownloadingTxId(tx.id);
      await downloadTransactionInvoice(tx.id, tx.customerName);
    } catch (err: unknown) {
      console.error('Invoice download failed:', err);
      setInvoiceError(err instanceof Error ? err.message : 'Failed to download invoice');
    } finally {
      setDownloadingTxId(null);
    }
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
              onChange={(e) => handleSearchInput(e.target.value)}
              className="pl-7 pr-7 h-8 w-56 border border-gray-400 rounded-md text-xs text-gray-800 placeholder-gray-400 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchInput('')}
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
              {activeFilterType === 'ALL'
                ? 'Select'
                : activeFilterType === 'PAYMENT_RECEIVED'
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
                    onClick={() => handleFilterSelect(t)}
                    className={`w-full text-left px-3 py-2 text-xs transition ${
                      activeFilterType === t
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

      {/* ── Invoice Error Banner ────────────────────────────────────────── */}
      {invoiceError && (
        <div className="mb-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-medium">{invoiceError}</span>
          </div>
          <button
            type="button"
            onClick={() => setInvoiceError(null)}
            className="text-red-500 hover:text-red-700 font-bold ml-2 px-1 text-sm leading-none"
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Transaction list — scrollable ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 -mr-1">
        {isLoading ? (
          <div className="space-y-3 p-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-2xl p-4 bg-gray-50/70 animate-pulse flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/5" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-20 shrink-0" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">Failed to load transactions</p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                Try Again
              </button>
            )}
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">No transactions found</p>
            {search || activeFilterType !== 'ALL' ? (
              <>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  No records match {search ? `"${search}"` : ''}
                  {search && activeFilterType !== 'ALL' ? ' with ' : ''}
                  {activeFilterType !== 'ALL' ? (activeFilterType === 'PAYMENT_RECEIVED' ? 'Payment Received' : 'Credit Given') : ''}.
                </p>
                <button
                  id="clear-filters-btn"
                  type="button"
                  onClick={() => {
                    handleSearchInput('');
                    handleFilterSelect('ALL');
                    onClearFilters?.();
                  }}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                >
                  Clear search & filters
                </button>
              </>
            ) : (
              <p className="text-xs text-gray-400 mt-1">No transactions recorded yet.</p>
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
                  isDownloadingInvoice={downloadingTxId === tx.id}
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
      {(paginationMeta.totalPages > 1 || paginationMeta.total > paginationMeta.limit) && (
        <div className="pt-2 border-t border-gray-100">
          <Pagination meta={paginationMeta} onPageChange={handlePageSelect} />
        </div>
      )}
    </div>
  );
}
