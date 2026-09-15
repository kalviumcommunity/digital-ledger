"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpenText, CheckCircle2, ChevronLeft, Loader2, Mail, RefreshCw } from "lucide-react";
import type { Role } from "@prisma/client";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { requestSignupOtp, completeSignupWithOtp } from "@/app/actions/auth";

export function SignupForm() {
  const [step, setStep] = useState<"DETAILS" | "OTP">("DETAILS");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("SHOPKEEPER");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setPending(true);
    try {
      const result = await requestSignupOtp({ name, email, password });
      if (result.success) {
        setStep("OTP");
        setOtp("");
        setResendCooldown(30);
        setInfo(`We've sent a 6-digit verification code to ${email.trim().toLowerCase()}. Please check your email inbox.`);
      } else {
        setError(result.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
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
      const result = await requestSignupOtp({ name, email, password });
      if (result.success) {
        setResendCooldown(30);
        setInfo(`A fresh verification code was sent to ${email.trim().toLowerCase()}. Please check your email inbox.`);
      } else {
        setError(result.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setPending(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await completeSignupWithOtp({
        name,
        email,
        password,
        role,
        otp,
      });

      if (result.success) {
        window.location.href = "/transactions";
      } else {
        setError(result.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete signup.");
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
          {step === "DETAILS" ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Create your account
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Set up your ledger in under a minute with email verification.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp} method="POST" className="mt-6 space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700">
                    Full name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Rahul Verma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <PasswordInput
                    id="signup-password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700">
                    Confirm password
                  </label>
                  <PasswordInput
                    id="signup-confirm-password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">
                      Passwords do not match.
                    </p>
                  )}
                  {confirmPassword.length > 0 && password === confirmPassword && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      Passwords match.
                    </p>
                  )}
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700">Role</span>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setRole("SHOPKEEPER")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === "SHOPKEEPER"
                          ? "border-slate-900 bg-slate-900/[0.04] ring-2 ring-slate-900/10"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-900">Shopkeeper</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">I own the business</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("EMPLOYEE")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === "EMPLOYEE"
                          ? "border-slate-900 bg-slate-900/[0.04] ring-2 ring-slate-900/10"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-900">Employee</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">I work at the shop</p>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pending || (confirmPassword.length > 0 && password !== confirmPassword)}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
                >
                  {pending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending verification code…
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("DETAILS")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-4 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Edit details
              </button>

              <div className="w-10 h-10 rounded-xl bg-slate-900/5 text-slate-900 flex items-center justify-center mb-3">
                <Mail className="w-5 h-5" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Enter verification code
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the 6-digit code sent to <strong className="text-slate-800">{email}</strong>.
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

              <form onSubmit={handleVerifyAndSignup} method="POST" className="mt-6 space-y-4">
                <div>
                  <label htmlFor="signup-otp" className="block text-xs font-semibold text-slate-700">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="signup-otp"
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
                  disabled={pending || otp.length !== 6}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
                >
                  {pending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying & creating account…
                    </>
                  ) : (
                    "Verify & Complete Sign Up"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}