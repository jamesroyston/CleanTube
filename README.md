This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

CleanTube is set up to deploy on **[Vercel](https://vercel.com)** like any standard Next.js app: connect the repo and use the default **Build Command** (`next build` / `npm run build`).

## Supabase Setup

Cloud library, auth, and watch progress use Supabase when these env vars are present:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is **server-only** and is required for **passkey (WebAuthn) sign-in**: after the browser proves possession of a registered credential, the API exchanges a Supabase magic-link token for a normal session. Do not prefix it with `NEXT_PUBLIC_`.

For local work, copy `.env.example` to `.env.local` and fill in your own project values. Do not commit real credentials or `.env.local`.

The app is intentionally safe to deploy without those env vars. In that case it stays in local-only mode, so preview builds still succeed while backend infra is being wired up.

Database schema lives under `supabase/migrations/` and is designed for:

- `saved_channels`
- `watch_later_entries`
- `watch_progress`

Each table is user-scoped with RLS enabled.

### Passkeys (custom WebAuthn)

Passkeys are implemented with **`@simplewebauthn/server`** and **`@simplewebauthn/browser`**. Credentials live in the `webauthn_credentials` table (see `supabase/migrations/`). Sign-in uses the service role to mint a one-time Supabase session via `generateLink` + `verifyOtp` after WebAuthn succeeds. Depending on your Supabase **Auth → Email** settings, generating that link may also send a magic-link email; adjust templates or flows in the dashboard if that is undesirable.

**Supabase MFA (TOTP / SMS):** If you enable MFA in the Supabase dashboard, the sign-in screen collects **authenticator codes** or **SMS codes** after the password step.

**Build-time icons:** `npm run build` runs **`prebuild`**, which executes `scripts/generate-app-icons.mjs` (Sharp) and writes `favicon.ico`, `icon.png`, and `apple-icon.png` under `src/app/`. That runs on Vercel’s build image without extra configuration, so Safari-friendly raster favicons are produced on every production build. To change the artwork, edit `scripts/app-icon-source.svg` and commit; the next Vercel build will regenerate the binaries.

You can still run `npm run generate-icons` locally after changing the SVG. Committing the generated files is optional but keeps `npm run dev` in sync without relying on a prior build.

More detail: [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
