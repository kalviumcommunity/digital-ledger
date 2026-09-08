"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  Check,
  Copy,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Lock,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  acquireTransactionLock,
  addTransaction,
  deleteTransaction,
  getTransactionAuditLogs,
  releaseTransactionLock,
  updateTransaction,
} from "@/app/actions/ledger";
import { formatDateTime, formatINR } from "@/lib/format";
import { TRANSACTION_METHODS } from "@/lib/types";
import type { AuditLogEntry, SerializedTransaction, TransactionMethod } from "@/lib/types";

const LOCK_BANNER = {
  margin: "p-3 mb-4 rounded-xl border text-xs font-medium",
};

function ModalShell({
  title,
  subtitle,
  icon,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  title: string;
  subtitle: React.ReactNode;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-3xl w-full ${maxWidth} p-6 relative shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pr-10">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
      {message}
    </div>
  );
}

/* ---------------------------------- Add ---------------------------------- */

export function AddTransactionModal({
  isOpen,
  onClose,
  onSaved,
  ledgerId,
  customerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  ledgerId: string;
  customerName: string;
}) {
  const [type, setType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TransactionMethod>("Cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await addTransaction({
      ledgerId,
      type,
      amount: Number.parseFloat(amount),
      note,
      method,
    });
    setPending(false);

    if (result.success) {
      setType("CREDIT");
      setAmount("");
      setMethod("Cash");
      setNote("");
      onSaved();
      onClose();
    } else {
      setError(result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      title={type === "CREDIT" ? "Record Credit" : "Record Payment"}
      subtitle={`Add an entry for ${customerName}`}
      icon={<ArrowDownLeft className="w-5 h-5" />}
      onClose={onClose}
    >
      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
            Entry type
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("CREDIT")}
              className={`p-3 rounded-xl border text-left transition-all ${
                type === "CREDIT"
                  ? "border-rose-300 bg-rose-50/60 ring-2 ring-rose-100"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <ArrowDownLeft className="w-3.5 h-3.5" /> Credit
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Money you gave</p>
            </button>
            <button
              type="button"
              onClick={() => setType("DEBIT")}
              className={`p-3 rounded-xl border text-left transition-all ${
                type === "DEBIT"
                  ? "border-emerald-300 bg-emerald-50/60 ring-2 ring-emerald-100"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <ArrowUpRight className="w-3.5 h-3.5" /> Payment
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Money you received</p>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="tx-amount" className="block text-xs font-semibold text-slate-700">
            Amount (₹)
          </label>
          <input
            id="tx-amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

        <div>
          <label htmlFor="tx-method" className="block text-xs font-semibold text-slate-700">
            Payment method
          </label>
          <select
            id="tx-method"
            value={method}
            onChange={(e) => setMethod(e.target.value as TransactionMethod)}
            className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            {TRANSACTION_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tx-note" className="block text-xs font-semibold text-slate-700">
            Note (optional)
          </label>
          <textarea
            id="tx-note"
            rows={2}
            placeholder="e.g. Grocery purchase on credit"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="w-1/2 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className={`w-1/2 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
              type === "CREDIT"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save entry
              </>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------------------------------- Edit --------------------------------- */

type LockState = "acquiring" | "held" | "held_other" | "error";

export function EditTransactionModal({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: SerializedTransaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"CREDIT" | "DEBIT">(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [method, setMethod] = useState<TransactionMethod>(
    (TRANSACTION_METHODS as readonly string[]).includes(transaction.method)
      ? (transaction.method as TransactionMethod)
      : "Cash"
  );
  const [note, setNote] = useState(transaction.note ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [lock, setLock] = useState<LockState>("acquiring");
  const [lockOwner, setLockOwner] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ready = lock === "held" || lock === "error";

  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      setLock("acquiring");
      const result = await acquireTransactionLock({ transactionId: transaction.id });
      if (cancelled) return;
      if (result.success) {
        setLock("held");
      } else if (result.code === "LOCKED") {
        setLock("held_other");
        setLockOwner(result.lockedBy ?? null);
      } else {
        setLock("error");
        setLockError(result.error);
      }
    }
    if (lock !== "held") void acquire();
    return () => {
      cancelled = true;
    };
  }, [transaction.id, lock]);

  // Release the lock when the modal unmounts.
  useEffect(() => {
    return () => {
      void releaseTransactionLock({ transactionId: transaction.id });
    };
  }, [transaction.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConflict(false);
    setPending(true);

    const result = await updateTransaction({
      id: transaction.id,
      type,
      amount: Number.parseFloat(amount),
      note,
      method,
      currentVersion: transaction.version,
      password,
    });
    setPending(false);

    if (result.success) {
      await releaseTransactionLock({ transactionId: transaction.id });
      onSaved();
      onClose();
    } else if (result.code === "VERSION_CONFLICT") {
      setConflict(true);
    } else if (result.code === "INVALID_PASSWORD") {
      setError(result.error);
    } else {
      setError(result.error);
    }
  };

  return (
    <ModalShell
      title="Edit Transaction"
      subtitle="Applies to the running balance & audit trail"
      icon={<Pencil className="w-5 h-5" />}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      {lock === "held_other" && (
        <div className={`${LOCK_BANNER} bg-amber-50 border-amber-200 text-amber-800 flex items-start gap-2`}>
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Someone else is editing this entry.</p>
            <p className="mt-0.5">
              {lockOwner ?? "Another user"} holds the edit lock. You can view the
              original values but saving is disabled until they finish.
            </p>
          </div>
        </div>
      )}

      {lock === "acquiring" && (
        <div className={`${LOCK_BANNER} bg-slate-50 border-slate-200 text-slate-500 flex items-center gap-2`}>
          <Loader2 className="w-4 h-4 animate-spin" /> Acquiring edit lock…
        </div>
      )}

      {lock === "error" && lockError && (
        <div className={`${LOCK_BANNER} bg-rose-50 border-rose-200 text-rose-700`}>
          {lockError} You can still edit; your changes will be validated on save.
        </div>
      )}

      {conflict && (
        <div className={`${LOCK_BANNER} bg-amber-50 border-amber-200 text-amber-800`}>
          This entry was modified elsewhere while you were editing (version
          conflict). Close this dialog to reload the latest version, then re-apply
          your changes.
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType("CREDIT")}
            disabled={lock === "held_other"}
            className={`p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
              type === "CREDIT"
                ? "border-rose-300 bg-rose-50/60 ring-2 ring-rose-100"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Credit
            </span>
          </button>
          <button
            type="button"
            onClick={() => setType("DEBIT")}
            disabled={lock === "held_other"}
            className={`p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
              type === "DEBIT"
                ? "border-emerald-300 bg-emerald-50/60 ring-2 ring-emerald-100"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <ArrowUpRight className="w-3.5 h-3.5" /> Payment
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-amount" className="block text-xs font-semibold text-slate-700">
              Amount (₹)
            </label>
            <input
              id="edit-amount"
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={lock === "held_other"}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="edit-method" className="block text-xs font-semibold text-slate-700">
              Method
            </label>
            <select
              id="edit-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as TransactionMethod)}
              disabled={lock === "held_other"}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:bg-slate-50"
            >
              {TRANSACTION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="edit-note" className="block text-xs font-semibold text-slate-700">
            Note
          </label>
          <textarea
            id="edit-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={lock === "held_other"}
            className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none disabled:bg-slate-50"
          />
        </div>

        <div>
          <label htmlFor="edit-password" className="block text-xs font-semibold text-slate-700">
            Confirm your password
          </label>
          <input
            id="edit-password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Required to apply changes"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={lock === "held_other"}
            className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:bg-slate-50"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="w-1/2 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !ready}
            className="w-1/2 inline-flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition active:scale-95"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* --------------------------------- Delete -------------------------------- */

export function DeleteTransactionModal({
  transaction,
  customerName,
  onClose,
  onDeleted,
}: {
  transaction: SerializedTransaction;
  customerName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await deleteTransaction({
      id: transaction.id,
      password,
    });
    setPending(false);

    if (result.success) {
      onDeleted();
    } else if (result.code === "INVALID_PASSWORD") {
      setError(result.error);
    } else {
      setError(result.error);
    }
  };

  return (
    <ModalShell
      title="Delete Transaction"
      subtitle="Removes this entry and adjusts the balance"
      icon={<Trash2 className="w-5 h-5" />}
      onClose={onClose}
    >
      <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {transaction.type === "CREDIT" ? "Credit" : "Payment"} ·{" "}
              {formatINR(transaction.amount)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {customerName} · {formatDateTime(transaction.createdAt)}
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {transaction.note ? truncate(transaction.note, 40) : "No note"}
          </span>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="delete-password" className="block text-xs font-semibold text-slate-700">
            Confirm your password
          </label>
          <input
            id="delete-password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Required to delete"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="w-1/2 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="w-1/2 inline-flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition active:scale-95"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete entry
              </>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------------------------------- Audit -------------------------------- */

export function AuditTrailModal({
  transaction,
  onClose,
}: {
  transaction: SerializedTransaction;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLogs(null);
      setError(null);
      const result = await getTransactionAuditLogs(transaction.id);
      if (cancelled) return;
      if (result.success) setLogs(result.data);
      else setError(result.error);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [transaction.id]);

  return (
    <ModalShell
      title="Audit Trail"
      subtitle={`Immutable history · ${transaction.customerName}`}
      icon={<History className="w-5 h-5" />}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
        <p className="text-xs font-bold text-slate-900">
          {transaction.type === "CREDIT" ? "Credit" : "Payment"} ·{" "}
          {formatINR(transaction.amount)} · {truncate(transaction.note ?? "No note", 48)}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Recorded {formatDateTime(transaction.createdAt)}
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {!logs && !error ? (
        <div className="py-10 text-center text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Loading audit
          trail…
        </div>
      ) : logs && logs.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">
          No audit entries found for this transaction.
        </div>
      ) : (
        <ol className="relative border-l border-slate-200 ml-3 space-y-6">
          {logs?.map((log) => (
            <li key={log.id} className="ml-6 relative">
              <span className="absolute -left-[33px] top-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
                {log.action === "CREATE" ? (
                  <Check className="w-3 h-3" />
                ) : log.action === "EDIT" ? (
                  <Pencil className="w-3 h-3" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </span>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900">
                  {log.action === "CREATE"
                    ? "Created"
                    : log.action === "EDIT"
                    ? "Edited"
                    : "Deleted"}
                </p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    log.action === "CREATE"
                      ? "bg-emerald-50 text-emerald-700"
                      : log.action === "EDIT"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {log.action}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                by {log.actorId} · {formatDateTime(log.timestamp)}
              </p>

              {log.action === "EDIT" && (
                <div className="mt-2 overflow-x-auto">
                  <AuditDiff oldData={log.oldData} newData={log.newData} />
                </div>
              )}
              {log.action === "DELETE" && log.oldData && (
                <div className="mt-2 overflow-x-auto">
                  <ArgSnapshot label="Before deletion" data={log.oldData} accent="rose" />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </ModalShell>
  );
}

function AuditDiff({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  if (!oldData || !newData) return null;
  const keys = ["amount", "type", "note", "method", "version"];
  const changes = keys.filter((k) => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]));

  if (changes.length === 0) {
    return (
      <p className="text-[11px] text-slate-400 italic">
        No value changes recorded.
      </p>
    );
  }

  return (
    <table className="text-[11px] w-full min-w-[280px] border-collapse">
      <tbody>
        {changes.map((key) => (
          <tr key={key} className="border-b border-slate-100">
            <td className="py-1 pr-2 text-slate-500 font-semibold capitalize align-top">
              {key}
            </td>
            <td className="py-1 px-2 align-top">
              <span className="line-through text-rose-600/80">{renderAuditValue(oldData[key])}</span>
            </td>
            <td className="py-1 px-2 align-top text-emerald-700 font-semibold">
              {renderAuditValue(newData[key])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ArgSnapshot({
  label,
  data,
  accent,
}: {
  label: string;
  data: Record<string, unknown>;
  accent: "rose";
}) {
  return (
    <div className="text-[11px]">
      <p className={`font-bold ${accent === "rose" ? "text-rose-600" : ""}`}>{label}</p>
      <ul className="mt-1 space-y-0.5 text-slate-500">
        {Object.entries(data).map(([k, v]) => (
          <li key={k}>
            <span className="font-semibold text-slate-700 capitalize">{k}:</span>{" "}
            {renderAuditValue(v)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (value % 1 === 0) return value.toLocaleString("en-IN");
    return formatINR(Number(value.toFixed(2)));
  }
  return String(value);
}

/* --------------------------------- Invoice ------------------------------- */

export function InvoiceModal({
  transaction,
  customerName,
  customerPhone,
  ledgerId,
  balance,
  onClose,
}: {
  transaction: SerializedTransaction;
  customerName: string;
  customerPhone: string | null;
  ledgerId: string;
  balance: number;
  onClose: () => void;
}) {
  const handlePrint = () => {
    document.body.classList.add("printing");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing"), 500);
  };

  const isCredit = transaction.type === "CREDIT";
  const invoiceNumber = `TX-${transaction.id.slice(0, 8).toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative shadow-2xl border border-slate-100 print:shadow-none print:border-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        <div id="invoice-print">
          {/* Invoice body */}
          <div className="print:block">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black text-slate-900 tracking-tight">
                  KhataBook
                </p>
                <p className="text-[11px] text-slate-500">Digital Ledger · Transaction Memo</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {isCredit ? "Debit Memo" : "Receipt"}
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{invoiceNumber}</p>
              </div>
            </div>

            <div className="mt-6 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Customer</span>
                <span className="font-semibold text-slate-900">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Phone</span>
                <span className="font-mono text-slate-700">{customerPhone ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Date</span>
                <span className="text-slate-700">{formatDateTime(transaction.createdAt)}</span>
              </div>
              {transaction.note && (
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Note</span>
                  <span className="text-slate-700 text-right max-w-[220px]">{transaction.note}</span>
                </div>
              )}
            </div>

            <div
              className={`mt-6 rounded-2xl p-5 flex items-center justify-between ${
                isCredit ? "bg-rose-50" : "bg-emerald-50"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                {isCredit ? (
                  <>
                    <ArrowDownLeft className="w-4 h-4 text-rose-600" /> Amount given
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Amount received
                  </>
                )}
              </div>
              <p className={`text-2xl font-black tabular-nums ${isCredit ? "text-rose-700" : "text-emerald-700"}`}>
                {formatINR(transaction.amount)}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-dashed border-slate-200 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Payment method</span>
                <span className="font-semibold text-slate-900">{transaction.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Running balance</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {balance > 0 ? "Due " : "In your favour "}
                  {formatINR(Math.abs(balance))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Ledger ref</span>
                <span className="font-mono text-[11px] text-slate-500">{ledgerId}</span>
              </div>
            </div>

            <p className="mt-6 text-center text-[10px] text-slate-400">
              Thank you for your business. This is a computer-generated memo.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-1/2 inline-flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition active:scale-95"
          >
            <FileText className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Notice -------------------------------- */

export function NoticeModal({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  amountDue,
  latestTransaction,
}: {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string | null;
  amountDue: number;
  latestTransaction: SerializedTransaction | null;
}) {
  const [copied, setCopied] = useState(false);

  const message = `Dear ${customerName}, as per our records your outstanding balance with us stands at ${formatINR(
    amountDue
  )} as of ${latestTransaction ? formatDateTime(latestTransaction.createdAt) : new Date().toLocaleDateString("en-IN")}. Kindly arrange the payment at your earliest convenience. Thank you. — KhataBook`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const digits = customerPhone?.replace(/\D/g, "");
  const whatsappHref =
    digits && digits.length >= 10
      ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      : null;

  if (!isOpen) return null;

  return (
    <ModalShell
      title="Send Payment Notice"
      subtitle={`Outstanding reminder for ${customerName}`}
      icon={<BellRing className="w-5 h-5" />}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <MetaBox label="Balance due" value={formatINR(amountDue)} valueClass="text-rose-600" />
        <MetaBox
          label="Since"
          value={latestTransaction ? formatDateTime(latestTransaction.createdAt) : "—"}
        />
        <MetaBox label="Phone" value={digits ?? "Not on file"} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Message preview
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          type="button"
          onClick={handleCopy}
          className="w-1/2 inline-flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy message
            </>
          )}
        </button>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="w-1/2 inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition active:scale-95"
          >
            <MessageCircle className="w-4 h-4" /> Send on WhatsApp
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        ) : (
          <button
            type="button"
            onClick={handleCopy}
            disabled
            className="w-1/2 inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold opacity-40"
          >
            <Send className="w-4 h-4" /> WhatsApp unavailable
          </button>
        )}
      </div>
    </ModalShell>
  );
}

/* ---------------------------------- Shared -------------------------------- */

function MetaBox({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-sm font-bold mt-1 tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}