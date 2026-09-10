"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const loginIdentifier = (email || mobile || "").trim();

    // Validation
    if (!loginIdentifier) {
      setMessage("Please enter your email address or mobile number.");
      return;
    }
    if (!password) {
      setMessage("Please enter your password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: loginIdentifier,
          email: email.trim(),
          mobile: mobile.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage("Login successful! Redirecting...");
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage(data.message || "Invalid email or password");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4 py-8">
      <div className="w-full max-w-lg bg-white shadow-md border border-black rounded-xl p-10 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-black mb-4 mt-8">
          Welcome Back
        </h1>

        <p className="text-sm text-gray-600 mb-12 text-center">
          Great to see you again! Let&apos;s get your shop&apos;s customers, payments,
          and dues organized.
        </p>

        <form onSubmit={handleLogin} className="w-full">
          <label className="self-start text-black font-bold mb-2 text-sm block">
            EMAIL ADDRESS
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow-sm h-14 text-sm text-black border rounded-lg p-3 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-red-800"
          />

          <label className="self-start text-black font-bold mb-2 text-sm block">
            MOBILE NUMBER
          </label>

          <input
            type="text"
            placeholder="Enter your mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="shadow-sm h-14 text-sm text-black border rounded-lg p-3 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-red-800"
          />

          <div className="flex justify-between items-center w-full mb-2">
            <label className="text-black font-bold text-sm">
              PASSWORD
            </label>

            <a
              href="/forgot-password"
              className="text-black text-xs hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <div className="relative w-full mb-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow-sm h-14 text-sm text-black border rounded-lg p-3 pr-12 w-full focus:outline-none focus:ring-2 focus:ring-red-800"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-4 text-gray-500 hover:text-black focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="w-full flex items-center gap-2 mb-8">
            <input type="checkbox" id="rememberMe" />
            <label htmlFor="rememberMe" className="text-xs text-gray-600 cursor-pointer">
              Remember this device
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="shadow-sm h-14 w-full font-bold bg-black text-white box-border border border-black rounded-lg transition duration-300 hover:bg-red-800 hover:text-black hover:border-black disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          {message && (
            <p className={`text-sm text-center mt-4 font-medium ${
              message.includes("successful") ? "text-green-600" : "text-red-700"
            }`}>
              {message}
            </p>
          )}
        </form>

        <p className="text-xs text-black mt-6 mb-4">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="text-black text-xs hover:underline font-bold"
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
}