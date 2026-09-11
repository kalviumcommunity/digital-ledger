'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { DashboardCustomer } from '@/app/dashboard/types';
import { formatNumber } from '@/app/dashboard/mockData';

interface CustomerPanelProps {
  customers: DashboardCustomer[];
}

const FILTER_OPTIONS = ['Due Amount', 'No Due', 'All'];

export default function CustomerPanel({ customers }: CustomerPanelProps) {
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = customers.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);

    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Due Amount' && c.amountDue > 0) ||
      (activeFilter === 'No Due' && c.amountDue === 0);

    return matchSearch && matchFilter;
  });

  return (
    <div className="border border-gray-400 rounded-2xl bg-white p-4 flex flex-col h-full overflow-hidden shadow-sm">
      {/* Panel header */}
      <div className="pb-3">
        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Customers</h2>

        {/* Controls row */}
        <div className="flex items-end gap-2">
          {/* Filter By */}
          <div className="relative">
            <p className="text-[10px] font-bold text-gray-700 mb-1">Filter By:</p>
            <button
              id="customer-filter-btn"
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-400 rounded-md text-xs font-semibold text-gray-800 bg-white hover:bg-gray-50 transition"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {activeFilter === 'All' ? 'Select' : activeFilter}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-[54px] z-30 bg-white border border-gray-300 rounded-lg shadow-lg py-1 w-36">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setActiveFilter(opt);
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition ${
                      activeFilter === opt
                        ? 'bg-gray-100 font-bold text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Customer */}
          <div>
            <button
              id="add-customer-placeholder"
              type="button"
              onClick={() => alert('Customer management is handled by Person 1')}
              className="h-8 px-3 border border-gray-400 rounded-md text-xs font-semibold text-gray-800 bg-white hover:bg-gray-50 transition flex items-center gap-1 shrink-0"
            >
              + Add Customer
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                id="customer-panel-search"
                type="text"
                placeholder="Name or Phone Number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 h-8 border border-gray-400 rounded-md text-xs text-gray-800 placeholder-gray-400 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer list — scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 -mr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-gray-400 font-medium">No customers found</p>
          </div>
        ) : (
          filtered.map((customer) => {
            const hasDue = customer.amountDue > 0;
            return (
              <div
                key={customer.id}
                className="flex items-center gap-3 p-3.5 border border-gray-400 rounded-2xl bg-white hover:border-gray-500 transition"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gray-300 shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-gray-900 text-sm leading-tight truncate">{customer.name}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{customer.phone}</p>
                </div>

                {/* Amount + status */}
                <div className="text-right shrink-0">
                  <p
                    className={`font-black text-sm tabular-nums leading-tight ${
                      hasDue ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatNumber(customer.amountDue)}
                  </p>
                  <p
                    className={`text-[11px] font-bold mt-0.5 ${
                      hasDue ? 'text-red-500' : 'text-green-600'
                    }`}
                  >
                    {hasDue ? 'Amount Due' : 'No Due'}
                  </p>
                </div>

                {/* View Ledger button */}
                <Link
                  href={`/customers/${customer.id}`}
                  className="flex flex-col items-center justify-center border border-gray-400 rounded-lg w-12 py-1 hover:bg-gray-50 transition shrink-0 ml-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  <span className="text-[9px] font-bold text-gray-700 leading-tight mt-0.5">View</span>
                  <span className="text-[9px] font-bold text-gray-700 leading-tight">Ledger</span>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
