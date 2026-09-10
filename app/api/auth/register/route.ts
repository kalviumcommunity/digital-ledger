import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { createSession, SESSION_COOKIE_NAME, getCookieOptions } from "../../../../lib/session";
import { createDevUser, findDevUser } from "../../../../lib/dev-users";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, mobile, password } = body;

    // Validation
    if (!email || !mobile || !password) {
      return NextResponse.json(
        { success: false, message: "Email, mobile, and password are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMobile = mobile.trim().replace(/\s+/g, "");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (trimmedMobile.length < 10) {
      return NextResponse.json(
        { success: false, message: "Mobile number must be at least 10 digits." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // All public registrations create a Shopkeeper (Owner) account
    // Employees can only be registered by the Shopkeeper via the Staff Directory
    const assignedRole = "SHOPKEEPER";

    // Check existing
    let databaseAvailable = true;
    let existing;
    try {
      existing = await prisma.user.findFirst({
        where: {
          OR: [{ email: trimmedEmail }, { mobile: trimmedMobile }],
        },
      });
    } catch (error) {
      databaseAvailable = false;
      if (process.env.NODE_ENV === "production") throw error;
      existing = await findDevUser(trimmedEmail) ?? await findDevUser(trimmedMobile);
    }

    if (existing) {
      const field = existing.email === trimmedEmail ? "Email" : "Mobile number";
      return NextResponse.json(
        { success: false, message: `${field} is already registered.` },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = databaseAvailable
      ? await prisma.user.create({
          data: {
            name: name ? name.trim() : null,
            email: trimmedEmail,
            mobile: trimmedMobile,
            password: hashedPassword,
            role: assignedRole,
          },
        })
      : await createDevUser({
          name,
          email: trimmedEmail,
          mobile: trimmedMobile,
          password,
        });

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
      message: "Registration successful",
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
