import "server-only";

import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  decryptSession,
  encryptSession,
} from "@/lib/session-token";

const scrypt = promisify(scryptCallback);

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const PASSWORD_PREFIX = "scrypt";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

function hashedPasswordParts(stored: string): { salt: Buffer; hash: Buffer } | null {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== PASSWORD_PREFIX) return null;
  return { salt: Buffer.from(parts[1], "hex"), hash: Buffer.from(parts[2], "hex") };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scrypt(password, salt, KEY_BYTES)) as Buffer;
  return `${PASSWORD_PREFIX}:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = hashedPasswordParts(stored);
  if (!parts) return false;
  const derived = (await scrypt(password, parts.salt, parts.hash.length)) as Buffer;
  if (derived.length !== parts.hash.length) return false;
  return timingSafeEqual(derived, parts.hash);
}

export async function createSession(user: {
  id: string;
  role: Role;
}): Promise<void> {
  const token = await encryptSession({ userId: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
});

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return null;
  return user;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}