import { SignJWT, jwtVerify } from "jose";

const secret = process.env.SESSION_SECRET || "default-secret-change-in-production";
const secretKey = new TextEncoder().encode(secret);

export const SESSION_COOKIE_NAME = "auth_token";

export interface SessionPayload {
  userId: number;
  email: string;
  mobile: string;
  role: string;
  name?: string | null;
}

export async function createSession(payload: SessionPayload | number): Promise<string> {
  const data = typeof payload === "number" ? { userId: payload } : payload;

  return await new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}