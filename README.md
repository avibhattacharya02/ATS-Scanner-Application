# HirePulse

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

## Optional AI resume suggestions

The ATS score and local suggestions work without an external API. To enable AI-generated suggestions, create a Gemini API key in Google AI Studio, copy `.env.example` to `.env.local`, and set `GEMINI_API_KEY` to your key. Restart the development server after saving. You can optionally change `GEMINI_MODEL` as well. Keep `.env.local` private and never expose the key in client-side code. When configured, extracted resume text and the job description are sent to Google Gemini for suggestions.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Accounts and saved scans

HirePulse uses Supabase Auth for email/password accounts and Supabase Postgres for private scan history.

1. Create a Supabase project and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from its API settings to your existing root `.env.local`. Keep secret/service-role keys out of browser environment variables.
3. In the Supabase SQL Editor, run `supabase/migrations/20261116000000_create_scans.sql`.
4. In Supabase Auth URL settings, add your local app URL (for example, `http://localhost:3000`) to the allowed redirect URLs. Email confirmation is enabled by default; the confirmation link returns through `/auth/confirm`.
5. Restart the Next.js development server, then create an account in the app.

The scans table is protected by row-level security: users can only read and create their own rows. Scan history stores the score, analysis summary, and job description. Uploaded resume files and extracted resume text are not saved to the database. If AI suggestions are enabled, extracted resume text is sent to Google Gemini as described above.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
