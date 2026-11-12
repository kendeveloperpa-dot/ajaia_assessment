"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { docId: string };

type Shared = { id: string; email: string; share_id: string };

export default function ShareDialog({ docId }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "notfound"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shares, setShares] = useState<Shared[]>([]);

  const loadShares = useCallback(async () => {
    const supabase = createClient();

    const { data: shareRows, error: sharesErr } = await supabase
      .from("document_shares")
      .select("id, shared_with_id")
      .eq("document_id", docId);

    if (sharesErr) {
      console.error("[ShareDialog] load shares failed:", sharesErr);
      return;
    }
    const rows = (shareRows ?? []) as {
      id: string;
      shared_with_id: string;
    }[];

    if (rows.length === 0) {
      setShares([]);
      return;
    }

    const ids = rows.map((r) => r.shared_with_id);
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", ids);

    if (profilesErr) {
      console.error("[ShareDialog] load profiles failed:", profilesErr);
    }

    const emailById = new Map(
      ((profiles ?? []) as { id: string; email: string }[]).map((p) => [
        p.id,
        p.email,
      ])
    );

    setShares(
      rows.map((r) => ({
        share_id: r.id,
        id: r.shared_with_id,
        email: emailById.get(r.shared_with_id) ?? "unknown",
      }))
    );
  }, [docId]);

  useEffect(() => {
    if (open) loadShares();
  }, [open, loadShares]);

  async function addShare(e: React.FormEvent) {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) return;

    setStatus("loading");
    setErrorMsg(null);
    const supabase = createClient();

    // 1. Resolve email → user id via profiles.
    const { data: profile, error: lookupErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", target)
      .maybeSingle();

    if (lookupErr) {
      setStatus("error");
      setErrorMsg(lookupErr.message);
      return;
    }
    if (!profile) {
      setStatus("notfound");
      return;
    }

    // 2. Insert share. RLS enforces that only owner can insert.
    const { error: insertErr } = await supabase
      .from("document_shares")
      .insert({ document_id: docId, shared_with_id: profile.id });

    if (insertErr) {
      // Likely unique-violation if already shared.
      if (insertErr.code === "23505") {
        setStatus("idle");
        setEmail("");
        await loadShares();
        return;
      }
      setStatus("error");
      setErrorMsg(insertErr.message);
      return;
    }

    setStatus("idle");
    setEmail("");
    await loadShares();
  }

  async function removeShare(shareId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("document_shares")
      .delete()
      .eq("id", shareId);
    if (error) {
      alert("Could not revoke access: " + error.message);
      return;
    }
    await loadShares();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-zinc-900 text-white text-sm font-medium px-3 py-1.5 hover:bg-zinc-800"
      >
        Share
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Share this document</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-zinc-500 hover:text-zinc-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={addShare} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-md bg-zinc-900 text-white text-sm font-medium px-3 py-1.5 hover:bg-zinc-800 disabled:opacity-50"
              >
                {status === "loading" ? "Adding…" : "Add"}
              </button>
            </form>

            {status === "notfound" && (
              <p className="text-xs text-amber-700">
                No user with that email has signed in yet. Ask them to sign in
                first, then share again.
              </p>
            )}
            {status === "error" && errorMsg && (
              <p className="text-xs text-red-700">{errorMsg}</p>
            )}

            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                People with access
              </div>
              {shares.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Only you have access right now.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
                  {shares.map((s) => (
                    <li
                      key={s.share_id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="truncate">{s.email}</span>
                      <button
                        type="button"
                        onClick={() => removeShare(s.share_id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
