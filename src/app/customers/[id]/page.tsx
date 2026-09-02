'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { getLedgerData, deleteTransaction } from '@/app/customers/actions/ledger';
import { TransactionType, type Transaction as PrismaTx } from '@prisma/client';

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
  ledgerId?: string;
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

export default function CustomerLedgerPage() {
  const params = useParams();
  const rawId = params?.id;
  const customerId = Array.isArray(rawId) ? rawId[0] : rawId || 'shopkeeper_101';

  const [ledgerId, setLedgerId] = useState<string>('');
  const [data, setData] = useState<CustomerLedgerData>({
    customer: {
      id: customerId,
      name: 'Customer Account',
      phone: '—',
    },
    summary: {
      totalCredit: '0.00',
      totalPaid: '0.00',
      amountDue: '0.00',
      transactionCount: 0,
    },
    transactions: [],
  });

  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchLedger = useCallback(async () => {
    try {
      const res = await getLedgerData(customerId);
      if (res.success && res.data) {
        const rawLedger = res.data;
        setLedgerId(rawLedger.id);

        let totalCredit = 0;
        let totalPaid = 0;

        const formattedTransactions: Transaction[] = rawLedger.transactions.map((tx: PrismaTx) => {
          const numAmount = Number(tx.amount);
          if (tx.type === TransactionType.CREDIT) {
            totalCredit += numAmount;
          } else {
            totalPaid += numAmount;
          }

          return {
            id: tx.id,
            ledgerId: tx.ledgerId,
            type: tx.type === TransactionType.CREDIT ? 'CREDIT_GIVEN' : 'PAYMENT_RECEIVED',
            amount: numAmount.toFixed(2),
            description: tx.note || undefined,
            createdAt: new Date(tx.createdAt).toISOString(),
            version: tx.version,
            method: 'Cash',
          };
        });

        const amountDue = totalCredit - totalPaid;

        setData({
          customer: {
            id: rawLedger.shopkeeperId,
            name: rawLedger.title || 'Customer Account',
            phone: 'Active',
          },
          summary: {
            totalCredit: totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            totalPaid: totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            amountDue: amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            transactionCount: formattedTransactions.length,
          },
          transactions: formattedTransactions,
        });
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) {
        await fetchLedger();
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [fetchLedger]);

  const handleDelete = async (tx: Transaction) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    const res = await deleteTransaction({
      id: tx.id,
      ledgerId: tx.ledgerId || ledgerId,
      actorId: 'shopkeeper_101',
    });

    if (res.success) {
      await fetchLedger();
    } else {
      alert(res.error || 'Failed to delete transaction.');
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
              <p className="text-xs font-mono text-slate-500 mt-1">ID: {data.customer.id}</p>
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

        {/* Summary Stat Cards */}
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

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading transactions...</div>
          ) : data.transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No transactions recorded yet. Click &quot;Add Transaction&quot; to start.
            </div>
          ) : (
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
                              onClick={() => handleDelete(tx)}
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
          )}
        </div>

        {/* Modals */}
        <AddTransactionModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            fetchLedger();
          }}
          customerName={data.customer.name}
        />

        <EditTransactionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTx(null);
            fetchLedger();
          }}
          transaction={selectedTx}
          currentUserId="shopkeeper_101"
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