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

**Build-time icons:** `npm run build` runs **`prebuild`**, which executes `scripts/generate-app-icons.mjs` (Sharp) and writes `favicon.ico`, `icon.png`, and `apple-icon.png` under `src/app/`. That runs on Vercel’s build image without extra configuration, so Safari-friendly raster favicons are produced on every production build. To change the artwork, edit `scripts/app-icon-source.svg` and commit; the next Vercel build will regenerate the binaries.

You can still run `npm run generate-icons` locally after changing the SVG. Committing the generated files is optional but keeps `npm run dev` in sync without relying on a prior build.

More detail: [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
