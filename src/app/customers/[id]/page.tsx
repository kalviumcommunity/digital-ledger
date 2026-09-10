"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Edit,
  FileText,
  History,
  Loader2,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import {
  AddTransactionModal,
  AuditTrailModal,
  DeleteTransactionModal,
  EditTransactionModal,
  InvoiceModal,
  NoticeModal,
} from "@/components/LedgerModals";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getLedgerData } from "@/app/actions/ledger";
import { formatDateTime, formatINR } from "@/lib/format";
import type { CurrentUser, CustomerLedgerData, SerializedTransaction } from "@/lib/types";

export default function CustomerLedgerPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<CustomerLedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTx, setEditTx] = useState<SerializedTransaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<SerializedTransaction | null>(null);
  const [auditTx, setAuditTx] = useState<SerializedTransaction | null>(null);
  const [invoiceTx, setInvoiceTx] = useState<SerializedTransaction | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [me, result] = await Promise.all([
      getCurrentUserAction(),
      getLedgerData(customerId),
    ]);
    if (result.success) {
      setData(result.data);
      setLoadError(null);
    } else {
      setData(null);
      setLoadError(result.error);
    }
    if (me) setUser(me);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void fetchData();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const balance = data?.summary.amountDue ?? 0;

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans antialiased text-slate-800">
      <AppHeader user={user ?? { id: "", name: "", email: "", role: "EMPLOYEE" }} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 print:py-0">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition print:hidden"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
        </Link>

        {loading && !data ? (
          <div className="py-24 text-center text-slate-400 text-sm">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
            Loading ledger…
          </div>
        ) : loadError ? (
          <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {loadError}
          </div>
        ) : data ? (
          <>
            {/* Customer header */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-inner">
                  {data.customerName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      {data.customerName}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Customer
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.customerPhone ? (
                      <span className="font-mono">{data.customerPhone}</span>
                    ) : (
                      "No phone on file"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Transaction
                </button>
                <button
                  type="button"
                  onClick={() => setNoticeOpen(true)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm print:hidden"
                >
                  <Bell className="w-4 h-4 text-amber-500" /> Send Notice
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm print:hidden"
                >
                  <FileText className="w-4 h-4" /> Print Ledger
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Credit"
                value={formatINR(data.summary.totalCredit)}
                icon={<ArrowDownLeft className="w-4 h-4" />}
                chip="bg-rose-50 text-rose-600"
                valueClass="text-slate-900"
              />
              <StatCard
                label="Total Paid"
                value={formatINR(data.summary.totalPaid)}
                icon={<ArrowUpRight className="w-4 h-4" />}
                chip="bg-emerald-50 text-emerald-600"
                valueClass="text-emerald-600"
              />
              <StatCard
                label="Amount Due"
                value={formatINR(balance)}
                icon={<Wallet className="w-4 h-4" />}
                chip="bg-rose-100/70 text-rose-600"
                valueClass="text-rose-600"
                highlight
              />
              <StatCard
                label="Transactions"
                value={String(data.summary.transactionCount)}
                icon={<ReceiptText className="w-4 h-4" />}
                chip="bg-slate-100 text-slate-600"
                valueClass="text-slate-900"
              />
            </div>

            {/* Transaction history */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden print:border-0 print:shadow-none">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between print:border-0">
                <h2 className="text-base font-bold text-slate-900">
                  Transaction History
                </h2>
                <span className="text-xs text-slate-500 font-medium print:hidden">
                  {data.summary.transactionCount} total entries
                </span>
              </div>

              {data.transactions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  <ReceiptText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  No transactions recorded yet. Click &quot;Add Transaction&quot; to start.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm print:text-xs">
                    <thead className="bg-slate-50/70 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5">Date & Time</th>
                        <th className="px-6 py-3.5">Type</th>
                        <th className="px-6 py-3.5">Description</th>
                        <th className="px-6 py-3.5 text-right">Amount</th>
                        <th className="px-6 py-3.5 text-center print:hidden">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.transactions.map((tx) => {
                        const isPayment = tx.type === "DEBIT";
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                              {formatDateTime(tx.createdAt)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  isPayment
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                    : "bg-rose-50 text-rose-700 border border-rose-200/60"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isPayment ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                />
                                {isPayment ? "Payment" : "Credit"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-xs font-normal">
                              <span className="block max-w-[260px] truncate">
                                {tx.note || "—"}
                              </span>
                              <span className="text-slate-400">via {tx.method}</span>
                            </td>
                            <td
                              className={`px-6 py-4 text-right font-bold text-sm tabular-nums ${
                                isPayment ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isPayment ? "+" : "−"}
                              {formatINR(tx.amount)}
                            </td>
                            <td className="px-6 py-4 print:hidden">
                              <div className="flex items-center justify-center gap-1.5">
                                <RowAction
                                  icon={<Edit className="w-4 h-4" />}
                                  title="Edit Transaction"
                                  onClick={() => setEditTx(tx)}
                                />
                                <RowAction
                                  icon={<FileText className="w-4 h-4" />}
                                  title="Invoice / Memo"
                                  onClick={() => setInvoiceTx(tx)}
                                />
                                <RowAction
                                  icon={<History className="w-4 h-4" />}
                                  title="Audit Trail"
                                  accent="text-blue-600 hover:bg-blue-50"
                                  onClick={() => setAuditTx(tx)}
                                />
                                <RowAction
                                  icon={<Trash2 className="w-4 h-4" />}
                                  title="Delete"
                                  accent="text-rose-600 hover:bg-rose-50"
                                  onClick={() => setDeleteTx(tx)}
                                />
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
          </>
        ) : null}
      </main>

      {data && user && (
        <>
          <AddTransactionModal
            isOpen={addOpen}
            onClose={() => {
              setAddOpen(false);
              void fetchData();
            }}
            ledgerId={data.ledgerId}
            customerName={data.customerName}
            onSaved={() => void fetchData()}
          />

          {editTx && (
            <EditTransactionModal
              transaction={editTx}
              onClose={() => {
                setEditTx(null);
                void fetchData();
              }}
              onSaved={() => void fetchData()}
            />
          )}

          {deleteTx && (
            <DeleteTransactionModal
              transaction={deleteTx}
              customerName={data.customerName}
              onClose={() => setDeleteTx(null)}
              onDeleted={() => {
                setDeleteTx(null);
                void fetchData();
              }}
            />
          )}

          {auditTx && (
            <AuditTrailModal
              transaction={auditTx}
              onClose={() => setAuditTx(null)}
            />
          )}

          {invoiceTx && (
            <InvoiceModal
              transaction={invoiceTx}
              customerName={data.customerName}
              customerPhone={data.customerPhone}
              ledgerId={data.ledgerId}
              balance={data.totalBalance}
              onClose={() => setInvoiceTx(null)}
            />
          )}

          <NoticeModal
            isOpen={noticeOpen}
            onClose={() => setNoticeOpen(false)}
            customerName={data.customerName}
            customerPhone={data.customerPhone}
            amountDue={balance}
            latestTransaction={data.transactions[0] ?? null}
          />
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  chip,
  valueClass,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  chip: string;
  valueClass: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white p-5 rounded-2xl border shadow-sm ${
        highlight ? "border-rose-100 bg-gradient-to-br from-white to-rose-50/20" : "border-slate-200/80"
      }`}
    >
      <div className="flex items-center justify-between text-slate-400 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className={`w-7 h-7 rounded-lg ${chip} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function RowAction({
  icon,
  title,
  onClick,
  accent = "",
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition ${
        accent ? accent : ""
      }`}
    >
      {icon}
    </button>
  );
}