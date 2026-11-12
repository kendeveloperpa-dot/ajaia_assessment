# Submission — Ajaia AI-Native Full Stack Developer assignment

## What's included

| Item | Location |
|---|---|
| Source code | this repository (`app/`, `components/`, `lib/`, `supabase/`, `tests/`) |
| README with local setup | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Automated test | `tests/sharing-authorization.test.ts` (run with `npm test`) |
| DB schema + RLS policies | `supabase/schema.sql` |
| Live product URL | _filled in once deployed_ — see § Live |
| Walkthrough video | _filled in after recording_ — see `VIDEO.txt` |

## Live

- **URL:** _added once deployed_
- **Test accounts** (seeded — see `README.md § Test accounts`):

| Email | Password |
|---|---|
| reviewer1@ajaia-docs.test | Reviewer1! |
| reviewer2@ajaia-docs.test | Reviewer2! |

Sign-up is also enabled if you'd prefer to create your own account.

## What works end-to-end

- Email + password sign-in / sign-up; session refresh via Next 16 proxy.
- Create a document (title defaults to "Untitled").
- Rename a document (debounced autosave).
- Edit content with bold / italic / underline / H1 / H2 / H3 / paragraph / bulleted list / numbered list / undo / redo.
- Content is persisted as ProseMirror JSON in Postgres; reload preserves every mark.
- Share a document with another user by email; shared user sees it under "Shared with you" on their dashboard and can open + edit.
- Owner can see and revoke shares from the share dialog.
- Upload a `.txt` or `.md` file → creates a new owned document with the parsed content.
- Save-state indicator (Saving… / Saved / Save failed) visible next to the toolbar and title.

## What is incomplete / deliberately deferred

See `ARCHITECTURE.md § 6` ("What I deliberately cut, and why"). Shortlist:

- No real-time multi-cursor collaboration.
- No `.docx` upload.
- No separate view-only share role.
- No comments, versions, PDF export.

## What I'd build in the next 2–4 hours

(Also in `README.md`.)

1. Realtime presence + collaborative cursors via Supabase Realtime.
2. View-only role in `document_shares` with an additional RLS policy split on UPDATE.
3. Markdown export (TipTap → MD via `turndown`).
4. Soft delete / trash view.

## How to review quickly

1. Open the live URL and sign in as `reviewer1@ajaia-docs.test` / `Reviewer1!`.
2. Create a doc, type and format a few lines, reload the page — the formatting survives.
3. Click **Share**, enter `reviewer2@ajaia-docs.test`, close the dialog.
4. Sign out, sign in as `reviewer2@ajaia-docs.test` / `Reviewer2!`, and the document appears under **Shared with you**.
5. From the dashboard of either account, click **Upload file** and drop a short `.md` file — it becomes a new editable doc.

If something breaks, the browser devtools network tab shows the Supabase requests and their response bodies.
