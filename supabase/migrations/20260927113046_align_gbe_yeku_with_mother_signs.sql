begin;

update public.fa_sign_documents as document
set content = (document.content - 'variantes' - 'noteEditoriale' - 'sources') || jsonb_build_object(
      'profil', $json$[
        "GBE YEKU ouvre la série des 240 signes descendants issus des seize grands signes du Fâ. Il appartient à la maison de Gbé et occupe la première place parmi ses signes dérivés.",
        "Le récit associé au signe parle de deux chasseurs. Le chien de l’un d’eux tombe dans un trou au cours d’une chasse. Son compagnon exige que l’animal soit tué et partagé malgré l’opposition de son propriétaire. Plus tard, un malheur comparable atteint la famille de celui qui avait imposé cette décision, le plaçant à son tour devant la dure règle qu’il avait fait subir à l’autre.",
        "Le signe met ainsi en garde contre la rivalité, la colère, l’injustice et la vengeance. Le porteur doit réfléchir aux conséquences de ses actes, éviter de profiter de la faiblesse d’autrui et rechercher une conduite équitable dans les conflits.",
        "Le respect des obligations envers Kluvito et Hêviosso est présenté comme une voie d’apaisement et de protection. Il est associé à la recherche d’une vie stable, de la paix, de la prospérité, des bienfaits et de la longévité."
      ]$json$::jsonb,
      'devises', $json$[
        {"ordre":1,"titre":"Le chasseur des morts et le chasseur des vivants entrent en rivalité","sens":"Une opposition mal maîtrisée peut conduire à une décision injuste. Le porteur est invité à privilégier l’équité plutôt que le rapport de force."},
        {"ordre":2,"titre":"Le chien tombé dans le trou est tué et partagé","sens":"Le malheur d’un proche ne doit pas devenir une occasion de profit. Toute décision imposée sans compassion peut entraîner des conséquences durables."},
        {"ordre":3,"titre":"L’épreuve revient dans la maison de celui qui avait imposé le partage","sens":"Chacun peut un jour être soumis à la règle qu’il applique aux autres. Le signe demande de mesurer la portée de ses actes avant de les imposer."},
        {"ordre":4,"titre":"Celui qui fait du mal rencontre le mal sur son chemin","sens":"La conduite envers autrui finit par produire un retour. La sagesse consiste à assumer ses responsabilités et à interrompre le cycle de la vengeance."}
      ]$json$::jsonb,
      'synthese', 'GBE YEKU est un signe de responsabilité, d’équité et de maîtrise de soi. Son récit enseigne que le tort causé à autrui peut revenir vers son auteur. Le porteur doit éviter la chasse, les vêtements noirs et l’igname frite, tout en respectant les obligations liées à Kluvito et Hêviosso afin de rechercher paix, prospérité et longévité.'
    ),
    source = $source${"titre":"256 SIGNES DU FÂ","fichier":"Les 256 signe .pdf","auteur":"ESMAC-HWENDO","page":11,"version":"2026-09-27"}$source$::jsonb,
    updated_at = now()
from public.fa_signs as sign
where document.fa_sign_id = sign.id
  and sign.slug = 'signe-017-gbe-yeku';

commit;
