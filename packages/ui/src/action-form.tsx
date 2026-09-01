"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "./primitives";
import { ErrorState, SuccessState } from "./states";

// Structurally compatible with @buildhaus/validation's ActionResult<T> —
// defined locally rather than depending on that package just for a type,
// since packages/ui otherwise has no reason to know about it.
export type FormActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// Drop-in replacement for <Button type="submit"> inside any <form
// action={...}> — a plain Server Action prop OR a useFormState action both
// work, since useFormStatus() reads the nearest enclosing <form>'s pending
// state either way. Disables the button (and swaps its label) while the
// action is in flight, which is what actually stops a duplicate submit
// (the button is unclickable, not just "eventually consistent") — the
// single lowest-risk, highest-coverage fix for "every mutation shows
// loading, disabled-during-submit" (CLAUDE.md's standing rules).
export function SubmitButton({
  children,
  pendingLabel,
  variant,
  className,
  disabled,
  formAction,
}: {
  children: ReactNode;
  pendingLabel?: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  // For a <form> with more than one submit action (e.g. "Save draft" vs
  // "Submit"), each button overrides the form's own action the same way a
  // plain HTML <button formAction> would.
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className={className} disabled={disabled || pending} formAction={formAction}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </Button>
  );
}

// Generic wrapper for a create/update form whose Server Action has been
// converted to the (prevState, formData) => Promise<FormActionResult>
// shape (see apps/portal/src/lib/mutation.ts's unwrap()). Renders the
// error/success state that action produces, resets the form on success,
// and — combined with <SubmitButton> for the submit control inside —
// gives every mutation using it loading state, disabled-during-submit,
// and either a success message or a specific error message without each
// call site hand-rolling useFormState/useFormStatus itself.
export function ActionForm<T = unknown>({
  action,
  successMessage,
  className,
  children,
  resetOnSuccess = true,
}: {
  action: (prevState: FormActionResult<T> | null, formData: FormData) => Promise<FormActionResult<T> | null>;
  successMessage?: string | ((data: T) => string);
  className?: string;
  children: ReactNode;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useFormState<FormActionResult<T> | null, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {state && !state.ok && (
        <div className="mt-3">
          <ErrorState message={state.error} />
        </div>
      )}
      {state?.ok && (
        <div className="mt-3">
          <SuccessState
            message={typeof successMessage === "function" ? successMessage(state.data) : successMessage ?? "Saved."}
          />
        </div>
      )}
    </form>
  );
}
