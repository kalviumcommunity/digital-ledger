'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Bell, Edit2, FileText, History, Trash2, 
  ArrowUpRight, ArrowDownLeft, Wallet, ReceiptText 
} from 'lucide-react';
import { 
  AddTransactionModal, 
  EditTransactionModal, 
  AuditTrailModal, 
  SendNoticeModal 
} from '@/components/LedgerModals';

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
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  summary: {
    totalCredit: string;
    totalPaid: string;
    amountDue: string;
    transactionCount: number;
  };
  transactions: Transaction[];
}

const INITIAL_MOCK_DATA: CustomerLedgerData = {
  customer: {
    id: '1',
    name: 'Alisha Thakur',
    phone: '9356xxxxxx',
  },
  summary: {
    totalCredit: '13,445.23',
    totalPaid: '10,400.00',
    amountDue: '3,045.23',
    transactionCount: 5,
  },
  transactions: [
    {
      id: '101',
      type: 'PAYMENT_RECEIVED',
      amount: '2400.00',
      method: 'UPI',
      description: 'Payment Received',
      createdAt: '2026-08-08T12:13:00Z',
      version: 1,
      auditLogs: [
        {
          id: 'a1',
          action: 'CREATED',
          userId: 'Shopkeeper',
          timestamp: '2026-08-08T12:13:00Z',
          newValue: { amount: '2400.00', type: 'PAYMENT_RECEIVED', method: 'UPI' },
        },
      ],
    },
    {
      id: '102',
      type: 'PAYMENT_RECEIVED',
      amount: '3000.00',
      method: 'Cash',
      description: 'Cash Received',
      createdAt: '2026-08-01T10:03:00Z',
      version: 1,
      auditLogs: [],
    },
    {
      id: '103',
      type: 'CREDIT_GIVEN',
      amount: '2800.00',
      method: 'Cash',
      description: 'Goods Purchased',
      createdAt: '2026-07-28T08:37:00Z',
      version: 1,
      auditLogs: [],
    },
    {
      id: '104',
      type: 'PAYMENT_RECEIVED',
      amount: '5000.00',
      method: 'Cash',
      description: 'Cash Received',
      createdAt: '2026-07-20T10:03:00Z',
      version: 1,
      auditLogs: [],
    },
    {
      id: '105',
      type: 'CREDIT_GIVEN',
      amount: '8645.23',
      method: 'Cash',
      description: 'Goods Purchased',
      createdAt: '2026-07-18T10:03:00Z',
      version: 2,
      lockedBy: 'Employee 1',
      lockedAt: new Date().toISOString(),
      auditLogs: [
        {
          id: 'a2',
          action: 'CREATED',
          userId: 'Shopkeeper',
          timestamp: '2026-07-18T10:03:00Z',
          newValue: { amount: '8000.00', type: 'CREDIT_GIVEN', method: 'Cash' },
        },
        {
          id: 'a3',
          action: 'EDITED',
          userId: 'Employee 1',
          timestamp: '2026-07-18T10:15:00Z',
          oldValue: { amount: '8000.00' },
          newValue: { amount: '8645.23' },
        },
      ],
    },
  ],
};

export default function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  
  const [data, setData] = useState<CustomerLedgerData>({
    ...INITIAL_MOCK_DATA,
    customer: {
      ...INITIAL_MOCK_DATA.customer,
      id: resolvedParams?.id || '1',
    },
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleDelete = (txId: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      setData((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== txId),
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      <main className="max-w-5xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
        </Link>

        {/* Customer Header Bar */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-inner">
              {data.customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {data.customer.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Customer
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-1">{data.customer.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
            <button
              type="button"
              onClick={() => setShowNoticeModal(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Bell className="w-4 h-4 text-amber-500" /> Send Notice
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Credit</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">₹{data.summary.totalCredit}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Paid</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">₹{data.summary.totalPaid}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow transition bg-gradient-to-br from-white to-rose-50/20">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Amount Due</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100/70 flex items-center justify-center text-rose-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-rose-600 tracking-tight">₹{data.summary.amountDue}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transactions</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <ReceiptText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{data.summary.transactionCount}</p>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Transaction History</h2>
            <span className="text-xs text-slate-500 font-medium">{data.transactions.length} total entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.transactions.map((tx) => {
                  const isPayment = tx.type === 'PAYMENT_RECEIVED' || tx.type === 'DEBIT';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                        {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPayment
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPayment ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isPayment ? 'Payment' : 'Credit'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs font-normal">
                        {tx.description || '—'}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold text-sm tabular-nums ${isPayment ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPayment ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => alert(`Downloading invoice for Transaction #${tx.id}`)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Download Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setShowAuditModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Audit Trail"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        <AddTransactionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          customerName={data.customer.name}
        />

        <EditTransactionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTx(null);
          }}
          transaction={selectedTx}
          currentUserId="Employee 2"
        />

        <AuditTrailModal
          isOpen={showAuditModal}
          onClose={() => {
            setShowAuditModal(false);
            setSelectedTx(null);
          }}
          transaction={selectedTx}
          customerName={data.customer.name}
        />

        <SendNoticeModal
          isOpen={showNoticeModal}
          onClose={() => setShowNoticeModal(false)}
          customerName={data.customer.name}
          amountDue={data.summary.amountDue}
        />
      </main>
    </div>
  );
}