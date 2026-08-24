"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@buildhaus/ui";
import { requestDetailedBoq, requestSiteVisitFromQuotation, requestCallback, RequestState } from "./actions";

function ActionButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto">
      {pending ? <><span className="spinner" /> Sending…</> : children}
    </Button>
  );
}

function RequestForm({
  action, leadId, quotationNo, label,
}: { action: (prev: RequestState, formData: FormData) => Promise<RequestState>; leadId: string | null; quotationNo: string; label: string }) {
  const [state, formAction] = useFormState<RequestState, FormData>(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="lead_id" value={leadId ?? ""} />
      <input type="hidden" name="quotation_no" value={quotationNo} />
      <ActionButton>{label}</ActionButton>
      {state && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${state.ok ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"}`}>
          {state.message}
        </div>
      )}
    </form>
  );
}

export function QuotationRequestActions({ leadId, quotationNo }: { leadId: string | null; quotationNo: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <RequestForm action={requestDetailedBoq} leadId={leadId} quotationNo={quotationNo} label="Request detailed BOQ" />
      <RequestForm action={requestSiteVisitFromQuotation} leadId={leadId} quotationNo={quotationNo} label="Request site visit" />
      <RequestForm action={requestCallback} leadId={leadId} quotationNo={quotationNo} label="Request callback" />
    </div>
  );
}

// "Download PDF" hits the server-rendered @react-pdf/renderer route (a real
// binary PDF, Content-Disposition: inline) via a plain <a> — not next/link,
// since this isn't a Next page and shouldn't go through client-side RSC
// navigation. "Print" is a separate, legitimate feature: it prints the
// on-screen view as-is via the browser's native print dialog.
export function PrintButtons({ pdfHref }: { pdfHref: string }) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <a href={pdfHref} target="_blank" rel="noopener noreferrer">
        <Button>Download PDF</Button>
      </a>
      <Button variant="outline" onClick={() => window.print()}>Print</Button>
    </div>
  );
}
