import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "dl_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  role: Role;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.includes("your-32")) {
    throw new Error(
      "Missing SESSION_SECRET. Set SESSION_SECRET (or NEXTAUTH_SECRET) in your environment."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(
  session: SessionPayload
): Promise<string> {
  const payload: JWTPayload = {
    userId: session.userId,
    role: session.role,
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string") return null;
    const role = payload.role;
    if (role !== "SHOPKEEPER" && role !== "EMPLOYEE") return null;
    return { userId: payload.userId, role };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] Session verification failed:", error);
    }
    return null;
  }
}