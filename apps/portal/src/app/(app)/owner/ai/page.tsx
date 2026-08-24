import { createClient } from "@buildhaus/database";
import { AiForm } from "./AiForm";

export default async function AiAssistantPage() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id,code,name")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">AI Assistant</h1>
        <p className="text-sm text-muted">
          Ask about delays, payments due, material shortages or quality issues. Never auto-approves anything.
        </p>
      </div>

      <AiForm projects={projects ?? []} />
    </div>
  );
}
