"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your registered email or mobile number.");
      return;
    }

    setLoading(true);
    setError("");

    // Simulate sending recovery instruction
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 border border-slate-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 text-white shadow-md shadow-red-200 mb-3">
            <span className="text-2xl font-black">KB</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Reset Your Password
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your email or phone to receive account recovery steps
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-1">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Recovery Instructions Sent
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If an account exists for <span className="font-semibold text-slate-800">{identifier}</span>, password reset instructions have been dispatched.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Log In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Email or Mobile
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. shop@example.com or 9876543210"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full px-3.5 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-slate-950 hover:bg-slate-900 active:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition duration-150 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending Link...
                </span>
              ) : (
                "Send Reset Instructions"
              )}
            </button>

            <div className="text-center pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Log In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
