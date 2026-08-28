'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import type { AddTransactionPayload, PaymentMethod, TransactionType } from '@/app/dashboard/types';
import { MOCK_CUSTOMERS } from '@/app/dashboard/mockData';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AddTransactionPayload) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer'];

function getLocalDateTimeString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSubmit,
}: AddTransactionModalProps) {
  const [customerId, setCustomerId] = useState('');
  const [type, setType] = useState<TransactionType>('CREDIT_GIVEN');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateTimeString);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const selectedCustomer = MOCK_CUSTOMERS.find((c) => c.id === customerId);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!customerId) e.customerId = 'Select a customer';
    if (!amount) e.amount = 'Enter amount';
    else if (isNaN(Number(amount))) e.amount = 'Must be numeric';
    else if (Number(amount) <= 0) e.amount = 'Must be > 0';
    if (!date) e.date = 'Select date & time';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      customerId,
      type,
      amount: Number(amount),
      date: new Date(date).toISOString(),
      paymentMethod,
      description: description.trim() || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setCustomerId('');
    setType('CREDIT_GIVEN');
    setAmount('');
    setDate(getLocalDateTimeString());
    setPaymentMethod('Cash');
    setDescription('');
    setErrors({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">Add Transaction</h3>
          <button
            id="add-tx-modal-close"
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-900 transition text-lg leading-none font-medium"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              customer
            </label>
            <select
              id="add-tx-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={`w-full h-10 px-3 border rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition ${
                errors.customerId ? 'border-red-400' : 'border-gray-300'
              }`}
            >
              <option value="">Select customer…</option>
              {MOCK_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ( {c.phone} )
                </option>
              ))}
            </select>
            {/* Customer display pill (when selected) */}
            {selectedCustomer && (
              <div className="mt-2 flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0" />
                <span className="text-sm text-gray-800">
                  {selectedCustomer.name} ( {selectedCustomer.phone} )
                </span>
              </div>
            )}
            {errors.customerId && (
              <p className="mt-1 text-[11px] text-red-500">{errors.customerId}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {/* Credit Given */}
              <button
                id="add-tx-type-credit"
                type="button"
                onClick={() => setType('CREDIT_GIVEN')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  type === 'CREDIT_GIVEN'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Up arrow circle icon */}
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  type === 'CREDIT_GIVEN' ? 'border-red-500' : 'border-gray-300'
                }`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={type === 'CREDIT_GIVEN' ? '#ef4444' : '#9ca3af'} strokeWidth="2.5">
                    <line x1="12" y1="19" x2="12" y2="5"/>
                    <polyline points="5 12 12 5 19 12"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold ${type === 'CREDIT_GIVEN' ? 'text-red-700' : 'text-gray-700'}`}>
                    Credit Given
                  </p>
                  <p className="text-[10px] text-gray-500">You gave credit</p>
                </div>
              </button>

              {/* Payment Received */}
              <button
                id="add-tx-type-payment"
                type="button"
                onClick={() => setType('PAYMENT_RECEIVED')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  type === 'PAYMENT_RECEIVED'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  type === 'PAYMENT_RECEIVED' ? 'border-green-500' : 'border-gray-300'
                }`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={type === 'PAYMENT_RECEIVED' ? '#22c55e' : '#9ca3af'} strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <polyline points="19 12 12 19 5 12"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold ${type === 'PAYMENT_RECEIVED' ? 'text-green-700' : 'text-gray-700'}`}>
                    Payment Received
                  </p>
                  <p className="text-[10px] text-gray-500">You received payment</p>
                </div>
              </button>
            </div>
          </div>

          {/* Amount + Date & Time — two columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <label htmlFor="add-tx-amount" className="block text-xs font-medium text-gray-700 mb-1.5">
                Amount
              </label>
              <div className="relative">
                {/* ₹ icon */}
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₹</span>
                <input
                  id="add-tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full h-10 pl-7 pr-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition ${
                    errors.amount ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="mt-0.5 text-[10px] text-red-500">{errors.amount}</p>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <label htmlFor="add-tx-date" className="block text-xs font-medium text-gray-700 mb-1.5">
                Date &amp; Time
              </label>
              <div className="relative">
                <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="add-tx-date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full h-10 pl-8 pr-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 transition ${
                    errors.date ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="add-tx-method" className="block text-xs font-medium text-gray-700 mb-1.5">
              Payment Method
            </label>
            <select
              id="add-tx-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="add-tx-description" className="block text-xs font-medium text-gray-700 mb-1.5">
              Description(optional)
            </label>
            <input
              id="add-tx-description"
              type="text"
              placeholder="Enter Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
            />
          </div>

          {/* Submit button */}
          <button
            id="add-tx-submit"
            type="submit"
            className="w-full h-10 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition active:scale-95"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
