"use client";

export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        Sign out
      </button>
    </form>
  );
}
