// Stable, readable ids for the handful of demo rows other demo modules need
// to reference directly (login users, RPC handlers, cross-links). Everything
// else in the seed data can use ordinary generated ids.
export const IDS = {
  org: "org-1",
  roleOwner: "role-owner",
  roleEngineer: "role-engineer",
  roleArchitect: "role-architect",
  roleClient: "role-client",

  profileOwner: "profile-owner",
  profileEngineer: "profile-engineer",
  profileArchitect: "profile-architect",
  profileClient: "profile-client",

  clientSunil: "client-sunil",

  projectVilla: "project-villa",
  projectDuplex: "project-duplex",
  projectCommercial: "project-commercial",
} as const;
