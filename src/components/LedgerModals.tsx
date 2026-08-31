'use client';

import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { Transaction } from '@/app/customers/[id]/page';

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADD TRANSACTION MODAL (Customer Ledger version — customer is pre-selected)
//    Visual style matches Screenshot 3
// ─────────────────────────────────────────────────────────────────────────────

export function AddTransactionModal({
  isOpen,
  onClose,
  customerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
}) {
  const [type, setType] = useState<'CREDIT_GIVEN' | 'PAYMENT_RECEIVED'>('CREDIT_GIVEN');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
  });
  const [method, setMethod] = useState('Cash');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Transaction Created: ₹${amount} (${type}) via ${method}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">Add Transaction</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-lg leading-none font-medium"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Customer display */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">customer</label>
            <div className="flex items-center gap-2.5 border border-gray-300 rounded-lg px-3 py-2.5">
              <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0" />
              <span className="text-sm text-gray-800">{customerName} ( 9356xxxxxxx )</span>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('CREDIT_GIVEN')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  type === 'CREDIT_GIVEN'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${type === 'CREDIT_GIVEN' ? 'border-red-500' : 'border-gray-300'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={type === 'CREDIT_GIVEN' ? '#ef4444' : '#9ca3af'} strokeWidth="2.5">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold ${type === 'CREDIT_GIVEN' ? 'text-red-700' : 'text-gray-700'}`}>Credit Given</p>
                  <p className="text-[10px] text-gray-500">You gave credit</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('PAYMENT_RECEIVED')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  type === 'PAYMENT_RECEIVED'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${type === 'PAYMENT_RECEIVED' ? 'border-green-500' : 'border-gray-300'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={type === 'PAYMENT_RECEIVED' ? '#22c55e' : '#9ca3af'} strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold ${type === 'PAYMENT_RECEIVED' ? 'text-green-700' : 'text-gray-700'}`}>Payment Received</p>
                  <p className="text-[10px] text-gray-500">You received payment</p>
                </div>
              </button>
            </div>
          </div>

          {/* Amount + Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ledger-add-amount" className="block text-xs font-medium text-gray-700 mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₹</span>
                <input
                  id="ledger-add-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Enter Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-10 pl-7 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ledger-add-date" className="block text-xs font-medium text-gray-700 mb-1.5">Date &amp; Time</label>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input
                  id="ledger-add-date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 pl-8 pr-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="ledger-add-method" className="block text-xs font-medium text-gray-700 mb-1.5">Payment Method</label>
            <select
              id="ledger-add-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="ledger-add-desc" className="block text-xs font-medium text-gray-700 mb-1.5">Description(optional)</label>
            <input
              id="ledger-add-desc"
              type="text"
              placeholder="Enter Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
            />
          </div>

          <button
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. EDIT TRANSACTION MODAL (with concurrency protection)
//    Visual style matches Screenshot 5
// ─────────────────────────────────────────────────────────────────────────────

function EditForm({
  transaction,
  currentUserId,
  onClose,
}: {
  transaction: Transaction;
  currentUserId: string;
  onClose: () => void;
}) {
  const isLockedByOther = Boolean(transaction.lockedBy && transaction.lockedBy !== currentUserId);
  const [amount, setAmount] = useState(
    Number(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
  const [txType, setTxType] = useState(
    transaction.type === 'PAYMENT_RECEIVED' ? 'Payment Received' : 'Credit Given'
  );
  const [description, setDescription] = useState(transaction.description || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-gray-200">
        <div className="px-6 py-5 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Edit Transaction</h3>

          {isLockedByOther && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Concurrent Edit In Progress</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Currently being edited by <strong>{transaction.lockedBy}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Customer */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">customer</label>
            <div className="flex items-center gap-2.5 border border-gray-300 rounded-lg px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-300 shrink-0" />
              <span className="text-sm font-medium text-gray-800">Customer #{transaction.id}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Amount</label>
            <input
              type="text"
              disabled={isLockedByOther}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-lg text-lg font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
            <div className="relative">
              <select
                disabled={isLockedByOther}
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="w-full h-11 px-4 border border-gray-300 rounded-lg bg-white text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-400 transition appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
              >
                <option>Payment Received</option>
                <option>Credit Given</option>
                <option>Debit Payment</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <input
              type="text"
              disabled={isLockedByOther}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 px-4 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                disabled={isLockedByOther}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-4 pr-10 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLockedByOther}
              onClick={() => { alert('Transaction updated successfully'); onClose(); }}
              className="flex-1 h-11 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  currentUserId = 'Shopkeeper',
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  currentUserId?: string;
}) {
  if (!isOpen || !transaction) return null;
  return <EditForm key={transaction.id} transaction={transaction} currentUserId={currentUserId} onClose={onClose} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUDIT TRAIL MODAL — matches Screenshot 4 timeline design
// ─────────────────────────────────────────────────────────────────────────────

export function AuditTrailModal({
  isOpen,
  onClose,
  transaction,
  customerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  customerName: string;
}) {
  if (!isOpen || !transaction) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-900">Audit Trail - Transaction</h3>
            <p className="text-xs text-gray-500 mt-0.5">From {customerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-lg leading-none font-medium"
          >
            x
          </button>
        </div>

        {/* Timeline */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {transaction.auditLogs && transaction.auditLogs.length > 0 ? (
            <div className="space-y-4">
              {transaction.auditLogs.map((log, idx) => {
                const isCreated = log.action === 'CREATED';
                const oldAmt = log.oldValue?.amount as string | undefined;
                const newAmt = log.newValue?.amount as string | undefined;
                const method = log.newValue?.method as string | undefined;
                const type = log.newValue?.type as string | undefined;

                return (
                  <div key={log.id} className="flex gap-3">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCreated ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'}`}>
                        <div className={`w-2 h-2 rounded-full ${isCreated ? 'bg-green-500' : 'bg-blue-500'}`} />
                      </div>
                      {idx < (transaction.auditLogs?.length ?? 0) - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isCreated ? 'text-green-700' : 'text-blue-700'}`}>
                          {isCreated ? 'Transaction Created' : 'Transaction Edited'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.timestamp).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2">By {log.userId}</p>

                      {/* Details box */}
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs space-y-1">
                        {isCreated && (
                          <>
                            {newAmt && <p><span className="text-gray-500">Amount:</span> {isCreated ? '+' : ''}₹{newAmt}</p>}
                            {type && <p><span className="text-gray-500">Type:</span> {type === 'PAYMENT_RECEIVED' ? 'Payment Received' : 'Credit Given'}</p>}
                            {method && <p><span className="text-gray-500">Method:</span> {method}</p>}
                            {(log.newValue?.description as string) && (
                              <p><span className="text-gray-500">Description:</span> {log.newValue?.description as string}</p>
                            )}
                          </>
                        )}
                        {!isCreated && (
                          <>
                            {oldAmt && newAmt && (
                              <p className="flex items-center gap-2">
                                <span className="text-gray-500">Amount:</span>
                                <span className="text-gray-700">₹{oldAmt}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600 font-semibold">₹{newAmt}</span>
                              </p>
                            )}
                            {(log.newValue?.description as string) && (
                              <p><span className="text-gray-500">Description:</span> {log.newValue?.description as string}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">No audit history available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SEND NOTICE MODAL
// ─────────────────────────────────────────────────────────────────────────────

export function SendNoticeModal({
  isOpen,
  onClose,
  customerName,
  amountDue,
}: {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  amountDue: string;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Send Payment Notice</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg leading-none font-medium">x</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-gray-600">
            Customer: <span className="font-semibold text-gray-900">{customerName}</span>
          </p>

          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700">
            <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Message Preview</p>
            <p className="italic">
              &quot;Hi {customerName}, you have an outstanding amount of ₹{amountDue}.&quot;
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { alert(`Notice sent to ${customerName}`); onClose(); }}
              className="flex-1 h-10 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
            >
              Send Notice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}