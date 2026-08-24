"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { assessDelay } from "@buildhaus/utils";
import { inr } from "@buildhaus/utils";

export interface AskState {
  answer: string;
  question: string;
}

// Demo Mode "AI Assistant" — deliberately NOT wired to any external LLM or
// API key. This looks at real Demo Mode data and returns a templated
// response so the screen is honest about being a stand-in, not a live model.
export async function askAssistant(_prev: AskState | null, formData: FormData): Promise<AskState> {
  const ctx = await getUserContext();
  const question = String(formData.get("question") || "").trim();
  const projectId = String(formData.get("project_id") || "");
  if (!question) return { answer: "Ask a question first.", question: "" };
  if (!ctx || !ctx.roles.includes("owner")) return { answer: "Not authorised.", question };

  const supabase = createClient();
  const q = question.toLowerCase();

  let project: any = null;
  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("id,code,name,status,progress,start_date,planned_completion,current_stage")
      .eq("id", projectId).maybeSingle();
    project = data;
  }

  let body: string;

  if (/(delay|progress|status|behind|schedule)/.test(q) && project) {
    const d = assessDelay({ startDate: project.start_date, plannedCompletion: project.planned_completion, actualProgress: project.progress });
    body = `${project.name} (${project.code}) is at ${d.actualProgress}% actual vs ${d.plannedProgress}% planned — risk level "${d.risk}". `
      + `Current stage: ${project.current_stage ?? "—"}. `
      + (d.delayDays > 0 ? `Projected to finish ${d.delayDays} day(s) late at the current pace.` : "On pace to finish on schedule.");
  } else if (/(payment|due|invoice|receivable|cash)/.test(q)) {
    const { data: schedule } = await supabase.from("client_payment_schedules").select("amount,status,due_date,project_id").order("due_date", { ascending: true });
    const today = new Date().toISOString().slice(0, 10);
    const overdue = (schedule ?? []).filter((s: any) => s.status !== "paid" && s.due_date && s.due_date < today && (!projectId || s.project_id === projectId));
    const overdueTotal = overdue.reduce((a: any, s: any) => a + Number(s.amount), 0);
    body = overdue.length
      ? `${overdue.length} client milestone(s) overdue${project ? ` on ${project.name}` : " across all projects"}, totalling ${inr(overdueTotal)}. Check Finance for details.`
      : `No overdue client milestones${project ? ` on ${project.name}` : ""} right now.`;
  } else if (/(material|shortage|stock|supply)/.test(q)) {
    const { count } = await supabase.from("material_requests").select("*", { count: "exact", head: true }).eq("status", "requested");
    body = `${count ?? 0} material request(s) are awaiting your review. Open Materials & Procurement to approve or fulfil them.`;
  } else if (/(quality|inspection|issue|defect)/.test(q)) {
    const { count } = await supabase.from("inspections").select("*", { count: "exact", head: true }).in("status", ["pending", "failed", "correction_pending"]);
    body = `${count ?? 0} quality issue(s) are currently open. Open Quality Control to pass, fail, or close them out.`;
  } else if (/(draft|message|write|email|reply)/.test(q)) {
    body = `Draft: "Hi — quick update on ${project ? project.name : "your project"}: work is progressing as planned. We'll share the next site report shortly. Let us know if you have any questions." `
      + `(Edit before sending — this assistant never sends messages on its own.)`;
  } else {
    body = `I can help summarise delays, payments due, material shortages, and open quality issues${project ? ` for ${project.name}` : " across your projects"}. Try asking about one of those, optionally after picking a project above.`;
  }

  return {
    answer: `[Demo response — no live AI call in Demo Mode]\n\n${body}`,
    question,
  };
}
