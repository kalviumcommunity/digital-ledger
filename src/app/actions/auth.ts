"use server";

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