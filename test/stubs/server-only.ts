// Test-only stand-in for the `server-only` package. The real package throws
// unconditionally when its module body executes (Next.js's webpack config
// aliases it to a no-op for the server compilation graph and to a throwing
// stub for the client graph — outside that build pipeline, e.g. under
// Vitest/Node, importing it directly always throws). vitest.config.ts aliases
// `server-only` to this empty module so packages/database's demo layer
// (db.ts, client.ts, etc.) can be imported directly in tests.
export {};
