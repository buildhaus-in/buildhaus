"use client";
import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, Button } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { ErrorState, SuccessState } from "@buildhaus/ui";
import { buildingTypeSchema } from "@buildhaus/validation";
import { createProject, type ProjectFormState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create project"}
    </Button>
  );
}

export function CreateProjectForm() {
  const [state, formAction] = useFormState<ProjectFormState, FormData>(createProject, null);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldError = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;

  // Server Actions can't imperatively clear a native <form>; the effect
  // fires once per successful submission (state.ok flips + a fresh
  // project id) and resets the DOM form directly.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <h2 className="mb-3 font-bold text-ivory">New project</h2>
      <form ref={formRef} action={formAction} className="grid gap-x-4 sm:grid-cols-2">
        <Input
          label="Project name"
          name="name"
          placeholder="Sunil Reddy G+2 Duplex"
          required
          error={fieldError("name")}
        />
        <Select label="Type" name="project_type" defaultValue="duplex">
          {buildingTypeSchema.options.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </Select>
        <Input
          label="Site address"
          name="site_address"
          placeholder="Kotha Kalava, Nellore"
          required
          error={fieldError("site_address")}
        />
        <Input
          label="Built-up area (sqft)"
          name="builtup"
          type="number"
          min={0}
          error={fieldError("builtup_area_sqft")}
        />
        <Input label="Floors" name="floors" type="number" min={1} max={20} error={fieldError("floors")} />
        <Input
          label="Contract value (₹)"
          name="contract_value"
          type="number"
          min={0}
          error={fieldError("contract_value")}
        />
        {state && !state.ok && (
          <div className="sm:col-span-2">
            <ErrorState message={state.error} />
          </div>
        )}
        {state?.ok && (
          <div className="sm:col-span-2">
            <SuccessState message={`Project ${state.data.code} created.`} />
          </div>
        )}
        <div className="sm:col-span-2"><Submit /></div>
      </form>
    </Card>
  );
}
