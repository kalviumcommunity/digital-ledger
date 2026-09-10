import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { createSession, SESSION_COOKIE_NAME, getCookieOptions } from "../../../../lib/session";
import { findDevUser } from "../../../../lib/dev-users";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, email, mobile, password } = body;

    const loginId = (identifier || email || mobile || "").trim();

    if (!loginId || !password) {
      return NextResponse.json(
        { success: false, message: "Email/Mobile and password are required." },
        { status: 400 }
      );
    }

    // Find user by email OR mobile
    let user;
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: loginId.toLowerCase() },
            { mobile: loginId.replace(/\s+/g, "") },
          ],
        },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") user = await findDevUser(loginId);
      else throw error;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email/mobile or password." },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email/mobile or password." },
        { status: 401 }
      );
    }

    // Create session token
    const token = await createSession({
      userId: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      name: user.name,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getCookieOptions());

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error during login." },
      { status: 500 }
    );
  }
}
