import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { findDevUserByContact, updateDevUserPassword } from "../../../../lib/dev-users";

type ResetRecord = { emailOtp: string; mobileOtp: string; expiresAt: number };
const resetStore = new Map<string, ResetRecord>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as "send" | "reset";
    const email = String(body.email || "").trim().toLowerCase();
    const mobile = String(body.mobile || "").trim().replace(/\s+/g, "");

    if (!email || !mobile) {
      return NextResponse.json({ success: false, message: "Email and mobile number are required." }, { status: 400 });
    }

    let user: { id: number; email: string; mobile: string; password?: string } | null = null;
    try {
      user = await prisma.user.findFirst({ where: { email, mobile }, select: { id: true, email: true, mobile: true, password: true } });
    } catch {
      if (process.env.NODE_ENV === "production") throw new Error("Database unavailable");
      user = findDevUserByContact(email, mobile) ?? null;
    }

    if (!user) {
      return NextResponse.json({ success: false, message: "Email and mobile number do not match an account. Please contact support at support@khatabook.local or +91 1800 123 4567." }, { status: 404 });
    }

    const key = `${email}:${mobile}`;
    if (action === "send") {
      const record = { emailOtp: "123456", mobileOtp: "123456", expiresAt: Date.now() + 10 * 60 * 1000 };
      resetStore.set(key, record);
      return NextResponse.json({ success: true, message: "OTP sent to both email and mobile.", demoOtp: process.env.NODE_ENV !== "production" ? "123456" : undefined });
    }

    if (action !== "reset") {
      return NextResponse.json({ success: false, message: "Invalid reset action." }, { status: 400 });
    }

    const record = resetStore.get(key);
    if (!record || record.expiresAt < Date.now() || body.emailOtp !== record.emailOtp || body.mobileOtp !== record.mobileOtp) {
      return NextResponse.json({ success: false, message: "Both OTPs are required and must be valid." }, { status: 400 });
    }

    const password = String(body.password || "");
    if (password.length < 6 || password !== body.confirmPassword) {
      return NextResponse.json({ success: false, message: "Passwords must match and contain at least 6 characters." }, { status: 400 });
    }

    if ("password" in user && user.password !== undefined) {
      try {
        await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 10) } });
      } catch {
        if (process.env.NODE_ENV === "production") throw new Error("Database unavailable");
        const devUser = findDevUserByContact(email, mobile);
        if (devUser) await updateDevUserPassword(devUser, password);
      }
    }

    resetStore.delete(key);
    return NextResponse.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, message: "Unable to reset password right now." }, { status: 500 });
  }
}