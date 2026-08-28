'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { DashboardTransaction } from '@/app/dashboard/types';
import { formatIndianCurrency } from '@/app/dashboard/mockData';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  transaction: DashboardTransaction | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export default function DeleteConfirmModal({
  isOpen,
  transaction,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen || !transaction) return null;

  const isPayment = transaction.type === 'PAYMENT_RECEIVED';

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Delete Transaction</h3>
          <button
            id="delete-tx-modal-close"
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 leading-relaxed">
              This action cannot be undone. The transaction will be permanently removed.
            </p>
          </div>

          {/* Transaction summary */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Customer</span>
              <span className="font-semibold text-gray-900">{transaction.customerName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Type</span>
              <span className={`font-semibold ${isPayment ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPayment ? 'Payment Received' : 'Credit Given'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Amount</span>
              <span className={`font-bold tabular-nums ${isPayment ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPayment ? '+' : '-'}{formatIndianCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              id="delete-tx-cancel"
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              id="delete-tx-confirm"
              type="button"
              onClick={() => {
                onConfirm(transaction.id);
                onClose();
              }}
              className="flex-1 h-10 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition active:scale-95 shadow-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
