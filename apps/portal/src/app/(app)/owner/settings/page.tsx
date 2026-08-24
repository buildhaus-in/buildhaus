import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Button } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { updateOrgSettings } from "./actions";

const CURRENCIES = ["INR", "USD", "AED", "GBP"];

export default async function SettingsPage() {
  const supabase = createClient();
  const ctx = await getUserContext();
  const orgId = ctx?.profile?.organisation_id ?? "";

  const [{ data: org }, { data: settings }] = await Promise.all([
    supabase.from("organisations").select("id,name,city,state").eq("id", orgId).maybeSingle(),
    supabase.from("organisation_settings").select("id,currency,timezone").eq("organisation_id", orgId).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Settings</h1>
        <p className="text-sm text-muted">Organisation profile and defaults used across the app.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Organisation</h2>
        <form action={updateOrgSettings} className="grid gap-x-4 sm:grid-cols-2">
          <Input label="Organisation name" name="name" defaultValue={org?.name ?? ""} required />
          <Select label="Currency" name="currency" defaultValue={settings?.currency ?? "INR"}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="City" name="city" defaultValue={org?.city ?? ""} />
          <Input label="State" name="state" defaultValue={org?.state ?? ""} />
          <Input label="Timezone" name="timezone" defaultValue={settings?.timezone ?? "Asia/Kolkata"} />
          <div className="sm:col-span-2"><Button type="submit">Save settings</Button></div>
        </form>
      </Card>
    </div>
  );
}
