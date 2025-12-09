"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      if (!email || !password || !confirm) {
        throw new Error("All fields are required.");
      }

      if (password !== confirm) {
        throw new Error("Passwords do not match.");
      }

      // TODO: Replace with real registration logic
      // await api.register({ email, password });

      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Create account</h1>

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

        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Confirm Password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button className="w-full bg-black text-white py-2 rounded">
          Register
        </button>
      </form>

      <p className="text-sm mt-4">
        Already have an account?{" "}
        <a href="/login" className="text-blue-500">
          Login
        </a>
      </p>
    </div>
  );
}
