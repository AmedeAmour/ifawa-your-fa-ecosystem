begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists public.admin_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_members enable row level security;

create or replace function private.is_ifawa_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_members
    where user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function private.is_ifawa_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_members
    where user_id = (select auth.uid())
      and role = 'admin'
      and is_active
  );
$$;

revoke all on function private.is_ifawa_staff() from public, anon;
revoke all on function private.is_ifawa_admin() from public, anon;
grant execute on function private.is_ifawa_staff() to authenticated, service_role;
grant execute on function private.is_ifawa_admin() to authenticated, service_role;

drop policy if exists "admin members can read themselves" on public.admin_members;
create policy "admin members can read themselves"
on public.admin_members for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_ifawa_admin())
);

revoke all on public.admin_members from public, anon, authenticated;
grant select on public.admin_members to authenticated;
grant all on public.admin_members to service_role;

alter table public.contributions
  add column if not exists reviewer_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists published_at timestamptz;

create table if not exists public.contribution_moderation_events (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (
    action in ('submitted', 'resubmitted', 'correction_requested', 'approved', 'rejected', 'archived')
  ),
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.contribution_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  kind text not null check (kind in ('correction_requested', 'approved', 'rejected')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contribution_moderation_events enable row level security;
alter table public.contribution_notifications enable row level security;

drop policy if exists "staff can read moderation events" on public.contribution_moderation_events;
create policy "staff can read moderation events"
on public.contribution_moderation_events for select
to authenticated
using (
  (select private.is_ifawa_staff())
  or exists (
    select 1 from public.contributions c
    where c.id = contribution_id and c.author_id = (select auth.uid())
  )
);

drop policy if exists "users can read contribution notifications" on public.contribution_notifications;
create policy "users can read contribution notifications"
on public.contribution_notifications for select
to authenticated
using (recipient_id = (select auth.uid()));

revoke all on public.contribution_moderation_events from public, anon, authenticated;
revoke all on public.contribution_notifications from public, anon, authenticated;
grant select on public.contribution_moderation_events to authenticated;
grant select on public.contribution_notifications to authenticated;
grant all on public.contribution_moderation_events to service_role;
grant all on public.contribution_notifications to service_role;

drop policy if exists "users can read their own contributions" on public.contributions;
drop policy if exists "users can submit contributions" on public.contributions;
drop policy if exists "users can update submitted contributions" on public.contributions;
drop policy if exists "contributions_select_authenticated" on public.contributions;
drop policy if exists "contributions_insert_own" on public.contributions;
drop policy if exists "contributions_update_own_submitted" on public.contributions;
drop policy if exists "hardening_contribution_select" on public.contributions;
drop policy if exists "hardening_contribution_insert" on public.contributions;
drop policy if exists "hardening_contribution_update" on public.contributions;

create policy "contributions visible to owner staff or after approval"
on public.contributions for select
to authenticated
using (
  author_id = (select auth.uid())
  or status = 'approved'
  or (select private.is_ifawa_staff())
);

create policy "users submit their own contributions"
on public.contributions for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'submitted'
  and reviewer_note is null
  and reviewer_id is null
  and reviewed_at is null
  and published_at is null
);

create policy "users edit or resubmit returned contributions"
on public.contributions for update
to authenticated
using (
  author_id = (select auth.uid())
  and status in ('submitted', 'needs_review')
)
with check (
  author_id = (select auth.uid())
  and status = 'submitted'
  and reviewer_note is null
  and reviewer_id is null
  and reviewed_at is null
  and published_at is null
);

create policy "staff moderate contributions"
on public.contributions for update
to authenticated
using ((select private.is_ifawa_staff()))
with check ((select private.is_ifawa_staff()));

revoke insert, update, delete on public.contributions from public, anon, authenticated;
grant select on public.contributions to authenticated;
grant insert (author_id, fa_sign_id, title, body, category, status) on public.contributions to authenticated;
grant update (
  fa_sign_id, title, body, category, status, reviewer_note, reviewer_id, reviewed_at, published_at
) on public.contributions to authenticated;
grant all on public.contributions to service_role;

create or replace function private.prepare_contribution_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('needs_review', 'approved', 'rejected', 'archived') then
      new.reviewer_id := (select auth.uid());
      new.reviewed_at := now();
      new.published_at := case when new.status = 'approved' then now() else null end;
    elsif new.status = 'submitted' and old.status = 'needs_review' then
      new.reviewer_note := null;
      new.reviewer_id := null;
      new.reviewed_at := null;
      new.published_at := null;
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.record_contribution_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_action text;
  notification_kind text;
  notification_message text;
begin
  if tg_op = 'INSERT' then
    event_action := 'submitted';
    insert into public.contribution_moderation_events (
      contribution_id, actor_id, action, from_status, to_status, note
    ) values (new.id, new.author_id, event_action, null, new.status::text, null);
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  event_action := case
    when new.status = 'submitted' and old.status = 'needs_review' then 'resubmitted'
    when new.status = 'needs_review' then 'correction_requested'
    when new.status = 'approved' then 'approved'
    when new.status = 'rejected' then 'rejected'
    when new.status = 'archived' then 'archived'
    else null
  end;

  if event_action is not null then
    insert into public.contribution_moderation_events (
      contribution_id, actor_id, action, from_status, to_status, note
    ) values (
      new.id,
      coalesce((select auth.uid()), new.author_id),
      event_action,
      old.status::text,
      new.status::text,
      new.reviewer_note
    );
  end if;

  notification_kind := case
    when new.status = 'needs_review' then 'correction_requested'
    when new.status = 'approved' then 'approved'
    when new.status = 'rejected' then 'rejected'
    else null
  end;

  notification_message := case
    when new.status = 'needs_review' then 'Une correction est demandée pour « ' || new.title || ' ».'
    when new.status = 'approved' then 'Votre contribution « ' || new.title || ' » a été validée.'
    when new.status = 'rejected' then 'Votre contribution « ' || new.title || ' » n’a pas été retenue.'
    else null
  end;

  if notification_kind is not null then
    insert into public.contribution_notifications (
      recipient_id, contribution_id, kind, message
    ) values (new.author_id, new.id, notification_kind, notification_message);
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_contribution_review() from public, anon, authenticated;
revoke all on function private.record_contribution_moderation() from public, anon, authenticated;

drop trigger if exists prepare_contribution_review on public.contributions;
create trigger prepare_contribution_review
before update of status on public.contributions
for each row execute function private.prepare_contribution_review();

drop trigger if exists record_contribution_moderation on public.contributions;
create trigger record_contribution_moderation
after insert or update of status on public.contributions
for each row execute function private.record_contribution_moderation();

create index if not exists contribution_status_created_idx
  on public.contributions(status, created_at desc);
create index if not exists contribution_sign_published_idx
  on public.contributions(fa_sign_id, published_at desc)
  where status = 'approved';
create index if not exists contribution_moderation_event_idx
  on public.contribution_moderation_events(contribution_id, created_at desc);
create index if not exists contribution_notification_recipient_idx
  on public.contribution_notifications(recipient_id, created_at desc);

insert into public.contribution_moderation_events (
  contribution_id, actor_id, action, from_status, to_status, note, created_at
)
select c.id, c.author_id, 'submitted', null, c.status::text, null, c.created_at
from public.contributions c
where not exists (
  select 1
  from public.contribution_moderation_events event
  where event.contribution_id = c.id
);

insert into public.admin_members (user_id, role, created_by)
select id, 'admin', id
from public.profiles
where id = '1baac504-886e-4513-986f-c5bf607735ce'
on conflict (user_id) do update
set role = excluded.role, is_active = true, updated_at = now();

-- FA_SIGN_CATALOG_SEED
insert into public.fa_signs (slug, name, display_order)
values
  ('gbe-medji', 'Gbé-Mèdji', 1),
  ('yekou-medji', 'Yèkou-Mèdji', 2),
  ('woli-medji', 'Woli-Mèdji', 3),
  ('di-medji', 'Di-Mèdji', 4),
  ('losso-medji', 'Losso-Mèdji', 5),
  ('winlin-medji', 'Winlin-Mèdji', 6),
  ('abla-medji', 'Abla-Mèdji', 7),
  ('aklan-medji', 'Aklan-Mèdji', 8),
  ('guda-medji', 'Guda-Mèdji', 9),
  ('sa-medji', 'Sa-Mèdji', 10),
  ('trukpin-medji', 'Trukpin-Mèdji', 11),
  ('tula-medji', 'Tula-Mèdji', 12),
  ('lete-medji', 'Lètè-Mèdji', 13),
  ('tche-medji', 'Tchè-Mèdji', 14),
  ('ka-medji', 'Ka-Mèdji', 15),
  ('fu-medji', 'Fu-Mèdji', 16),
  ('signe-017-gbe-yeku', 'GBE YEKU', 17),
  ('signe-018-gbe-woli', 'GBE WOLI', 18),
  ('signe-019-gbe-di', 'GBE DI', 19),
  ('signe-020-gbe-loso', 'GBE LOSO', 20),
  ('signe-021-gbe-winlin', 'GBE WINLIN', 21),
  ('signe-022-gbe-abla', 'GBE ABLA', 22),
  ('signe-023-gbe-aklan', 'GBE AKLAN', 23),
  ('signe-024-gbe-guda', 'GBE GUDA', 24),
  ('signe-025-gbe-sa', 'GBE SA', 25),
  ('signe-026-gbe-trukpin', 'GBE TRUKPIN', 26),
  ('signe-027-gbe-tula', 'GBE TULA', 27),
  ('signe-028-gbe-lete', 'GBE LETE', 28),
  ('signe-029-gbe-ka', 'GBE KA', 29),
  ('signe-030-gbe-tche', 'GBE TCHE', 30),
  ('signe-031-gbe-fu', 'GBE FU', 31),
  ('signe-032-yeku-logbe', 'YEKU LOGBE', 32),
  ('signe-033-yeku-do-woli', 'YEKU DO WOLI', 33),
  ('signe-034-yeku-mon-di', 'YEKU MON DI', 34),
  ('signe-035-yeku-gbo-loso', 'YEKU GBO LOSO', 35),
  ('signe-036-yeku-do-winlin', 'YEKU DO WINLIN', 36),
  ('signe-037-yeku-do-abla', 'YEKU DO ABLA', 37),
  ('signe-038-yeku-da-aklan', 'YEKU DA AKLAN', 38),
  ('signe-039-yeku-do-gouda', 'YEKU DO GOUDA', 39),
  ('signe-040-yekudonsa', 'YEKUDONSA', 40),
  ('signe-041-yeku-fo-trunkpin', 'YEKU FO TRUNKPIN', 41),
  ('signe-042-yeku-do-tula', 'YEKU DO TULA', 42),
  ('signe-043-yeku-gbo-lete', 'YEKU GBO LETE', 43),
  ('signe-044-yeku-si-ka', 'YEKU SI KA', 44),
  ('signe-045-yeku-vi-dje', 'YEKU VI DJE', 45),
  ('signe-046-yeku-ti-fu', 'YEKU TI FU', 46),
  ('signe-047-woli-bo-gbe', 'WOLI BO GBE', 47),
  ('signe-048-woli-yeku', 'WOLI YEKU', 48),
  ('signe-049-woli-wodi-woli-di', 'WOLI WODI / WOLI DI', 49),
  ('signe-050-woli-losso', 'WOLI LOSSO', 50),
  ('signe-051-woli-winlin', 'WOLI WINLIN', 51),
  ('signe-052-woli-abla', 'WOLI ABLA', 52),
  ('signe-053-woli-aklan', 'WOLI AKLAN', 53),
  ('signe-054-woli-gouda', 'WOLI GOUDA', 54),
  ('signe-055-woli-wo-sa', 'WOLI WO SA', 55),
  ('signe-056-woli-trukpin', 'WOLI TRUKPIN', 56),
  ('signe-057-woli-tula', 'WOLI TULA', 57),
  ('signe-058-woli-lete', 'WOLI LETE', 58),
  ('signe-059-woli-ayo-ka', 'WOLI AYO KA', 59),
  ('signe-060-woli-otche', 'WOLI OTCHE', 60),
  ('signe-061-woli-wo-fu', 'WOLI WO-FU', 61),
  ('signe-062-di-gbe', 'DI GBE', 62),
  ('signe-063-di-yeku', 'DI YEKU', 63),
  ('signe-064-di-woli', 'DI WOLI', 64),
  ('signe-065-di-losso', 'DI LOSSO', 65),
  ('signe-066-di-wlin', 'DI WLIN', 66),
  ('signe-067-di-abla', 'DI-ABLA', 67),
  ('signe-068-di-aklan', 'DI-AKLAN', 68),
  ('signe-069-di-gouda', 'DI GOUDA', 69),
  ('signe-070-di-sa', 'DI SA', 70),
  ('signe-071-di-houn-trukpin', 'DI HOUN TRUKPIN', 71),
  ('signe-072-di-houn-toula', 'DI HOUN TOULA', 72),
  ('signe-073-di-lete', 'DI LETE', 73),
  ('signe-074-di-tche', 'DI TCHE', 74),
  ('signe-075-di-ka', 'DI KA', 75),
  ('signe-076-di-fu', 'DI FU', 76),
  ('signe-077-lossobo-gbe', 'LOSSOBO-GBE', 77),
  ('signe-078-losso-yeku', 'LOSSO YEKU', 78),
  ('signe-079-losso-woli', 'LOSSO WOLI', 79),
  ('signe-080-losso-di', 'LOSSO DI', 80),
  ('signe-081-losso-winlin', 'LOSSO WINLIN', 81),
  ('signe-082-losso-abla', 'LOSSO ABLA', 82),
  ('signe-083-losso-aklan', 'LOSSO AKLAN', 83),
  ('signe-084-losso-gouda', 'LOSSO GOUDA', 84),
  ('signe-085-losso-sa', 'LOSSO-SA', 85),
  ('signe-086-losso-trukpin', 'LOSSO TRUKPIN', 86),
  ('signe-087-losso-toula', 'LOSSO TOULA', 87),
  ('signe-088-losso-lete-lossadjtemin', 'LOSSO LETE (LOSSADJTEMIN)', 88),
  ('signe-089-losso-tche', 'LOSSO TCHE', 89),
  ('signe-090-losso-ka', 'LOSSO KA', 90),
  ('signe-091-losso-fu', 'LOSSO FU', 91),
  ('signe-092-winlin-tchoogbe', 'WINLIN TCHÔÔGBE', 92),
  ('signe-093-winlin-yekou', 'WINLIN YEKOU', 93),
  ('signe-094-winlin-woli', 'WINLIN WOLI', 94),
  ('signe-095-winlin-do-di', 'WINLIN DO DI', 95),
  ('signe-096-winlin-do-losso', 'WINLIN DO LOSSO', 96),
  ('signe-097-winlin-dou-bla', 'WINLIN DOU BLA', 97),
  ('signe-098-winlin-do-aklan', 'WINLIN DO AKLAN', 98),
  ('signe-099-winlin-guda', 'WINLIN GUDA', 99),
  ('signe-100-winlin-don-sa', 'WINLIN DON-SA', 100),
  ('signe-101-winlin-fu-trukpin', 'WINLIN FU TRUKPIN', 101),
  ('signe-102-winlin-gbo-lete', 'WINLIN GBO LETE', 102),
  ('signe-103-winlin-tula', 'WINLIN TULA', 103),
  ('signe-104-winlin-kotche', 'WINLIN KOTCHE', 104),
  ('signe-105-winlin-kpa-fu', 'WINLIN KPA FU', 105),
  ('signe-106-winlin-ka', 'WINLIN KA', 106),
  ('signe-107-abla-bo-gbe', 'ABLA BO GBE', 107),
  ('signe-108-abla-yekou', 'ABLA YEKOU', 108),
  ('signe-109-abla-woli', 'ABLA WOLI', 109),
  ('signe-110-abla-ho-di', 'ABLA HO-DI', 110),
  ('signe-111-abla-losso', 'ABLA LOSSO', 111),
  ('signe-112-abla-winlin', 'ABLA WINLIN', 112),
  ('signe-113-abla-do-aklan', 'ABLA DO AKLAN', 113),
  ('signe-114-abla-gouda', 'ABLA GOUDA', 114),
  ('signe-115-abla-mi-sa', 'ABLA MI-SA', 115),
  ('signe-116-abla-trukpin', 'ABLA TRUKPIN', 116),
  ('signe-117-abla-toula', 'ABLA TOULA', 117),
  ('signe-118-abla-gbo-lete', 'ABLA GBO LETE', 118),
  ('signe-119-abla-ko-tche', 'ABLA KO-TCHE', 119),
  ('signe-120-abla-ho-ka', 'ABLA HO-KA', 120),
  ('signe-121-abla-kpa-fou', 'ABLA KPA FOU', 121),
  ('signe-122-aklan-chooogbe', 'AKLAN CHÔÔÔGBE', 122),
  ('signe-123-aklan-yekou', 'AKLAN-YEKOU', 123),
  ('signe-124-aklan-woli', 'AKLAN-WOLI', 124),
  ('signe-125-aklan-ho-di', 'AKLAN HO-DI', 125),
  ('signe-126-aklanvi-losso', 'AKLANVI LOSSO', 126),
  ('signe-127-aklan-winlin', 'AKLAN WINLIN', 127),
  ('signe-128-aklan-do-abla', 'AKLAN DO ABLA', 128),
  ('signe-129-aklan-gouda', 'AKLAN GOUDA', 129),
  ('signe-130-aklan-don-sa', 'AKLAN-DON-SA', 130),
  ('signe-131-aklan-trukpin', 'AKLAN TRUKPIN', 131),
  ('signe-132-aklan-toula', 'AKLAN-TOULA', 132),
  ('signe-133-aklan-gbo-lete', 'AKLAN GBO-LETE', 133),
  ('signe-134-aklan-ho-ka', 'AKLAN HO KA', 134),
  ('signe-135-aklan-ko-tche', 'AKLAN KO TCHE', 135),
  ('signe-136-aklan-kpa-fou', 'AKLAN KPA FOU', 136),
  ('signe-137-gouda-fli-gbe', 'GOUDA FLI-GBE', 137),
  ('signe-138-gouda-yekou', 'GOUDA YEKOU', 138),
  ('signe-139-gouda-woli', 'GOUDA WOLI', 139),
  ('signe-140-gouda-mon-di', 'GOUDA MON-DI', 140),
  ('signe-141-gouda-gbo-losso', 'GOUDA GBO LOSSO', 141),
  ('signe-142-gouda-winlin', 'GOUDA WINLIN', 142),
  ('signe-143-gouda-bla', 'GOUDA BLA', 143),
  ('signe-144-gouda-aklan', 'GOUDA AKLAN', 144),
  ('signe-145-gouda-sa', 'GOUDA-SA', 145),
  ('signe-146-gouda-fo-trukpin', 'GOUDA FO TRUKPIN', 146),
  ('signe-147-gouda-kpa-toula', 'GOUDA KPA TOULA', 147),
  ('signe-148-gouda-gbo-lete', 'GOUDA GBO LETE', 148),
  ('signe-149-gouda-ka', 'GOUDA KA', 149),
  ('signe-150-gouda-tche', 'GOUDA TCHE', 150),
  ('signe-151-gouda-fou', 'GOUDA FOU', 151),
  ('signe-152-sa-wo-gbe', 'SA WO-GBE', 152),
  ('signe-153-sa-yekou', 'SA YEKOU', 153),
  ('signe-154-sa-woli', 'SA WOLI', 154),
  ('signe-155-sa-di', 'SA-DI', 155),
  ('signe-156-sa-losso', 'SA LOSSO', 156),
  ('signe-157-sa-winlin', 'SA WINLIN', 157),
  ('signe-158-sa-abla', 'SA ABLA', 158),
  ('signe-159-sa-aklan', 'SA-AKLAN', 159),
  ('signe-160-sa-gouda-sa-guda', 'SA-GOUDA (SA-GUDA)', 160),
  ('signe-161-sa-trukpin', 'SA-TRUKPIN', 161),
  ('signe-162-sa-toula-sa-tula', 'SA-TOULA / SA TULA', 162),
  ('signe-163-sa-lete', 'SA LETE', 163),
  ('signe-164-sa-ka', 'SA-KA', 164),
  ('signe-165-sa-tche', 'SA-TCHE', 165),
  ('signe-166-sa-fu', 'SA-FU', 166),
  ('signe-167-trukpin-tchooode', 'TRUKPIN TCHÔÔÔDE', 167),
  ('signe-168-trukpin-yekou', 'TRUKPIN YEKOU', 168),
  ('signe-169-trukpin-woli', 'TRUKPIN WOLI', 169),
  ('signe-170-trukpin-di', 'TRUKPIN-DI', 170),
  ('signe-171-trukpin-losso', 'TRUKPIN LOSSO', 171),
  ('signe-172-trukpin-winlin', 'TRUKPIN WINLIN', 172),
  ('signe-173-trukpin-abla', 'TRUKPIN ABLA', 173),
  ('signe-174-trukpin-aklan', 'TRUKPIN AKLAN', 174),
  ('signe-175-trukpin-gouda', 'TRUKPIN GOUDA', 175),
  ('signe-176-trukpin-sa', 'TRUKPIN SA', 176),
  ('signe-177-trukpin-toula', 'TRUKPIN TOULA', 177),
  ('signe-178-trukpin-lete', 'TRUKPIN LETE', 178),
  ('signe-179-trukpin-ka', 'TRUKPIN KA', 179),
  ('signe-180-trukpin-tche', 'TRUKPIN TCHE', 180),
  ('signe-181-trukpin-fu', 'TRUKPIN FU', 181),
  ('signe-182-toula-do-logbe', 'TOULA DO LOGBE', 182),
  ('signe-183-toula-yekou', 'TOULA YEKOU', 183),
  ('signe-184-toula-woli', 'TOULA WOLI', 184),
  ('signe-185-toula-mon-di', 'TOULA MON DI', 185),
  ('signe-186-toula-de-so', 'TOULA DE-SO', 186),
  ('signe-187-toula-winlin', 'TOULA WINLIN', 187),
  ('signe-188-toula-abla', 'TOULA ABLA', 188),
  ('signe-189-toula-d-aklan', 'TOULA D’AKLAN', 189),
  ('signe-190-toula-gouda', 'TOULA GOUDA', 190),
  ('signe-191-toula-sa', 'TOULA SA', 191),
  ('signe-192-toula-for-trukpin', 'TOULA FOR TRUKPIN', 192),
  ('signe-193-toula-lete-toula-gbo-gbe', 'TOULA LETE / TOULA GBO GBE', 193),
  ('signe-194-toula-ka', 'TOULA-KA', 194),
  ('signe-195-toula-tche', 'TOULA-TCHE', 195),
  ('signe-196-toula-fu', 'TOULA FU', 196),
  ('signe-197-leta-yi-gbe-lete-gbe', 'LETA YI GBE / LETE GBE', 197),
  ('signe-198-lete-yekou', 'LETE YEKOU', 198),
  ('signe-199-lete-woli', 'LETE WOLI', 199),
  ('signe-200-lete-di', 'LETE-DI', 200),
  ('signe-201-lete-gba-losso-tete-gba-losso', 'LETE GBA LOSSO / TETE GBA LOSSO', 201),
  ('signe-202-lete-winlin', 'LETE WINLIN', 202),
  ('signe-203-lete-abla', 'LETE ABLA', 203),
  ('signe-204-lete-aklan', 'LETE AKLAN', 204),
  ('signe-205-lete-gouda', 'LETE GOUDA', 205),
  ('signe-206-lete-sa', 'LETE SA', 206),
  ('signe-207-lete-trukpin', 'LETE TRUKPIN', 207),
  ('signe-208-lete-toula', 'LETE TOULA', 208),
  ('signe-209-lete-ka', 'LETE KA', 209),
  ('signe-210-lete-tchehoun', 'LETE TCHEHOUN', 210),
  ('signe-211-lete-fu', 'LETE FU', 211),
  ('signe-212-ka-wo-gbe', 'KA WO GBE', 212),
  ('signe-213-ka-yekou', 'KA YEKOU', 213),
  ('signe-214-ka-woli', 'KA WOLI', 214),
  ('signe-215-ka-di', 'KA DI', 215),
  ('signe-216-ka-losso', 'KA LOSSO', 216),
  ('signe-217-ka-winlin', 'KA WINLIN', 217),
  ('signe-218-ka-abla', 'KA-ABLA', 218),
  ('signe-219-ka-aklan', 'KA-AKLAN', 219),
  ('signe-220-ka-gouda', 'KA-GOUDA', 220),
  ('signe-221-ka-sa', 'KA-SA', 221),
  ('signe-222-ka-trukpin', 'KA-TRUKPIN', 222),
  ('signe-223-ka-tula', 'KA-TULA', 223),
  ('signe-224-ka-lete', 'KA-LETE', 224),
  ('signe-225-ka-tche', 'KA-TCHE', 225),
  ('signe-226-ka-fu', 'KA FU', 226),
  ('signe-227-tcheogbe', 'TCHEOGBE', 227),
  ('signe-228-tche-yekou', 'TCHE-YEKOU', 228),
  ('signe-229-tche-woli', 'TCHE WOLI', 229),
  ('signe-230-tche-di', 'TCHE-DI', 230),
  ('signe-231-tche-losso', 'TCHE-LOSSO', 231),
  ('signe-232-tche-winlin', 'TCHE WINLIN', 232),
  ('signe-233-tche-abla', 'TCHE ABLA', 233),
  ('signe-234-tche-aklan', 'TCHE AKLAN', 234),
  ('signe-235-tchegouda', 'TCHEGOUDA', 235),
  ('signe-236-tchesa', 'TCHESA', 236),
  ('signe-237-tche-trukpin', 'TCHE TRUKPIN', 237),
  ('signe-238-tche-toula', 'TCHE TOULA', 238),
  ('signe-239-tche-vile', 'TCHE VILE', 239),
  ('signe-240-tche-ka', 'TCHE KA', 240),
  ('signe-241-tche-fu', 'TCHE FU', 241),
  ('signe-242-fu-wo-gbe', 'FU WO GBE', 242),
  ('signe-243-fu-yekou', 'FU YEKOU', 243),
  ('signe-244-fu-woli', 'FU WOLI', 244),
  ('signe-245-fu-di', 'FU DI', 245),
  ('signe-246-fu-losso', 'FU LOSSO', 246),
  ('signe-247-fu-winlin', 'FU WINLIN', 247),
  ('signe-248-fu-abla', 'FU ABLA', 248),
  ('signe-249-fu-kpa-klan', 'FU KPA KLAN', 249),
  ('signe-250-fu-guda', 'FU GUDA', 250),
  ('signe-251-fu-sa', 'FU SA', 251),
  ('signe-252-fu-trukpin', 'FU TRUKPIN', 252),
  ('signe-253-fu-tula', 'FU TULA', 253),
  ('signe-254-fu-lete', 'FU LETE', 254),
  ('signe-255-fu-tche', 'FU TCHE', 255),
  ('signe-256-fu-ka', 'FU KA', 256)
on conflict (slug) do update
set name = excluded.name, display_order = excluded.display_order, updated_at = now();

commit;
