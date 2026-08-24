import { describe, it, expect } from "vitest";
import type { z } from "zod";
import {
  loginSchema,
  costEstimatorSchema,
  enquirySchema,
  siteVisitRequestSchema,
  dailyReportSchema,
  materialRequestSchema,
  changeRequestSchema,
  createUserSchema,
  createProjectSchema,
  zodErrorToFieldErrors,
} from "./index";

// Shared helper: assert a schema rejects `data` and that the named field
// carries at least one error message in the flattened fieldErrors map — the
// shape every Server Action in the app relies on (see index.ts's header
// comment: `{ ok: false, fieldErrors }`, never a bare throw).
function expectFieldError(schema: z.ZodTypeAny, data: unknown, field: string) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(false);
  if (!result.success) {
    const fieldErrors = zodErrorToFieldErrors(result.error);
    expect(fieldErrors[field]?.length ?? 0).toBeGreaterThan(0);
  }
}

describe("loginSchema", () => {
  it("accepts a valid email + non-empty password", () => {
    const result = loginSchema.safeParse({ email: "owner@buildhaus.example", password: "Buildhaus#Owner1" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expectFieldError(loginSchema, { email: "not-an-email", password: "x" }, "email");
  });
});

describe("costEstimatorSchema", () => {
  const valid = {
    full_name: "Ramesh Kumar",
    mobile: "+91 9000010001",
    site_location: "Podalakur Road, Nellore",
    city: "Nellore",
    state: "Andhra Pradesh",
    builtup_area_sqft: 2800,
    floors: 2,
    building_type: "independent_house",
    package_key: "premium",
    optional_works: ["parking"],
  };

  it("accepts a fully valid submission", () => {
    const result = costEstimatorSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a missing built-up area", () => {
    const { builtup_area_sqft, ...rest } = valid;
    expectFieldError(costEstimatorSchema, rest, "builtup_area_sqft");
  });

  it("rejects an out-of-range floor count", () => {
    expectFieldError(costEstimatorSchema, { ...valid, floors: 0 }, "floors");
  });

  it("rejects an unrecognised building type", () => {
    expectFieldError(costEstimatorSchema, { ...valid, building_type: "castle" }, "building_type");
  });
});

describe("enquirySchema", () => {
  const valid = {
    full_name: "Ramesh Kumar",
    mobile: "+91 9000010001",
    site_location: "Podalakur Road, Nellore",
    message: "Looking to build a 2BHK independent house, budget around 50 lakhs.",
  };

  it("accepts a valid enquiry", () => {
    expect(enquirySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a message that's too short", () => {
    expectFieldError(enquirySchema, { ...valid, message: "Hi" }, "message");
  });
});

describe("siteVisitRequestSchema", () => {
  const valid = {
    full_name: "Ramesh Kumar",
    mobile: "+91 9000010001",
    site_location: "Podalakur Road, Nellore",
    preferred_date: "2026-08-01",
  };

  it("accepts a valid site-visit request", () => {
    expect(siteVisitRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing preferred date", () => {
    const { preferred_date, ...rest } = valid;
    expectFieldError(siteVisitRequestSchema, rest, "preferred_date");
  });
});

describe("dailyReportSchema", () => {
  const valid = {
    project_id: "project-villa",
    report_date: "2026-07-14",
    work_completed: "Shuttering for the 2nd floor slab, 70% complete.",
  };

  it("accepts a valid daily report", () => {
    expect(dailyReportSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a work_completed description that's too short", () => {
    expectFieldError(dailyReportSchema, { ...valid, work_completed: "ok" }, "work_completed");
  });

  it("rejects a missing project_id", () => {
    const { project_id, ...rest } = valid;
    expectFieldError(dailyReportSchema, rest, "project_id");
  });
});

describe("materialRequestSchema", () => {
  const valid = {
    project_id: "project-villa",
    priority: "high",
    needed_by: "2026-08-01",
    items: [{ material_name: "TMT steel 12mm", quantity: 800, unit: "kg" }],
  };

  it("accepts a valid material request with at least one item", () => {
    expect(materialRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty items array", () => {
    expectFieldError(materialRequestSchema, { ...valid, items: [] }, "items");
  });

  it("rejects an invalid priority value", () => {
    expectFieldError(materialRequestSchema, { ...valid, priority: "urgent" }, "priority");
  });
});

describe("changeRequestSchema", () => {
  const valid = {
    title: "Add extra wardrobe",
    description: "Client requested a built-in wardrobe in Bedroom 2 that wasn't in the original scope.",
  };

  it("accepts a valid change request", () => {
    expect(changeRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a description that's too short", () => {
    expectFieldError(changeRequestSchema, { ...valid, description: "short" }, "description");
  });
});

describe("createUserSchema", () => {
  const valid = {
    full_name: "New Engineer",
    email: "new.engineer@buildhaus.example",
    password: "Buildhaus#New1",
    role_key: "site_engineer",
  };

  it("accepts a valid new-user submission", () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expectFieldError(createUserSchema, { ...valid, password: "short" }, "password");
  });

  it("rejects an unrecognised role_key", () => {
    expectFieldError(createUserSchema, { ...valid, role_key: "superadmin" }, "role_key");
  });
});

describe("createProjectSchema", () => {
  const valid = {
    name: "Test Villa Project",
    project_type: "villa",
    site_address: "123 Main Street, Nellore",
  };

  it("accepts a valid minimal project", () => {
    expect(createProjectSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing site_address", () => {
    const { site_address, ...rest } = valid;
    expectFieldError(createProjectSchema, rest, "site_address");
  });
});
