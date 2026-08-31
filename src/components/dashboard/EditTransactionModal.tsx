'use client';

import React, { useState } from 'react';
import type { DashboardTransaction, PaymentMethod, TransactionType } from '@/app/dashboard/types';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: DashboardTransaction | null;
  onClose: () => void;
  onSubmit: (id: string, updates: Partial<DashboardTransaction>) => void;
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'CREDIT_GIVEN', label: 'Credit Given' },
];


// Inner form — fresh mount per transaction open (no useEffect setState needed)
function EditForm({
  transaction,
  onClose,
  onSubmit,
}: {
  transaction: DashboardTransaction;
  onClose: () => void;
  onSubmit: (id: string, updates: Partial<DashboardTransaction>) => void;
}) {
  const [amount, setAmount] = useState(
    Number(transaction.amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [description, setDescription] = useState(transaction.description ?? '');
  const [paymentMethod] = useState<PaymentMethod>(transaction.paymentMethod);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const rawAmount = amount.replace(/,/g, '');
    if (!rawAmount) e.amount = 'Amount is required';
    else if (isNaN(Number(rawAmount))) e.amount = 'Must be numeric';
    else if (Number(rawAmount) <= 0) e.amount = 'Must be > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(transaction.id, {
      type,
      amount: Number(amount.replace(/,/g, '')),
      paymentMethod,
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-gray-200">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Edit Transaction</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer display */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">customer</label>
              <div className="flex items-center gap-2.5 border border-gray-300 rounded-lg px-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-300 shrink-0" />
                <span className="text-sm font-medium text-gray-800">{transaction.customerName}</span>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="edit-tx-amount" className="block text-xs font-medium text-gray-700 mb-1.5">
                Amount
              </label>
              <input
                id="edit-tx-amount"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full h-12 px-4 border rounded-lg text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-gray-400 transition ${
                  errors.amount ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.amount && (
                <p className="mt-0.5 text-[11px] text-red-500">{errors.amount}</p>
              )}
            </div>

            {/* Type dropdown */}
            <div>
              <label htmlFor="edit-tx-type" className="block text-xs font-medium text-gray-700 mb-1.5">
                Type
              </label>
              <select
                id="edit-tx-type"
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full h-11 px-4 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="edit-tx-description" className="block text-xs font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <input
                id="edit-tx-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-11 px-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="edit-tx-password" className="block text-xs font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="edit-tx-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                id="edit-tx-cancel"
                type="button"
                onClick={onClose}
                className="flex-1 h-11 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                id="edit-tx-submit"
                type="submit"
                className="flex-1 h-11 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditTransactionModal({
  isOpen,
  transaction,
  onClose,
  onSubmit,
}: EditTransactionModalProps) {
  if (!isOpen || !transaction) return null;
  return (
    <EditForm
      key={transaction.id}
      transaction={transaction}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
