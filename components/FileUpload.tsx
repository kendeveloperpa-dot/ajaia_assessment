"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACCEPT = ".txt,.md,text/plain,text/markdown";

export default function FileUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Upload failed" }));
      setError(body.error ?? "Upload failed");
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const body = (await res.json()) as { id: string };
    router.push(`/doc/${body.id}`);
  }

  return (
    <div className="flex items-center gap-3">
      <label className="rounded-md border border-zinc-300 bg-white text-sm font-medium px-3 py-2 hover:bg-zinc-50 cursor-pointer">
        {uploading ? "Uploading…" : "Upload file"}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onChange}
          disabled={uploading}
          className="sr-only"
        />
      </label>
      <span className="text-xs text-zinc-500">
        .txt or .md — becomes a new doc
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
