import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentRow, DocumentWithAccess } from "./types";

/**
 * Fetch all documents visible to the current user, split by access level.
 * RLS enforces that the caller can only see rows they own or are shared on.
 */
export async function listVisibleDocuments(
  supabase: SupabaseClient,
  userId: string
): Promise<DocumentWithAccess[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, owner_id, title, content, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as DocumentRow[]).map((d) => ({
    ...d,
    access: d.owner_id === userId ? "owner" : "shared",
  }));
}

export async function getDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, owner_id, title, content, created_at, updated_at")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw error;
  return (data as DocumentRow | null) ?? null;
}

export async function createDocument(
  supabase: SupabaseClient,
  ownerId: string,
  title: string,
  content?: unknown
): Promise<DocumentRow> {
  const payload: Record<string, unknown> = {
    owner_id: ownerId,
    title: title || "Untitled",
  };
  if (content !== undefined) payload.content = content;

  const { data, error } = await supabase
    .from("documents")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as DocumentRow;
}
