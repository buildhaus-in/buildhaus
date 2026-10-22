"use client";
import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, Button, FileUpload } from "@buildhaus/ui";
import { Input, Select, Textarea } from "@buildhaus/ui";
import { ErrorState } from "@buildhaus/ui";
import { createDrawing, type DrawingFormState } from "../actions";
import { prepareUploadViaApi } from "@/lib/prepare-upload-client";

const DISCIPLINES = ["architectural", "structural", "electrical", "plumbing", "interior", "elevation", "landscape", "shop_drawing", "as_built"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create drawing"}
    </Button>
  );
}

export function UploadDrawingForm({ projects }: { projects: { id: string; code: string; name: string }[] }) {
  const [state, formAction] = useFormState<DrawingFormState, FormData>(createDrawing, null);
  const formRef = useRef<HTMLFormElement>(null);
  // The file is stored under the chosen project's folder, so it's read at
  // the moment the file is picked.
  const selectedProject = () => String(new FormData(formRef.current ?? undefined).get("project_id") || "");

  return (
    <Card>
      <form ref={formRef} action={formAction} className="grid gap-x-4 sm:grid-cols-2">
        <Select label="Project" name="project_id" required defaultValue="">
          <option value="" disabled>Select a project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
          ))}
        </Select>
        <Select label="Discipline" name="discipline" defaultValue="architectural">
          {DISCIPLINES.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
        </Select>
        <Input label="Drawing no." name="drawing_no" placeholder="A-401" required />
        <Input label="Floor" name="floor" placeholder="Ground floor" />
        <div className="sm:col-span-2">
          <Input label="Title" name="title" placeholder="Kitchen layout detail" required />
        </div>
        <div className="sm:col-span-2">
          <FileUpload name="file" label="Drawing file" kind="drawing" required direct={(meta) => prepareUploadViaApi({ target: "drawing", projectId: selectedProject() }, meta)} helperText="Choose the project first — PDF or image, max 10MB." />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Notes" name="notes" placeholder="First issue for internal review." />
        </div>
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
