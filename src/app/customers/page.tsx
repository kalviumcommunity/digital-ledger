'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, UserCheck } from 'lucide-react';

interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  amountDue: string;
}

const CUSTOMERS: CustomerListItem[] = [
  { id: '1', name: 'Alisha Thakur', phone: '9356xxxxxx', amountDue: '3,045.23' },
  { id: '2', name: 'Rahul Chaudhary', phone: '9812xxxxxx', amountDue: '14,343.33' },
  { id: '3', name: 'Juhi Aggarwal', phone: '9876xxxxxx', amountDue: '17,591.65' },
];

export default function CustomersListPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      <main className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
            <p className="text-xs text-slate-500 mt-1">Select any customer to open their ledger and audit timeline.</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {CUSTOMERS.length} Active
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
          {CUSTOMERS.map((customer) => (
            <div
              key={customer.id}
              className="p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700">
                  <UserCheck className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-base">{customer.name}</p>
                  <p className="text-xs font-mono text-slate-500">{customer.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount Due</p>
                  <p className="text-sm font-bold text-rose-600 tabular-nums">₹{customer.amountDue}</p>
                </div>

                <Link
                  href={`/customers/${customer.id}`}
                  className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition active:scale-95 shadow-sm"
                >
                  View Ledger
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}