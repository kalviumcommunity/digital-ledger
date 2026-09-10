import { NextResponse } from 'next/server';

export type TransactionTypeEnum = 'CREDIT' | 'DEBIT';
export type PaymentMethodType = 'Cash' | 'UPI' | 'Bank Transfer';

export const ALLOWED_PAYMENT_METHODS: PaymentMethodType[] = ['Cash', 'UPI', 'Bank Transfer'];

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export function apiSuccess<T>(data: T, status: number = 200, pagination?: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}) {
  const body: Record<string, unknown> = {
    success: true,
    data,
  };
  if (pagination) {
    body.pagination = pagination;
  }
  return NextResponse.json(body, { status });
}

export function apiError(
  code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR',
  message: string,
  status: number = 400,
  details?: ValidationErrorDetail[]
) {
  const body: Record<string, unknown> = {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

export interface ValidatedCreateTransactionInput {
  ledgerId: string;
  type: TransactionTypeEnum;
  amount: number;
  date: Date;
  paymentMethod: string;
  note: string | null;
}

export function validateCreateTransaction(body: unknown): {
  isValid: boolean;
  data?: ValidatedCreateTransactionInput;
  details?: ValidationErrorDetail[];
} {
  const details: ValidationErrorDetail[] = [];

  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      details: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const raw = body as Record<string, unknown>;

  // Customer ID / Ledger ID
  const customerId = raw.ledgerId ?? raw.customerId;
  if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
    details.push({ field: 'ledgerId', message: 'Customer/Ledger ID is required' });
  }

  // Type
  let normalizedType: TransactionTypeEnum | undefined;
  if (!raw.type || typeof raw.type !== 'string') {
    details.push({ field: 'type', message: 'Transaction type is required' });
  } else {
    const t = raw.type.trim().toUpperCase();
    if (t === 'CREDIT' || t === 'CREDIT_GIVEN') {
      normalizedType = 'CREDIT';
    } else if (t === 'DEBIT' || t === 'PAYMENT_RECEIVED') {
      normalizedType = 'DEBIT';
    } else {
      details.push({
        field: 'type',
        message: "Type must be 'CREDIT' or 'DEBIT' ('CREDIT_GIVEN' or 'PAYMENT_RECEIVED')",
      });
    }
  }

  // Amount
  let amountNum: number | undefined;
  if (raw.amount === undefined || raw.amount === null || raw.amount === '') {
    details.push({ field: 'amount', message: 'Amount is required' });
  } else {
    amountNum = Number(raw.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      details.push({ field: 'amount', message: 'Amount must be a positive number greater than zero' });
    } else {
      // Check decimal places (max 2)
      const parts = raw.amount.toString().split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        details.push({ field: 'amount', message: 'Amount cannot have more than 2 decimal places' });
      }
    }
  }

  // Date
  let dateObj = new Date();
  if (raw.date !== undefined && raw.date !== null && raw.date !== '') {
    const d = new Date(String(raw.date));
    if (isNaN(d.getTime())) {
      details.push({ field: 'date', message: 'Date must be a valid ISO 8601 datetime' });
    } else {
      dateObj = d;
    }
  }

  // Payment Method
  let paymentMethodStr = 'Cash';
  if (raw.paymentMethod === undefined || raw.paymentMethod === null || raw.paymentMethod === '') {
    details.push({ field: 'paymentMethod', message: 'Payment method is required' });
  } else if (typeof raw.paymentMethod !== 'string' || !ALLOWED_PAYMENT_METHODS.includes(raw.paymentMethod as PaymentMethodType)) {
    details.push({
      field: 'paymentMethod',
      message: `Payment method must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
    });
  } else {
    paymentMethodStr = raw.paymentMethod;
  }

  // Note / Description
  let noteStr: string | null = null;
  const rawNote = raw.note ?? raw.description;
  if (rawNote !== undefined && rawNote !== null) {
    if (typeof rawNote !== 'string') {
      details.push({ field: 'note', message: 'Note must be a string' });
    } else if (rawNote.length > 500) {
      details.push({ field: 'note', message: 'Note must be 500 characters or fewer' });
    } else {
      noteStr = rawNote;
    }
  }

  if (details.length > 0) {
    return { isValid: false, details };
  }

  return {
    isValid: true,
    data: {
      ledgerId: String(customerId).trim(),
      type: normalizedType!,
      amount: amountNum!,
      date: dateObj,
      paymentMethod: paymentMethodStr,
      note: noteStr,
    },
  };
}

export interface ValidatedUpdateTransactionInput {
  type?: TransactionTypeEnum;
  amount?: number;
  date?: Date;
  paymentMethod?: string;
  note?: string | null;
}

export function validateUpdateTransaction(body: unknown): {
  isValid: boolean;
  data?: ValidatedUpdateTransactionInput;
  details?: ValidationErrorDetail[];
} {
  const details: ValidationErrorDetail[] = [];

  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      details: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const raw = body as Record<string, unknown>;
  const data: ValidatedUpdateTransactionInput = {};

  // Type
  if (raw.type !== undefined) {
    if (typeof raw.type !== 'string') {
      details.push({ field: 'type', message: 'Type must be a string' });
    } else {
      const t = raw.type.trim().toUpperCase();
      if (t === 'CREDIT' || t === 'CREDIT_GIVEN') {
        data.type = 'CREDIT';
      } else if (t === 'DEBIT' || t === 'PAYMENT_RECEIVED') {
        data.type = 'DEBIT';
      } else {
        details.push({
          field: 'type',
          message: "Type must be 'CREDIT' or 'DEBIT' ('CREDIT_GIVEN' or 'PAYMENT_RECEIVED')",
        });
      }
    }
  }

  // Amount
  if (raw.amount !== undefined) {
    if (raw.amount === null) {
      details.push({ field: 'amount', message: 'Amount must be a positive number greater than zero' });
    } else {
      const amountNum = Number(raw.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        details.push({ field: 'amount', message: 'Amount must be a positive number greater than zero' });
      } else {
        const parts = String(raw.amount).split('.');
        if (parts.length > 1 && parts[1].length > 2) {
          details.push({ field: 'amount', message: 'Amount cannot have more than 2 decimal places' });
        }
        data.amount = amountNum;
      }
    }
  }

  // Date
  if (raw.date !== undefined) {
    const d = new Date(String(raw.date));
    if (isNaN(d.getTime())) {
      details.push({ field: 'date', message: 'Date must be a valid ISO 8601 datetime' });
    } else {
      data.date = d;
    }
  }

  // Payment Method
  if (raw.paymentMethod !== undefined) {
    if (typeof raw.paymentMethod !== 'string' || !ALLOWED_PAYMENT_METHODS.includes(raw.paymentMethod as PaymentMethodType)) {
      details.push({
        field: 'paymentMethod',
        message: `Payment method must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      });
    } else {
      data.paymentMethod = raw.paymentMethod;
    }
  }

  // Note
  const rawNote = raw.note ?? raw.description;
  if (rawNote !== undefined) {
    if (rawNote === null) {
      data.note = null;
    } else if (typeof rawNote !== 'string') {
      details.push({ field: 'note', message: 'Note must be a string or null' });
    } else if (rawNote.length > 500) {
      details.push({ field: 'note', message: 'Note must be 500 characters or fewer' });
    } else {
      data.note = rawNote;
    }
  }

  if (details.length > 0) {
    return { isValid: false, details };
  }

  return { isValid: true, data };
}
