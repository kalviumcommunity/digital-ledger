process.env.ALLOW_DEV_EMAIL_FALLBACK = "true";

import { prisma } from '../src/lib/prisma';
import {
  requestSignupOtp,
  completeSignupWithOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  login,
} from '../src/app/actions/auth';
import { verifyOtp } from '../src/lib/otp';

async function runOtpAuthTests() {
  console.log('======================================================');
  console.log('🧪 Running Auth OTP & Password Reset Integration Tests');
  console.log('======================================================\n');

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

  const testEmail = `otp.tester.${Date.now()}@example.com`;
  const initialPassword = 'Password123!';
  const updatedPassword = 'NewSecretPassword456!';

  try {
    // ----------------------------------------------------
    // Test 1: Request Signup OTP for new email
    // ----------------------------------------------------
    console.log('--- 1. Testing Signup OTP Generation ---');
    const signupReq = await requestSignupOtp({
      name: 'OTP Test User',
      email: testEmail,
      password: initialPassword,
    });
    assert(signupReq.success === true, 'requestSignupOtp succeeds for valid new user');

    // Verify OTP was stored in OtpVerification table
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { email: testEmail, type: 'SIGNUP' },
    });
    assert(!!otpRecord, 'OTP record exists in database');
    assert(/^\d{6}$/.test(otpRecord?.otp || ''), 'Stored OTP is exactly 6 digits');

    // ----------------------------------------------------
    // Test 2: Reject invalid OTP for signup
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Invalid OTP Rejection ---');
    const invalidSignup = await completeSignupWithOtp({
      name: 'OTP Test User',
      email: testEmail,
      password: initialPassword,
      role: 'SHOPKEEPER',
      otp: '000000',
    });
    assert(invalidSignup.success === false, 'completeSignupWithOtp rejects wrong OTP');

    // ----------------------------------------------------
    // Test 3: Complete Signup with valid OTP
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Complete Signup with Valid OTP ---');
    const validSignup = await completeSignupWithOtp({
      name: 'OTP Test User',
      email: testEmail,
      password: initialPassword,
      role: 'SHOPKEEPER',
      otp: otpRecord!.otp,
    });
    assert(validSignup.success === true, 'completeSignupWithOtp succeeds with valid OTP');
    if (validSignup.success) {
      assert(validSignup.data.email === testEmail, 'Created user returned with matching email');
    }

    // Verify user exists in database
    const createdUser = await prisma.user.findUnique({ where: { email: testEmail } });
    assert(!!createdUser, 'User is stored in database');

    // Verify OTP record was purged after use
    const usedOtpRecord = await prisma.otpVerification.findFirst({
      where: { email: testEmail, type: 'SIGNUP' },
    });
    assert(!usedOtpRecord, 'Single-use OTP is deleted after successful verification');

    // ----------------------------------------------------
    // Test 4: Prevent Duplicate Signup OTP
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Duplicate Email Detection ---');
    const duplicateReq = await requestSignupOtp({
      name: 'Duplicate User',
      email: testEmail,
      password: initialPassword,
    });
    assert(duplicateReq.success === false, 'requestSignupOtp rejects already registered email');

    // ----------------------------------------------------
    // Test 5: Forgot Password OTP Request
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Forgot Password OTP Request ---');
    const nonExistentReq = await requestPasswordResetOtp('nobody.exists.here@nowhere.com');
    assert(nonExistentReq.success === false, 'requestPasswordResetOtp rejects non-existent email');

    const resetReq = await requestPasswordResetOtp(testEmail);
    assert(resetReq.success === true, 'requestPasswordResetOtp succeeds for registered user');

    const resetOtpRecord = await prisma.otpVerification.findFirst({
      where: { email: testEmail, type: 'FORGOT_PASSWORD' },
    });
    assert(!!resetOtpRecord, 'Forgot password OTP record stored in database');
    assert(/^\d{6}$/.test(resetOtpRecord?.otp || ''), 'Reset OTP is 6 digits');

    // ----------------------------------------------------
    // Test 6: Reset Password with Valid OTP
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Password Reset with OTP ---');
    const resetResult = await resetPasswordWithOtp({
      email: testEmail,
      otp: resetOtpRecord!.otp,
      newPassword: updatedPassword,
    });
    assert(resetResult.success === true, 'resetPasswordWithOtp succeeds with valid OTP');

    // ----------------------------------------------------
    // Test 7: Verify Login with New Password
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Login Authentication with New Password ---');
    const oldLogin = await login({ email: testEmail, password: initialPassword });
    assert(oldLogin.success === false, 'Old password no longer works after reset');

    const newLogin = await login({ email: testEmail, password: updatedPassword });
    assert(newLogin.success === true, 'New password successfully authenticates user');

    // Clean up test user and any related data
    await prisma.user.delete({ where: { email: testEmail } });
    console.log('\n🧹 Cleaned up test user data.');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runOtpAuthTests();
