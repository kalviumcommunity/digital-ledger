/**
 * ============================================================================
 * STATELESS JWT SESSION SECURITY ENGINE
 * ============================================================================
 * 
 * HOW AUTHENTICATION WORKS ACROSS FRONTEND & BACKEND:
 * 1. Rather than storing sessions in a database table (which requires an extra
 *    network query on every single HTTP request), we use cryptographically
 *    signed, tamper-proof JSON Web Tokens (JWTs).
 * 2. The token is generated on the server upon successful login/signup and
 *    stored in the client's browser inside an HTTP-only, SameSite cookie (`dl_session`).
 * 3. The browser automatically attaches this cookie to every future request.
 * 4. We use the modern, standards-compliant `jose` library because it works
 *    universally across Node.js servers, Next.js Server Actions, and Next.js Edge Middleware.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";

// The cookie name used to store the user's session token
export const SESSION_COOKIE_NAME = "dl_session";

// Session lifespan: 7 days
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * The data payload stored inside the encrypted JWT.
 * Kept intentionally minimal (just userId and role) to keep HTTP headers lightweight.
 */
export interface SessionPayload {
  userId: string;
  role: Role;
}

/**
 * Derives a secure byte array key from the server environment variable.
 * Fails fast if the environment secret has not been configured.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.includes("your-32")) {
    throw new Error(
      "Missing SESSION_SECRET. Set SESSION_SECRET (or NEXTAUTH_SECRET) in your environment."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs a new JWT containing the user's ID and role using HMAC-SHA256 (HS256).
 * Sets issuance timestamp and a 7-day expiration time.
 */
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

/**
 * Validates the digital signature of the incoming JWT token.
 * Returns the decoded payload if valid, or null if the token is tampered, expired, or malformed.
 */
export async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    // Ensure essential payload fields are present and valid
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