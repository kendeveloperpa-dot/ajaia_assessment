"use client";

import type { Editor } from "@tiptap/react";

type Props = { editor: Editor | null };

export default function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  const btn =
    "px-2 py-1 text-sm rounded hover:bg-zinc-100 disabled:opacity-40";
  const active = "bg-zinc-200 hover:bg-zinc-200";

  return (
    <div className="flex flex-wrap items-center gap-1 border border-zinc-200 rounded-md px-2 py-1.5 bg-white sticky top-0 z-10">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
        aria-pressed={editor.isActive("bold")}
        className={`${btn} font-bold ${editor.isActive("bold") ? active : ""}`}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
        aria-pressed={editor.isActive("italic")}
        className={`${btn} italic ${editor.isActive("italic") ? active : ""}`}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
        aria-pressed={editor.isActive("underline")}
        className={`${btn} underline ${editor.isActive("underline") ? active : ""}`}
      >
        U
      </button>

      <span className="w-px h-5 bg-zinc-200 mx-1" />

      <button
        type="button"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        aria-label="Heading 1"
        className={`${btn} ${editor.isActive("heading", { level: 1 }) ? active : ""}`}
      >
        H1
      </button>
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="Heading 2"
        className={`${btn} ${editor.isActive("heading", { level: 2 }) ? active : ""}`}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        aria-label="Heading 3"
        className={`${btn} ${editor.isActive("heading", { level: 3 }) ? active : ""}`}
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        aria-label="Paragraph"
        className={`${btn} ${editor.isActive("paragraph") ? active : ""}`}
      >
        ¶
      </button>

      <span className="w-px h-5 bg-zinc-200 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bulleted list"
        className={`${btn} ${editor.isActive("bulletList") ? active : ""}`}
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered list"
        className={`${btn} ${editor.isActive("orderedList") ? active : ""}`}
      >
        1. List
      </button>

      <span className="w-px h-5 bg-zinc-200 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Undo"
        className={btn}
      >
        ↶
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Redo"
        className={btn}
      >
        ↷
      </button>
    </div>
  );
}
