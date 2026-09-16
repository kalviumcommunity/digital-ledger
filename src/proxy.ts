/**
 * ============================================================================
 * NEXT.JS EDGE MIDDLEWARE / PROXY GATEKEEPER
 * ============================================================================
 * 
 * HOW THE FRONTEND & BACKEND WORK TOGETHER HERE:
 * 1. Every incoming HTTP request to a page (excluding static assets and APIs)
 *    passes through this proxy function before any React Server Component or
 *    page renders on the server.
 * 2. Session Inspection: It reads the HTTP-only cookie (`dl_session`) sent
 *    automatically by the user's browser.
 * 3. Stateless Decryption: Uses `jose` to decrypt and verify the JWT without
 *    querying the database on every route hop, keeping latency near zero.
 * 4. Access Control & Route Guarding:
 *    - If an unauthenticated user tries to view protected pages (like `/transactions`
 *      or `/customers`), they are redirected to `/login?from=<requested_url>`.
 *    - If an already authenticated user visits `/login` or `/signup`, they are
 *      automatically fast-forwarded to their dashboard (`/transactions`).
 *    - If an invalid/expired session is detected, the cookie is cleanly cleared.
 */

import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session-token";

// List of public routes accessible without logging in
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // Read and decrypt the encrypted JWT session cookie from request headers
  const session = await decryptSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isAuthenticated = session?.userId != null;

  // SCENARIO 1: Stale Session Cleanup
  // If the user arrives at a public path with a "from" parameter, they were rejected by a protected route:
  // clear the stale session cookie and render the public page directly.
  if (isPublicPath && request.nextUrl.searchParams.has("from")) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // SCENARIO 2: Already Logged In
  // Authenticated users hitting auth pages without a "from" bounce are sent directly to the main app feed.
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/transactions", request.url));
  }

  // SCENARIO 3: Protected Route Access Guard
  // Unauthenticated users trying to access private routes are redirected to the login page.
  // We preserve the target destination in "?from=" so they can be redirected back after logging in.
  if (!isPublicPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // SCENARIO 4: Authorized Request
  // Proceed to render the requested page
  return NextResponse.next();
}

/**
 * Matcher Configuration:
 * Applies middleware to all application routes EXCEPT:
 * - Next.js internal paths (_next/static, _next/image)
 * - Public static assets (images, icons, svgs)
 * - API routes (/api/* handle their own granular authentication)
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};