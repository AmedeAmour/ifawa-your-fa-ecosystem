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
  19,
  'signe_derive',
  null,
  $content${"slug":"signe-018-gbe-woli","nom":"GBE WOLI","ordre":null,"type":"signe_derive","position":"18e signe du catalogue ; deuxième des 240 signes descendants","sexeSymbolique":"Non précisé par le document de référence","maison":"Maison de Gbé ; deuxième signe dérivé de cette lignée","divinites":"Non précisées dans le document de référence","feuilles":"Non précisées dans le document de référence","couleurs":"Aucune couleur particulière n’est précisée dans le document de référence.","profil":["GBE WOLI est le deuxième signe descendant des seize grands signes du Fâ. Il appartient à la maison de Gbé et vient immédiatement après GBE YEKU dans cette lignée.","Le signe est associé à une situation dangereuse qui exige vigilance, calme et maîtrise de soi. Le porteur peut cependant être appelé à exercer une autorité importante et à devenir chef de collectivité. Cette responsabilité lui demande d’éviter les décisions précipitées et les conflits inutiles.","Ses images rappellent qu’un bienfait peut aussi créer une difficulté lorsqu’il arrive au mauvais moment : la pluie nourrit la terre, mais elle mouille le linge laissé dehors. De même, l’éponge sèche ressort trempée de la douche, comme une personne transformée par l’épreuve qu’elle vient de traverser.","La rivalité entre le bœuf des morts et celui des vivants met en garde contre les luttes de pouvoir. Leur voix finit pourtant par se rejoindre, ce qui invite le porteur à rechercher l’entente, à rassembler les personnes placées sous son autorité et à conduire la communauté avec mesure."],"devises":[{"ordre":1,"titre":"Une même personne ne doit pas être frappée deux fois par la mort","sens":"Une épreuve déjà subie ne doit pas être aggravée par un nouvel acharnement. Le signe appelle à mettre une limite à la violence et à protéger celui qui a déjà souffert."},{"ordre":2,"titre":"La pluie est bénéfique, mais elle mouille les pagnes laissés au soleil","sens":"Une chose favorable peut produire un dommage lorsqu’elle surprend une personne mal préparée. Le porteur doit anticiper les conséquences de ce qui paraît avantageux."},{"ordre":3,"titre":"L’éponge sèche entre dans la douche et en ressort chargée d’eau","sens":"Toute expérience laisse une trace. Une difficulté peut transformer profondément le porteur et lui apprendre à reconnaître la souffrance d’autrui."},{"ordre":4,"titre":"Le bœuf des morts et le bœuf des vivants rivalisent par la voix","sens":"La compétition et les tiraillements peuvent menacer l’équilibre du groupe. Lorsque les voix se rejoignent, la rivalité peut devenir une force collective."}],"interdits":["Manger de la viande de bœuf","Découper la viande avec un couteau"],"prescriptions":["Respecter strictement les interdits liés à la viande de bœuf et au couteau","Rester vigilant face aux situations pouvant conduire au danger","Éviter les tiraillements et rechercher l’entente dans les conflits","Exercer toute responsabilité collective avec calme, mesure et équité"],"synthese":"GBE WOLI associe danger, vigilance, transformation et autorité. Le porteur peut être appelé à diriger une collectivité, mais il doit prévenir les conflits, mesurer les conséquences de ses décisions et rechercher l’unité. Il lui est interdit de manger du bœuf et de découper la viande avec un couteau."}$content$::jsonb,
  $source${"titre":"256 SIGNES DU FÂ","fichier":"Les 256 signe .pdf","auteur":"ESMAC-HWENDO","pages":[11,12],"version":"2026-09-27"}$source$::jsonb,
  'published'
from public.fa_signs
where slug = 'signe-018-gbe-woli'
on conflict (fa_sign_id) do update
set content = excluded.content,
    source = excluded.source,
    status = excluded.status,
    updated_at = now();

commit;
