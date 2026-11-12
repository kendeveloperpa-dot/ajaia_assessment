"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EditorToolbar from "./EditorToolbar";

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  docId: string;
  initialContent: unknown;
  canEdit: boolean;
};

export default function Editor({ docId, initialContent, canEdit }: Props) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef(createClient());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
    ],
    content: initialContent as object,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (!canEdit) return;
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const content = editor.getJSON();
      saveTimer.current = setTimeout(async () => {
        const { error } = await supabaseRef.current
          .from("documents")
          .update({ content })
          .eq("id", docId);
        if (error) {
          console.error("save failed", error);
          setSaveState("error");
        } else {
          setSaveState("saved");
        }
      }, 600);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <EditorToolbar editor={editor} />
          </div>
          <SaveIndicator state={saveState} />
        </div>
      )}
      <div className="rounded-md border border-zinc-200 px-4 py-3 bg-white min-h-[60vh]">
        <EditorContent editor={editor} />
      </div>
      {!canEdit && (
        <p className="text-xs text-zinc-500">
          You have read-only access to this document.
        </p>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle")
    return <span className="text-xs text-zinc-400">Ready</span>;
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : "Save failed";
  const color =
    state === "error"
      ? "text-red-600"
      : state === "saving"
        ? "text-zinc-500"
        : "text-emerald-600";
  return <span className={`text-xs ${color} whitespace-nowrap`}>{label}</span>;
}
