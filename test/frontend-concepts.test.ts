import {
  createDebounce,
  createRateLimiter,
  createBalanceCalculator,
} from "../src/lib/frontend/closures";
import {
  generateReceiptWithCallback,
  generateReceiptWithPromise,
  promisify,
  type TransactionSummaryData,
} from "../src/lib/frontend/asyncPatterns";

async function runFrontendConceptsTestSuite() {
  console.log("======================================================");
  console.log("🧪 Running Frontend Concepts Test Suite (Closures & Async)");
  console.log("======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ==========================================================================
  // SUITE 1: JAVASCRIPT CLOSURES
  // ==========================================================================
  console.log("--- 1. Testing JavaScript Closures ---");

  // Test 1.1: State Encapsulation in Closure (createBalanceCalculator)
  const calc1 = createBalanceCalculator(100);
  assert(
    (calc1 as any).runningBalance === undefined,
    "Closure Encapsulation: runningBalance is private and inaccessible from outside"
  );
  calc1.addCredit(50);
  calc1.addCredit(25);
  calc1.addDebit(30);
  assert(
    calc1.getBalance() === 145,
    "Closure State: Methods access and mutate enclosed lexical scope variable (100 + 50 + 25 - 30 = 145)"
  );
  assert(
    calc1.getCount() === 3,
    "Closure State: Private transaction counter tracks calls across invocations"
  );

  // Test 1.2: Independent Lexical Environments across instances
  const calc2 = createBalanceCalculator(0);
  calc2.addCredit(500);
  assert(
    calc1.getBalance() === 145 && calc2.getBalance() === 500,
    "Closure Isolation: Separate factory calls create isolated, independent lexical environments"
  );

  // Test 1.3: Debounce Closure captures timerId
  let debouncedExecutedCount = 0;
  let lastReceivedValue = "";
  const debouncedFn = createDebounce((val: string) => {
    debouncedExecutedCount++;
    lastReceivedValue = val;
  }, 40);

  // Call rapidly 3 times
  debouncedFn("first");
  debouncedFn("second");
  debouncedFn("third");

  assert(
    debouncedFn.isPending() === true,
    "Debounce Closure: isPending() accesses enclosed timerId in private scope"
  );

  await new Promise((resolve) => setTimeout(resolve, 80));

  assert(
    debouncedExecutedCount === 1,
    "Debounce Closure: Groups rapid invocations into a single execution"
  );
  assert(
    lastReceivedValue === "third",
    "Debounce Closure: Delivers the latest arguments received"
  );

  // Test 1.4: Rate Limiter Closure
  const limiter = createRateLimiter(2, 100); // 2 calls allowed per 100ms
  assert(limiter.tryExecute() === true, "Rate Limiter: First call allowed");
  assert(limiter.tryExecute() === true, "Rate Limiter: Second call allowed");
  assert(limiter.tryExecute() === false, "Rate Limiter: Third call blocked (rate limit enforced)");
  assert(limiter.getRemainingCooldownMs() > 0, "Rate Limiter: Reports remaining cooldown duration");

  await new Promise((resolve) => setTimeout(resolve, 120));
  assert(limiter.tryExecute() === true, "Rate Limiter: Resumes allowance after window expires");

  // ==========================================================================
  // SUITE 2: JAVASCRIPT PROMISES VS CALLBACKS
  // ==========================================================================
  console.log("\n--- 2. Testing Promises vs Callbacks ---");

  const validTx: TransactionSummaryData = {
    customerName: "Aarav Sharma",
    amount: 1250.75,
    type: "CREDIT",
    method: "UPI",
    timestamp: new Date().toISOString(),
  };

  const invalidTx: TransactionSummaryData = {
    customerName: "",
    amount: -50,
    type: "CREDIT",
    method: "Cash",
    timestamp: new Date().toISOString(),
  };

  // Test 2.1: Error-First Callback Success
  await new Promise<void>((resolve) => {
    generateReceiptWithCallback(validTx, (err, receipt) => {
      assert(err === null, "Callback Pattern: err argument is null on success");
      assert(
        receipt !== undefined && receipt.formattedAmount === "INR 1250.75",
        "Callback Pattern: receipt result passed as second argument"
      );
      resolve();
    });
  });

  // Test 2.2: Error-First Callback Failure
  await new Promise<void>((resolve) => {
    generateReceiptWithCallback(invalidTx, (err, receipt) => {
      assert(err instanceof Error, "Callback Pattern: returns Error as first argument on invalid input");
      assert(receipt === undefined, "Callback Pattern: result is undefined when error occurs");
      resolve();
    });
  });

  // Test 2.3: Modern Promise Success (async/await)
  try {
    const receipt = await generateReceiptWithPromise(validTx);
    assert(
      receipt.formattedAmount === "INR 1250.75",
      "Promise Pattern: Resolves formatted receipt value via async/await"
    );
    assert(
      receipt.title === "Credit Issued Receipt",
      "Promise Pattern: Resolved payload contains correct structured fields"
    );
  } catch {
    assert(false, "Promise Pattern: Should not throw on valid input");
  }

  // Test 2.4: Modern Promise Failure (rejection handling)
  try {
    await generateReceiptWithPromise(invalidTx);
    assert(false, "Promise Pattern: Should have rejected on invalid input");
  } catch (err) {
    assert(
      err instanceof Error && err.message.includes("Invalid Customer"),
      "Promise Pattern: Rejection caught cleanly in try/catch block"
    );
  }

  // Test 2.5: Promisify higher-order converter
  const promisifiedFn = promisify(generateReceiptWithCallback);
  const promisifiedResult = await promisifiedFn(validTx);
  assert(
    promisifiedResult.receiptId.startsWith("REC-"),
    "Promisification: Successfully adapts error-first callback API into modern Promise"
  );

  console.log("\n======================================================");
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFrontendConceptsTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
