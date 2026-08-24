# Running BuildHaus on a new laptop

Both applications are in this one folder — the public website AND the
management portal. They share code, so always keep the folder together.

## One-time setup

1. Install Node.js (version 20 or newer) from https://nodejs.org
2. Unzip this folder anywhere (e.g. Desktop)
3. Open Terminal, go into the folder, and install dependencies:

   ```
   cd buildhaus
   npm install
   ```

## Run it (every time)

```
npm run dev
```

Then open in a browser:

- Public website → http://localhost:3000
- Management portal → http://localhost:3001

That's it — no accounts or configuration needed. It starts in Demo Mode
with sample data automatically.

## Portal demo logins

| Role          | Email                       | Password             |
|---------------|-----------------------------|----------------------|
| Owner         | owner@buildhaus.example     | Buildhaus#Owner1     |
| Site Engineer | engineer@buildhaus.example  | Buildhaus#Engineer1  |
| Architect     | architect@buildhaus.example | Buildhaus#Architect1 |
| Client        | client@buildhaus.example    | Buildhaus#Client1    |

## Useful extras

- `npm run demo:reset` — reset the sample data back to fresh
- `docs/DEPLOYMENT.md` — how to put this on the internet properly (Vercel + Supabase)
- `README.md` — full documentation
