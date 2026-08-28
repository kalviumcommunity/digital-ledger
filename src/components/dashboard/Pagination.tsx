'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/app/dashboard/types';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export default function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, totalPages, total, limit } = meta;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Build page number array (show up to 5 pages around current)
  const pages: (number | '...')[] = [];
  if (totalPages <= 6) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1 pt-3 border-t border-gray-100">
      {/* Item count */}
      <p className="text-xs text-gray-400">
        Showing <span className="font-semibold text-gray-600">{startItem}–{endItem}</span> of{' '}
        <span className="font-semibold text-gray-600">{total}</span> transactions
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          id="pagination-prev"
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              id={`pagination-page-${p}`}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={`h-7 min-w-[28px] px-2 flex items-center justify-center rounded-lg text-xs font-medium transition ${
                p === page
                  ? 'bg-gray-900 text-white border border-gray-900'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          id="pagination-next"
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
