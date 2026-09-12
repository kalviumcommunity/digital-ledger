"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !mobile.trim() || !password || !confirmPassword) {
      setMessage("All fields are required.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage("Registration successful! Redirecting to dashboard...");
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage(data.message || "Registration failed.");
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
          Create Account
        </h1>

        <p className="text-sm text-gray-600 mb-10 text-center">
          Everything your shop needs, right at your fingertips. Let&apos;s get started!.
        </p>

        <form onSubmit={handleRegister} className="w-full">
          <label className="self-start text-black font-bold mb-2 text-sm block">
            FULL NAME
          </label>

          <input
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="shadow-sm h-14 text-sm text-black border rounded-lg p-3 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-red-800"
          />

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

          <label className="self-start text-black font-bold mb-2 text-sm block">
            PASSWORD
          </label>

          <div className="relative w-full mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
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

          <label className="self-start text-black font-bold mb-2 text-sm block">
            CONFIRM PASSWORD
          </label>

          <div className="relative w-full mb-6">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="shadow-sm h-14 text-sm text-black border rounded-lg p-3 pr-12 w-full focus:outline-none focus:ring-2 focus:ring-red-800"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-4 text-gray-500 hover:text-black focus:outline-none"
              tabIndex={-1}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="shadow-sm h-14 w-full font-bold bg-black text-white box-border border border-black rounded-lg transition duration-300 hover:bg-red-800 hover:text-black hover:border-black disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Registering..." : "Register"}
          </button>

          {message && (
            <p className={`text-sm text-center mt-4 font-medium ${
              message.includes("successful") ? "text-green-600" : "text-red-700"
            }`}>
              {message}
            </p>
          )}
        </form>

        <p className="text-xs text-black mt-4 mb-8">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-black text-xs hover:underline font-bold"
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}