'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import BalanceCard from '@/components/dashboard/BalanceCard';
import CreditGivenCard from '@/components/dashboard/CreditGivenCard';
import CustomerPanel from '@/components/dashboard/CustomerPanel';
import TransactionHistory from '@/components/dashboard/TransactionHistory';
import AddTransactionModal from '@/components/dashboard/AddTransactionModal';
import EditTransactionModal from '@/components/dashboard/EditTransactionModal';
import DeleteConfirmModal from '@/components/dashboard/DeleteConfirmModal';
import {
  MOCK_CUSTOMERS,
  MOCK_TRANSACTIONS,
} from '@/app/dashboard/mockData';
import { fetchCustomersFromApi } from '@/lib/api/customerClient';
import { fetchTransactionsFromApi, fetchTransactionSummaryFromApi } from '@/lib/api/transactionClient';
import { calculateFinancialSummary } from '@/lib/utils/financial';
import type {
  DashboardCustomer,
  DashboardTransaction,
  AddTransactionPayload,
  PaginationMeta,
} from '@/app/dashboard/types';

export default function DashboardPage() {
  const [transactions, setTransactions] =
    useState<DashboardTransaction[]>(MOCK_TRANSACTIONS);
  const [customers, setCustomers] =
    useState<DashboardCustomer[]>(MOCK_CUSTOMERS);
  const [headerSearch, setHeaderSearch] = useState('');
  const [headerFilter, setHeaderFilter] = useState<'ALL' | 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: MOCK_TRANSACTIONS.length,
    totalPages: Math.ceil(MOCK_TRANSACTIONS.length / 10),
  });

  const [isLoadingTxns, setIsLoadingTxns] = useState(true);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [serverSummary, setServerSummary] = useState<{ balance: number; creditGiven: number } | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<DashboardTransaction | null>(null);

  // Load summary from API
  const loadSummary = useCallback(() => {
    fetchTransactionSummaryFromApi()
      .then((data) => {
        setServerSummary({ balance: data.balance, creditGiven: data.creditGiven });
      })
      .catch(() => {
        // Fallback to client-side precision calculation
      });
  }, []);

  // Load real transactions with backend pagination, search, and filtering
  const loadTransactions = useCallback(
    (page: number, search: string, filter: 'ALL' | 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN', signal?: AbortSignal) => {
      setIsLoadingTxns(true);
      setTxnError(null);

      fetchTransactionsFromApi({
        page,
        limit: 10,
        search: search.trim() || undefined,
        type: filter,
        sortBy: 'date',
        sortOrder: 'desc',
        signal,
      })
        .then((res) => {
          setTransactions(res.transactions);
          setPaginationMeta(res.meta);
          setIsLoadingTxns(false);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') {
            return; // Ignore aborted requests
          }
          setTxnError(err instanceof Error ? err.message : 'Failed to fetch transactions from server');
          setIsLoadingTxns(false);
        });
    },
    []
  );

  // Fetch customers once on mount
  useEffect(() => {
    let ignore = false;
    fetchCustomersFromApi()
      .then((data) => {
        if (!ignore && data.length > 0) {
          setCustomers(data);
        }
      })
      .catch(() => {
        // Fallback to initial mock customers
      });

    loadSummary();

    return () => {
      ignore = true;
    };
  }, [loadSummary]);

  // Fetch transactions with debouncing on search / filter / page change & cancellation
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      loadTransactions(currentPage, headerSearch, headerFilter, controller.signal);
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [currentPage, headerSearch, headerFilter, loadTransactions]);

  // Compute live summary metrics with precision arithmetic
  const summary = useMemo(() => {
    if (serverSummary && transactions.length === 0) {
      return serverSummary;
    }
    return calculateFinancialSummary(transactions);
  }, [transactions, serverSummary]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddSubmit = async (payload: AddTransactionPayload) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: payload.customerId,
        type: payload.type,
        amount: payload.amount,
        date: payload.date,
        paymentMethod: payload.paymentMethod,
        note: payload.description,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const errorMsg =
        json?.error?.details?.[0]?.message ||
        json?.error?.message ||
        'Failed to create transaction';
      throw new Error(errorMsg);
    }

    // Refresh transactions and summary from API
    setCurrentPage(1);
    loadTransactions(1, headerSearch, headerFilter);
    loadSummary();

    // Update customer metrics in Customer panel
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === payload.customerId) {
          const delta = payload.type === 'CREDIT_GIVEN' ? payload.amount : -payload.amount;
          return {
            ...c,
            amountDue: Math.max(0, c.amountDue + delta),
            transactionCount: (c.transactionCount || 0) + 1,
          };
        }
        return c;
      })
    );
  };

  const handleEditSubmit = async (id: string, updates: Partial<DashboardTransaction>) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: updates.type,
        amount: updates.amount,
        date: updates.createdAt,
        paymentMethod: updates.paymentMethod,
        note: updates.description,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      const errorMsg =
        json?.error?.details?.[0]?.message ||
        json?.error?.message ||
        'Failed to update transaction';
      throw new Error(errorMsg);
    }

    // Update local list, reload transactions & sync summary
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
    loadTransactions(currentPage, headerSearch, headerFilter);
    loadSummary();
  };

  const handleDeleteConfirm = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      const errorMsg =
        json?.error?.details?.[0]?.message ||
        json?.error?.message ||
        'Failed to delete transaction';
      throw new Error(errorMsg);
    }

    // Update local list and sync summary
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    loadTransactions(currentPage, headerSearch, headerFilter);
    loadSummary();
  };

  const handleSearchChange = (s: string) => {
    setHeaderSearch(s);
    setCurrentPage(1);
  };

  const handleFilterChange = (f: 'ALL' | 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN') => {
    setHeaderFilter(f);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setHeaderSearch('');
    setHeaderFilter('ALL');
    setCurrentPage(1);
  };

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
  };

  const openEdit = (tx: DashboardTransaction) => {
    setSelectedTx(tx);
    setShowEditModal(true);
  };

  const openDelete = (tx: DashboardTransaction) => {
    setSelectedTx(tx);
    setShowDeleteModal(true);
  };

  return (
    <div className="flex flex-col bg-white min-h-screen">
      {/* Header */}
      <DashboardHeader
        searchQuery={headerSearch}
        onSearchChange={handleSearchChange}
        filterType={headerFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Main content */}
      <main className="flex-1 p-3 lg:p-4 bg-white overflow-hidden">
        <div
          className="flex gap-4 w-full mx-auto"
          style={{ height: 'calc(100vh - 84px)' }}
        >
          {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
          <div className="w-[410px] shrink-0 flex flex-col gap-3 h-full">
            {/* Balance + Credit Given cards */}
            <div className="flex gap-3 shrink-0">
              <BalanceCard balance={summary.balance} />
              <CreditGivenCard creditGiven={summary.creditGiven} />
            </div>

            {/* Customer panel — fills remaining height */}
            <div className="flex-1 min-h-0">
              <CustomerPanel customers={customers} />
            </div>
          </div>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 h-full">
            <TransactionHistory
              transactions={transactions}
              initialSearch={headerSearch}
              filterType={headerFilter}
              meta={paginationMeta}
              isLoading={isLoadingTxns}
              error={txnError}
              onRetry={() => {
                loadTransactions(currentPage, headerSearch, headerFilter);
                loadSummary();
              }}
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              onPageChange={handlePageChange}
              onAddTransaction={() => setShowAddModal(true)}
              onEditTransaction={openEdit}
              onDeleteTransaction={openDelete}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSubmit}
      />

      <EditTransactionModal
        isOpen={showEditModal}
        transaction={selectedTx}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTx(null);
        }}
        onSubmit={handleEditSubmit}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        transaction={selectedTx}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTx(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
