/**
 * ============================================================================
 * PRISMA ORM CLIENT SINGLETON
 * ============================================================================
 * 
 * WHY THIS PATTERN IS ESSENTIAL IN NEXT.JS:
 * 1. During development, Next.js clears the Node.js require cache on every hot reload.
 * 2. If we simply ran `new PrismaClient()`, each code change would instantiate a
 *    new client with its own PostgreSQL connection pool, quickly exhausting available
 *    database connections on PostgreSQL / Supabase poolers.
 * 3. By attaching the instance to the Node.js `globalThis` object, the same connection
 *    pool survives hot reloads and is reused across all Server Actions, API routes,
 *    and background workers.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.DEBUG_PRISMA === "true"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

// Cache the client globally only in non-production environments
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;