begin;

alter table public.contribution_moderation_events
  drop constraint if exists contribution_moderation_events_action_check;
alter table public.contribution_moderation_events
  add constraint contribution_moderation_events_action_check check (
    action in (
      'submitted', 'resubmitted', 'review_started', 'correction_requested',
      'approved', 'rejected', 'archived'
    )
  );

create or replace function private.prepare_contribution_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('under_review', 'needs_review', 'approved', 'rejected', 'archived') then
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
    insert into public.contribution_moderation_events (
      contribution_id, actor_id, action, from_status, to_status, note
    ) values (new.id, new.author_id, 'submitted', null, new.status::text, null);
    return new;
  end if;
  if new.status is not distinct from old.status then return new; end if;

  event_action := case
    when new.status = 'submitted' and old.status = 'needs_review' then 'resubmitted'
    when new.status = 'under_review' then 'review_started'
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
      new.id, coalesce((select auth.uid()), new.author_id), event_action,
      old.status::text, new.status::text, new.reviewer_note
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

commit;
