"use client";

import { useActionState } from "react";

import { login } from "./actions";

export default function LoginForm() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="mx-auto mt-10 flex max-w-xs flex-col gap-3">
      <label htmlFor="password" className="eyebrow">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        className="border-2 border-red bg-cream px-4 py-3 text-lg outline-none"
      />
      <button type="submit" disabled={pending} className="btn btn-ghost justify-center disabled:opacity-50">
        {pending ? "Checking…" : "Sign in"}
      </button>
      {error && <p className="text-center">{error}</p>}
    </form>
  );
}
