import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { 
  Users, 
  Search, 
  UserPlus, 
  ChevronRight, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft 
} from 'lucide-react';
import { TransactionType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface CustomerListItem {
  id: string;
  dbId: string;
  name: string;
  totalCredit: number;
  totalPaid: number;
  balanceDue: number;
  lastActive: string;
  transactionCount: number;
}

export default async function CustomersPage() {
  const ledgers = await prisma.ledger.findMany({
    include: {
      transactions: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Calculate per-customer totals cleanly
  const customers: CustomerListItem[] = ledgers.map((ledger) => {
    const totalCredit = ledger.transactions
      .filter((tx) => tx.type === TransactionType.CREDIT)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalPaid = ledger.transactions
      .filter((tx) => tx.type !== TransactionType.CREDIT)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const balanceDue = totalCredit - totalPaid;

    return {
      id: ledger.shopkeeperId,
      dbId: ledger.id,
      name: ledger.title || 'Unnamed Account',
      totalCredit,
      totalPaid,
      balanceDue,
      lastActive: ledger.transactions[0]?.createdAt 
        ? new Date(ledger.transactions[0].createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })
        : 'No activity',
      transactionCount: ledger.transactions.length,
    };
  });

  // Calculate overall aggregates using pure reduce
  const overallCredit = customers.reduce((sum, c) => sum + c.totalCredit, 0);
  const overallPaid = customers.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalOutstanding = overallCredit - overallPaid;

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      <main className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Customer Accounts
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {customers.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage accounts, pending credit balances, and transaction records.
            </p>
          </div>

          <Link
            href="/customers/shopkeeper_101"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Quick Ledger
          </Link>
        </div>

        {/* Aggregate Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Credit Given
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">
              ₹{overallCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Payments Received
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 tracking-tight">
              ₹{overallPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm bg-gradient-to-br from-white to-rose-50/20">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                Total Market Due
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-100/70 flex items-center justify-center text-rose-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-600 tracking-tight">
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Directory Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">All Customers</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                className="pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 w-full sm:w-56"
              />
            </div>
          </div>

          {customers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              No customer ledgers found in database.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <Link
                  key={customer.dbId}
                  href={`/customers/${customer.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {customer.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {customer.transactionCount} transactions · Last active {customer.lastActive}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                        Balance Due
                      </p>
                      <p
                        className={`text-sm font-bold tabular-nums mt-0.5 ${
                          customer.balanceDue > 0
                            ? 'text-rose-600'
                            : customer.balanceDue < 0
                            ? 'text-emerald-600'
                            : 'text-slate-600'
                        }`}
                      >
                        ₹{customer.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}