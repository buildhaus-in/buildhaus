// useFormStatus/useFormState are typed in @types/react-dom's canary entry,
// not its default index (React 18 shipped them as canary APIs; Next.js's own
// bundled types normally paper over this inside the apps). This reference
// makes this package typecheck standalone (tsc -p packages/ui) too.
/// <reference types="react-dom/canary" />
