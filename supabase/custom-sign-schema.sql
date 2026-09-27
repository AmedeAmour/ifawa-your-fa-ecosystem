-- Preserve a member's own sign name without adding unreviewed library entries.
alter table public.profile_fa_details
  add column custom_sign_name text
  constraint profile_fa_custom_sign_length
  check (custom_sign_name is null or char_length(btrim(custom_sign_name)) between 1 and 120);
