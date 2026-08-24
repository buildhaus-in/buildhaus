import { createClient } from "@buildhaus/database";
import { Card, Button, Badge } from "@buildhaus/ui";
import { Input } from "@buildhaus/ui";
import { inr } from "@buildhaus/utils";
import { updateRate, updatePackageRate } from "./actions";

export default async function EstimatorPage() {
  const supabase = createClient();

  const [{ data: packages }, { data: rates }, { data: history }] = await Promise.all([
    supabase.from("estimator_packages").select("id,key,label,rate_per_sqft,description").order("rate_per_sqft", { ascending: true }),
    supabase.from("estimator_rates").select("id,component,label,percent").order("label", { ascending: true }),
    supabase.from("estimator_rate_history").select("key,old_value,new_value,changed_at").order("changed_at", { ascending: false }).limit(10),
  ]);

  const packageList = packages ?? [];
  const rateList = rates ?? [];
  const totalPercent = rateList.reduce((a: any, r: any) => a + Number(r.percent), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Estimator config</h1>
        <p className="text-sm text-muted">
          This is the only source the public cost estimator reads from — nothing here is hardcoded on the website.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Package rates (₹ / sqft)</h2>
        <div className="space-y-3">
          {packageList.map((p: any) => (
            <form key={p.id} action={updatePackageRate} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="flex-1 min-w-[160px]">
                <div className="text-sm font-semibold text-sandlight">{p.label}</div>
                <div className="text-xs text-muted">{p.description}</div>
              </div>
              <Input label="Rate per sqft (₹)" name="rate_per_sqft" type="number" defaultValue={p.rate_per_sqft} className="!mb-0 w-40" />
              <Button type="submit" variant="outline">Save</Button>
            </form>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ivory">Cost breakdown percentages</h2>
          <Badge tone={totalPercent === 100 ? "ok" : "warn"}>{totalPercent}% total</Badge>
        </div>
        <p className="mb-3 text-xs text-muted">These should add up to 100% — they split a package&apos;s per-sqft rate across cost heads.</p>
        <div className="space-y-2">
          {rateList.map((r: any) => (
            <form key={r.id} action={updateRate} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
              <input type="hidden" name="id" value={r.id} />
              <span className="text-sm text-sandlight">{r.label}</span>
              <div className="flex items-center gap-2">
                <input
                  name="percent" type="number" step="0.5" defaultValue={r.percent}
                  className="w-20 rounded-lg border border-border bg-card px-2 py-1.5 text-right text-sm text-ink focus:border-brand"
                />
                <span className="text-xs text-muted">%</span>
                <Button type="submit" variant="outline">Save</Button>
              </div>
            </form>
          ))}
        </div>
      </Card>

      {history && history.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Recent rate changes</h2>
          <div className="divide-y divide-border text-sm">
            {history.map((h: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-sand">{h.key}</span>
                <span className="text-muted">{h.old_value} → {h.new_value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
