import { getBrevoApiKey, getBrevoSender, isEmailConfigured, sendOtpEmail } from "../src/lib/email";

async function runBrevoEmailTests() {
  console.log("======================================================");
  console.log("🧪 Running Brevo Email Service Unit & Contract Tests");
  console.log("======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // Preserve original env
  const origKey = process.env.BREVO_API_KEY;
  const origSenderEmail = process.env.BREVO_SENDER_EMAIL;
  const origSender = process.env.BREVO_SENDER;
  const origName = process.env.BREVO_SENDER_NAME;
  const origNodeEnv = process.env.NODE_ENV;

  try {
    // ----------------------------------------------------
    // Test 1: getBrevoApiKey returns undefined when unset
    // ----------------------------------------------------
    delete process.env.BREVO_API_KEY;
    assert(getBrevoApiKey() === undefined, "getBrevoApiKey() returns undefined when BREVO_API_KEY is not set");

    // ----------------------------------------------------
    // Test 2: getBrevoApiKey directly reads process.env.BREVO_API_KEY
    // ----------------------------------------------------
    process.env.BREVO_API_KEY = "test-brevo-key-123";
    assert(getBrevoApiKey() === "test-brevo-key-123", "getBrevoApiKey() directly reads process.env.BREVO_API_KEY");

    // Test stripping of surrounding quotes
    process.env.BREVO_API_KEY = '"test-quoted-key"';
    assert(getBrevoApiKey() === "test-quoted-key", "getBrevoApiKey() strips surrounding quotes");

    // ----------------------------------------------------
    // Test 3: No fallback sender when env vars are unset
    // ----------------------------------------------------
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.BREVO_SENDER;
    delete process.env.BREVO_SENDER_NAME;
    const defaultSender = getBrevoSender();
    assert(defaultSender === undefined, "getBrevoSender() returns undefined when no sender env vars are set (no hardcoded fallback)");

    // ----------------------------------------------------
    // Test 4: Sender resolution from BREVO_SENDER_EMAIL & BREVO_SENDER_NAME
    // ----------------------------------------------------
    process.env.BREVO_SENDER_EMAIL = "tallyh29@gmail.com";
    process.env.BREVO_SENDER_NAME = "TallyHo";
    const sender1 = getBrevoSender();
    assert(sender1?.email === "tallyh29@gmail.com", "getBrevoSender() reads BREVO_SENDER_EMAIL");
    assert(sender1?.name === "TallyHo", "getBrevoSender() reads BREVO_SENDER_NAME");

    // ----------------------------------------------------
    // Test 5: Sender resolution backwards compatibility with BREVO_SENDER = "TallyHo <tallyh29@gmail.com>"
    // ----------------------------------------------------
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.BREVO_SENDER_NAME;
    process.env.BREVO_SENDER = "TallyHo <tallyh29@gmail.com>";
    const sender2 = getBrevoSender();
    assert(sender2?.email === "tallyh29@gmail.com", "getBrevoSender() parses email from 'TallyHo <tallyh29@gmail.com>'");
    assert(sender2?.name === "TallyHo", "getBrevoSender() parses name from 'TallyHo <tallyh29@gmail.com>'");

    // ----------------------------------------------------
    // Test 6: Sender resolution backwards compatibility with BREVO_SENDER = "tallyh29@gmail.com"
    // ----------------------------------------------------
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.BREVO_SENDER_NAME;
    process.env.BREVO_SENDER = "tallyh29@gmail.com";
    const sender3 = getBrevoSender();
    assert(sender3?.email === "tallyh29@gmail.com", "getBrevoSender() parses plain email from BREVO_SENDER");

    // ----------------------------------------------------
    // Test 7: Missing API key handling in sendOtpEmail
    // ----------------------------------------------------
    delete process.env.BREVO_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.ALLOW_DEV_EMAIL_FALLBACK;
    (process.env as any).NODE_ENV = "production";

    const missingKeyResult = await sendOtpEmail({
      to: "recipient@example.com",
      otp: "123456",
      purpose: "FORGOT_PASSWORD",
    });

    assert(missingKeyResult.success === false, "sendOtpEmail returns success: false when API key is missing");
    assert(
      (missingKeyResult.error || "").includes("BREVO_API_KEY is not configured"),
      "sendOtpEmail provides clear error message when BREVO_API_KEY is missing"
    );

    // ----------------------------------------------------
    // Test 7b: Missing sender handling in sendOtpEmail
    // ----------------------------------------------------
    process.env.BREVO_API_KEY = "test-brevo-key-123";
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.BREVO_SENDER;
    delete process.env.BREVO_SENDER_NAME;
    delete process.env.RESEND_API_KEY;
    delete process.env.ALLOW_DEV_EMAIL_FALLBACK;
    (process.env as any).NODE_ENV = "production";

    const missingSenderResult = await sendOtpEmail({
      to: "recipient@example.com",
      otp: "123456",
      purpose: "FORGOT_PASSWORD",
    });

    assert(missingSenderResult.success === false, "sendOtpEmail returns success: false when BREVO_SENDER_EMAIL is missing");
    assert(
      (missingSenderResult.error || "").includes("BREVO_SENDER_EMAIL is not configured"),
      "sendOtpEmail provides clear error message when BREVO_SENDER_EMAIL is missing"
    );

    // ----------------------------------------------------
    // Test 8: HTTPS Request construction (Mocking fetch)
    // ----------------------------------------------------
    process.env.BREVO_API_KEY = "xkeysib-mock-test-key";
    process.env.BREVO_SENDER_EMAIL = "tallyh29@gmail.com";
    process.env.BREVO_SENDER_NAME = "TallyHo";

    let interceptedUrl = "";
    let interceptedOptions: RequestInit | undefined;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      interceptedUrl = typeof input === "string" ? input : input.toString();
      interceptedOptions = init;
      return {
        ok: true,
        status: 201,
        json: async () => ({ messageId: "<mock-message-id-123@brevo.com>" }),
      } as Response;
    }) as typeof fetch;

    try {
      const dispatchResult = await sendOtpEmail({
        to: "sujal.rana.s.130@kalvium.community",
        otp: "654321",
        purpose: "FORGOT_PASSWORD",
      });

      assert(dispatchResult.success === true, "sendOtpEmail succeeds when Brevo API responds with 201");
      assert(interceptedUrl === "https://api.brevo.com/v3/smtp/email", "Request is sent to https://api.brevo.com/v3/smtp/email (Port 443)");
      assert(interceptedOptions?.method === "POST", "Request uses HTTP POST");

      const headers = (interceptedOptions?.headers as Record<string, string>) || {};
      assert(headers["api-key"] === "xkeysib-mock-test-key", "api-key header matches process.env.BREVO_API_KEY");
      assert(headers["Content-Type"] === "application/json", "Content-Type is application/json");
      assert(headers["Accept"] === "application/json", "Accept header is application/json");

      const body = JSON.parse((interceptedOptions?.body as string) || "{}");
      assert(body.sender?.name === "TallyHo", "Payload sender name is TallyHo");
      assert(body.sender?.email === "tallyh29@gmail.com", "Payload sender email is tallyh29@gmail.com");
      assert(body.to?.[0]?.email === "sujal.rana.s.130@kalvium.community", "Payload recipient is correct");
      assert(body.htmlContent?.includes("654321"), "Payload HTML contains the 6-digit OTP");
    } finally {
      globalThis.fetch = originalFetch;
    }

    // ----------------------------------------------------
    // Test 9: Brevo error response handling without exposing secrets
    // ----------------------------------------------------
    globalThis.fetch = (async () => {
      return {
        ok: false,
        status: 401,
        json: async () => ({ code: "unauthorized", message: "Key not found" }),
      } as Response;
    }) as typeof fetch;

    try {
      const errorResult = await sendOtpEmail({
        to: "sujal.rana.s.130@kalvium.community",
        otp: "654321",
        purpose: "FORGOT_PASSWORD",
      });

      assert(errorResult.success === false, "Handles 401 response gracefully as failure");
      assert((errorResult.error || "").includes("Key not found"), "Captures Brevo error message");
      assert(!(errorResult.error || "").includes("xkeysib"), "Does not leak API key in error message");
    } finally {
      globalThis.fetch = originalFetch;
      (process.env as any).NODE_ENV = origNodeEnv;
    }

  } finally {
    // Restore original env
    if (origKey !== undefined) process.env.BREVO_API_KEY = origKey;
    else delete process.env.BREVO_API_KEY;

    if (origSenderEmail !== undefined) process.env.BREVO_SENDER_EMAIL = origSenderEmail;
    else delete process.env.BREVO_SENDER_EMAIL;

    if (origSender !== undefined) process.env.BREVO_SENDER = origSender;
    else delete process.env.BREVO_SENDER;

    if (origName !== undefined) process.env.BREVO_SENDER_NAME = origName;
    else delete process.env.BREVO_SENDER_NAME;
  }

  console.log(`\n======================================================`);
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runBrevoEmailTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
