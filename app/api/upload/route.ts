import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markdownToTiptap, textToTiptap } from "@/lib/md-to-tiptap";

const MAX_BYTES = 1_000_000; // 1 MB
const ALLOWED_EXT = [".txt", ".md"] as const;

export async function POST(request: NextRequest) {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_BYTES / 1000} KB.` },
      { status: 413 }
    );
  }

  const name = file.name.toLowerCase();
  const ext = ALLOWED_EXT.find((e) => name.endsWith(e));
  if (!ext) {
    return NextResponse.json(
      { error: "Only .txt and .md files are supported." },
      { status: 415 }
    );
  }

  const text = await file.text();
  const content = ext === ".md" ? markdownToTiptap(text) : textToTiptap(text);
  const title = file.name.replace(/\.(txt|md)$/i, "") || "Untitled";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("documents")
    .insert({
      owner_id: user.id,
      title,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/upload] insert error:", error);
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 400 }
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
