"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenText, CheckCircle2, ChevronLeft, KeyRound, Loader2, Mail, RefreshCw } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { requestPasswordResetOtp, resetPasswordWithOtp } from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<"REQUEST" | "RESET">("REQUEST");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const result = await requestPasswordResetOtp(email);
      if (result.success) {
        setStep("RESET");
        setOtp("");
        setResendCooldown(30);
        setInfo(`We've sent a 6-digit reset code to ${email.trim().toLowerCase()}. Please check your email inbox.`);
      } else {
        setError(result.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset code.");
    } finally {
      setPending(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || pending) return;
    setError(null);
    setInfo(null);
    setPending(true);

    try {
      const result = await requestPasswordResetOtp(email);
      if (result.success) {
        setResendCooldown(30);
        setInfo(`A fresh reset code was sent to ${email.trim().toLowerCase()}. Please check your email inbox.`);
      } else {
        setError(result.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setPending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setPending(true);
    try {
      const result = await resetPasswordWithOtp({
        email,
        otp,
        newPassword,
      });

      if (result.success) {
        window.location.href = "/transactions";
      } else {
        setError(result.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10 font-sans antialiased">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <BookOpenText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                KhataBook
              </h1>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Digital Ledger
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-7">
          {step === "REQUEST" ? (
            <>
              <div className="w-10 h-10 rounded-xl bg-slate-900/5 text-slate-900 flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Reset password
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your account email and we&apos;ll send you a 6-digit code to reset your password.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleRequestOtp} method="POST" className="mt-6 space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
                >
                  {pending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending reset code…
                    </>
                  ) : (
                    "Send Reset Code"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("REQUEST")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-4 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Change email
              </button>

              <div className="w-10 h-10 rounded-xl bg-slate-900/5 text-slate-900 flex items-center justify-center mb-3">
                <Mail className="w-5 h-5" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Enter reset code
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the 6-digit code sent to <strong className="text-slate-800">{email}</strong> and choose a new password.
              </p>

              {info && (
                <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{info}</span>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} method="POST" className="mt-6 space-y-4">
                <div>
                  <label htmlFor="reset-otp" className="block text-xs font-semibold text-slate-700">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="reset-otp"
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full mt-1.5 px-3.5 py-3 rounded-xl border border-slate-200 text-center font-mono text-xl tracking-widest font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700">
                    New password
                  </label>
                  <PasswordInput
                    id="new-password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700">
                    Confirm new password
                  </label>
                  <PasswordInput
                    id="confirm-password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Didn&apos;t get the code?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || pending}
                    className="font-semibold text-slate-900 hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${pending ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={pending || otp.length !== 6 || !newPassword || !confirmPassword}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
                >
                  {pending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating password…
                    </>
                  ) : (
                    "Reset Password & Sign In"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
