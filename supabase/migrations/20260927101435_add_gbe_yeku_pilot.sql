begin;

insert into public.fa_sign_documents (
  fa_sign_id,
  catalog_slot,
  kind,
  mother_order,
  content,
  source,
  status
)
select
  id,
  18,
  'signe_derive',
  null,
  $content${"slug":"signe-017-gbe-yeku","nom":"GBE YEKU","ordre":null,"type":"signe_derive","position":"17e signe du catalogue ; premier des 240 signes descendants","sexeSymbolique":"Non précisé par la source béninoise","maison":"Maison de Gbé ; premier signe dérivé de cette lignée","divinites":"Kluvito (défunts et ancêtres) et Hêviosso","feuilles":"Non précisées par la source béninoise","couleurs":"Aucune couleur favorable n’est précisée ; le port de vêtements noirs est interdit.","profil":["GBE YEKU est présenté dans le document béninois comme le premier des 240 signes descendants des seize grands signes. Des corpus comparatifs l’écrivent aussi Ogbe Yeku, Ogbe Oyeku ou Ògbè Òyèkú et le rattachent à la lignée de Gbé.","Son récit met en scène deux chasseurs, l’un associé aux morts et l’autre aux vivants. Après la mise à mort et le partage du chien tombé dans un trou, la même épreuve atteint la famille de celui qui avait insisté pour profiter du malheur. Le récit enseigne que le tort infligé à autrui finit par revenir vers son auteur.","Le signe invite ainsi à maîtriser rivalité, colère et désir de vengeance. Il appelle à la prudence dans les conflits, à l’équité dans les décisions et à la conscience des conséquences de ses actes.","La source béninoise relie enfin l’équilibre du porteur au respect de Kluvito et de Hêviosso, avec pour horizons la paix, la prospérité, les bienfaits de la vie et la longévité. Les sources comparatives confirment les thèmes de vigilance, de justice et de longévité, mais leurs prescriptions rituelles propres ne sont pas transposées ici."],"devises":[{"ordre":1,"titre":"Le chasseur des morts et le chasseur des vivants entrent en rivalité","sens":"Le récit ouvre sur un conflit de jugement et de valeurs. Il recommande de ne pas laisser la rivalité décider à la place de l’équité."},{"ordre":2,"titre":"Le chien tombé dans le trou est tué et partagé","sens":"Profiter du malheur d’autrui crée une dette morale. Une décision prise sous l’effet du rapport de force peut produire des conséquences durables."},{"ordre":3,"titre":"La même épreuve revient dans la maison de celui qui l’avait imposée","sens":"Le retournement du récit rappelle que chacun peut subir la règle qu’il applique aux autres. Il appelle à mesurer ses actes avant de les imposer."},{"ordre":4,"titre":"Celui qui fait du mal rencontre le mal sur son chemin","sens":"La leçon centrale porte sur la responsabilité, la réciprocité et la nécessité de rompre le cycle de la vengeance."}],"interdits":["Aller à la chasse","Porter des vêtements noirs","Manger de l’igname frite"],"prescriptions":["Prendre soin de Kluvito et respecter les obligations liées aux défunts et aux ancêtres","Prendre soin de Hêviosso","Accomplir les prescriptions indiquées afin de rechercher paix, prospérité, bienfaits et longévité"],"synthese":"GBE YEKU est un signe de responsabilité et de juste mesure. Son récit enseigne que le mal fait à autrui peut revenir vers son auteur ; il recommande de maîtriser rivalité et vengeance, de respecter les interdits transmis et d’entretenir les liens rituels avec Kluvito et Hêviosso pour rechercher paix, prospérité et longévité.","variantes":"Ogbe Yeku, Ogbe Oyeku, Ògbè Òyèkú","noteEditoriale":"Cette fiche donne priorité au document béninois d’ESMAC-HWENDO. Les sources Yoruba comparatives servent à confirmer l’identification et les thèmes convergents ; leurs prescriptions propres ne sont pas ajoutées aux règles béninoises sans validation traditionnelle.","sources":[{"titre":"256 SIGNES DU FÂ","detail":"ESMAC-HWENDO, page 11 — source principale béninoise"},{"titre":"Myths of Ife","url":"https://tianmu.org/good-work-library/african/yoruba-and-ife/myths-of-ife","detail":"Source historique comparative : Ogbe Yeku est présenté comme un enfant de Gbé dans la matrice des 256 combinaisons"},{"titre":"Fourth World Journal — 256 Chapters of Ifa Literary Corpus","url":"https://fwj.cwis.org/index.php/fwj/article/download/124/123/234","detail":"Table comparative des 256 Odù, incluant Ogbe Oyeku"},{"titre":"Ileifa — Ogbe Oyeku","url":"https://ileifa.org/odus/01-02-ogbe-oyeku/","detail":"Source traditionnelle comparative consultée pour les thèmes de vigilance, justice, conflits et longévité"}]}$content$::jsonb,
  $source${"titre":"Dossier pilote GBE YEKU","fichier":"Les 256 signe .pdf","auteur":"ESMAC-HWENDO","page":11,"sourcesComparatives":["Myths of Ife","Fourth World Journal — 256 Chapters of Ifa Literary Corpus","Ileifa — Ogbe Oyeku"],"version":"2026-09-27"}$source$::jsonb,
  'published'
from public.fa_signs
where slug = 'signe-017-gbe-yeku'
on conflict (fa_sign_id) do update
set content = excluded.content,
    source = excluded.source,
    status = excluded.status,
    updated_at = now();

commit;
