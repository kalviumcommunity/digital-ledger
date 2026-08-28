'use client';

import React, { useState } from 'react';
import { Search, Moon, Settings } from 'lucide-react';

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function DashboardHeader({
  searchQuery,
  onSearchChange,
}: DashboardHeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center shrink-0">
          {/* Book/ledger icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <span className="text-xl font-bold text-red-600 tracking-tight">Khatabook</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search + Filter pill */}
        <div className="flex items-center border border-gray-300 rounded-full bg-white overflow-hidden">
          <div className="flex items-center pl-4 pr-1 py-1.5">
            <Search size={14} className="text-gray-400 shrink-0 mr-2" />
            <input
              id="dashboard-global-search"
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="outline-none text-sm w-60 bg-transparent text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="relative">
            <button
              id="dashboard-header-filter"
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="border-l border-gray-300 px-4 py-1.5 flex items-center gap-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              Filter
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-9 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-44">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">Filter by type</p>
                {['All', 'Payment Received', 'Credit Given'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Moon / dark toggle */}
        <button
          id="dashboard-dark-toggle"
          type="button"
          className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition"
          title="Toggle dark mode"
        >
          <Moon size={17} className="text-white" />
        </button>

        {/* Settings */}
        <button
          id="dashboard-settings"
          type="button"
          className="text-gray-600 hover:text-gray-900 transition"
          title="Settings"
        >
          <Settings size={24} />
        </button>
      </div>
    </header>
  );
}
