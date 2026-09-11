'use client';

import React from 'react';
import type { DashboardTransaction } from '@/app/dashboard/types';
import { formatNumber, formatTime } from '@/app/dashboard/mockData';

interface TransactionRowProps {
  transaction: DashboardTransaction;
  onEdit: (tx: DashboardTransaction) => void;
  onDelete: (tx: DashboardTransaction) => void;
  onInvoice: (tx: DashboardTransaction) => void;
  onAuditTrail: (tx: DashboardTransaction) => void;
  isDownloadingInvoice?: boolean;
}

export default function TransactionRow({
  transaction,
  onEdit,
  onDelete,
  onInvoice,
  onAuditTrail,
  isDownloadingInvoice = false,
}: TransactionRowProps) {
  const isPayment = transaction.type === 'PAYMENT_RECEIVED';

  return (
    <div className="border border-gray-400 rounded-2xl p-3.5 bg-white flex items-center gap-4 hover:border-gray-500 transition">
      {/* Gray circle avatar */}
      <div className="w-11 h-11 rounded-full bg-gray-300 shrink-0" />

      {/* Customer name + time */}
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-gray-900 text-sm leading-tight truncate">{transaction.customerName}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{formatTime(transaction.createdAt)}</p>
      </div>

      {/* Amount */}
      <span
        className={`font-black text-base tabular-nums shrink-0 ${
          isPayment ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {isPayment ? '+' : '-'}{formatNumber(transaction.amount)}
      </span>

      {/* Actions */}
      <button
        id={`tx-edit-${transaction.id}`}
        type="button"
        onClick={() => onEdit(transaction)}
        className="text-xs font-bold text-gray-900 hover:underline shrink-0 px-1"
      >
        Edit
      </button>

      <button
        id={`tx-invoice-${transaction.id}`}
        type="button"
        disabled={isDownloadingInvoice}
        onClick={() => onInvoice(transaction)}
        className={`text-[11px] font-bold leading-tight text-center shrink-0 px-1 transition ${
          isDownloadingInvoice
            ? 'text-gray-400 cursor-wait'
            : 'text-gray-900 hover:underline cursor-pointer'
        }`}
      >
        {isDownloadingInvoice ? (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <svg className="animate-spin w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating
          </span>
        ) : (
          <>
            Download<br />Invoice
          </>
        )}
      </button>

      <button
        id={`tx-audit-${transaction.id}`}
        type="button"
        onClick={() => onAuditTrail(transaction)}
        className="text-[11px] font-bold text-gray-900 hover:underline leading-tight text-center shrink-0 px-1"
      >
        Audit Trail
      </button>

      {/* Trash icon with border */}
      <button
        id={`tx-delete-${transaction.id}`}
        type="button"
        onClick={() => onDelete(transaction)}
        className="border border-gray-400 rounded-md p-1.5 text-gray-700 hover:text-red-600 hover:border-red-400 transition shrink-0"
        title="Delete Transaction"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>
  );
}
