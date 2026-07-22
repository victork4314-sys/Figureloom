-- Separate encrypted FigureLoom Bio project gallery using the existing FigureLoom account.

create table if not exists public.bio_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Bio project',
  cipher_text text not null default '',
  iv text not null default '',
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bio_projects_owner_updated_idx
  on public.bio_projects(owner_id, updated_at desc);

drop trigger if exists bio_projects_set_updated_at on public.bio_projects;
create trigger bio_projects_set_updated_at
before update on public.bio_projects
for each row execute function scicanvas_private.set_updated_at();

alter table public.bio_projects enable row level security;
grant select, insert, update, delete on public.bio_projects to authenticated;
revoke all on public.bio_projects from anon;

drop policy if exists "owners read Bio projects" on public.bio_projects;
create policy "owners read Bio projects"
on public.bio_projects for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "owners create Bio projects" on public.bio_projects;
create policy "owners create Bio projects"
on public.bio_projects for insert to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "owners update Bio projects" on public.bio_projects;
create policy "owners update Bio projects"
on public.bio_projects for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "owners delete Bio projects" on public.bio_projects;
create policy "owners delete Bio projects"
on public.bio_projects for delete to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.get_bio_project_key(target_project uuid)
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
  if not exists (
    select 1 from public.bio_projects
    where id = target_project and owner_id = auth.uid()
  ) then
    raise exception 'Bio project access denied';
  end if;
  select secret into master_key from private.app_secrets where name = 'cloud_master_key';
  if master_key is null then raise exception 'Cloud key is unavailable'; end if;
  return encode(
    extensions.hmac(
      convert_to('figureloom-bio:v1:' || target_project::text, 'UTF8'),
      master_key,
      'sha256'
    ),
    'base64'
  );
end;
$$;

revoke all on function public.get_bio_project_key(uuid) from public, anon;
grant execute on function public.get_bio_project_key(uuid) to authenticated;
