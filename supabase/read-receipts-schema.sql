-- Account-scoped read markers only; no message contents are stored here.
begin;
create table if not exists public.user_read_receipts (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('conversation', 'notification')),
  item_id text not null check (length(item_id) between 1 and 200),
  read_at timestamptz not null default now(),
  primary key (profile_id, kind, item_id)
);
alter table public.user_read_receipts enable row level security;
revoke all on public.user_read_receipts from public, anon, authenticated;
grant select, insert, update on public.user_read_receipts to authenticated;
grant all on public.user_read_receipts to service_role;
drop policy if exists own_read_receipts on public.user_read_receipts;
create policy own_read_receipts on public.user_read_receipts for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
-- A delayed device must never overwrite a more recent read position.
create or replace function public.keep_latest_read_receipt()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.read_at := greatest(old.read_at, new.read_at);
  return new;
end;
$$;
revoke all on function public.keep_latest_read_receipt() from public, anon, authenticated;
drop trigger if exists keep_latest_read_receipt on public.user_read_receipts;
create trigger keep_latest_read_receipt before update on public.user_read_receipts
  for each row execute function public.keep_latest_read_receipt();
commit;
