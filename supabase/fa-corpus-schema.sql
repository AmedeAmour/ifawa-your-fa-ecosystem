-- Schéma du corpus Fa pour Ifawa2. Historique d'import : references/README.md.
-- catalog_slot est un emplacement technique (1..256), pas un rang traditionnel.
begin;
create table if not exists public.fa_sign_documents (
  fa_sign_id uuid primary key references public.fa_signs(id) on delete restrict,
  catalog_slot smallint not null unique check (catalog_slot between 1 and 257),
  kind text not null check (kind in ('signe_mere', 'signe_derive', 'messager')),
  mother_order smallint unique check (mother_order between 1 and 16),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  source jsonb not null check (jsonb_typeof(source) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now(),
  check ((kind = 'signe_mere' and mother_order is not null) or
         (kind <> 'signe_mere' and mother_order is null)),
  check (content ?& array['slug','nom','position','sexeSymbolique','maison',
    'divinites','feuilles','couleurs','profil','devises','interdits','prescriptions','synthese']),
  check (jsonb_typeof(content->'profil') = 'array'),
  check (jsonb_typeof(content->'devises') = 'array'),
  check (jsonb_typeof(content->'interdits') = 'array'),
  check (jsonb_typeof(content->'prescriptions') = 'array')
);
alter table public.fa_sign_documents enable row level security;
revoke all on table public.fa_sign_documents from public, anon, authenticated;
grant select on table public.fa_sign_documents to authenticated;
grant all on table public.fa_sign_documents to service_role;
drop policy if exists "Published sign documents" on public.fa_sign_documents;
create policy "Published sign documents" on public.fa_sign_documents
  for select to authenticated using (status = 'published');
comment on table public.fa_sign_documents is
  'Corpus éditorial Ifawa. 256 signes et le messager Tchè-Tula. Écriture réservée au serveur.';
commit;
