-- SciCanvas cloud vault, gallery and collaboration schema for Supabase/Postgres.
-- Run this in the Supabase SQL editor, then deploy the Edge Functions in supabase/functions.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled project',
  cipher_text text not null default '',
  iv text not null default '',
  thumbnail text not null default '',
  revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','editor','reviewer','viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.collaboration_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Scientist',
  body_cipher text not null,
  body_iv text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx on public.projects(owner_id, updated_at desc);
create index if not exists project_members_user_idx on public.project_members(user_id, project_id);
create index if not exists collaboration_comments_project_idx on public.collaboration_comments(project_id, created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists comments_set_updated_at on public.collaboration_comments;
create trigger comments_set_updated_at before update on public.collaboration_comments for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Security-definer helper avoids recursive RLS checks while still binding access to auth.uid().
create or replace function public.project_role(target_project uuid, target_user uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select case
    when p.owner_id = target_user then 'owner'
    else (select pm.role from public.project_members pm where pm.project_id = p.id and pm.user_id = target_user)
  end
  from public.projects p
  where p.id = target_project;
$$;

create or replace function public.can_access_project(target_project uuid, required_role text default 'viewer')
returns boolean language sql stable security definer set search_path = public as $$
  with roles(role, rank) as (values ('viewer',1),('reviewer',2),('editor',3),('owner',4)),
  actual as (select public.project_role(target_project, auth.uid()) as role)
  select coalesce((select ar.rank >= rr.rank from actual a join roles ar on ar.role = a.role join roles rr on rr.role = required_role), false);
$$;

grant execute on function public.project_role(uuid, uuid) to authenticated;
grant execute on function public.can_access_project(uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.collaboration_comments enable row level security;

drop policy if exists "profiles are readable by signed in users" on public.profiles;
create policy "profiles are readable by signed in users" on public.profiles for select to authenticated using (true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "accessible projects are readable" on public.projects;
create policy "accessible projects are readable" on public.projects for select to authenticated using (public.can_access_project(id, 'viewer'));
drop policy if exists "users create owned projects" on public.projects;
create policy "users create owned projects" on public.projects for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owners and editors update projects" on public.projects;
create policy "owners and editors update projects" on public.projects for update to authenticated using (public.can_access_project(id, 'editor')) with check (public.can_access_project(id, 'editor'));
drop policy if exists "owners delete projects" on public.projects;
create policy "owners delete projects" on public.projects for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "memberships are readable by project members" on public.project_members;
create policy "memberships are readable by project members" on public.project_members for select to authenticated using (public.can_access_project(project_id, 'viewer'));
drop policy if exists "members can leave projects" on public.project_members;
create policy "members can leave projects" on public.project_members for delete to authenticated using (user_id = auth.uid() or public.project_role(project_id) = 'owner');
-- Inserts and role changes are performed only by the invite-member Edge Function using the service role.

drop policy if exists "comments are readable by project members" on public.collaboration_comments;
create policy "comments are readable by project members" on public.collaboration_comments for select to authenticated using (public.can_access_project(project_id, 'viewer'));
drop policy if exists "reviewers can create comments" on public.collaboration_comments;
create policy "reviewers can create comments" on public.collaboration_comments for insert to authenticated with check (user_id = auth.uid() and public.can_access_project(project_id, 'reviewer'));
drop policy if exists "authors can update comments" on public.collaboration_comments;
create policy "authors can update comments" on public.collaboration_comments for update to authenticated using (user_id = auth.uid() or public.can_access_project(project_id, 'editor')) with check (user_id = auth.uid() or public.can_access_project(project_id, 'editor'));
drop policy if exists "authors can delete comments" on public.collaboration_comments;
create policy "authors can delete comments" on public.collaboration_comments for delete to authenticated using (user_id = auth.uid() or public.can_access_project(project_id, 'editor'));

-- Realtime: project document updates use authenticated broadcast channels; comments use Postgres changes.
do $$
begin
  alter publication supabase_realtime add table public.collaboration_comments;
exception when duplicate_object then null;
end $$;
