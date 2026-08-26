'use client';

import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import type { Transaction } from '@/app/customers/[id]/page';

// 1. ADD TRANSACTION MODAL
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
  const [method, setMethod] = useState('Cash');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Transaction Created: ₹${amount} (${type}) via ${method}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-black transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">Add Transaction</h3>
        <p className="text-xs text-gray-500 mb-5">
          Customer: <span className="font-semibold text-gray-800">{customerName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('CREDIT_GIVEN')}
              className={`p-3 text-left rounded-2xl border transition-all ${
                type === 'CREDIT_GIVEN'
                  ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20 text-rose-800 font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <p className="text-sm font-bold">Credit Given</p>
              <p className="text-xs text-gray-500 mt-0.5">You gave credit</p>
            </button>
            <button
              type="button"
              onClick={() => setType('PAYMENT_RECEIVED')}
              className={`p-3 text-left rounded-2xl border transition-all ${
                type === 'PAYMENT_RECEIVED'
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-800 font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <p className="text-sm font-bold">Payment Received</p>
              <p className="text-xs text-gray-500 mt-0.5">You received payment</p>
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-semibold text-lg"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white text-sm"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Goods Purchase"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition active:scale-95 shadow-md"
          >
            Submit Transaction
          </button>
        </form>
      </div>
    </div>
  );
}

// 2. EDIT TRANSACTION MODAL (WITH CONCURRENCY PROTECTION)
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

  const isLockedByOther =
    Boolean(transaction.lockedBy && transaction.lockedBy !== currentUserId);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-black transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">Edit Transaction</h3>
        <p className="text-xs text-gray-500 mb-4">Transaction #{transaction.id}</p>

        {isLockedByOther ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-start gap-3 mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Concurrent Edit In Progress</p>
              <p className="text-xs mt-0.5">
                This transaction is currently being edited by <strong>{transaction.lockedBy}</strong>[cite: 1, 2].
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700">Amount</label>
            <input
              type="text"
              disabled={isLockedByOther}
              defaultValue={transaction.amount}
              className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Description</label>
            <input
              type="text"
              disabled={isLockedByOther}
              defaultValue={transaction.description || ''}
              className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Password</label>
            <input
              type="password"
              disabled={isLockedByOther}
              placeholder="••••••••"
              className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLockedByOther}
              onClick={() => {
                alert('Transaction updated successfully');
                onClose();
              }}
              className="w-1/2 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md transition"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. AUDIT TRAIL MODAL
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative shadow-2xl border border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-black transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">Audit Trail - Transaction</h3>
        <p className="text-xs text-gray-500 mb-5">
          From <span className="font-semibold text-gray-800">{customerName}</span>[cite: 1, 2]
        </p>

        <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200 max-h-[60vh] overflow-y-auto pr-2">
          {transaction.auditLogs && transaction.auditLogs.length > 0 ? (
            transaction.auditLogs.map((log) => {
              const oldAmt = log.oldValue?.amount as string | number | undefined;
              const newAmt = log.newValue?.amount as string | number | undefined;
              const method = log.newValue?.method as string | undefined;
              const type = log.newValue?.type as string | undefined;

              return (
                <div key={log.id} className="relative flex items-start gap-4 ml-1">
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center shrink-0 z-10">
                    <div className="w-2 h-2 rounded-full bg-black" />
                  </div>
                  <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 w-full text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">
                        {log.action === 'CREATED' ? '+ Transaction Created' : '✎ Transaction Edited'}[cite: 1, 2]
                      </span>
                      <span className="text-gray-400">
                        {new Date(log.timestamp).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}[cite: 1, 2]
                      </span>
                    </div>
                    <p className="text-gray-500 font-medium">By {log.userId}</p>

                    {log.action === 'EDITED' && (
                      <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                        <span>Amount:</span>
                        {oldAmt && <span className="line-through text-rose-500">₹{oldAmt}</span>}
                        {newAmt && <span className="font-bold text-emerald-600">₹{newAmt}</span>}[cite: 1, 2]
                      </div>
                    )}

                    {log.action === 'CREATED' && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-gray-700 space-y-0.5">
                        {newAmt && <p>Amount: +₹{newAmt}</p>}
                        {type && <p>Type: {type === 'PAYMENT_RECEIVED' ? 'Payment Received' : 'Credit Given'}</p>}
                        {method && <p>Method: {method}</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">No audit history records available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// 4. SEND NOTICE MODAL
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-black transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">Send Payment Notice</h3>
        <p className="text-xs text-gray-500 mb-4">
          Customer: <span className="font-semibold text-gray-800">{customerName}</span>[cite: 1, 2]
        </p>

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-sm text-gray-800 mb-6 space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase">Message Preview</p>
          <p className="italic font-serif">
            &quot;Hi {customerName}, you have an outstanding amount of ₹{amountDue}.&quot;[cite: 1, 2]
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              alert(`Notice sent to ${customerName}`);
              onClose();
            }}
            className="w-1/2 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 shadow-md transition active:scale-95"
          >
            Send Notice
          </button>
        </div>
      </div>
    </div>
  );
}