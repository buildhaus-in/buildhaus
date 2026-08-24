// Central navigation definitions per role. Grouped so the Owner's 16
// destinations stay organised instead of a flat crowded list.

export interface NavItem { href: string; label: string }
export interface NavGroup { heading?: string; items: NavItem[] }

export const OWNER_NAV: NavGroup[] = [
  { items: [{ href: "/owner", label: "Command Centre" }] },
  { heading: "Sales", items: [
    { href: "/owner/crm", label: "CRM" },
    { href: "/owner/quotations", label: "Estimates & Quotations" },
  ]},
  { heading: "Delivery", items: [
    { href: "/owner/projects", label: "Projects" },
    { href: "/owner/site-operations", label: "Site Operations" },
    { href: "/owner/drawings", label: "Drawings" },
    { href: "/owner/quality", label: "Quality Control" },
  ]},
  { heading: "Supply chain", items: [
    { href: "/owner/materials", label: "Materials & Procurement" },
    { href: "/owner/labour", label: "Labour & Subcontractors" },
  ]},
  { heading: "Money", items: [
    { href: "/owner/finance", label: "Finance" },
  ]},
  { heading: "Relationships", items: [
    { href: "/owner/clients", label: "Clients" },
  ]},
  { heading: "Insights", items: [
    { href: "/owner/reports", label: "Reports" },
    { href: "/owner/notifications", label: "Notifications" },
    { href: "/owner/ai", label: "AI Assistant" },
    { href: "/owner/website", label: "Public Website Content" },
  ]},
  { heading: "Admin", items: [
    { href: "/owner/users", label: "Users" },
    { href: "/owner/settings", label: "Settings" },
  ]},
];

export const ARCHITECT_NAV: NavGroup[] = [
  { items: [
    { href: "/architect", label: "Dashboard" },
    { href: "/architect/projects", label: "Projects" },
    { href: "/architect/drawings", label: "Drawings" },
    { href: "/architect/reviews", label: "Reviews" },
  ]},
];

export const CLIENT_NAV: NavGroup[] = [
  { items: [
    { href: "/client", label: "Overview" },
    { href: "/client/progress", label: "Progress" },
    { href: "/client/photos", label: "Photos" },
    { href: "/client/approvals", label: "Approvals" },
    { href: "/client/payments", label: "Payments" },
    { href: "/client/documents", label: "Documents" },
    { href: "/client/change-requests", label: "Change Requests" },
    { href: "/client/messages", label: "Messages" },
  ]},
];

// Engineer is split for a mobile bottom bar: four primary destinations plus a
// "More" screen that lists the rest. Desktop shows all of them in the sidebar.
export const ENGINEER_PRIMARY: NavItem[] = [
  { href: "/engineer", label: "Today" },
  { href: "/engineer/tasks", label: "Tasks" },
  { href: "/engineer/report", label: "Report" },
  { href: "/engineer/materials", label: "Materials" },
];
export const ENGINEER_MORE: NavItem[] = [
  { href: "/engineer/projects", label: "My Projects" },
  { href: "/engineer/drawings", label: "Drawings" },
  { href: "/engineer/attendance", label: "Attendance" },
  { href: "/engineer/issues", label: "Site Issues" },
  { href: "/engineer/notifications", label: "Notifications" },
  { href: "/engineer/profile", label: "Profile" },
];
export const ENGINEER_NAV: NavGroup[] = [
  { items: [...ENGINEER_PRIMARY, ...ENGINEER_MORE] },
];

export function navGroupsFor(prefix: string): NavGroup[] {
  if (prefix.startsWith("/owner")) return OWNER_NAV;
  if (prefix.startsWith("/engineer")) return ENGINEER_NAV;
  if (prefix.startsWith("/architect")) return ARCHITECT_NAV;
  return CLIENT_NAV;
}
