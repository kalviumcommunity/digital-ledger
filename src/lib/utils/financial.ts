/**
 * Financial Calculation Utilities for Person 2's Dashboard
 * 
 * Implements precision-safe accounting calculations using integer paise (cents)
 * to avoid floating-point arithmetic errors.
 */

export interface TransactionFinancialItem {
  type: 'CREDIT' | 'DEBIT' | 'CREDIT_GIVEN' | 'PAYMENT_RECEIVED';
  amount: number | string;
  isDeleted?: boolean;
}

export interface FinancialSummary {
  balance: number;
  creditGiven: number;
  totalPaid: number;
}

/**
 * Converts a rupee amount to integer paise (cents) to avoid floating point precision issues.
 */
export function toPaise(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer paise back to rupees with 2 decimal precision.
 */
export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Calculates Dashboard Financial Summary (Balance & Credit Given)
 * from a list of transactions according to project business rules:
 * 
 * - Credit Given = Sum of all active CREDIT transactions
 * - Total Paid = Sum of all active DEBIT transactions
 * - Balance = Total Credit Given - Total Paid (Net Outstanding / Amount Due to Shopkeeper)
 * 
 * Example:
 * Credit ₹10,000 + Payment ₹4,000 => Credit Given: ₹10,000, Balance: ₹6,000
 */
export function calculateFinancialSummary(
  transactions: TransactionFinancialItem[]
): FinancialSummary {
  let totalCreditPaise = 0;
  let totalPaidPaise = 0;

  for (const tx of transactions) {
    if (tx.isDeleted) continue;

    const amountPaise = toPaise(tx.amount);
    if (amountPaise <= 0) continue;

    if (tx.type === 'CREDIT' || tx.type === 'CREDIT_GIVEN') {
      totalCreditPaise += amountPaise;
    } else if (tx.type === 'DEBIT' || tx.type === 'PAYMENT_RECEIVED') {
      totalPaidPaise += amountPaise;
    }
  }

  const creditGiven = fromPaise(totalCreditPaise);
  const totalPaid = fromPaise(totalPaidPaise);
  const balance = fromPaise(totalCreditPaise - totalPaidPaise);

  return {
    balance,
    creditGiven,
    totalPaid,
  };
}
