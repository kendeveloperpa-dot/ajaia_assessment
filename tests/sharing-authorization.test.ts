/**
 * Sharing authorization — the core business rule of this app.
 *
 * We intentionally test the authorization predicate directly rather than
 * mocking a round-trip to Supabase. The actual RLS policies in schema.sql
 * encode the same rule in SQL; this test pins the rule in TypeScript so
 * the two can be reviewed side by side.
 *
 * Rule: a user can access a document iff they are the owner OR appear in
 * document_shares for that document. All other users are denied.
 */

import { describe, it, expect } from "vitest";

type Document = { id: string; owner_id: string };
type Share = { document_id: string; shared_with_id: string };

/**
 * Pure TypeScript mirror of the SQL `can_access_document` function and the
 * SELECT RLS policy on `documents` in supabase/schema.sql.
 */
function canAccessDocument(
  userId: string,
  doc: Document,
  shares: Share[]
): boolean {
  if (doc.owner_id === userId) return true;
  return shares.some(
    (s) => s.document_id === doc.id && s.shared_with_id === userId
  );
}

const ALICE = "user-alice";
const BOB = "user-bob";
const CARLA = "user-carla";

const doc: Document = { id: "doc-1", owner_id: ALICE };

describe("sharing authorization", () => {
  it("allows the owner", () => {
    expect(canAccessDocument(ALICE, doc, [])).toBe(true);
  });

  it("allows a user the document is shared with", () => {
    const shares: Share[] = [{ document_id: "doc-1", shared_with_id: BOB }];
    expect(canAccessDocument(BOB, doc, shares)).toBe(true);
  });

  it("denies a user with no share", () => {
    const shares: Share[] = [{ document_id: "doc-1", shared_with_id: BOB }];
    expect(canAccessDocument(CARLA, doc, shares)).toBe(false);
  });

  it("does not leak access across documents", () => {
    // Bob is shared on a different document — he must not gain access here.
    const shares: Share[] = [
      { document_id: "doc-other", shared_with_id: BOB },
    ];
    expect(canAccessDocument(BOB, doc, shares)).toBe(false);
  });

  it("denies access with no shares at all", () => {
    expect(canAccessDocument(BOB, doc, [])).toBe(false);
  });

  it("is case-sensitive on user id (string equality)", () => {
    // Guards against sloppy lowercasing of UUIDs.
    expect(canAccessDocument(ALICE.toUpperCase(), doc, [])).toBe(false);
  });
});
