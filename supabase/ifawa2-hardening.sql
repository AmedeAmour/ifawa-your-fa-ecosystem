-- PROPOSITION LOCALE : non exécutée, à tester sur une copie de Ifawa2.
-- Cible attendue : ejaiflgcspbowtsywyqc. Comparer le schéma réel au contrat
-- ifawa2-schema.sql avant application. Transaction : tout échec annule tout.
-- Ne pas relancer l'ancien contrat après cette correction.
begin;

alter table public.profile_fa_details enable row level security;
alter table public.conversation_members enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.connections enable row level security;
alter table public.contributions enable row level security;
alter table public.service_requests enable row level security;

create policy hardening_request_select on public.service_requests
as restrictive for select to authenticated using (requester_id=(select auth.uid()));
create policy hardening_connection_select on public.connections
as restrictive for select to authenticated
using (requester_id=(select auth.uid()) or addressee_id=(select auth.uid()));
create policy hardening_contribution_select on public.contributions
as restrictive for select to authenticated using (author_id=(select auth.uid()) or status='approved');

-- Des politiques RESTRICTIVE ferment aussi les anciennes politiques permissives.
create policy hardening_fa_private on public.profile_fa_details
as restrictive for all to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
alter table public.profile_fa_details alter column sign_visibility set default 'private';
alter table public.profile_fa_details alter column initiation_year_visibility set default 'private';
alter table public.profile_fa_details alter column experience_visibility set default 'private';
-- Le partage champ par champ sera une évolution distincte. Aucun RPC annonçant
-- ifawa_security_version=1 n'est créé : les sélecteurs restent indisponibles.

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversation_members
    where conversation_id = target_conversation_id and profile_id = (select auth.uid()));
$$;
revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

create policy hardening_member_select on public.conversation_members
as restrictive for select to authenticated
using (public.is_conversation_member(conversation_id));
create policy hardening_member_insert on public.conversation_members
as restrictive for insert to authenticated with check (false);
create policy hardening_member_update on public.conversation_members
as restrictive for update to authenticated using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
create policy hardening_member_read_receipt on public.conversation_members
for update to authenticated using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
create policy hardening_member_delete on public.conversation_members
as restrictive for delete to authenticated using (false);
revoke update on public.conversation_members from public, anon, authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
create policy hardening_conversation_insert on public.conversations
as restrictive for insert to authenticated with check (false);
create policy hardening_conversation_select on public.conversations
as restrictive for select to authenticated using (public.is_conversation_member(id));
create policy hardening_message_select on public.messages
as restrictive for select to authenticated using (public.is_conversation_member(conversation_id));
create policy hardening_message_insert on public.messages
as restrictive for insert to authenticated with check (
  sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id)
  and length(btrim(body)) between 1 and 10000);
revoke update, delete on public.messages, public.conversations from public, anon, authenticated;

create or replace function public.start_direct_conversation(peer_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target uuid;
begin
  if actor is null or peer_id is null or actor = peer_id then
    raise exception 'Invalid conversation participants';
  end if;
  -- Sérialise les créations concurrentes pour cette paire, dans les deux sens.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    least(actor::text, peer_id::text) || ':' || greatest(actor::text, peer_id::text), 0));
  select c.id into target from public.conversations c
    where exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.profile_id=actor)
      and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.profile_id=peer_id)
      and (select count(*) from public.conversation_members m where m.conversation_id=c.id)=2
    order by c.created_at, c.id limit 1;
  if target is not null then return target; end if;
  if not exists(select 1 from public.connections where status='accepted'
    and ((requester_id=actor and addressee_id=peer_id) or (requester_id=peer_id and addressee_id=actor))) then
    raise exception 'An accepted connection is required';
  end if;
  insert into public.conversations(created_by) values(actor) returning id into target;
  insert into public.conversation_members(conversation_id, profile_id) values(target,actor),(target,peer_id);
  return target;
end;
$$;
revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

create policy hardening_contribution_insert on public.contributions
as restrictive for insert to authenticated with check (
  author_id=(select auth.uid()) and status='submitted' and reviewer_note is null);
create policy hardening_contribution_update on public.contributions
as restrictive for update to authenticated using (author_id=(select auth.uid()) and status='submitted')
with check (author_id=(select auth.uid()) and status='submitted' and reviewer_note is null);
revoke update on public.contributions from public, anon, authenticated;
grant update (title, body, category, fa_sign_id) on public.contributions to authenticated;

-- Échoue en présence de paires inversées existantes : les examiner, ne pas les supprimer automatiquement.
create unique index connections_unordered_pair on public.connections
  (least(requester_id,addressee_id),greatest(requester_id,addressee_id));
create policy hardening_connection_insert on public.connections
as restrictive for insert to authenticated with check (
  requester_id=(select auth.uid()) and requester_id<>addressee_id and status='pending'
  and exists(select 1 from public.profiles p where p.id=addressee_id and p.relation_enabled));
create policy hardening_connection_update on public.connections
as restrictive for update to authenticated using (addressee_id=(select auth.uid()) and status='pending')
with check (addressee_id=(select auth.uid()) and status in ('accepted','rejected'));
revoke update on public.connections from public, anon, authenticated;
grant update (status) on public.connections to authenticated;

create policy hardening_request_insert on public.service_requests
as restrictive for insert to authenticated with check (
  requester_id=(select auth.uid()) and status='submitted'
  and result_summary is null and result_payload is null and completed_at is null
  and exists(select 1 from public.service_catalog s where s.type=service_type and s.is_active));
create policy hardening_request_update on public.service_requests
as restrictive for update to authenticated using (false) with check (false);
revoke update, delete on public.service_requests from public, anon, authenticated;

create table public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check(length(btrim(reason)) between 1 and 200),
  details text check(length(details)<=5000),
  status text not null default 'submitted' check(status in ('submitted','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  unique(post_id, reporter_id)
);
alter table public.post_reports enable row level security;
revoke all on public.post_reports from public, anon, authenticated;
grant select, insert on public.post_reports to authenticated;
grant all on public.post_reports to service_role;
create policy reports_insert_own on public.post_reports for insert to authenticated
with check (reporter_id=(select auth.uid()) and status='submitted');
create policy reports_select_own on public.post_reports for select to authenticated
using (reporter_id=(select auth.uid()));

create or replace function public.ifawa_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end;
$$;
do $$ declare table_name text;
begin
  foreach table_name in array array['profiles','profile_fa_details','posts','contributions','connections','service_requests'] loop
    execute format('create trigger ifawa_touch_updated_at before update on public.%I for each row execute function public.ifawa_touch_updated_at()',table_name);
  end loop;
end $$;
create index if not exists posts_feed_order on public.posts(created_at desc,id desc);
create index if not exists posts_author_order on public.posts(author_id,created_at desc,id desc);
create index if not exists comments_post_order on public.post_comments(post_id,created_at,id);
create index if not exists memberships_profile on public.conversation_members(profile_id,conversation_id);
create index if not exists messages_conversation_order on public.messages(conversation_id,created_at,id);
create index if not exists connections_addressee_status on public.connections(addressee_id,status);
create index if not exists requests_requester_order on public.service_requests(requester_id,created_at desc);
create index if not exists contributions_author_order on public.contributions(author_id,created_at desc);
-- Pas d'accès anonyme aux données communautaires, même si un GRANT antérieur existe.
revoke all on public.profiles, public.profile_fa_details, public.posts,
  public.post_comments, public.post_reactions, public.contributions, public.connections,
  public.conversations, public.conversation_members, public.messages, public.service_requests
from anon, public;
commit;
