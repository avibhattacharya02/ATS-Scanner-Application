"use client";

import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthFormProps = { supabase: SupabaseClient; initialError?: string };

export function AuthForm({ supabase, initialError = "" }: AuthFormProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
          });

      if (result.error) {
        setError(result.error.message);
      } else if (mode === "sign-up" && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
      }
    } catch {
      setError("Could not connect to Supabase. Check your project settings and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignIn = mode === "sign-in";

  return (
    <section className="mx-auto mt-12 max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8">
      <h2 className="text-2xl font-semibold">{isSignIn ? "Welcome back" : "Create your account"}</h2>
      <p className="mt-2 text-sm text-gray-400">
        {isSignIn ? "Sign in to scan resumes and access your saved history." : "Your scans are private to your account."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm text-gray-300">
          Email
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-white outline-none focus:border-blue-500"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Password
          <input
            autoComplete={isSignIn ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-white outline-none focus:border-blue-500"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {!isSignIn ? <span className="mt-1 block text-xs text-gray-500">Use at least 8 characters.</span> : null}
        </label>
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-emerald-300">{message}</p> : null}
        <button
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Please wait…" : isSignIn ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-400">
        {isSignIn ? "New to HirePulse?" : "Already have an account?"}{" "}
        <button
          className="font-medium text-blue-300 hover:text-blue-200"
          onClick={() => {
            setMode(isSignIn ? "sign-up" : "sign-in");
            setError("");
            setMessage("");
          }}
          type="button"
        >
          {isSignIn ? "Create an account" : "Sign in"}
        </button>
      </p>
    </section>
  );
}
