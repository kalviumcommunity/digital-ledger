'use client';

import React from 'react';
import { formatNumber } from '@/app/dashboard/mockData';

interface CreditGivenCardProps {
  creditGiven: number;
}

export default function CreditGivenCard({ creditGiven }: CreditGivenCardProps) {
  return (
    <div className="border border-gray-400 rounded-2xl px-4 py-2.5 bg-white flex items-center justify-between gap-2 flex-1 shadow-sm">
      <span className="text-xs font-semibold text-gray-900">Credit Given:</span>
      <span className="text-base font-extrabold text-red-600 tabular-nums">
        {formatNumber(creditGiven)}
      </span>
    </div>
  );
}
