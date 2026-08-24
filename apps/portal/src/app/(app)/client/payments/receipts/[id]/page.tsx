import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card } from "@buildhaus/ui";
import { inrFull, dateLabel } from "@buildhaus/utils";
import { PrintButton } from "./print-button";

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: clientRow } = await supabase
    .from("clients").select("id,full_name").eq("profile_id", ctx?.userId ?? "").maybeSingle();

  const { data: project } = clientRow
    ? await supabase.from("projects").select("id,code,name,site_address").eq("client_id", clientRow.id).maybeSingle()
    : { data: null };

  if (!project || !clientRow) notFound();

  const { data: receipt } = await supabase
    .from("client_receipts")
    .select("id,project_id,receipt_no,amount,receipt_date,mode")
    .eq("id", params.id).maybeSingle();

  // Never render a receipt that doesn't belong to this client's own project —
  // Demo Mode has no RLS, so this ownership check is done explicitly.
  if (!receipt || receipt.project_id !== project.id) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/client/payments" className="text-xs text-brand">← Back to Payments</Link>
        <PrintButton />
      </div>

      <Card className="print:border-none print:shadow-none">
        <div className="mb-6 flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="text-lg font-bold text-ivory">Buildhaus Constructions</div>
            <div className="text-xs text-muted">Payment receipt</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-sandlight">{receipt.receipt_no}</div>
            <div className="text-xs text-muted">{dateLabel(receipt.receipt_date)}</div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Received from</div>
            <div className="text-sandlight">{clientRow.full_name}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Project</div>
            <div className="text-sandlight">{project.code} — {project.name}</div>
            <div className="text-xs text-muted">{project.site_address}</div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Amount received</span>
            <span className="text-xl font-extrabold text-brand">{inrFull(receipt.amount)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Mode of payment</span>
            <span className="capitalize text-sand">{receipt.mode?.replace(/_/g, " ")}</span>
          </div>
        </div>

        <p className="text-xs text-muted">
          This is a system-generated receipt from your Buildhaus client portal. For any queries, please reach
          out to your project team via Messages.
        </p>
      </Card>
    </div>
  );
}
