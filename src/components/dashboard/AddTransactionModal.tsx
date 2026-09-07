'use client';

import React, { useState } from 'react';
import { Calendar, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AddTransactionPayload, PaymentMethod, TransactionType } from '@/app/dashboard/types';
import { MOCK_CUSTOMERS } from '@/app/dashboard/mockData';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AddTransactionPayload) => void | Promise<void>;
  initialCustomerId?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer'];

function getLocalDateTimeString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function AddTransactionForm({
  initialCustomerId = '',
  onClose,
  onSubmit,
}: {
  initialCustomerId?: string;
  onClose: () => void;
  onSubmit: (payload: AddTransactionPayload) => void | Promise<void>;
}) {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [type, setType] = useState<TransactionType>('CREDIT_GIVEN');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateTimeString);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [description, setDescription] = useState('');
  
  // Component States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedCustomer = MOCK_CUSTOMERS.find((c) => c.id === customerId);

  const handleClose = () => {
    onClose();
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    
    // Customer validation
    if (!customerId) {
      e.customerId = 'Customer is required';
    }

    // Type validation
    if (!type) {
      e.type = 'Transaction type is required';
    }

    // Amount validation
    if (!amount.trim()) {
      e.amount = 'Amount is required';
    } else {
      const num = Number(amount);
      if (isNaN(num)) {
        e.amount = 'Amount must be a numeric value';
      } else if (num <= 0) {
        e.amount = 'Amount must be greater than zero';
      }
    }

    // Date validation
    if (!date) {
      e.date = 'Date & time is required';
    } else {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        e.date = 'Please enter a valid date & time';
      }
    }

    // Payment Method validation
    if (!paymentMethod) {
      e.paymentMethod = 'Payment method is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Clean payload independent of UI
      const payload: AddTransactionPayload = {
        customerId,
        type,
        amount: Number(amount),
        date: new Date(date).toISOString(),
        paymentMethod,
        description: description.trim() || undefined,
      };

      await onSubmit(payload);
      
      setSubmitSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add transaction. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 tracking-tight">Add Transaction</h3>
          <button
            id="add-tx-modal-close"
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-full transition disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Feedback Banner */}
        {submitSuccess && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2.5 text-green-800 text-xs font-semibold">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <span>Transaction added successfully!</span>
          </div>
        )}

        {/* Error Feedback Banner */}
        {submitError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-800 text-xs font-semibold">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Customer Selection */}
          <div>
            <label htmlFor="add-tx-customer" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              id="add-tx-customer"
              value={customerId}
              disabled={isSubmitting}
              onChange={(e) => {
                setCustomerId(e.target.value);
                if (errors.customerId) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.customerId;
                    return next;
                  });
                }
              }}
              className={`w-full h-10 px-3 border rounded-xl bg-white text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 transition ${
                errors.customerId ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
              }`}
            >
              <option value="">Select customer…</option>
              {MOCK_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>

            {/* Selected customer card display */}
            {selectedCustomer && (
              <div className="mt-2 flex items-center gap-3 border border-gray-200 rounded-xl px-3.5 py-2 bg-gray-50/60">
                <div className="w-8 h-8 rounded-full bg-gray-300 shrink-0 flex items-center justify-center text-xs font-bold text-gray-700">
                  {selectedCustomer.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">{selectedCustomer.name}</p>
                  <p className="text-[11px] text-gray-500">{selectedCustomer.phone}</p>
                </div>
              </div>
            )}

            {errors.customerId && (
              <p className="mt-1 text-[11px] font-medium text-red-500">{errors.customerId}</p>
            )}
          </div>

          {/* Type Selector: Credit Given vs Payment Received */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Credit Given */}
              <button
                id="add-tx-type-credit"
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setType('CREDIT_GIVEN');
                  if (errors.type) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.type;
                      return next;
                    });
                  }
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                  type === 'CREDIT_GIVEN'
                    ? 'border-red-500 bg-red-50/50 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    type === 'CREDIT_GIVEN' ? 'border-red-500 bg-red-100/50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={type === 'CREDIT_GIVEN' ? '#ef4444' : '#9ca3af'} strokeWidth="2.5">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </div>
                <div>
                  <p className={`text-xs font-bold leading-tight ${type === 'CREDIT_GIVEN' ? 'text-red-700' : 'text-gray-800'}`}>
                    Credit Given
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">You gave credit</p>
                </div>
              </button>

              {/* Payment Received */}
              <button
                id="add-tx-type-payment"
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setType('PAYMENT_RECEIVED');
                  if (errors.type) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.type;
                      return next;
                    });
                  }
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                  type === 'PAYMENT_RECEIVED'
                    ? 'border-green-500 bg-green-50/50 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    type === 'PAYMENT_RECEIVED' ? 'border-green-500 bg-green-100/50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={type === 'PAYMENT_RECEIVED' ? '#22c55e' : '#9ca3af'} strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </div>
                <div>
                  <p className={`text-xs font-bold leading-tight ${type === 'PAYMENT_RECEIVED' ? 'text-green-700' : 'text-gray-800'}`}>
                    Payment Received
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">You received payment</p>
                </div>
              </button>
            </div>
            {errors.type && (
              <p className="mt-1 text-[11px] font-medium text-red-500">{errors.type}</p>
            )}
          </div>

          {/* Amount + Date & Time — Two Columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <label htmlFor="add-tx-amount" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">₹</span>
                <input
                  id="add-tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={isSubmitting}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (errors.amount) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.amount;
                        return next;
                      });
                    }
                  }}
                  className={`w-full h-10 pl-7 pr-3 border rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 transition ${
                    errors.amount ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-[11px] font-medium text-red-500">{errors.amount}</p>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <label htmlFor="add-tx-date" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Date &amp; Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="add-tx-date"
                  type="datetime-local"
                  disabled={isSubmitting}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errors.date) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.date;
                        return next;
                      });
                    }
                  }}
                  className={`w-full h-10 pl-7 pr-2 border rounded-xl text-[11px] font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 transition ${
                    errors.date ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-[11px] font-medium text-red-500">{errors.date}</p>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="add-tx-method" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="add-tx-method"
              value={paymentMethod}
              disabled={isSubmitting}
              onChange={(e) => {
                setPaymentMethod(e.target.value as PaymentMethod);
                if (errors.paymentMethod) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.paymentMethod;
                    return next;
                  });
                }
              }}
              className={`w-full h-10 px-3 border rounded-xl bg-white text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 transition ${
                errors.paymentMethod ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
              }`}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errors.paymentMethod && (
              <p className="mt-1 text-[11px] font-medium text-red-500">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Description (Optional) */}
          <div>
            <label htmlFor="add-tx-description" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="add-tx-description"
              type="text"
              placeholder="e.g. Goods purchased / Invoice #402"
              disabled={isSubmitting}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 transition placeholder:text-gray-400"
            />
          </div>

          {/* Action Buttons: Submit & Cancel */}
          <div className="pt-2 flex items-center gap-3">
            <button
              id="add-tx-cancel"
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="w-1/3 h-10 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-98 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="add-tx-submit"
              type="submit"
              disabled={isSubmitting || submitSuccess}
              className="flex-1 h-10 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Submit</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialCustomerId = '',
}: AddTransactionModalProps) {
  if (!isOpen) return null;

  return (
    <AddTransactionForm
      key={isOpen ? 'open' : 'closed'}
      initialCustomerId={initialCustomerId}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}


