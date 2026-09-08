-- Contrat Supabase attendu par l'application Ifawa.
-- A appliquer uniquement sur le projet Supabase correct: Ifawa2.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  cover_url text,
  path text check (path in ('initiated', 'not_initiated')),
  relation_enabled boolean not null default false,
  is_profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fa_signs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_fa_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  fa_sign_id uuid references public.fa_signs(id) on delete set null,
  initiation_year integer,
  satisfaction_score integer check (satisfaction_score between 1 and 5),
  experience_text text,
  sign_visibility text not null default 'same_sign',
  initiation_year_visibility text not null default 'connections',
  experience_visibility text not null default 'connections',
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'love', 'laugh', 'support')),
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_not_self check (requester_id <> addressee_id),
  constraint connections_unique_pair unique (requester_id, addressee_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  type text unique not null,
  title text not null,
  description text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.profile_id = auth.uid()
  );
$$;

insert into public.service_catalog (type, title, description, display_order, is_active)
values
  ('fa_consultation', 'Consultation Fa', 'Posez une préoccupation et suivez le dossier depuis votre espace personnel.', 1, true),
  ('initiation_request', 'Demande d''initiation', 'Un parcours clair pour exprimer votre situation, votre zone et votre disponibilité.', 2, true),
  ('sign_deep_study', 'Étude approfondie du signe', 'Plusieurs lectures sont regroupées dans une synthèse comparative structurée.', 3, true),
  ('fa_accompaniment', 'Accompagnement Fa', 'Un cadre de suivi régulier avec carnet, questions et comptes rendus.', 4, true)
on conflict (type) do update set
  title = excluded.title,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = excluded.is_active;

alter table public.profiles enable row level security;
alter table public.fa_signs enable row level security;
alter table public.profile_fa_details enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.connections enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.service_catalog enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "fa_signs_select_authenticated" on public.fa_signs;
create policy "fa_signs_select_authenticated"
on public.fa_signs for select
to authenticated
using (true);

drop policy if exists "profile_fa_select_authenticated" on public.profile_fa_details;
create policy "profile_fa_select_authenticated"
on public.profile_fa_details for select
to authenticated
using (true);

drop policy if exists "profile_fa_upsert_own" on public.profile_fa_details;
create policy "profile_fa_upsert_own"
on public.profile_fa_details for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "posts_select_authenticated" on public.posts;
create policy "posts_select_authenticated"
on public.posts for select
to authenticated
using (true);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
on public.posts for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
on public.posts for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
on public.posts for delete
to authenticated
using (author_id = auth.uid());

drop policy if exists "comments_select_authenticated" on public.post_comments;
create policy "comments_select_authenticated"
on public.post_comments for select
to authenticated
using (true);

drop policy if exists "comments_insert_own" on public.post_comments;
create policy "comments_insert_own"
on public.post_comments for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "comments_delete_own_or_post_owner" on public.post_comments;
create policy "comments_delete_own_or_post_owner"
on public.post_comments for delete
to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = auth.uid()
  )
);

drop policy if exists "reactions_select_authenticated" on public.post_reactions;
create policy "reactions_select_authenticated"
on public.post_reactions for select
to authenticated
using (true);

drop policy if exists "reactions_insert_own" on public.post_reactions;
create policy "reactions_insert_own"
on public.post_reactions for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "reactions_delete_own" on public.post_reactions;
create policy "reactions_delete_own"
on public.post_reactions for delete
to authenticated
using (profile_id = auth.uid());

drop policy if exists "connections_select_related" on public.connections;
create policy "connections_select_related"
on public.connections for select
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "connections_insert_own" on public.connections;
create policy "connections_insert_own"
on public.connections for insert
to authenticated
with check (requester_id = auth.uid());

drop policy if exists "connections_update_addressee" on public.connections;
create policy "connections_update_addressee"
on public.connections for update
to authenticated
using (addressee_id = auth.uid())
with check (addressee_id = auth.uid());

drop policy if exists "connections_delete_related" on public.connections;
create policy "connections_delete_related"
on public.connections for delete
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
on public.conversations for select
to authenticated
using (public.is_conversation_member(id));

drop policy if exists "conversations_insert_authenticated" on public.conversations;
create policy "conversations_insert_authenticated"
on public.conversations for insert
to authenticated
with check (created_by is null or created_by = auth.uid());

drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member"
on public.conversation_members for select
to authenticated
using (profile_id = auth.uid() or public.is_conversation_member(conversation_id));

drop policy if exists "conversation_members_insert_self_or_creator" on public.conversation_members;
create policy "conversation_members_insert_self_or_creator"
on public.conversation_members for insert
to authenticated
with check (
  profile_id = auth.uid()
  or exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.created_by = auth.uid() or c.created_by is null)
  )
);

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
on public.messages for select
to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "service_catalog_select_authenticated" on public.service_catalog;
create policy "service_catalog_select_authenticated"
on public.service_catalog for select
to authenticated
using (is_active = true);

insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true), ('post-media', 'post-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "profile_media_select_authenticated" on storage.objects;
create policy "profile_media_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'profile-media');

drop policy if exists "profile_media_write_own_folder" on storage.objects;
create policy "profile_media_write_own_folder"
on storage.objects for all
to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post_media_select_authenticated" on storage.objects;
create policy "post_media_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'post-media');

drop policy if exists "post_media_write_own_folder" on storage.objects;
create policy "post_media_write_own_folder"
on storage.objects for all
to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
