-- SciCanvas email accounts, encrypted project gallery and collaboration backend.
-- This file mirrors the deployed Supabase schema. It is idempotent.

create schema if not exists scicanvas_private;
create schema if not exists private;
revoke all on schema scicanvas_private from public, anon;
revoke all on schema private from public, anon, authenticated;

create extension if not exists pgcrypto with schema extensions;

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

create table if not exists private.app_secrets (
  name text primary key,
  secret bytea not null,
  created_at timestamptz not null default now()
);
revoke all on table private.app_secrets from public, anon, authenticated;
insert into private.app_secrets(name, secret)
values ('cloud_master_key', extensions.gen_random_bytes(32))
on conflict (name) do nothing;

create index if not exists projects_owner_updated_idx on public.projects(owner_id, updated_at desc);
create unique index if not exists projects_realtime_token_idx on public.projects(realtime_token);
create index if not exists project_members_user_idx on public.project_members(user_id, project_id);
create index if not exists project_members_invited_by_idx on public.project_members(invited_by) where invited_by is not null;
create index if not exists project_invitations_email_idx on public.project_invitations(lower(email));
create index if not exists project_invitations_invited_by_idx on public.project_invitations(invited_by);
create index if not exists collaboration_comments_project_idx on public.collaboration_comments(project_id, created_at);
create index if not exists collaboration_comments_user_idx on public.collaboration_comments(user_id);

create or replace function scicanvas_private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function scicanvas_private.keep_project_owner()
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

