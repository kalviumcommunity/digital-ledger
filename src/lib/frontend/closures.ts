/**
 * ============================================================================
 * JAVASCRIPT CONCEPT: CLOSURES (FRONTEND ARCHITECTURE)
 * ============================================================================
 * 
 * WHAT IS A CLOSURE?
 * In JavaScript, a closure is the combination of a function bundled together
 * (enclosed) with references to its surrounding state (the lexical environment).
 * In simpler terms: a closure gives an inner function access to an outer function's
 * scope, even after the outer function has finished executing and returned.
 * 
 * WHY USE CLOSURES IN FRONTEND APPLICATIONS?
 * 1. Data Encapsulation & Privacy: Variables defined within the outer function
 *    cannot be accessed or tampered with directly from outside; they can only
 *    be read or modified via the returned inner function(s).
 * 2. State Preservation: Enables functions to "remember" state across multiple
 *    invocations without polluting global window scope or component state.
 * 3. Function Factories: Enables creating customized functions with preset
 *    configurations (e.g. debouncers, rate limiters, balance accumulators).
 * 
 * PRACTICAL FRONTEND IMPLEMENTATIONS BELOW:
 * - `createDebounce`: Debounces high-frequency input events (e.g., search bars).
 * - `createRateLimiter`: Limits UI actions (e.g., preventing OTP spamming).
 * - `createBalanceCalculator`: Encapsulated ledger math engine with private state.
 */

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * ----------------------------------------------------------------------------
 * 1. DEBOUNCE VIA CLOSURE (`createDebounce`)
 * ----------------------------------------------------------------------------
 * 
 * How Closure Works Here:
 * - Outer function `createDebounce` declares `timerId` inside its lexical scope.
 * - The returned function (and `.cancel()`) retains a persistent closure reference
 *   to `timerId`.
 * - Every time the returned debounced function is invoked, it clears the enclosed
 *   `timerId` and schedules a new timeout, effectively grouping rapid events.
 */
export interface DebouncedFunction<T extends (...args: any[]) => void> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  isPending: () => boolean;
}

export function createDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number
): DebouncedFunction<T> {
  // Lexical environment variable captured by the closure:
  let timerId: ReturnType<typeof setTimeout> | null = null;

  // Inner function 1: The debounced executor
  const debounced = function (...args: Parameters<T>) {
    if (timerId !== null) {
      clearTimeout(timerId); // Clears previously scheduled execution
    }

    timerId = setTimeout(() => {
      timerId = null;
      fn(...args);
    }, delayMs);
  };

  // Inner function 2: Closure method to cancel pending execution
  debounced.cancel = function () {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  // Inner function 3: Closure method to inspect pending status
  debounced.isPending = function (): boolean {
    return timerId !== null;
  };

  return debounced as DebouncedFunction<T>;
}

/**
 * ----------------------------------------------------------------------------
 * 2. ACTION RATE LIMITER VIA CLOSURE (`createRateLimiter`)
 * ----------------------------------------------------------------------------
 * 
 * How Closure Works Here:
 * - Outer function `createRateLimiter` declares an array of `callTimestamps`.
 * - This array is private and enclosed: outside code cannot manipulate the history.
 * - The inner function checks how many calls occurred within `windowMs`, and
 *   returns true (allowed) or false (blocked).
 */
export interface RateLimiter {
  tryExecute: () => boolean;
  getRemainingCooldownMs: () => number;
  reset: () => void;
}

export function createRateLimiter(
  maxCalls: number,
  windowMs: number
): RateLimiter {
  // Enclosed private state: list of execution timestamps
  let callTimestamps: number[] = [];

  return {
    // Closure method 1: Checks limit and records new execution
    tryExecute(): boolean {
      const now = Date.now();
      // Remove timestamps outside the sliding window
      callTimestamps = callTimestamps.filter((t) => now - t < windowMs);

      if (callTimestamps.length >= maxCalls) {
        return false; // Rate limit exceeded
      }

      callTimestamps.push(now);
      return true; // Allowed
    },

    // Closure method 2: Calculates remaining time until next allowed call
    getRemainingCooldownMs(): number {
      const now = Date.now();
      callTimestamps = callTimestamps.filter((t) => now - t < windowMs);

      if (callTimestamps.length < maxCalls) {
        return 0; // Not rate limited
      }

      const oldestInWindow = callTimestamps[0];
      return Math.max(0, windowMs - (now - oldestInWindow));
    },

    // Closure method 3: Clears the private timestamp history
    reset(): void {
      callTimestamps = [];
    },
  };
}

/**
 * ----------------------------------------------------------------------------
 * 3. STATE ACCUMULATOR VIA CLOSURE (`createBalanceCalculator`)
 * ----------------------------------------------------------------------------
 * 
 * How Closure Works Here:
 * - `runningBalance` and `txCount` are private variables enclosed within
 *   the lexical scope of `createBalanceCalculator`.
 * - Neither variable is directly accessible on the returned object; they can
 *   only be modified through `addCredit` / `addDebit` and read through `getBalance`.
 */
export interface BalanceCalculator {
  addCredit: (amount: number) => number;
  addDebit: (amount: number) => number;
  getBalance: () => number;
  getCount: () => number;
  reset: () => void;
}

export function createBalanceCalculator(initialBalance = 0): BalanceCalculator {
  // Enclosed private state variables
  let runningBalance = initialBalance;
  let txCount = 0;

  return {
    addCredit(amount: number): number {
      runningBalance += amount;
      txCount += 1;
      return runningBalance;
    },

    addDebit(amount: number): number {
      runningBalance -= amount;
      txCount += 1;
      return runningBalance;
    },

    getBalance(): number {
      return Math.round(runningBalance * 100) / 100;
    },

    getCount(): number {
      return txCount;
    },

    reset(): void {
      runningBalance = initialBalance;
      txCount = 0;
    },
  };
}

/**
 * ----------------------------------------------------------------------------
 * 4. REACT HOOK UTILIZING CLOSURE (`useDebounce`)
 * ----------------------------------------------------------------------------
 * Integrates the closure-based debouncer into React component lifecycles.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Closure captures 'value' inside setTimeout callback
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
