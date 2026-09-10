import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session-token";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const session = await decryptSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isAuthenticated = session?.userId != null;

  // Authenticated users hitting the auth pages are sent to the feed.
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/transactions", request.url));
  }

  // Unauthenticated users are sent to login.
  if (!isPublicPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};