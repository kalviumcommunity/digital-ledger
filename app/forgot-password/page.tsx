"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<"contact" | "otp">("contact");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const action = step === "contact" ? "send" : "reset";
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, mobile, emailOtp, mobileOtp, password, confirmPassword }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || "Unable to continue.");
      } else if (step === "contact") {
        setStep("otp");
        setMessage(data.demoOtp ? `Demo OTP for both channels: ${data.demoOtp}` : data.message);
      } else {
        setMessage(data.message);
        setStep("contact");
        setEmailOtp("");
        setMobileOtp("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4f6] px-4 py-8">
      <div className="flex w-full max-w-lg flex-col items-center rounded-2xl border border-gray-300 bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
          <LockKeyhole size={22} />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-red-600">Account recovery</p>
        <h1 className="mb-3 text-3xl font-bold text-black">Reset Password</h1>
        <p className="mb-6 max-w-sm text-center text-sm leading-6 text-gray-600">Verify both your email and mobile number to securely reset your password.</p>

        <div className="mb-7 grid w-full grid-cols-2 gap-3">
          <div className={`rounded-lg border px-3 py-2 text-center text-xs font-bold ${step === "contact" ? "border-red-600 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-400"}`}>1. Verify account</div>
          <div className={`rounded-lg border px-3 py-2 text-center text-xs font-bold ${step === "otp" ? "border-red-600 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-400"}`}>2. Set password</div>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <label className="mb-2 block text-sm font-bold text-black">EMAIL ADDRESS</label>
          <input type="email" required placeholder="Enter your registered email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={step === "otp"} className="mb-4 h-14 w-full rounded-lg border p-3 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-red-800 disabled:bg-gray-100" />

          <label className="mb-2 block text-sm font-bold text-black">MOBILE NUMBER</label>
          <input type="text" required placeholder="Enter your registered mobile number" value={mobile} onChange={(event) => setMobile(event.target.value)} disabled={step === "otp"} className="mb-4 h-14 w-full rounded-lg border p-3 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-red-800 disabled:bg-gray-100" />

          {step === "otp" && (
            <>
              <label className="mb-2 block text-sm font-bold text-black">EMAIL OTP</label>
              <input type="text" inputMode="numeric" required maxLength={6} placeholder="Enter email OTP" value={emailOtp} onChange={(event) => setEmailOtp(event.target.value)} className="mb-4 h-14 w-full rounded-lg border p-3 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-red-800" />

              <label className="mb-2 block text-sm font-bold text-black">MOBILE OTP</label>
              <input type="text" inputMode="numeric" required maxLength={6} placeholder="Enter mobile OTP" value={mobileOtp} onChange={(event) => setMobileOtp(event.target.value)} className="mb-4 h-14 w-full rounded-lg border p-3 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-red-800" />

              <label className="mb-2 block text-sm font-bold text-black">NEW PASSWORD</label>
              <PasswordInput value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword(!showPassword)} placeholder="Create a new password" />

              <label className="mb-2 block text-sm font-bold text-black">CONFIRM PASSWORD</label>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} placeholder="Confirm your new password" />
            </>
          )}

          <button type="submit" disabled={loading} className="mt-5 h-14 w-full rounded-lg border border-black bg-black font-bold text-white transition duration-300 hover:bg-red-800 hover:text-black disabled:opacity-50">
            {loading ? "Please wait..." : step === "contact" ? "Send Both OTPs" : "Reset Password"}
          </button>

          {message && <p className={`mt-4 text-center text-sm font-medium ${message.includes("successfully") || message.includes("Demo OTP") ? "text-green-600" : "text-red-700"}`}>{message}</p>}

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs leading-5 text-gray-500">
            Don&apos;t have access to both details? Contact support at{" "}
            <a href="mailto:support@khatabook.local" className="font-bold text-black hover:underline">support@khatabook.local</a>{" "}
            or <a href="tel:+9118001234567" className="font-bold text-black hover:underline">+91 1800 123 4567</a>.
          </div>
        </form>

        <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-black hover:underline"><ArrowLeft size={14} /> Back to Log In</Link>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, visible, onToggle, placeholder }: { value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; placeholder: string }) {
  return (
    <div className="relative mb-4 w-full">
      <input type={visible ? "text" : "password"} required value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-14 w-full rounded-lg border p-3 pr-12 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-red-800" />
      <button type="button" onClick={onToggle} className="absolute right-3 top-4 text-gray-500 hover:text-black" aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button>
    </div>
  );
}
