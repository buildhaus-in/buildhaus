Project rules — apply to all work in this repo:

- Do not rebuild. Preserve existing design, routes, Supabase schema,
  auth and role-based access.
- Never fail silently. Every mutation shows loading, disabled-during-
  submit, and either a success toast or a specific error message.
- Never expose the service-role key to the browser. Server-side only,
  and only where genuinely required.
- No mock data once live Supabase is configured. No placeholder buttons.
  Every visible control performs its real database operation.
- Server-side validation AND permission validation on every server
  action and API route. Never trust the client.
- Duplicate-submit protection on every mutation.
- Audit-log entry for every important change.
- Indian currency formatting (₹, lakh/crore grouping) and consistent
  date format throughout.
- Preserve responsive desktop/mobile behaviour.
- Do not write test data into production tables. Use an isolated test
  project record, and clean up after.
