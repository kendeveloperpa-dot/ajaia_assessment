"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewDocButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createNew() {
    setCreating(true);

    const res = await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Unknown error" }));
      setCreating(false);
      console.error("[NewDocButton] create failed:", body);
      alert(
        "Could not create document: " +
          (body.error ?? "Unknown") +
          (body.code ? ` (code ${body.code})` : "") +
          (body.hint ? `\nHint: ${body.hint}` : "")
      );
      return;
    }

    const body = (await res.json()) as { id: string };
    router.push(`/doc/${body.id}`);
  }

  return (
    <button
      type="button"
      onClick={createNew}
      disabled={creating}
      className="rounded-md bg-zinc-900 text-white text-sm font-medium px-3 py-2 hover:bg-zinc-800 disabled:opacity-50"
    >
      {creating ? "Creating…" : "New document"}
    </button>
  );
}
