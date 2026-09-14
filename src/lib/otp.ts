import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import type { OtpType } from "@prisma/client";

const OTP_TTL_MINUTES = 10;

/**
 * Generates a cryptographically secure 6-digit OTP, stores it in the database with
 * a 10-minute expiry window, and sends it via email.
 */
export async function generateAndSendOtp(
  email: string,
  type: OtpType
): Promise<{ success: boolean; otp?: string; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Generate 6-digit numeric code
  const otp = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  try {
    // Delete previous OTPs for this email and type
    await prisma.otpVerification.deleteMany({
      where: {
        email: normalizedEmail,
        type,
      },
    });

    // Save new OTP record
    await prisma.otpVerification.create({
      data: {
        email: normalizedEmail,
        otp,
        type,
        expiresAt,
      },
    });

    // Send email dispatch
    const sendResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      purpose: type,
    });

    if (!sendResult.success) {
      await prisma.otpVerification.deleteMany({
        where: { email: normalizedEmail, type },
      });
      return {
        success: false,
        error: sendResult.error || "Failed to deliver verification email. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error(`[otp] Failed to generate/send OTP for ${normalizedEmail}:`, error);
    return { success: false, error: "Failed to generate and send verification code. Please try again." };
  }
}

/**
 * Validates a submitted OTP against the database record.
 * If valid and not expired, deletes the record to ensure single-use security.
 */
export async function verifyOtp(
  email: string,
  otp: string,
  type: OtpType
): Promise<{ valid: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    return { valid: false, error: "Verification code must be 6 digits." };
  }

  try {
    const record = await prisma.otpVerification.findFirst({
      where: {
        email: normalizedEmail,
        otp: cleanOtp,
        type,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!record) {
      return { valid: false, error: "Invalid or expired verification code." };
    }

    // Single-use guarantee: remove OTP after successful verification
    await prisma.otpVerification.deleteMany({
      where: {
        email: normalizedEmail,
        type,
      },
    });

    return { valid: true };
  } catch (error) {
    console.error(`[otp] Error verifying OTP for ${normalizedEmail}:`, error);
    return { valid: false, error: "Verification check failed. Please try again." };
  }
}
