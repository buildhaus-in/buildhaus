"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signIn } from "./actions";
import { Input } from "@buildhaus/ui";
import { Button } from "@buildhaus/ui";
import { Logo } from "@buildhaus/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <><span className="spinner" /> Signing in…</> : "Sign in"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(signIn, null as null | { error?: string });
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo
            markClassName="h-10 w-10"
            wordmarkClassName="text-2xl"
            tagline="Sign in to your workspace"
          />
        </Link>
        <form action={action} className="rounded-xl2 border border-border bg-card p-6">
          <Input label="Email" name="email" type="email" autoComplete="email" placeholder="you@buildhaus.example" />
          <Input label="Password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" />
          {state?.error && <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</div>}
          <Submit />
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          Owner, Site Engineer, Architect and Client accounts all sign in here.
        </p>
      </div>
    </main>
  );
}
