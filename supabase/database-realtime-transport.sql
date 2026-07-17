-- Database-backed collaboration transport for FigureLoom.
-- Deployed to production as migration database_realtime_chat_and_motion_transport.

create table if not exists public.collaboration_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text not null default '',
  color text not null default '',
  body text not null check (char_length(body) between 1 and 1200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);

create index if not exists collaboration_chat_messages_project_created_idx
  on public.collaboration_chat_messages(project_id, created_at desc);
create index if not exists collaboration_chat_messages_expiry_idx
  on public.collaboration_chat_messages(expires_at);

create table if not exists public.collaboration_object_motion (
  project_id uuid not null references public.projects(id) on delete cascade,
  page_id text not null default '',
  page_index integer not null default 0,
  object_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  x double precision not null,
  y double precision not null,
  width double precision not null,
  height double precision not null,
  rotation double precision not null default 0,
  final boolean not null default false,
  client_sent_at bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (project_id, page_id, object_id)
);

create index if not exists collaboration_object_motion_project_updated_idx
  on public.collaboration_object_motion(project_id, updated_at desc);

create or replace function public.figureloom_guard_chat_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.figureloom_chat_message_allowed(jsonb_build_object('text', new.body)) then
    raise exception 'This message is not allowed.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.collaboration_chat_messages m
    where m.project_id = new.project_id
      and m.user_id = new.user_id
      and lower(regexp_replace(m.body, '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(new.body, '[[:space:]]+', ' ', 'g'))
      and m.created_at > now() - interval '8 seconds'
  ) then
    raise exception 'That duplicate message was not sent.' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.collaboration_chat_messages m
    where m.project_id = new.project_id
      and m.user_id = new.user_id
      and m.created_at > now() - interval '10 seconds'
  ) >= 6 then
    raise exception 'Slow down before sending more messages.' using errcode = 'P0001';
  end if;

  delete from public.collaboration_chat_messages where expires_at <= now();
  new.created_at := now();
  new.expires_at := now() + interval '12 hours';
  return new;
end;
$$;

create or replace function public.figureloom_touch_motion()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table public.collaboration_chat_messages enable row level security;
alter table public.collaboration_object_motion enable row level security;

-- Project members may read and send temporary moderated chat.
-- Project editors may publish object motion; all project members may receive it.
-- Only the project owner may delete stored temporary chat rows.

alter table public.collaboration_chat_messages replica identity full;
alter table public.collaboration_object_motion replica identity full;
