"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Card, Button, FileUpload } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { ErrorState } from "@buildhaus/ui";
import { uploadDocument, type DocumentFormState } from "../actions";

const CATEGORIES = ["legal", "approvals", "internal", "handover", "other"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Uploading…" : "Upload document"}
    </Button>
  );
}

export function DocumentUploadForm({ projectId }: { projectId: string }) {
  const boundAction = uploadDocument.bind(null, projectId);
  const [state, formAction] = useFormState<DocumentFormState, FormData>(boundAction, null);

  return (
    <Card>
      <h2 className="mb-3 font-bold text-ivory">Upload a document</h2>
      <form action={formAction} className="grid gap-x-4 sm:grid-cols-2">
        <Input label="Title" name="title" placeholder="Construction agreement" required />
        <Select label="Category" name="category" defaultValue="legal">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <div className="sm:col-span-2">
          <FileUpload name="file" label="File" kind="document" required />
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm text-sand sm:col-span-2">
          <input type="checkbox" name="client_visible" className="h-4 w-4 rounded border-border" />
          Visible to client on their Documents page
        </label>
        {state?.error && (
          <div className="sm:col-span-2">
            <ErrorState message={state.error} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Submit />
        </div>
      </form>
    </Card>
  );
}
