"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Card, Button, Badge } from "@buildhaus/ui";
import { Select, Textarea } from "@buildhaus/ui";
import { askAssistant, type AskState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Thinking…" : "Ask"}
    </Button>
  );
}

const SUGGESTIONS = [
  "How delayed is this project?",
  "Any client payments due?",
  "Any material shortages?",
  "Any open quality issues?",
  "Draft a client update message",
];

export function AiForm({ projects }: { projects: { id: string; code: string; name: string }[] }) {
  const [state, action] = useFormState<AskState | null, FormData>(askAssistant, null);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="warn">Templated, not live AI</Badge>
          <span className="text-xs text-muted">No external API key is used — every response is a fixed template built from your project data, not a live model.</span>
        </div>
        <form action={action} className="space-y-3">
          <Select label="Ask about this project (optional)" name="project_id" defaultValue="">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </Select>
          <Textarea name="question" label="Your question" placeholder="Ask about this project…" required />
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <span key={s} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">{s}</span>
            ))}
          </div>
          <Submit />
        </form>
      </Card>

      {state?.answer && (
        <Card>
          <div className="mb-2 text-[10px] uppercase tracking-wide text-muted">You asked</div>
          <p className="mb-3 text-sm text-sand">{state.question}</p>
          <div className="mb-2 text-[10px] uppercase tracking-wide text-muted">Assistant</div>
          <p className="whitespace-pre-line text-sm text-sandlight">{state.answer}</p>
        </Card>
      )}
    </div>
  );
}
