"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Card, Button, FileUpload } from "@buildhaus/ui";
import { Textarea } from "@buildhaus/ui";
import { ErrorState } from "@buildhaus/ui";
import { createRevision, type DrawingFormState } from "../actions";

function Submit({ nextRevisionNo }: { nextRevisionNo: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : `Save as new revision (Rev ${nextRevisionNo})`}
    </Button>
  );
}

export function RevisionForm({
  drawingId,
  drawingNo,
  nextRevisionNo,
  isRevisionRequested,
  currentRevisionNo,
}: {
  drawingId: string;
  drawingNo: string;
  nextRevisionNo: number;
  isRevisionRequested: boolean;
  currentRevisionNo: number | null;
}) {
  const boundAction = createRevision.bind(null, drawingId);
  const [state, formAction] = useFormState<DrawingFormState, FormData>(boundAction, null);

  return (
    <Card>
      <h2 className="mb-3 font-bold text-ivory">
        {isRevisionRequested ? "Upload revised file" : "Create revision"}
      </h2>
      {isRevisionRequested && (
        <p className="-mt-2 mb-3 text-xs text-warn">
          The Owner/client requested changes — see notes on Rev {currentRevisionNo} below. Upload a revised file to respond.
        </p>
      )}
      <form action={formAction} className="grid gap-x-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FileUpload name="file" label="File" kind="drawing" required helperText={`Replaces the file for ${drawingNo} Rev ${nextRevisionNo} — PDF or image, max 10MB.`} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Notes" name="notes" placeholder="What changed in this revision?" />
        </div>
        {state?.error && (
          <div className="sm:col-span-2">
            <ErrorState message={state.error} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Submit nextRevisionNo={nextRevisionNo} />
        </div>
      </form>
    </Card>
  );
}
