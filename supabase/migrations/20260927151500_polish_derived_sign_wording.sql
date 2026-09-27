begin;

update public.fa_sign_documents
set content = jsonb_set(
      jsonb_set(
        content,
        '{profil,0}',
        to_jsonb(
          regexp_replace(
            content->'profil'->>0,
            'Il occupe la place de (.+) signe descendant dans l''ordre général des 240 combinaisons\.',
            'Il occupe la \1 place parmi les 240 signes descendants.'
          )
        )
      ),
      '{synthese}',
      to_jsonb(
        replace(
          replace(
            content->>'synthese',
            ' réunit les enseignements de ',
            ' réunit des enseignements liés à '
          ),
          ' développe les thèmes de ',
          ' développe des thèmes liés à '
        )
      )
    ),
    updated_at = now()
where kind = 'signe_derive'
  and status = 'published';

commit;
