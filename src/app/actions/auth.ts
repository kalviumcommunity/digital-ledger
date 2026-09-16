"use server";

/**
 * ============================================================================
 * AUTHENTICATION SERVER ACTIONS (BACKEND MUTATION LAYER)
 * ============================================================================
 * 
 * HOW THE FRONTEND TALKS TO THE BACKEND HERE:
 * 1. Next.js Server Actions (`"use server"`) act as type-safe Remote Procedure
 *    Calls (RPC). A React component running in the browser (e.g., `LoginForm.tsx`)
 *    can directly import and call `login({ email, password })`.
 * 2. Behind the scenes, Next.js generates an internal POST request with serialized
 *    arguments, executes this server-side code in Node.js, and returns the result.
 * 3. Security Advantage: Sensitive logic (hashing passwords, issuing JWT cookies,
 *    emailing OTPs, connecting to Prisma database) never leaks to the client bundle.
 */

import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
  type SessionUser,
} from "@/lib/auth";
import type { ActionResult, CurrentUser } from "@/lib/types";
import type { Role } from "@prisma/client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type AuthResult = ActionResult<CurrentUser>;

function toCurrentUser(user: SessionUser): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function getCurrentUserAction(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user ? toCurrentUser(user) : null;
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  role?: Role;
}): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (name.length < 2) {
    return { success: false, error: "Name must be at least 2 characters long." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }
  const role: Role = input.role === "EMPLOYEE" ? "EMPLOYEE" : "SHOPKEEPER";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash, role },
    });
    await createSession({ id: user.id, role: user.role });
    return {
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  } catch (error) {
    console.error("Signup failed:", error);
    return { success: false, error: "Failed to create your account. Please try again." };
  }
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) {
    return { success: false, error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const valid = await verifyPassword(input.password, user.password);
  if (!valid) {
    return { success: false, error: "Invalid email or password." };
  }

  await createSession({ id: user.id, role: user.role });
  return {
    success: true,
    data: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function logout(): Promise<AuthResult> {
  await destroySession();
  return {
    success: true,
    data: {
      id: "",
      name: "",
      email: "",
      role: "SHOPKEEPER",
    },
  };
}

/**
 * Re-authentication guard used before destructive edits.
 * Verifies the password of the currently signed-in user.
 */
export async function confirmPassword(
  password: string
): Promise<ActionResult<{ valid: boolean }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });
  if (!record) {
    return { success: false, error: "Account not found." };
  }

  const valid = await verifyPassword(password, record.password);
  if (!valid) {
    return { success: false, error: "Incorrect password.", code: "INVALID_PASSWORD" };
  }
  return { success: true, data: { valid: true } };
}

/**
 * Validates signup details and generates an email verification OTP.
 */
export async function requestSignupOtp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult<{ email: string }>> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (name.length < 2) {
    return { success: false, error: "Name must be at least 2 characters long." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const { generateAndSendOtp } = await import("@/lib/otp");
  const result = await generateAndSendOtp(email, "SIGNUP");
  if (!result.success) {
    return { success: false, error: result.error || "Failed to send verification code." };
  }

  return {
    success: true,
    data: {
      email,
    },
  };
}

/**
 * Verifies the 6-digit signup OTP, creates the user account, and establishes a session.
 */
export async function completeSignupWithOtp(input: {
  name: string;
  email: string;
  password: string;
  role?: Role;
  otp: string;
}): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const role: Role = input.role === "EMPLOYEE" ? "EMPLOYEE" : "SHOPKEEPER";

  const { verifyOtp } = await import("@/lib/otp");
  const otpCheck = await verifyOtp(email, input.otp, "SIGNUP");
  if (!otpCheck.valid) {
    return { success: false, error: otpCheck.error || "Invalid or expired verification code." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash, role },
    });
    await createSession({ id: user.id, role: user.role });
    return {
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  } catch (error) {
    console.error("Signup failed:", error);
    return { success: false, error: "Failed to create your account. Please try again." };
  }
}

/**
 * Validates that an account exists for the given email and sends a password reset OTP.
 */
export async function requestPasswordResetOtp(
  email: string
): Promise<ActionResult<{ email: string }>> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return { success: false, error: "No account found with this email address." };
  }

  const { generateAndSendOtp } = await import("@/lib/otp");
  const result = await generateAndSendOtp(normalizedEmail, "FORGOT_PASSWORD");
  if (!result.success) {
    return { success: false, error: result.error || "Failed to send reset code." };
  }

  return {
    success: true,
    data: {
      email: normalizedEmail,
    },
  };
}

/**
 * Verifies the 6-digit reset OTP, updates the user's password, and signs them in.
 */
export async function resetPasswordWithOtp(input: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const newPassword = input.newPassword;

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }

  const { verifyOtp } = await import("@/lib/otp");
  const otpCheck = await verifyOtp(email, input.otp, "FORGOT_PASSWORD");
  if (!otpCheck.valid) {
    return { success: false, error: otpCheck.error || "Invalid or expired reset code." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { success: false, error: "Account not found." };
  }

  const passwordHash = await hashPassword(newPassword);

  try {
    const updated = await prisma.user.update({
      where: { email },
      data: { password: passwordHash },
    });
    await createSession({ id: updated.id, role: updated.role });
    return {
      success: true,
      data: { id: updated.id, name: updated.name, email: updated.email, role: updated.role },
    };
  } catch (error) {
    console.error("Password reset failed:", error);
    return { success: false, error: "Failed to update password. Please try again." };
  }
}