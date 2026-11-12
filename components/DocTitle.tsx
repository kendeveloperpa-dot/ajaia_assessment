"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  docId: string;
  initialTitle: string;
  canEdit: boolean;
};

export default function DocTitle({ docId, initialTitle, canEdit }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTitle(v);
    setState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("documents")
        .update({ title: v.trim() || "Untitled" })
        .eq("id", docId);
      setState(error ? "error" : "saved");
    }, 500);
  }

  if (!canEdit) {
    return (
      <h1 className="text-xl font-semibold tracking-tight truncate">
        {title || "Untitled"}
      </h1>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <input
        value={title}
        onChange={onChange}
        placeholder="Untitled"
        className="text-xl font-semibold tracking-tight bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-900 rounded px-1 -mx-1 flex-1 min-w-0"
      />
      {state === "saving" && (
        <span className="text-xs text-zinc-500">Saving…</span>
      )}
      {state === "error" && (
        <span className="text-xs text-red-600">Save failed</span>
      )}
    </div>
  );
}
