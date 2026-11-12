# Architecture note

## 1. What I prioritized

I had ~5 hours. I chose two areas to make genuinely good:

1. **The editing experience.** TipTap with a real toolbar, debounced
   autosave with a visible save-state indicator, and the specific
   formatting options the prompt listed. The editor stores content as
   ProseMirror JSON in a `jsonb` column, which preserves structure
   perfectly on reopen.
2. **The authorization model.** Sharing is enforced in the database via
   Supabase Row Level Security — not in the application layer. This means
   an attacker (or a bug) in the client code cannot bypass access
   control. The TypeScript test in `tests/` pins the same rule the SQL
   policy enforces, so a reviewer can verify both encode the same
   predicate.

Everything else (UI polish, extra file formats, realtime cursors) was
either cut or deliberately kept simple.

## 2. Stack rationale

| Layer | Pick | Why over alternatives |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript | Unified frontend/backend; API routes avoid a second deploy target. |
| Editor | TipTap v3 (ProseMirror) | Off-the-shelf B/I/U/headings/lists, serializes to clean JSON (Lexical was heavier; Quill's data model is more awkward for structured docs). |
| Auth + DB + storage | Supabase | RLS collapses "who can see what" from middleware + handwritten checks down to SQL policies. Email + password with seeded accounts so reviewers can log in instantly (the prompt explicitly blesses seeded accounts for scope). |
| Deploy | Vercel | Native Next.js; zero config; free tier is enough. |
| Tests | Vitest | Faster to set up than Jest with Next 16; no transform config needed. |

## 3. Data model

Three tables (full schema in `supabase/schema.sql`):

```
profiles(id uuid PK → auth.users.id, email text unique)
  ← auto-populated via trigger on auth.users insert.
  ← exists so we can look up a user_id from an email without the
    service_role key; `auth.users` is not queryable from the browser.

documents(id, owner_id → auth.users.id, title, content jsonb, timestamps)
  ← content is TipTap's ProseMirror JSON — faithful round-trip.

document_shares(document_id, shared_with_id, unique together)
  ← one row per (doc, user) share.
```

### Why `profiles` instead of just using `auth.users`

Supabase's `auth.users` is in a protected schema and requires the service
role key to read from the server. Rather than ship the service key, I
mirror `id` and `email` into a `public.profiles` row via a trigger. That
lets the browser do `select id from profiles where email = ?` under a
permissive-but-safe RLS policy (only `id` and `email` are exposed, no
password hashes or metadata). This also means **no server-side secret
has to leave the Supabase project**.

## 4. Authorization

Encoded as SQL RLS policies, not application code:

- **Read a document** iff you own it OR there's a row in `document_shares` for (doc_id, you).
- **Update a document** iff same as read (shared users can edit — collab model).
- **Delete a document** iff you are the owner.
- **Insert a share** iff you own the document.
- **Delete a share** iff you own the document.
- **Read a share row** iff you are the share recipient or the document owner.

The test `tests/sharing-authorization.test.ts` holds the same predicate
in TypeScript. If a reviewer wants to audit the rule, they read the test
and compare it against the SQL in schema.sql side by side.

## 5. Save model

Autosave, not explicit save:

- Editor subscribes to TipTap's `onUpdate`.
- Each change schedules a 600 ms debounced write of the current `getJSON()` to the DB.
- Save-state (`idle / saving / saved / error`) is rendered next to the toolbar so users see the state at a glance.
- Title rename follows the same pattern with a 500 ms debounce.

Tradeoff: no offline buffer, no retry on network error — a reload on
"save failed" would lose unsaved input. In a fuller build I'd queue
failed updates and retry, with an explicit "unsaved changes" banner.

## 6. What I deliberately cut, and why

| Cut | Reason |
|---|---|
| Magic-link / passwordless auth | Started here but hit two constraints: Supabase free tier restricts email-template editing to projects with custom SMTP, and PKCE magic links break if the email is opened in a different browser than where the request was made. The prompt explicitly allows "seeded accounts, mocked auth, or a lightweight login flow" to keep scope reasonable — switched to email + password with two seeded reviewer accounts. See `AI_WORKFLOW.md § Pivots` for the full reasoning trail. |
| Realtime multi-user cursors | High-value but a full day of work (presence, selection broadcast, OT or CRDT to merge). I'd rather ship solid single-user editing. |
| `.docx` upload | Needs `mammoth.js` + handling of many edge cases. Doesn't move the needle on what Ajaia is actually testing. |
| View-only share role | One more RLS policy split. Listed as a follow-up. |
| Soft delete / trash | Not in the rubric. |
| Dark mode, mobile polish | Stakeholder-readable, not stakeholder-dazzling. |
| Comments, version history, export to PDF | Listed as stretch; skipped to protect core quality. |
| Service-role key in env | See profile-table rationale above; avoiding it is more secure by default. |
| Explicit API routes for CRUD | Most mutations go through the browser Supabase client with RLS. One API route for the parts that genuinely need server trust: `/api/upload` (parses file text). |

## 7. Trust boundaries

- **Browser code can call Supabase directly.** It only has the publishable key, which is intended for browser use. Every request includes the user's JWT.
- **RLS is the only thing enforcing access.** Which is the point — there is one source of truth for "can this user do this," written in SQL, and it applies whether a mutation comes from the browser, our `/api/upload` route, or a future worker.
- **The `proxy.ts` (formerly middleware) refreshes the session cookie** and redirects unauthenticated users away from protected routes — but it is not the security boundary. If it were bypassed, RLS still holds the line.

## 8. Known gaps in the as-shipped version

1. No rate limiting on `/api/upload` or on share inserts.
2. Profile emails are visible to any authenticated user (needed for email-based sharing). A production build would restrict this behind an edge function.
3. If two people edit the same document at the same time, the last autosave wins — no conflict handling.
4. `.md` → TipTap conversion is intentionally minimal (headings, bold, italic, lists, paragraphs). Nested lists, links, code blocks, and tables pass through as plain text.
