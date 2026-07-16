-- Secure, expiring collaboration share links for SciCanvas.
-- This migration is deployed on the live Supabase project.

create table if not exists public.project_share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token_hash text not null unique,
  role text not null default 'reviewer' check (role in ('editor','reviewer','viewer')),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists project_share_links_project_idx on public.project_share_links(project_id, created_at desc);
create index if not exists project_share_links_expiry_idx on public.project_share_links(expires_at) where revoked_at is null;
create index if not exists project_share_links_created_by_idx on public.project_share_links(created_by);

alter table public.project_share_links enable row level security;
grant select, delete on public.project_share_links to authenticated;
revoke all on public.project_share_links from anon;

drop policy if exists "owners read project share links" on public.project_share_links;
create policy "owners read project share links" on public.project_share_links for select to authenticated
using (scicanvas_private.project_role_for(project_id, (select auth.uid())) = 'owner');

drop policy if exists "owners delete project share links" on public.project_share_links;
create policy "owners delete project share links" on public.project_share_links for delete to authenticated
using (scicanvas_private.project_role_for(project_id, (select auth.uid())) = 'owner');

drop function if exists public.create_project_share_link(uuid, text, integer);
drop function if exists public.accept_project_share_link(text);
drop function if exists public.revoke_project_share_links(uuid);
drop function if exists public.redeem_project_share_link(text);

create function public.create_project_share_link(
  target_project uuid,
  target_role text default 'reviewer',
  valid_hours integer default 168
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, scicanvas_private
as $$
declare
  current_user_id uuid := auth.uid();
  raw_token uuid := gen_random_uuid();
  expiry timestamptz;
  project_title text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if scicanvas_private.project_role_for(target_project, current_user_id) <> 'owner' then
    raise exception 'Only the project owner can create share links';
  end if;
  if target_role not in ('editor','reviewer','viewer') then raise exception 'Invalid collaborator role'; end if;
  if valid_hours < 1 or valid_hours > 720 then raise exception 'Share links must expire between 1 hour and 30 days'; end if;

  select title into project_title from public.projects where id = target_project;
  if project_title is null then raise exception 'Project not found'; end if;

  expiry := now() + make_interval(hours => valid_hours);
  insert into public.project_share_links(project_id, token_hash, role, created_by, expires_at)
  values (target_project, encode(extensions.digest(raw_token::text, 'sha256'), 'hex'), target_role, current_user_id, expiry);

  return jsonb_build_object('ok', true, 'token', raw_token::text, 'project_id', target_project, 'title', project_title, 'role', target_role, 'expires_at', expiry);
end;
$$;

create function public.accept_project_share_link(link_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, scicanvas_private
as $$
declare
  current_user_id uuid := auth.uid();
  link_record public.project_share_links%rowtype;
  project_title text;
  project_owner uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if link_token is null or length(trim(link_token)) < 8 then raise exception 'Invalid share link'; end if;

  select * into link_record
  from public.project_share_links
  where token_hash = encode(extensions.digest(trim(link_token), 'sha256'), 'hex')
    and revoked_at is null and expires_at > now()
  for update;
  if not found then raise exception 'This share link is invalid, expired, or revoked'; end if;

  select title, owner_id into project_title, project_owner from public.projects where id = link_record.project_id;
  if project_owner <> current_user_id then
    insert into public.project_members(project_id, user_id, role, invited_by)
    values (link_record.project_id, current_user_id, link_record.role, link_record.created_by)
    on conflict (project_id, user_id)
    do update set
      role = case
        when excluded.role = 'editor' or public.project_members.role = 'editor' then 'editor'
        when excluded.role = 'reviewer' or public.project_members.role = 'reviewer' then 'reviewer'
        else 'viewer'
      end,
      invited_by = excluded.invited_by;
  end if;

  update public.project_share_links set use_count = use_count + 1 where id = link_record.id;
  return jsonb_build_object(
    'ok', true,
    'project_id', link_record.project_id,
    'title', project_title,
    'role', case when project_owner = current_user_id then 'owner' else scicanvas_private.project_role_for(link_record.project_id, current_user_id) end,
    'expires_at', link_record.expires_at
  );
end;
$$;

create function public.revoke_project_share_links(target_project uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, scicanvas_private
as $$
declare affected integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if scicanvas_private.project_role_for(target_project, auth.uid()) <> 'owner' then raise exception 'Only the project owner can revoke share links'; end if;
  update public.project_share_links set revoked_at = now()
  where project_id = target_project and revoked_at is null and expires_at > now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.create_project_share_link(uuid, text, integer) from public, anon;
revoke all on function public.accept_project_share_link(text) from public, anon;
revoke all on function public.revoke_project_share_links(uuid) from public, anon;
grant execute on function public.create_project_share_link(uuid, text, integer) to authenticated;
grant execute on function public.accept_project_share_link(text) to authenticated;
grant execute on function public.revoke_project_share_links(uuid) to authenticated;