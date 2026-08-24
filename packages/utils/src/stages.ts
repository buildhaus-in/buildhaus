// The 25 standard construction stages every project is seeded with on
// conversion from a lead (see rpc.ts `convert_lead_to_project`) — shared with
// seed.ts so both stay in sync without a circular import.
export const STANDARD_STAGES = [
  "Requirement collection", "Survey", "Soil testing", "Architectural design",
  "Structural design", "Approvals", "Site mobilisation", "Excavation",
  "Foundation", "Plinth", "RCC structure", "Masonry", "Internal plastering",
  "External plastering", "Waterproofing", "Plumbing", "Electrical", "Flooring",
  "Doors and windows", "Painting", "Fixtures", "Elevation", "External works",
  "Snagging", "Handover",
];
