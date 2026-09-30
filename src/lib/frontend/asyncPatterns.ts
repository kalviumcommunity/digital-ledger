/**
 * ============================================================================
 * JAVASCRIPT CONCEPT: PROMISES VS CALLBACKS (FRONTEND ASYNCHRONOUS PATTERNS)
 * ============================================================================
 * 
 * 1. WHAT ARE CALLBACKS?
 * A callback is a function passed as an argument to another function, which is
 * invoked after some asynchronous operation (network request, timer, file I/O)
 * completes.
 * 
 * - The Node/Browser standard is the "Error-First Callback" signature:
 *     callback(error: Error | null, result?: T): void
 * - Limitations of Callbacks:
 *     a) "Callback Hell" / Pyramid of Doom: Deep nesting when chaining async steps.
 *     b) Inversion of Control: You trust the calling function to invoke your
 *        callback exactly once (neither zero times nor multiple times).
 *     c) Error Handling: Difficult to catch exceptions; try/catch blocks do NOT
 *        catch errors thrown asynchronously inside callbacks.
 * 
 * 2. WHAT ARE PROMISES?
 * A Promise is an object representing the eventual completion (or failure) of an
 * asynchronous operation, and its resulting value.
 * 
 * - Three Mutual States:
 *     - Pending: Initial state, neither fulfilled nor rejected.
 *     - Fulfilled: The operation completed successfully (triggers `.then()`).
 *     - Rejected: The operation failed (triggers `.catch()`).
 * - Advantages of Promises:
 *     a) Linear Chaining: Flattens pyramids into `.then().then().catch()`.
 *     b) Robust Error Propagation: An error at any stage bubbles to `.catch()`.
 *     c) Composition: Native methods like `Promise.all()`, `Promise.allSettled()`.
 *     d) Foundation for `async / await`: Clean, synchronous-looking syntax.
 * 
 * 3. PROMISE VS CALLBACK COMPARISON MATRIX:
 * ┌───────────────────────┬───────────────────────────────┬───────────────────────────────┐
 * │ Dimension             │ Callbacks                     │ Promises / async-await        │
 * ├───────────────────────┼───────────────────────────────┼───────────────────────────────┤
 * │ Chaining              │ Nested indentation (Pyramid)  │ Linear `.then()` or `await`   │
 * │ Error Handling        │ Inconsistent (check `if (err)`)│ Centralized `.catch()` or `try/catch`│
 * │ Inversion of Control  │ High (third party calls code) │ Low (Promise returns a value) │
 * │ Multiple Invocations  │ Risk of multiple callbacks    │ Guaranteed resolved once only │
 * │ Composition           │ Manual counter tracking       │ `Promise.all()`, `Promise.race`│
 * └───────────────────────┴───────────────────────────────┴───────────────────────────────┘
 */

export interface TransactionSummaryData {
  customerName: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  method: string;
  timestamp: string;
}

export interface FormattedReceipt {
  receiptId: string;
  title: string;
  summaryText: string;
  generatedAt: string;
  formattedAmount: string;
}

export type ErrorFirstCallback<T> = (error: Error | null, result?: T) => void;

/**
 * ----------------------------------------------------------------------------
 * PATTERN A: ASYNCHRONOUS CALLBACK PATTERN
 * ----------------------------------------------------------------------------
 * Demonstrates the classic error-first callback pattern.
 * The function accepts a callback as its final argument: (err, result).
 */
export function generateReceiptWithCallback(
  data: TransactionSummaryData,
  callback: ErrorFirstCallback<FormattedReceipt>
): void {
  // Simulating asynchronous processing (e.g., calculations, validation, formatting)
  setTimeout(() => {
    // 1. Error handling demonstration in callbacks:
    if (!data.customerName || data.customerName.trim().length === 0) {
      const err = new Error("Invalid Customer: Name is required to generate receipt.");
      callback(err); // First argument is Error, second is undefined
      return;
    }

    if (data.amount <= 0) {
      const err = new Error("Invalid Amount: Transaction amount must be greater than zero.");
      callback(err);
      return;
    }

    // 2. Success handling demonstration in callbacks:
    const receipt: FormattedReceipt = {
      receiptId: `REC-${Date.now().toString().slice(-6)}`,
      title: data.type === "CREDIT" ? "Credit Issued Receipt" : "Payment Received Receipt",
      summaryText: `${data.customerName} - ${data.type === "CREDIT" ? "Udhar Given" : "Payment Collected"} via ${data.method}`,
      formattedAmount: `INR ${data.amount.toFixed(2)}`,
      generatedAt: new Date().toISOString(),
    };

    callback(null, receipt); // First argument is null (no error), second is result
  }, 50);
}

/**
 * ----------------------------------------------------------------------------
 * PATTERN B: MODERN PROMISE PATTERN
 * ----------------------------------------------------------------------------
 * Demonstrates the modern Promise pattern returning a Promise<FormattedReceipt>.
 * Allows caller to use `.then().catch()` or `await`.
 */
export function generateReceiptWithPromise(
  data: TransactionSummaryData
): Promise<FormattedReceipt> {
  return new Promise<FormattedReceipt>((resolve, reject) => {
    // Asynchronous task inside the Promise constructor:
    setTimeout(() => {
      // 1. Error condition triggers reject()
      if (!data.customerName || data.customerName.trim().length === 0) {
        reject(new Error("Invalid Customer: Name is required to generate receipt."));
        return;
      }

      if (data.amount <= 0) {
        reject(new Error("Invalid Amount: Transaction amount must be greater than zero."));
        return;
      }

      // 2. Success condition triggers resolve()
      const receipt: FormattedReceipt = {
        receiptId: `REC-${Date.now().toString().slice(-6)}`,
        title: data.type === "CREDIT" ? "Credit Issued Receipt" : "Payment Received Receipt",
        summaryText: `${data.customerName} - ${data.type === "CREDIT" ? "Udhar Given" : "Payment Collected"} via ${data.method}`,
        formattedAmount: `INR ${data.amount.toFixed(2)}`,
        generatedAt: new Date().toISOString(),
      };

      resolve(receipt);
    }, 50);
  });
}

/**
 * ----------------------------------------------------------------------------
 * PATTERN C: PROMISIFICATION (CONVERTING CALLBACKS TO PROMISES)
 * ----------------------------------------------------------------------------
 * A generic higher-order utility that converts ANY callback-based asynchronous
 * function into a Promise-returning function.
 * 
 * This shows how legacy callback-based APIs (e.g. FileReader, geolocation,
 * Node fs) can be adapted to modern Promise/async-await codebases.
 */
export function promisify<T, A>(
  fn: (arg: A, callback: ErrorFirstCallback<T>) => void
): (arg: A) => Promise<T> {
  return function (arg: A): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      fn(arg, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result as T);
        }
      });
    });
  };
}

/**
 * Convenience promisified version of the callback receipt generator:
 */
export const generateReceiptPromisified = promisify<FormattedReceipt, TransactionSummaryData>(
  generateReceiptWithCallback
);
