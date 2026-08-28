'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Bell, Trash2,
} from 'lucide-react';
import {
  AddTransactionModal,
  EditTransactionModal,
  AuditTrailModal,
  SendNoticeModal,
} from '@/components/LedgerModals';
import { MOCK_CUSTOMERS, formatNumber } from '@/app/dashboard/mockData';

export interface AuditLog {
  id: string;
  action: 'CREATED' | 'EDITED' | 'DELETED';
  userId: string;
  timestamp: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  type: 'CREDIT_GIVEN' | 'PAYMENT_RECEIVED' | 'CREDIT' | 'DEBIT';
  amount: string | number;
  method?: string;
  description?: string;
  createdAt: string;
  version: number;
  lockedBy?: string | null;
  lockedAt?: string | null;
  auditLogs?: AuditLog[];
}

export interface CustomerLedgerData {
  customer: { id: string; name: string; phone: string };
  summary: {
    totalCredit: string;
    totalPaid: string;
    amountDue: string;
    transactionCount: number;
  };
  transactions: Transaction[];
}

const INITIAL_MOCK_DATA: CustomerLedgerData = {
  customer: { id: '1', name: 'Alisha Thakur', phone: '9356xxxxxxx' },
  summary: {
    totalCredit: '13,445.23',
    totalPaid: '10,400.00',
    amountDue: '3,045.23',
    transactionCount: 7,
  },
  transactions: [
    {
      id: '101', type: 'PAYMENT_RECEIVED', amount: '2400.00', method: 'UPI',
      description: 'Payment Received', createdAt: '2026-08-08T12:13:00Z', version: 1,
      auditLogs: [{ id: 'a1', action: 'CREATED', userId: 'Shopkeeper', timestamp: '2026-08-08T12:13:00Z', newValue: { amount: '2400.00', type: 'PAYMENT_RECEIVED', method: 'UPI' } }],
    },
    {
      id: '102', type: 'PAYMENT_RECEIVED', amount: '3000.00', method: 'Cash',
      description: 'Cash Received', createdAt: '2026-08-01T10:03:00Z', version: 1, auditLogs: [],
    },
    {
      id: '103', type: 'CREDIT_GIVEN', amount: '2800.00', method: 'Cash',
      description: 'Goods Purchased', createdAt: '2026-07-28T08:37:00Z', version: 1, auditLogs: [],
    },
    {
      id: '104', type: 'PAYMENT_RECEIVED', amount: '5000.00', method: 'Cash',
      description: 'Cash Received', createdAt: '2026-07-20T10:03:00Z', version: 1, auditLogs: [],
    },
    {
      id: '105', type: 'CREDIT_GIVEN', amount: '8645.23', method: 'Cash',
      description: 'Goods Purchased', createdAt: '2026-07-18T10:03:00Z', version: 2,
      lockedBy: 'Employee 1', lockedAt: new Date().toISOString(),
      auditLogs: [
        { id: 'a2', action: 'CREATED', userId: 'Shopkeeper', timestamp: '2026-07-18T10:03:00Z', newValue: { amount: '8000.00', type: 'CREDIT_GIVEN', method: 'Cash' } },
        { id: 'a3', action: 'EDITED', userId: 'Employee 1', timestamp: '2026-07-18T10:15:00Z', oldValue: { amount: '8000.00' }, newValue: { amount: '8645.23' } },
      ],
    },
  ],
};

function formatTxDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatAmount(amount: string | number): string {
  const n = Number(amount);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


export default function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const customerId = resolvedParams?.id || '2';
  const customerInfo = MOCK_CUSTOMERS.find((c) => c.id === customerId) || MOCK_CUSTOMERS[1];

  const [data, setData] = useState<CustomerLedgerData>(() => ({
    ...INITIAL_MOCK_DATA,
    customer: {
      id: customerInfo.id,
      name: customerInfo.name,
      phone: customerInfo.phone,
    },
    summary: {
      ...INITIAL_MOCK_DATA.summary,
      amountDue: formatNumber(customerInfo.amountDue),
    },
  }));

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleDelete = (txId: string) => {
    if (confirm('Delete this transaction?')) {
      setData((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== txId),
      }));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Back link */}
      <div className="px-6 py-3 border-b border-gray-200">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft size={13} />
          Back to customers
        </Link>
      </div>

      <main className="px-6 py-4 max-w-5xl">
        {/* Customer header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-300 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{data.customer.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{data.customer.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 h-10 px-4 border border-gray-900 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
            >
              <Plus size={15} />
              Add Transaction
            </button>
            <button
              type="button"
              onClick={() => setShowNoticeModal(true)}
              className="flex items-center gap-2 h-10 px-4 border border-gray-900 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
            >
              <Bell size={15} />
              Send Notice
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Credit', value: data.summary.totalCredit, color: 'text-gray-900' },
            { label: 'Total Paid', value: data.summary.totalPaid, color: 'text-green-600' },
            { label: 'Amount Due', value: data.summary.amountDue, color: 'text-red-600' },
            { label: 'Transactions', value: String(data.summary.transactionCount), color: 'text-gray-900' },
          ].map((card) => (
            <div key={card.label} className="border border-gray-300 rounded-lg px-4 py-3 text-center">
              <p className="text-xs text-gray-600 font-medium mb-1">{card.label}</p>
              <p className={`text-lg font-bold tabular-nums ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Transaction table */}
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[180px_100px_1fr_100px_180px] border-b border-gray-200 bg-white px-4 py-3">
            {['Date & Time', 'Type', 'Description', 'Amount', 'Actions'].map((h) => (
              <span key={h} className="text-xs font-semibold text-gray-700">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-200">
            {data.transactions.map((tx) => {
              const isPayment = tx.type === 'PAYMENT_RECEIVED' || tx.type === 'DEBIT';
              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-[180px_100px_1fr_100px_180px] px-4 py-3 items-center hover:bg-gray-50 transition"
                >
                  {/* Date & Time */}
                  <span className="text-sm text-gray-700">{formatTxDate(tx.createdAt)}</span>

                  {/* Type */}
                  <span className={`text-sm ${isPayment ? 'text-gray-700' : 'text-gray-700'}`}>
                    {isPayment ? 'Payment' : 'Credit'}
                  </span>

                  {/* Description */}
                  <span className="text-sm text-gray-600">{tx.description || '—'}</span>

                  {/* Amount */}
                  <span className={`text-sm font-bold tabular-nums ${isPayment ? 'text-green-600' : 'text-red-600'}`}>
                    {isPayment ? '+' : '-'}{formatAmount(tx.amount)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setSelectedTx(tx); setShowEditModal(true); }}
                      className="text-xs text-gray-700 hover:underline px-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => alert(`Downloading invoice for #${tx.id}`)}
                      className="text-xs text-gray-700 hover:underline px-1 text-center leading-tight"
                    >
                      Download<br />Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedTx(tx); setShowAuditModal(true); }}
                      className="text-xs text-gray-700 hover:underline px-1 text-center leading-tight"
                    >
                      Audit<br />Trail
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tx.id)}
                      className="text-gray-400 hover:text-red-500 transition ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        customerName={data.customer.name}
      />
      <EditTransactionModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedTx(null); }}
        transaction={selectedTx}
        currentUserId="Employee 2"
      />
      <AuditTrailModal
        isOpen={showAuditModal}
        onClose={() => { setShowAuditModal(false); setSelectedTx(null); }}
        transaction={selectedTx}
        customerName={data.customer.name}
      />
      <SendNoticeModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        customerName={data.customer.name}
        amountDue={data.summary.amountDue}
      />
    </div>
  );
}