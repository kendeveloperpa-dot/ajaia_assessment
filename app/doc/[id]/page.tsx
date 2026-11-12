import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/docs";
import Editor from "@/components/Editor";
import DocTitle from "@/components/DocTitle";
import ShareDialog from "@/components/ShareDialog";
import SignOutButton from "@/components/SignOutButton";

export default async function DocPage({ params }: PageProps<"/doc/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const doc = await getDocument(supabase, id);
  if (!doc) notFound();

  const isOwner = doc.owner_id === user.id;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-6 space-y-5">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← All documents
        </Link>
        <SignOutButton />
      </header>

      <div className="flex items-center gap-3">
        <DocTitle docId={doc.id} initialTitle={doc.title} canEdit={true} />
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${
            isOwner
              ? "bg-zinc-100 text-zinc-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {isOwner ? "Owned by you" : "Shared with you"}
        </span>
        {isOwner && <ShareDialog docId={doc.id} />}
      </div>

      <Editor
        docId={doc.id}
        initialContent={doc.content}
        canEdit={true /* collab model: shared users can also edit */}
      />
    </div>
  );
}
