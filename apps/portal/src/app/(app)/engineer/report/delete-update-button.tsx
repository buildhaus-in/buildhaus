"use client";
import { useFormStatus } from "react-dom";

// Deleting an update can't be undone, so the browser asks first. Sits inside
// a <form> carrying report_id/project_id and overrides its action, the same
// way SubmitButton's formAction does. Same size as the other buttons; red
// text and border so it isn't mistaken for Save/Submit.
export function DeleteUpdateButton({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      formAction={action}
      onClick={(e) => {
        if (!window.confirm("Delete this update? Its labour, materials and photos are removed too. This can't be undone.")) {
          e.preventDefault();
        }
      }}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete update"}
    </button>
  );
}