create or replace function scicanvas_private.project_role_for(target_project uuid, target_user uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when p.owner_id = target_user then 'owner'
    else (
      select pm.role
      from public.project_members pm
      where pm.project_id = p.id and pm.user_id = target_user
    )
  end
  from public.projects p
  where p.id = target_project;
$$;

create or replace function scicanvas_private.can_access_project(target_project uuid, required_role text default 'viewer')
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, scicanvas_private
as $$
  with actual as (
    select scicanvas_private.project_role_for(target_project, auth.uid()) as role
  )
  select coalesce(
    (select case a.role
      when 'owner' then 4
      when 'editor' then 3
      when 'reviewer' then 2
      when 'viewer' then 1
      else 0
    end >= case required_role
      when 'owner' then 4
      when 'editor' then 3
      when 'reviewer' then 2
      else 1
    end from actual a),
    false
  );
$$;

create or replace function scicanvas_private.realtime_project_id()
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, realtime
as $$
declare
  candidate text;
begin
  candidate := split_part(realtime.topic(), ':', 2);
  if candidate is null or candidate = '' then return null; end if;
  return candidate::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function scicanvas_private.handle_new_user()
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

  delete from public.project_invitations
  where lower(email) = lower(new.email);
  return new;
end;
$$;

revoke all on function scicanvas_private.set_updated_at() from public, anon, authenticated;
revoke all on function scicanvas_private.keep_project_owner() from public, anon, authenticated;
revoke all on function scicanvas_private.handle_new_user() from public, anon, authenticated;
revoke all on function scicanvas_private.project_role_for(uuid, uuid) from public, anon;
revoke all on function scicanvas_private.can_access_project(uuid, text) from public, anon;
revoke all on function scicanvas_private.realtime_project_id() from public, anon;
grant usage on schema scicanvas_private to authenticated;
grant execute on function scicanvas_private.project_role_for(uuid, uuid) to authenticated;
grant execute on function scicanvas_private.can_access_project(uuid, text) to authenticated;
grant execute on function scicanvas_private.realtime_project_id() to authenticated;

create or replace function public.get_project_key(target_project uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private, extensions, scicanvas_private
as $$
declare
  master_key bytea;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not scicanvas_private.can_access_project(target_project, 'viewer') then raise exception 'Project access denied'; end if;
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
revoke all on function public.get_project_key(uuid) from public, anon;
grant execute on function public.get_project_key(uuid) to authenticated;

create or replace function public.invite_project_member(target_project uuid, target_email text, target_role text default 'editor')
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, scicanvas_private
as $$
declare
  current_user_id uuid := auth.uid();
  invited_user_id uuid;
  normalized_email text := lower(trim(target_email));
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if scicanvas_private.project_role_for(target_project, current_user_id) <> 'owner' then raise exception 'Only the project owner can invite collaborators'; end if;
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

  return jsonb_build_object('ok', true, 'status', 'pending', 'role', target_role, 'message', 'Invitation saved. Access will activate automatically when this email creates an account.');
end;
$$;
revoke all on function public.invite_project_member(uuid, text, text) from public, anon;
grant execute on function public.invite_project_member(uuid, text, text) to authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function scicanvas_private.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function scicanvas_private.set_updated_at();
drop trigger if exists projects_keep_owner on public.projects;
create trigger projects_keep_owner before update on public.projects for each row execute function scicanvas_private.keep_project_owner();
drop trigger if exists comments_set_updated_at on public.collaboration_comments;
create trigger comments_set_updated_at before update on public.collaboration_comments for each row execute function scicanvas_private.set_updated_at();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function scicanvas_private.handle_new_user();

insert into public.profiles(id, display_name, avatar_url)
select id,
       coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
       raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;
alter table public.collaboration_comments enable row level security;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, delete on public.project_members to authenticated;
grant select, delete on public.project_invitations to authenticated;
grant select, insert, update, delete on public.collaboration_comments to authenticated;
revoke all on public.profiles, public.projects, public.project_members, public.project_invitations, public.collaboration_comments from anon;

drop policy if exists "signed in users read profiles" on public.profiles;
create policy "signed in users read profiles" on public.profiles for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "accessible projects are readable" on public.projects;
create policy "accessible projects are readable" on public.projects for select to authenticated using (scicanvas_private.can_access_project(id, 'viewer'));
drop policy if exists "users create owned projects" on public.projects;
create policy "users create owned projects" on public.projects for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "owners and editors update projects" on public.projects;
create policy "owners and editors update projects" on public.projects for update to authenticated using (scicanvas_private.can_access_project(id, 'editor')) with check (scicanvas_private.can_access_project(id, 'editor'));
drop policy if exists "owners delete projects" on public.projects;
create policy "owners delete projects" on public.projects for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "memberships are readable by project members" on public.project_members;
create policy "memberships are readable by project members" on public.project_members for select to authenticated using (scicanvas_private.can_access_project(project_id, 'viewer'));
drop policy if exists "members can leave or owners can remove" on public.project_members;
create policy "members can leave or owners can remove" on public.project_members for delete to authenticated using ((select auth.uid()) = user_id or scicanvas_private.can_access_project(project_id, 'owner'));

drop policy if exists "owners read pending invitations" on public.project_invitations;
create policy "owners read pending invitations" on public.project_invitations for select to authenticated using (scicanvas_private.project_role_for(project_id, auth.uid()) = 'owner');
drop policy if exists "owners delete pending invitations" on public.project_invitations;
create policy "owners delete pending invitations" on public.project_invitations for delete to authenticated using (scicanvas_private.project_role_for(project_id, auth.uid()) = 'owner');

drop policy if exists "comments are readable by project members" on public.collaboration_comments;
create policy "comments are readable by project members" on public.collaboration_comments for select to authenticated using (scicanvas_private.can_access_project(project_id, 'viewer'));
drop policy if exists "reviewers can create comments" on public.collaboration_comments;
create policy "reviewers can create comments" on public.collaboration_comments for insert to authenticated with check ((select auth.uid()) = user_id and scicanvas_private.can_access_project(project_id, 'reviewer'));
drop policy if exists "authors or editors update comments" on public.collaboration_comments;
create policy "authors or editors update comments" on public.collaboration_comments for update to authenticated using ((select auth.uid()) = user_id or scicanvas_private.can_access_project(project_id, 'editor')) with check ((select auth.uid()) = user_id or scicanvas_private.can_access_project(project_id, 'editor'));
drop policy if exists "authors or editors delete comments" on public.collaboration_comments;
create policy "authors or editors delete comments" on public.collaboration_comments for delete to authenticated using ((select auth.uid()) = user_id or scicanvas_private.can_access_project(project_id, 'editor'));

drop policy if exists "project members receive room messages" on realtime.messages;
create policy "project members receive room messages" on realtime.messages for select to authenticated using (split_part((select realtime.topic()), ':', 1) = 'project-room' and extension in ('broadcast','presence') and scicanvas_private.can_access_project(scicanvas_private.realtime_project_id(), 'viewer'));
drop policy if exists "project members send room messages" on realtime.messages;
create policy "project members send room messages" on realtime.messages for insert to authenticated with check (split_part((select realtime.topic()), ':', 1) = 'project-room' and extension in ('broadcast','presence') and scicanvas_private.can_access_project(scicanvas_private.realtime_project_id(), 'viewer'));
drop policy if exists "project members receive edit broadcasts" on realtime.messages;
create policy "project members receive edit broadcasts" on realtime.messages for select to authenticated using (split_part((select realtime.topic()), ':', 1) = 'project-edit' and extension = 'broadcast' and scicanvas_private.can_access_project(scicanvas_private.realtime_project_id(), 'viewer'));
drop policy if exists "project editors send edit broadcasts" on realtime.messages;
create policy "project editors send edit broadcasts" on realtime.messages for insert to authenticated with check (split_part((select realtime.topic()), ':', 1) = 'project-edit' and extension = 'broadcast' and scicanvas_private.can_access_project(scicanvas_private.realtime_project_id(), 'editor'));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'collaboration_comments'
  ) then
    alter publication supabase_realtime add table public.collaboration_comments;
  end if;
end
$$;

drop function if exists public.can_access_project(uuid, text);
drop function if exists public.realtime_project_id();
drop function if exists public.project_role(uuid);