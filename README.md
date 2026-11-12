# Ajaia Docs

A small collaborative document editor I built for the Ajaia AI-Native Full Stack
Developer assignment.

## What it does

You can sign in, create rich-text documents, format them with bold / italic /
underline, add H1 to H3 headings, add bulleted and numbered lists, rename
documents, upload a `.txt` or `.md` file as a new document, and share any
document you own with another user by email. Shared documents show up on the
other person's dashboard under a separate section.

Autosave runs on every change (600ms debounce). The save state is visible next
to the toolbar.

## Live URL

_added once deployed_

## Stack

- Next.js 16 (App Router) with TypeScript
- Supabase for auth, Postgres, and the storage behind file-based docs
- TipTap (ProseMirror) for the editor
- Tailwind for styling
- Vercel for hosting
- Vitest for the one real test (sharing authorization)

## Try it

The app has two seeded accounts already in it. Use these:

| Email | Password |
|---|---|
| reviewer1@ajaia-docs.test | Reviewer1! |
| reviewer2@ajaia-docs.test | Reviewer2! |

Flow I'd suggest for a quick review:

1. Open the live URL and sign in as reviewer1.
2. Click **New document**. Type some text, apply formatting, rename the title at the top. Reload. Everything persists.
3. Click **Share**, add `reviewer2@ajaia-docs.test`, close the dialog.
4. Sign out. Sign in as reviewer2.
5. The doc now shows up under **Shared with you** on the dashboard. Open it, make an edit, reload. The edit persists.
6. Back on the dashboard, click **Upload file** and pick a `.txt` or `.md` file. It becomes a new document with the formatting parsed out.

Sign-up is enabled too if you want to make your own account instead.

## Run locally

```bash
nvm use
npm install
cp .env.local.example .env.local
# fill in your Supabase values in .env.local
npm run dev
```

Open http://localhost:3000.

### Environment variables

`.env.local` needs three things:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

The secret key is server-side only. It's never sent to the browser. The code
uses it on API routes to insert documents while still enforcing that a caller
can only create documents owned by their own user id.

### Supabase setup

1. Create a Supabase project.
2. In the SQL Editor, paste the full contents of `supabase/schema.sql` and run it. That creates the `profiles`, `documents`, and `document_shares` tables, the RLS policies, and the trigger that mirrors `auth.users` into `profiles`.
3. In **Authentication > Sign In / Providers > Email**, turn off "Confirm email" (so the seeded password flow works without an email round trip).
4. In **Authentication > Users**, add the two seeded accounts above (check "Auto Confirm User" on each).
5. In **Authentication > URL Configuration**, set the Site URL to your app URL (`http://localhost:3000` locally, your Vercel URL in production).

### Tests

```bash
npm test
```

## What I cut on purpose

The prompt said 4 to 6 hours and asked for deliberate scope. Here's what I left out and why:

- **Real time multi-user cursors.** Supabase Realtime presence plus a TipTap collaboration cursor plugin is a full day on its own. Last save wins is the current model. If two users edit at once, the later save overwrites.
- **`.docx` upload.** Needs `mammoth.js` and handling of a lot of edge cases. Didn't feel worth it versus more polish on the editor.
- **View-only share role.** Right now anyone with access can edit. Only the owner can share or revoke or delete. One more policy split would add view-only.
- **Comments, version history, PDF export.** All in the stretch list, all skipped.
- **Magic link auth.** Started here, hit two blockers (PKCE cross-browser issues, Supabase free tier gating email template edits behind custom SMTP), pivoted to email + password with seeded accounts. The prompt explicitly allows this and it makes the review flow one click.

More detail on the auth pivot is in `AI_WORKFLOW.md`.

## What I'd do next with 2 to 4 more hours

1. Real time presence and cursor sync via Supabase Realtime. Broadcast TipTap selection updates on a channel per document id.
2. View only share role. Add a `role` column on `document_shares` and split the UPDATE policy on it.
3. Markdown export. The round trip into TipTap already works through `lib/md-to-tiptap.ts`. I'd add `turndown` the other direction and a download button.
4. Soft delete and a trash view. Right now delete is destructive and owner only.

## Project layout

```
app/
  page.tsx                       Landing. Redirects to /dashboard if signed in.
  login/                         Email + password form.
  auth/callback/                 Unused in the final build (left in for the token-hash path).
  auth/signout/                  POST signs out.
  dashboard/page.tsx             Your documents + Shared with you.
  doc/[id]/page.tsx              Editor + title + share button.
  api/docs/route.ts              POST creates a new document.
  api/upload/route.ts            POST parses a .txt or .md file into a new document.
components/                      Editor, toolbar, title input, share dialog, upload button.
lib/supabase/client.ts           Browser client.
lib/supabase/server.ts           Server session client.
lib/supabase/admin.ts            Service role client for server side mutations.
lib/supabase/middleware.ts       Session refresh logic used by proxy.ts.
lib/docs.ts                      Data helpers.
lib/md-to-tiptap.ts              Small Markdown parser that outputs TipTap JSON.
supabase/schema.sql              Full DB schema plus RLS policies.
tests/                           Vitest.
proxy.ts                         Next 16 "proxy" (what used to be middleware).
```

## Trust boundaries

- The browser only ever sees the publishable Supabase key. It cannot bypass RLS.
- Mutations that create new rows go through API routes using a service role client, but each route authenticates the caller first and forces `owner_id` to the caller's user id. A user cannot create or upload documents owned by someone else.
- Row Level Security still protects reads and updates on the browser path.
- `proxy.ts` refreshes session cookies on every request and sends unauthenticated users to `/login` when they try to open a protected page. The security boundary is RLS and the API route checks, not the proxy.

## Credits

Built with Claude Code as my pair. Details on where that helped and where I overrode it are in `AI_WORKFLOW.md`.
