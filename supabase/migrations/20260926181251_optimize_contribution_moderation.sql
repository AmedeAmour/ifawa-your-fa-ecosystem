begin;

drop policy if exists "staff moderate contributions" on public.contributions;
drop policy if exists "users edit or resubmit returned contributions" on public.contributions;

create policy "owners edit returned contributions and staff moderate"
on public.contributions for update
to authenticated
using (
  (select private.is_ifawa_staff())
  or (
    author_id = (select auth.uid())
    and status in ('submitted', 'needs_review')
  )
)
with check (
  (select private.is_ifawa_staff())
  or (
    author_id = (select auth.uid())
    and status = 'submitted'
    and reviewer_note is null
    and reviewer_id is null
    and reviewed_at is null
    and published_at is null
  )
);

create index if not exists admin_members_created_by_idx
  on public.admin_members(created_by)
  where created_by is not null;
create index if not exists contribution_moderation_actor_idx
  on public.contribution_moderation_events(actor_id)
  where actor_id is not null;
create index if not exists contribution_notification_contribution_idx
  on public.contribution_notifications(contribution_id);
create index if not exists contributions_reviewer_idx
  on public.contributions(reviewer_id)
  where reviewer_id is not null;

commit;
