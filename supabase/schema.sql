-- Ajaia Docs schema
-- Paste into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: uses `create if not exists` and `drop policy if exists`.

-- ============================================================
-- 1. profiles (mirror of auth.users for email-based share lookup)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any authenticated user can look up profiles by email (needed for sharing).
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

-- Trigger: auto-create a profile row when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing users (safe to re-run).
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ============================================================
-- 2. documents
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_id_idx on public.documents(owner_id);

alter table public.documents enable row level security;

-- ============================================================
-- 3. document_shares
-- ============================================================
create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  shared_with_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (document_id, shared_with_id)
);

create index if not exists document_shares_shared_with_idx on public.document_shares(shared_with_id);
create index if not exists document_shares_document_idx on public.document_shares(document_id);

alter table public.document_shares enable row level security;

-- ============================================================
-- 4. SECURITY DEFINER helpers (bypass RLS to prevent recursion)
-- ============================================================
-- Why: a SELECT policy on documents that queries document_shares, plus a
-- SELECT policy on document_shares that queries documents, forms an
-- infinite recursion (Postgres error 42P17). These SECURITY DEFINER
-- functions run with the owner's privileges, so the inner queries skip
-- RLS entirely — breaking the cycle.

create or replace function public.user_has_doc_access(doc_id uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id and d.owner_id = uid
  ) or exists (
    select 1 from public.document_shares s
    where s.document_id = doc_id and s.shared_with_id = uid
  );
$$;

create or replace function public.user_owns_doc(doc_id uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id and d.owner_id = uid
  );
$$;

-- ============================================================
-- 5. RLS policies for documents
-- ============================================================
drop policy if exists "documents_select_owner_or_shared" on public.documents;
create policy "documents_select_owner_or_shared" on public.documents
  for select to authenticated
  using (public.user_has_doc_access(id, (select auth.uid())));

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- Both owner and shared users can update content (simple collab model).
drop policy if exists "documents_update_owner_or_shared" on public.documents;
create policy "documents_update_owner_or_shared" on public.documents
  for update to authenticated
  using (public.user_has_doc_access(id, (select auth.uid())))
  with check (public.user_has_doc_access(id, (select auth.uid())));

drop policy if exists "documents_delete_owner" on public.documents;
create policy "documents_delete_owner" on public.documents
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ============================================================
-- 6. RLS policies for document_shares
-- ============================================================
drop policy if exists "shares_select_participants" on public.document_shares;
create policy "shares_select_participants" on public.document_shares
  for select to authenticated
  using (
    shared_with_id = (select auth.uid())
    or public.user_owns_doc(document_id, (select auth.uid()))
  );

drop policy if exists "shares_insert_owner" on public.document_shares;
create policy "shares_insert_owner" on public.document_shares
  for insert to authenticated
  with check (public.user_owns_doc(document_id, (select auth.uid())));

drop policy if exists "shares_delete_owner" on public.document_shares;
create policy "shares_delete_owner" on public.document_shares
  for delete to authenticated
  using (public.user_owns_doc(document_id, (select auth.uid())));

-- ============================================================
-- 7. updated_at trigger for documents
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 8. Refresh PostgREST cache
-- ============================================================
notify pgrst, 'reload schema';
