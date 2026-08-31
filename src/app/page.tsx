'use client';

import React, { useState } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import BalanceCard from '@/components/dashboard/BalanceCard';
import CreditGivenCard from '@/components/dashboard/CreditGivenCard';
import CustomerPanel from '@/components/dashboard/CustomerPanel';
import TransactionHistory from '@/components/dashboard/TransactionHistory';
import AddTransactionModal from '@/components/dashboard/AddTransactionModal';
import EditTransactionModal from '@/components/dashboard/EditTransactionModal';
import DeleteConfirmModal from '@/components/dashboard/DeleteConfirmModal';
import {
  MOCK_SUMMARY,
  MOCK_CUSTOMERS,
  MOCK_TRANSACTIONS,
} from '@/app/dashboard/mockData';
import type {
  DashboardTransaction,
  AddTransactionPayload,
} from '@/app/dashboard/types';

export default function DashboardPage() {
  const [transactions, setTransactions] =
    useState<DashboardTransaction[]>(MOCK_TRANSACTIONS);
  const [summary] = useState(MOCK_SUMMARY);
  const [headerSearch, setHeaderSearch] = useState('');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<DashboardTransaction | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddSubmit = (payload: AddTransactionPayload) => {
    const customer = MOCK_CUSTOMERS.find((c) => c.id === payload.customerId);
    if (!customer) return;
    const newTx: DashboardTransaction = {
      id: `txn-${Date.now()}`,
      customerId: payload.customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: payload.type,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      description: payload.description,
      createdAt: payload.date,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleEditSubmit = (id: string, updates: Partial<DashboardTransaction>) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
  };

  const handleDeleteConfirm = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const openEdit = (tx: DashboardTransaction) => {
    setSelectedTx(tx);
    setShowEditModal(true);
  };

  const openDelete = (tx: DashboardTransaction) => {
    setSelectedTx(tx);
    setShowDeleteModal(true);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-white min-h-screen">
      {/* Header */}
      <DashboardHeader
        searchQuery={headerSearch}
        onSearchChange={setHeaderSearch}
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
              <CustomerPanel customers={MOCK_CUSTOMERS} />
            </div>
          </div>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 h-full">
            <TransactionHistory
              transactions={transactions}
              initialSearch={headerSearch}
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
