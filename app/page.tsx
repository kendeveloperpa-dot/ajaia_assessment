import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight">Ajaia Docs</h1>
        <p className="text-zinc-600 text-lg">
          A lightweight collaborative document editor. Create, edit, upload, and
          share rich-text docs.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-white font-medium hover:bg-zinc-800"
        >
          Sign in to get started
        </Link>
      </div>
    </main>
  );
}
