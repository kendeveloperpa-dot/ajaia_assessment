import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  // 1. Authenticate caller via session cookies (user-scoped client).
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse optional title.
  let body: { title?: string } = {};
  try {
    body = await request.json();
  } catch {}

  // 3. Insert with admin privileges — owner_id is forced to the
  // authenticated user id (not from the client), so the caller cannot
  // create docs owned by anyone else.
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Admin client init failed";
    console.error("[api/docs POST] admin client:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data, error } = await admin
    .from("documents")
    .insert({
      owner_id: user.id,
      title: body.title?.trim() || "Untitled",
    })
    .select()
    .single();

  if (error) {
    console.error("[api/docs POST] insert error:", error);
    return NextResponse.json(
      { error: error.message, code: error.code, hint: error.hint },
      { status: 400 }
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
