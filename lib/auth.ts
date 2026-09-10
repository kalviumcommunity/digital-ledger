import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE_NAME, SessionPayload } from "./session";
import { prisma } from "./prisma";
import { findDevUserById } from "./dev-users";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySession(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        shopkeeperId: true,
        createdAt: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    if (process.env.NODE_ENV !== "production") {
      return findDevUserById(session.userId) ?? null;
    }
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
