"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      // TODO: Replace with your real login logic
      if (!email || !password) throw new Error("Missing credentials");

      // Simulate login success
      router.push(from);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Login</h1>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-black text-white py-2 rounded">
          Login
        </button>
      </form>

      <p className="text-sm mt-4">
        No account?{" "}
        <a href="/register" className="text-blue-500">
          Register
        </a>
      </p>
    </div>
  );
}
