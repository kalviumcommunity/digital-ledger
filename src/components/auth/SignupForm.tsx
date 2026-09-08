"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpenText, Loader2 } from "lucide-react";
import type { Role } from "@prisma/client";
import { signup } from "@/app/actions/auth";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SHOPKEEPER");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await signup({ name, email, password, role });
    setPending(false);

    if (result.success) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/transactions";
    } else {
      setError(result.error);
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create your account
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Set up your ledger in under a minute.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} method="POST" className="mt-6 space-y-4">
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
                Email
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
              <input
                id="signup-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
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
                  <p className="text-[11px] text-slate-500 mt-0.5">I manage the books</p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>
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