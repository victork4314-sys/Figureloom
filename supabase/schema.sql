-- SciCanvas email accounts, encrypted cloud gallery and collaboration schema.
-- This is the source-of-truth setup for a fresh Supabase project.
-- Project payloads and comment bodies are encrypted in the browser before storage.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name text primary key,
  secret bytea not null,
  created_at timestamptz not null default now()
);
revoke all on table private.app_secrets from public, anon, authenticated;

insert into private.app_secrets(name, secret)
select 'cloud_master_key', extensions.gen_random_bytes(32)
where not exists (select 1 from private.app_secrets where name = 'cloud_master_key');

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
  revision bigint not null default 0 check (revision >= 0),
  realtime_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('editor','reviewer','viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_invitations (
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('editor','reviewer','viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, email)
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
create unique index if not exists projects_realtime_token_idx on public.projects(realtime_token);
create index if not exists project_members_user_idx on public.project_members(user_id, project_id);
create index if not exists project_members_invited_by_idx on public.project_members(invited_by) where invited_by is not null;
create index if not exists project_invitations_email_idx on public.project_invitations(lower(email));
create index if not exists project_invitations_invited_by_idx on public.project_invitations(invited_by);
create index if not exists collaboration_comments_project_idx on public.collaboration_comments(project_id, created_at);
create index if not exists collaboration_comments_user_idx on public.collaboration_comments(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.keep_project_owner()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Project ownership cannot be changed through the project update API.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.project_role(target_project uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  result text;
begin
  if current_user_id is null then return null; end if;
  select case
    when p.owner_id = current_user_id then 'owner'
    else (select pm.role from public.project_members pm where pm.project_id = p.id and pm.user_id = current_user_id)
  end into result
  from public.projects p
  where p.id = target_project;
  return result;
end;
$$;

create or replace function public.can_access_project(target_project uuid, required_role text default 'viewer')
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with roles(role, rank) as (
    values ('viewer',1),('reviewer',2),('editor',3),('owner',4)
  ), actual as (
    select public.project_role(target_project) as role
  )
  select coalesce((
    select actual_rank.rank >= required_rank.rank
    from actual
    join roles actual_rank on actual_rank.role = actual.role
    join roles required_rank on required_rank.role = required_role
  ), false);
$$;

create or replace function public.realtime_project_id()
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public, realtime
as $$
declare
  candidate text;
begin
  candidate := split_part((select realtime.topic()), ':', 2);
  if candidate is null or candidate = '' then return null; end if;
  return candidate::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.get_project_key(target_project uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  master_key bytea;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.can_access_project(target_project, 'viewer') then raise exception 'Project access denied'; end if;
  select secret into master_key from private.app_secrets where name = 'cloud_master_key';
  if master_key is null then raise exception 'Cloud key is unavailable'; end if;
  return encode(
    extensions.hmac(
      convert_to('scicanvas:v1:' || target_project::text, 'UTF8'),
      master_key,
      'sha256'
    ),
    'base64'
  );
end;
$$;

create or replace function public.invite_project_member(target_project uuid, target_email text, target_role text default 'editor')
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  invited_user_id uuid;
  normalized_email text := lower(trim(target_email));
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if public.project_role(target_project) <> 'owner' then raise exception 'Only the project owner can invite collaborators'; end if;
  if normalized_email = '' or position('@' in normalized_email) < 2 then raise exception 'Enter a valid email address'; end if;
  if target_role not in ('editor','reviewer','viewer') then raise exception 'Invalid collaborator role'; end if;

  select id into invited_user_id from auth.users where lower(email) = normalized_email limit 1;
  if invited_user_id is not null then
    if invited_user_id = current_user_id then raise exception 'The owner already has full access'; end if;
    insert into public.project_members(project_id, user_id, role, invited_by)
    values (target_project, invited_user_id, target_role, current_user_id)
    on conflict (project_id, user_id)
    do update set role = excluded.role, invited_by = excluded.invited_by;
    delete from public.project_invitations where project_id = target_project and lower(email) = normalized_email;
    return jsonb_build_object('ok', true, 'status', 'member', 'role', target_role, 'message', normalized_email || ' now has ' || target_role || ' access.');
  end if;

  insert into public.project_invitations(project_id, email, role, invited_by)
  values (target_project, normalized_email, target_role, current_user_id)
  on conflict (project_id, email)
  do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now();
  return jsonb_build_object('ok', true, 'status', 'pending', 'role', target_role, 'message', 'Invitation saved. Access activates automatically when this email creates an account.');
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles(id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.project_members(project_id, user_id, role, invited_by)
  select invitation.project_id, new.id, invitation.role, invitation.invited_by
  from public.project_invitations invitation
  where lower(invitation.email) = lower(new.email)
  on conflict (project_id, user_id)
  do update set role = excluded.role, invited_by = excluded.invited_by;

  delete from public.project_invitations where lower(email) = lower(new.email);
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.keep_project_owner() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.project_role(uuid) from public, anon;
revoke all on function public.can_access_project(uuid, text) from public, anon;
revoke all on function public.realtime_project_id() from public, anon;
revoke all on function public.get_project_key(uuid) from public, anon;
revoke all on function public.invite_project_member(uuid, text, text) from public, anon;
grant execute on function public.project_role(uuid) to authenticated, service_role;
grant execute on function public.can_access_project(uuid, text) to authenticated, service_role;
grant execute on function public.realtime_project_id() to authenticated, service_role;
grant execute on function public.get_project_key(uuid) to authenticated, service_role;
grant execute on function public.invite_project_member(uuid, text, text) to authenticated, service_role;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists comments_set_updated_at on public.collaboration_comments;
create trigger comments_set_updated_at before update on public.collaboration_comments for each row execute function public.set_updated_at();
drop trigger if exists projects_keep_owner on public.projects;
create trigger projects_keep_owner before update on public.projects for each row execute function public.keep_project_owner();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;
alter table public.collaboration_comments enable row level security;

revoke all on table public.profiles, public.projects, public.project_members, public.project_invitations, public.collaboration_comments from anon;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, delete on table public.project_members to authenticated;
grant select, delete on table public.project_invitations to authenticated;
grant select, insert, update, delete on table public.collaboration_comments to authenticated;

drop policy if exists "signed in users read profiles" on public.profiles;
create policy "signed in users read profiles" on public.profiles for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "accessible projects are readable" on public.projects;
create policy "accessible projects are readable" on public.projects for select to authenticated using (public.can_access_project(id, 'viewer'));
drop policy if exists "users create owned projects" on public.projects;
create policy "users create owned projects" on public.projects for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "owners and editors update projects" on public.projects;
create policy "owners and editors update projects" on public.projects for update to authenticated using (public.can_access_project(id, 'editor')) with check (public.can_access_project(id, 'editor'));
drop policy if exists "owners delete projects" on public.projects;
create policy "owners delete projects" on public.projects for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "memberships are readable by project members" on public.project_members;
create policy "memberships are readable by project members" on public.project_members for select to authenticated using (public.can_access_project(project_id, 'viewer'));
drop policy if exists "members can leave or owners can remove" on public.project_members;
create policy "members can leave or owners can remove" on public.project_members for delete to authenticated using ((select auth.uid()) = user_id or public.project_role(project_id) = 'owner');

drop policy if exists "owners read pending invitations" on public.project_invitations;
create policy "owners read pending invitations" on public.project_invitations for select to authenticated using (public.project_role(project_id) = 'owner');
drop policy if exists "owners delete pending invitations" on public.project_invitations;
create policy "owners delete pending invitations" on public.project_invitations for delete to authenticated using (public.project_role(project_id) = 'owner');

drop policy if exists "comments are readable by project members" on public.collaboration_comments;
create policy "comments are readable by project members" on public.collaboration_comments for select to authenticated using (public.can_access_project(project_id, 'viewer'));
drop policy if exists "reviewers can create comments" on public.collaboration_comments;
create policy "reviewers can create comments" on public.collaboration_comments for insert to authenticated with check ((select auth.uid()) = user_id and public.can_access_project(project_id, 'reviewer'));
drop policy if exists "authors or editors update comments" on public.collaboration_comments;
create policy "authors or editors update comments" on public.collaboration_comments for update to authenticated using ((select auth.uid()) = user_id or public.can_access_project(project_id, 'editor')) with check ((select auth.uid()) = user_id or public.can_access_project(project_id, 'editor'));
drop policy if exists "authors or editors delete comments" on public.collaboration_comments;
create policy "authors or editors delete comments" on public.collaboration_comments for delete to authenticated using ((select auth.uid()) = user_id or public.can_access_project(project_id, 'editor'));

-- Realtime Broadcast/Presence authorization. Supabase owns realtime.messages;
-- run this section in the project SQL editor if your migration role cannot alter it.
drop policy if exists "project members receive room messages" on realtime.messages;
create policy "project members receive room messages" on realtime.messages for select to authenticated
using (split_part(realtime.topic(), ':', 1) = 'project-room' and extension in ('broadcast','presence') and public.can_access_project(public.realtime_project_id(), 'viewer'));
drop policy if exists "project members send room messages" on realtime.messages;
create policy "project members send room messages" on realtime.messages for insert to authenticated
with check (split_part(realtime.topic(), ':', 1) = 'project-room' and extension in ('broadcast','presence') and public.can_access_project(public.realtime_project_id(), 'viewer'));
drop policy if exists "project members receive edit broadcasts" on realtime.messages;
create policy "project members receive edit broadcasts" on realtime.messages for select to authenticated
using (split_part(realtime.topic(), ':', 1) = 'project-edit' and extension = 'broadcast' and public.can_access_project(public.realtime_project_id(), 'viewer'));
drop policy if exists "project editors send edit broadcasts" on realtime.messages;
create policy "project editors send edit broadcasts" on realtime.messages for insert to authenticated
with check (split_part(realtime.topic(), ':', 1) = 'project-edit' and extension = 'broadcast' and public.can_access_project(public.realtime_project_id(), 'editor'));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'collaboration_comments'
  ) then
    alter publication supabase_realtime add table public.collaboration_comments;
  end if;
end $$;

notify pgrst, 'reload schema';
