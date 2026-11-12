import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listVisibleDocuments } from "@/lib/docs";
import SignOutButton from "@/components/SignOutButton";
import NewDocButton from "@/components/NewDocButton";
import FileUpload from "@/components/FileUpload";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const docs = await listVisibleDocuments(supabase, user.id);
  const owned = docs.filter((d) => d.access === "owner");
  const shared = docs.filter((d) => d.access === "shared");

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ajaia Docs
          </h1>
          <p className="text-sm text-zinc-500">
            Signed in as {user.email}
          </p>
        </div>
        <SignOutButton />
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <NewDocButton />
        <FileUpload />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your documents</h2>
        {owned.length === 0 ? (
          <EmptyState text="No documents yet. Create one or upload a .txt/.md file." />
        ) : (
          <DocList docs={owned} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Shared with you</h2>
        {shared.length === 0 ? (
          <EmptyState text="Nothing shared with you yet." />
        ) : (
          <DocList docs={shared} />
        )}
      </section>
    </div>
  );
}

function DocList({
  docs,
}: {
  docs: { id: string; title: string; updated_at: string; access: string }[];
}) {
  return (
    <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-md bg-white">
      {docs.map((d) => (
        <li key={d.id}>
          <Link
            href={`/doc/${d.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
          >
            <span className="font-medium truncate">{d.title}</span>
            <span className="text-xs text-zinc-500 whitespace-nowrap ml-4">
              {new Date(d.updated_at).toLocaleString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 bg-white">
      {text}
    </div>
  );
}
